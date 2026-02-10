
"use client";

import * as React from "react";
import { 
  Button,
  Input,
  Label,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  ScrollArea,
  Card, CardContent,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Badge
} from "@agelum/shadcn";
import { ChevronLeft, Plus, Trash2, Save, Play, Image as ImageIcon, Terminal, Globe, Sparkles } from "lucide-react";

// Types matching the engine
interface TestStep {
  action: string;
  [key: string]: any;
}

interface TestScenario {
  id: string;
  name: string;
  steps: TestStep[];
}

interface TestEditorProps {
  testId: string;
  onBack: () => void;
}

const STEP_TYPES = [
  { value: "open", label: "Open URL", desc: "Navigate to a specific page", icon: Globe },
  { value: "command", label: "Browser Command", desc: "Low-level browser actions", icon: Terminal },
  { value: "prompt", label: "AI Prompt", desc: "Natural language instruction", icon: Sparkles },
];

// Agent-browser commands reference for the Command step type
const AGENT_BROWSER_COMMANDS = [
  // Core Commands
  { cmd: "open <url>", desc: "Navigate to URL" },
  { cmd: "click <selector>", desc: "Click element" },
  { cmd: "dblclick <selector>", desc: "Double-click element" },
  { cmd: "type <selector> <text>", desc: "Type into element" },
  { cmd: "fill <selector> <text>", desc: "Clear and fill element" },
  { cmd: "press <key>", desc: "Press key (Enter, Tab, etc.)" },
  { cmd: "hover <selector>", desc: "Hover element" },
  { cmd: "select <selector> <value>", desc: "Select dropdown option" },
  { cmd: "check <selector>", desc: "Check checkbox" },
  { cmd: "uncheck <selector>", desc: "Uncheck checkbox" },
  { cmd: "scroll <direction> [px]", desc: "Scroll (up/down/left/right)" },
  { cmd: "screenshot [path]", desc: "Take screenshot" },
  { cmd: "snapshot", desc: "Get accessibility tree with refs" },
  { cmd: "wait <selector>", desc: "Wait for element" },
  { cmd: "eval <js>", desc: "Run JavaScript" },
  // Get Info
  { cmd: "get text <selector>", desc: "Get text content" },
  { cmd: "get value <selector>", desc: "Get input value" },
  { cmd: "get attr <selector> <attr>", desc: "Get attribute" },
  { cmd: "get title", desc: "Get page title" },
  { cmd: "get url", desc: "Get current URL" },
  // Navigation
  { cmd: "back", desc: "Go back" },
  { cmd: "forward", desc: "Go forward" },
  { cmd: "reload", desc: "Reload page" },
  // Check State
  { cmd: "is visible <selector>", desc: "Check if visible" },
  { cmd: "is enabled <selector>", desc: "Check if enabled" },
  { cmd: "is checked <selector>", desc: "Check if checked" },
];

