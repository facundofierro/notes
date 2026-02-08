import { BrowserManager } from "agent-browser/dist/browser.js";
import { executeCommand } from "agent-browser/dist/actions.js";
import { LLMProvider, LLMMessage } from "@agelum/llm-provider";
import { TestStep, TestScenario } from "./types";

export class TestEngine {
  private browser: BrowserManager;
  private llmProvider: LLMProvider;

  constructor(llmProvider: LLMProvider) {
    this.browser = new BrowserManager();
    this.llmProvider = llmProvider;
  }

  async start(options: { headless?: boolean } = {}) {
    await this.browser.launch({
      action: "launch",
      id: "launch",
      headless: options.headless ?? true,
    });
  }

  async stop() {
    await this.browser.close();
  }

  async runScenario(scenario: TestScenario) {
    console.log(`Running scenario: ${scenario.name}`);
    for (const step of scenario.steps) {
      console.log(`Executing step: ${step.action}`);
      await this.runStep(step);
    }
  }

  async runStep(step: TestStep) {
    if (step.action === "prompt") {
      await this.handleAIPrompt(step.instruction);
      return;
    }

    // VerifyVisible handled above
    const s = step as any;
    if (s.action === "verifyVisible") {
       await this.handleVerifyVisible(s.selector);
       return;
    }

    // Map step to agent-browser command
    const command = this.mapStepToCommand(step);
    
    // executeCommand expects { action: string, ... } and id.
    if (!command.id) command.id = Math.random().toString(36).substring(7);

    // Call agent-browser executeCommand
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await executeCommand(command as any, this.browser);

    if (!result.success) {
      throw new Error(`Step failed: ${step.action} - ${result.error}`);
    }
  }

  private mapStepToCommand(step: any): any {
    const base = { ...step };
    
    switch (step.action) {
      case "setViewport":
        return { ...base, action: "viewport" };
      
      case "verifyVisible":
        return { 
           action: "isvisible", 
           selector: step.selector,
           id: step.id 
        };
        
      case "wait":
        if (step.type === "element") {
          return { action: "wait", selector: String(step.value) };
        } else if (step.type === "time") {
          return { action: "wait", timeout: Number(step.value) };
        } else if (step.type === "url") {
          return { action: "waitforurl", url: String(step.value) };
        }
        return { action: "wait", timeout: 1000 }; // fallback
        
      default:
        return base;
    }
  }

  private async handleVerifyVisible(selector: string) {
     const result = await executeCommand({
         action: "isvisible",
         selector,
         id: "verify-" + Date.now()
     } as any, this.browser);

     if (!result.success) throw new Error(`Verify failed: ${result.error}`);
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
     if (!(result.data as any)?.visible) {
         throw new Error(`Element ${selector} is not visible`);
     }
  }

  private async handleAIPrompt(instruction: string) {
    // 1. Get snapshot
    const snapshot = await this.browser.getSnapshot({ compact: true });
    const tree = snapshot.tree;

    // 2. Build prompt
    // We use the simpler snapshot for the LLM
    const messages: LLMMessage[] = [
      {
        role: "system",
        content: `You are a browser automation agent.
You will be given a representation of the current web page (Accessibility Tree) and a user instruction.
You must output a JSON object containing a "step" field which describes the next action to take to fulfill the instruction.
The action must be one of the following schemas (similar to Playwright/Agent Browser):
{ "action": "click", "selector": "@ref" }
{ "action": "type", "selector": "@ref", "text": "value" }
{ "action": "wait", "timeout": 1000 }
{ "action": "done" } (if the instruction is complete)

Prioritize using the simplified "refs" (e.g. @12, @e1) from the tree.
`
      },
      {
        role: "user",
        content: `Current Page Tree:\n${tree}\n\nInstruction: ${instruction}`
      }
    ];

    // 3. Loop until done (simplification: just one step for now? Or loop?)
    // The task says "map the instruction to a sequence of interaction steps".
    // I entered a loop in my thought process. Let's do a simple loop.
    let done = false;
    let iterations = 0;
    while (!done && iterations < 5) {
        // We might need to refresh snapshot if state changed
        if (iterations > 0) {
            const newSnap = await this.browser.getSnapshot();
            messages.push({ role: "user", content: `New State:\n${newSnap.tree}` });
        }

        const response = await this.llmProvider.generateObject(messages, 
            // We define a loose schema for the output action
            // In a real app we'd define all allowed actions strictly.
             // This is just a placeholder schema
             // We'll trust the LLM outputs a valid action structure we can try to execute or map.
             // Since zod schemas are strict, let's use a "passthrough" or just object.
             // But generateObject requires a specific Zod schema.
             // Let's define a "NextAction" schema.
             // For now, I'll use 'any' schema to allow flexibility and refine later.
             {
                 /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                 parse: (obj: any) => obj
             } as any
        );
        
        const action = (response as any).step || (response as any); // Handle if it returns { step: ... } or just ...
        
        console.log("AI decided:", action);

        if (action.action === "done") {
            done = true;
            break;
        }

        // Execute LLM generated action
        // We map it to TestStep or directly to executeCommand
        try {
            await this.runStep(action);
            messages.push({ role: "assistant", content: JSON.stringify({ step: action }) });
            messages.push({ role: "user", content: "Action executed successfully." });
        } catch (e: any) {
            messages.push({ role: "assistant", content: JSON.stringify({ step: action }) });
            messages.push({ role: "user", content: `Action failed: ${e.message}. Try something else.` });
        }
        
        iterations++;
    }
  }
}