export function TestEditor({ testId, onBack }: TestEditorProps) {
  const [test, setTest] = React.useState<TestScenario | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [steps, setSteps] = React.useState<TestStep[]>([]);
  const [testName, setTestName] = React.useState("");
  
  // Execution
  const [isRunning, setIsRunning] = React.useState(false);
  const [logs, setLogs] = React.useState<string[]>([]);
  const [screenshots, setScreenshots] = React.useState<string[]>([]);
  const [activeTab, setActiveTab] = React.useState<"steps" | "results">("steps");

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingStepIndex, setEditingStepIndex] = React.useState<number | null>(null);
  const [currentStep, setCurrentStep] = React.useState<TestStep>({ action: "click" });

  const fetchTest = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/tests/${testId}`);
      if (res.ok) {
        const data = await res.json();
        setTest(data);
        setTestName(data.name || "Untitled Test");
        setSteps(data.steps || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [testId]);

  React.useEffect(() => {
    fetchTest();
  }, [fetchTest]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/tests/${testId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: testName, steps }),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
     await handleSave();
     setIsRunning(true);
     setLogs([]);
     setScreenshots([]);
     setActiveTab("results");
     
     try {
         const res = await fetch("/api/tests/execute", {
             method: "POST",
             body: JSON.stringify({ id: testId }),
             headers: { "Content-Type": "application/json" }
         });
         
         const reader = res.body?.getReader();
         if (!reader) return;

         const decoder = new TextDecoder();
         let buffer = "";

         while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            
            const lines = buffer.split("\n");
            // Keep the last incomplete part in buffer
            const lastPart = lines.pop(); 
            buffer = lastPart !== undefined ? lastPart : "";

            for (const line of lines) {
                if (!line.trim()) continue;
                setLogs(prev => [...prev, line]);
                
                try {
                    // Try to extract JSON from line (it might be wrapped in other text or pure JSON)
                    // We assume the engine output JSON formatted lines pure.
                    // But agent-browser might output other stuff.
                    // We only care about lines starting with {
                    const jsonMatch = line.match(/^\{.*\}$/);
                    if (jsonMatch) {
                        const event = JSON.parse(jsonMatch[0]);
                        if (event.type === "screenshot" && event.path) {
                            const parts = event.path.split(".agelum/tests/runs/");
                            if (parts.length > 1) {
                                 const url = `/api/tests/artifacts/${parts[1]}`;
                                 setScreenshots(prev => [...prev, url]);
                            }
                        }
                    }
                } catch (e) { /* ignore */ }
            }
         }
     } catch(e: any) { 
         setLogs(prev => [...prev, `Error: ${e.message}`]);
     } finally {
         setIsRunning(false);
     }
  };

  // Step management functions...
  const addStep = () => {
    setEditingStepIndex(null);
    setCurrentStep({ action: "open" });
    setIsDialogOpen(true);
  };

  const editStep = (index: number) => {
    setEditingStepIndex(index);
    setCurrentStep({ ...steps[index] });
    setIsDialogOpen(true);
  };

  const saveStep = () => {
    if (editingStepIndex !== null) {
      const newSteps = [...steps];
      newSteps[editingStepIndex] = currentStep;
      setSteps(newSteps);
    } else {
      setSteps([...steps, currentStep]);
    }
    setIsDialogOpen(false);
  };

  const deleteStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps);
  };

  const updateCurrentStep = (field: string, value: any) => {
    setCurrentStep(prev => ({ ...prev, [field]: value }));
  };

  const renderStepFields = () => {
    switch (currentStep.action) {
      case "open":
        return (
          <div className="space-y-2">
            <Label>URL</Label>
            <Input 
                value={currentStep.url || ""} 
                onChange={e => updateCurrentStep("url", e.target.value)} 
                placeholder="https://example.com"
            />
          </div>
        );
      case "command":
        return (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Agent-Browser Command</Label>
                <Input 
                    value={currentStep.command || ""} 
                    onChange={e => updateCurrentStep("command", e.target.value)} 
                    placeholder="click @submit or fill #email test@example.com"
                    className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Enter any agent-browser command. Use @ref for AI-detected elements or CSS selectors.
                </p>
              </div>
              
              {/* Command Reference Table */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Available Commands Reference</Label>
                <ScrollArea className="h-[200px] w-full border rounded-md">
                  <div className="p-3 space-y-1">
                    {AGENT_BROWSER_COMMANDS.map((cmd, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-start gap-3 py-1.5 px-2 hover:bg-accent/50 rounded-sm cursor-pointer transition-colors"
                        onClick={() => updateCurrentStep("command", cmd.cmd)}
                      >
                        <code className="text-xs font-mono text-emerald-400 flex-1 min-w-[180px]">
                          {cmd.cmd}
                        </code>
                        <span className="text-xs text-muted-foreground flex-1">
                          {cmd.desc}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <p className="text-xs text-muted-foreground italic">
                  💡 Click any command to use it as a template
                </p>
              </div>
            </div>
        );
      case "prompt":
        return (
            <div className="space-y-2">
                <Label>AI Instruction</Label>
                <textarea 
                    value={currentStep.instruction || ""} 
                    onChange={e => updateCurrentStep("instruction", e.target.value)} 
                    placeholder="Click the blue submit button and wait for the success modal to appear"
                    className="w-full min-h-[100px] px-3 py-2 text-sm border border-input bg-background rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                />
                <p className="text-xs text-muted-foreground">
                  Describe what you want the AI to do. This will execute using Gemini CLI in the background with agent-browser.
                </p>
            </div>
        );
      default:
        return <p className="text-sm text-muted-foreground">No extra configuration for this step type.</p>;
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onBack}>
                <ChevronLeft className="w-4 h-4" />
            </Button>
            <Input 
                value={testName} 
                onChange={e => setTestName(e.target.value)} 
                className="font-semibold text-lg border-none focus-visible:ring-0 w-[300px]"
            />
        </div>
        <div className="flex gap-2 bg-muted p-1 rounded-md">
             <Button 
                variant={activeTab === "steps" ? "default" : "ghost"} 
                size="sm" 
                onClick={() => setActiveTab("steps")}
            >
                 Steps
             </Button>
             <Button 
                variant={activeTab === "results" ? "default" : "ghost"} 
                size="sm" 
                onClick={() => setActiveTab("results")}
            >
                 Results
             </Button>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save"}
            </Button>
            <Button onClick={handleRun} disabled={isRunning}>
                <Play className="w-4 h-4 mr-2" />
                {isRunning ? "Running..." : "Run"}
            </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {activeTab === "steps" ? (
             <div className="space-y-4 max-w-3xl mx-auto">
                {steps.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                        <p>No steps defined yet.</p>
                        <Button variant="link" onClick={addStep}>Add your first step</Button>
                    </div>
                )}
                
                {steps.map((step, index) => (
                    <Card key={index} className="relative group hover:border-primary transition-colors">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="bg-muted p-2 rounded text-muted-foreground">
                                <span className="font-mono text-sm">{index + 1}</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline">{step.action}</Badge>
                                    <span className="text-sm font-medium">
                                        {step.action === "open" && step.url}
                                        {step.action === "command" && (
                                          <code className="font-mono text-emerald-400">
                                            {step.command}
                                          </code>
                                        )}
                                        {step.action === "prompt" && (
                                          <span className="italic text-muted-foreground">
                                            {step.instruction?.substring(0, 60)}
                                            {step.instruction?.length > 60 ? "..." : ""}
                                          </span>
                                        )}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" onClick={() => editStep(index)}>
                                    <span className="sr-only">Edit</span>
                                   <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4"><path d="M11.8536 1.14645C11.6583 0.951184 11.3417 0.951184 11.1464 1.14645L3.71455 8.57836C3.62459 8.66832 3.55263 8.77461 3.50251 8.89291L2.16918 12.0396C2.04623 12.3297 2.32969 12.6132 2.61985 12.4902L5.76651 11.1569C5.88481 11.1068 5.9911 11.0348 6.08106 10.9449L13.5129 3.51296C13.7081 3.3177 13.7081 3.00111 13.5129 2.80585L11.8536 1.14645ZM4.42169 9.28547L11.5 2.20711L12.7929 3.5L5.71455 10.5784C5.74836 10.5332 5.76686 10.4913 5.76651 10.4902L2.61985 11.8236L3.95319 8.67691C3.95201 8.67656 3.91004 8.69506 3.86493 8.72887L4.42169 9.28547Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                                </Button>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteStep(index)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                
                <Button variant="outline" className="w-full border-dashed" onClick={addStep}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Step
                </Button>
            </div>
        ) : (
            <div className="flex flex-col gap-6 max-w-4xl mx-auto">
                 {screenshots.length > 0 && (
                     <div className="space-y-4">
                         <h3 className="font-semibold flex items-center gap-2">
                             <ImageIcon className="w-4 h-4" />
                             Screenshots
                         </h3>
                         <div className="grid grid-cols-2 gap-4">
                             {screenshots.map((url, i) => (
                                 <div key={i} className="border rounded-lg overflow-hidden bg-background">
                                     <a href={url} target="_blank" rel="noopener noreferrer">
                                        <img src={url} alt={`Screenshot ${i}`} className="w-full h-auto object-contain max-h-[300px]" />
                                     </a>
                                 </div>
                             ))}
                         </div>
                     </div>
                 )}
                 
                 <div className="space-y-2">
                     <h3 className="font-semibold flex items-center gap-2">
                         <Terminal className="w-4 h-4" />
                         Console Output
                     </h3>
                     <div className="bg-black text-green-400 font-mono text-xs p-4 rounded-md overflow-x-auto whitespace-pre-wrap min-h-[200px]">
                         {logs.length > 0 ? logs.join("\n") : "No logs available..."}
                         {isRunning && <span className="animate-pulse">_</span>}
                     </div>
                 </div>
            </div>
        )}
      </ScrollArea>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingStepIndex !== null ? "Edit Step" : "Add Step"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Step Type</Label>
                    <div className="grid grid-cols-3 gap-3">
                        {STEP_TYPES.map((t) => {
                            const Icon = t.icon;
                            const isSelected = currentStep.action === t.value;
                            return (
                                <div
                                    key={t.value}
                                    onClick={() => updateCurrentStep("action", t.value)}
                                    className={`
                                        relative overflow-hidden cursor-pointer rounded-xl border transition-all duration-300 group active:scale-95
                                        ${isSelected 
                                            ? "bg-white/[0.06] border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.05)] ring-1 ring-white/10" 
                                            : "border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 hover:shadow-lg"
                                        }
                                    `}
                                >
                                    <div className="p-3 flex flex-col items-center gap-2 text-center h-full justify-center">
                                        <div className={`p-2 rounded-lg transition-colors duration-300 ${isSelected ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-zinc-500 group-hover:text-zinc-200"}`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className={`text-xs font-bold mb-0.5 ${isSelected ? "text-zinc-100" : "text-zinc-400 group-hover:text-zinc-200"}`}>{t.label}</div>
                                            <div className="text-[9px] text-zinc-600 leading-tight px-1">{t.desc}</div>
                                        </div>
                                    </div>
                                    
                                    {isSelected && (
                                        <div className="absolute -bottom-6 -right-6 w-12 h-12 bg-emerald-500/20 blur-xl rounded-full" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                {renderStepFields()}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={saveStep}>Save Step</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
