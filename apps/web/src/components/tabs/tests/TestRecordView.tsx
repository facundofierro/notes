"use client";

import * as React from "react";
import {
  cn,
  Button,
  Badge,
  ScrollArea,
  Switch,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@agelum/shadcn";
import {
  Circle,
  Square,
  Send,
  Loader2,
  ChevronDown,
  ChevronRight,
  Eye,
  Mic,
  Image as ImageIcon,
  GripVertical,
  Code,
  Layout,
} from "lucide-react";
import type { AIBackendInfo } from "@/lib/record-ai";

interface RecordedStep {
  type: "command" | "prompt";
  command: string;
  args: string[];
  instruction?: string; // for prompt steps
  description: string;
}

interface TestRecordViewProps {
  testId: string;
  onStop: () => void;
  projectPath: string | null;
}

export function TestRecordView({
  testId,
  onStop,
  projectPath,
}: TestRecordViewProps) {
  // State
  const [testName, setTestName] = React.useState("Recording...");
  const [screenshot, setScreenshot] = React.useState("");
  const [snapshot, setSnapshot] = React.useState("");

  const [recordedSteps, setRecordedSteps] = React.useState<RecordedStep[]>([]);
  const [prompt, setPrompt] = React.useState("");
  const [deterministic, setDeterministic] = React.useState(false);
  const [backends, setBackends] = React.useState<AIBackendInfo[]>([]);
  const [selectedBackend, setSelectedBackend] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isInitializing, setIsInitializing] = React.useState(true);
  const [statusMessage, setStatusMessage] = React.useState("Initializing...");
  const [error, setError] = React.useState("");
  const promptRef = React.useRef<HTMLTextAreaElement>(null);
  const stepsEndRef = React.useRef<HTMLDivElement>(null);

  // Layout state
  const [rightPanelWidth, setRightPanelWidth] = React.useState(35);
  const [isResizing, setIsResizing] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const startResizing = React.useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = React.useCallback(
    (e: MouseEvent) => {
      if (isResizing && containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        // Calculate right panel width percentage based on mouse position from right edge
        // OR mouse position from left.
        // Left width = e.clientX - containerLeft
        const containerRect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - containerRect.left;
        
        // Right width % = 100 - (mouseX / containerWidth * 100)
        const newRightWidth = 100 - ((mouseX / containerWidth) * 100);
        
        // Constrain between 20% and 70%
        const constrainedWidth = Math.min(70, Math.max(20, newRightWidth));
        setRightPanelWidth(constrainedWidth);
      }
    },
    [isResizing],
  );

  React.useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    } 
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  // Scroll to bottom of steps when new step added
  React.useEffect(() => {
    stepsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [recordedSteps.length]);

  // Initialization
  React.useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // 1. Fetch available backends
        setStatusMessage("Detecting AI backends...");
        const backendsRes = await fetch("/api/tests/record/ai");
        if (backendsRes.ok) {
          const backendsData: AIBackendInfo[] = await backendsRes.json();
          if (!cancelled) {
            setBackends(backendsData);
            if (backendsData.length > 0) {
              setSelectedBackend(backendsData[0].id);
            }
          }
        }

        // 2. Fetch test data
        setStatusMessage("Loading test data...");
        const testRes = await fetch(`/api/tests/${testId}`);
        let testData: any = null;
        if (testRes.ok) {
          testData = await testRes.json();
          if (!cancelled) {
            setTestName(testData.name || "Untitled Test");
          }
        }

        // 3. Get preview URL from project config
        let previewUrl = "http://localhost:3000";
        if (projectPath) {
          const configRes = await fetch(
            `/api/project/config?path=${encodeURIComponent(projectPath)}`,
          );
          if (configRes.ok) {
            const configData = await configRes.json();
            if (configData.config?.url) {
              previewUrl = configData.config.url;
            }
          }
        }

        const existingSteps = testData?.steps || [];

        if (existingSteps.length === 0) {
          // No steps — open preview URL as first step
          setStatusMessage(`Opening ${previewUrl}...`);
          const execRes = await fetch("/api/tests/record/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command: "open", args: [previewUrl] }),
          });
          if (!execRes.ok) {
            const errorText = await execRes.text();
            let errorMessage = "Unknown error";
            try {
              const errorData = JSON.parse(errorText);
              errorMessage =
                errorData.error || errorData.message || errorMessage;
            } catch (e) {
              errorMessage = errorText || errorMessage;
            }
            throw new Error(`Failed to open preview URL: ${errorMessage}`);
          }

          const execData = await execRes.json();
          if (execData.success && !cancelled) {
            const step: RecordedStep = {
              type: "command",
              command: "open",
              args: [previewUrl],
              description: `Open ${previewUrl}`,
            };
            setRecordedSteps([step]);

            // Persist this step
            await fetch(`/api/tests/${testId}/steps`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "command",
                command: `open ${previewUrl}`,
              }),
            });
          }
        } else {
          // Replay existing steps
          setStatusMessage("Replaying existing steps...");
          const replayedSteps: RecordedStep[] = [];

          for (const step of existingSteps) {
            if (cancelled) break;

            // Skip prompt steps during recording replay (they require LLM execution)
            if (step.action === "prompt") {
              replayedSteps.push({
                type: "prompt",
                command: "",
                args: [],
                instruction: step.instruction || "",
                description: step.instruction || "AI prompt step",
              });
              continue;
            }

            let command = "";
            let args: string[] = [];
            let description = "";

            if (step.action === "open" && step.url) {
              command = "open";
              args = [step.url];
              description = `Open ${step.url}`;
            } else if (step.action === "command" && step.command) {
              const parts = step.command.split(/\s+/);
              command = parts[0] || "";
              args = parts.slice(1);
              description = step.command;
            } else {
              continue;
            }

            setStatusMessage(`Replaying: ${description}`);
            const replayedExecRes = await fetch("/api/tests/record/execute", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ command, args }),
            });

            if (!replayedExecRes.ok) {
              const errorText = await replayedExecRes.text();
              let errorMessage = "Unknown error";
              try {
                const errorData = JSON.parse(errorText);
                errorMessage =
                  errorData.error || errorData.message || errorMessage;
              } catch (e) {
                errorMessage = errorText || errorMessage;
              }
              throw new Error(
                `Failed to replay step "${description}": ${errorMessage}`,
              );
            }

            replayedSteps.push({ type: "command", command, args, description });
          }

          if (!cancelled) {
            setRecordedSteps(replayedSteps);
          }
        }

        // 4. Capture initial screenshot + snapshot
        if (!cancelled) {
          setStatusMessage("Capturing browser state...");
          await captureState(cancelled);
          setStatusMessage("");
          setIsInitializing(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Initialization failed");
          setIsInitializing(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [testId, projectPath]);

  async function captureState(cancelled?: boolean) {
    try {
      const res = await fetch("/api/tests/record/capture", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        if (cancelled) return;
        if (data.screenshot) setScreenshot(data.screenshot);
        if (data.snapshot) setSnapshot(data.snapshot);
      }
    } catch (err: any) {
      console.error("Capture failed:", err);
    }
  }

  async function handleSubmitPrompt() {
    if (!prompt.trim() || isProcessing || !selectedBackend) return;

    setIsProcessing(true);
    setError("");
    setStatusMessage("Getting AI recommendation...");

    try {
      // 1. Get AI recommendation
      const aiRes = await fetch("/api/tests/record/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          screenshot,
          snapshot,
          prompt: prompt.trim(),
          deterministic,
          backend: selectedBackend,
          projectPath,
        }),
      });

      if (!aiRes.ok) {
        const errData = await aiRes.json();
        throw new Error(errData.error || "AI recommendation failed");
      }

      const recommendation = await aiRes.json();

      if (recommendation.type === "prompt") {
        // 2a. Non-deterministic: execution already happened via gemini CLI
        // Just add the prompt step to the list and persist it
        const newStep: RecordedStep = {
          type: "prompt",
          command: "",
          args: [],
          instruction: recommendation.instruction,
          description: recommendation.stepDescription || recommendation.instruction || prompt.trim(),
        };
        setRecordedSteps((prev) => [...prev, newStep]);

        await fetch(`/api/tests/${testId}/steps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "prompt",
            instruction: recommendation.instruction || prompt.trim(),
          }),
        });
      } else {
        // 2b. Deterministic: execute the command
        setStatusMessage(
          `Executing: ${recommendation.command} ${recommendation.args.join(" ")}`,
        );
        const execRes = await fetch("/api/tests/record/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            command: recommendation.command,
            args: recommendation.args,
          }),
        });

        if (!execRes.ok) {
          throw new Error("Command execution failed");
        }

        const execData = await execRes.json();
        if (!execData.success) {
          throw new Error(execData.error || "Command failed");
        }

        // 3. Add step to local list
        const newStep: RecordedStep = {
          type: "command",
          command: recommendation.command,
          args: recommendation.args,
          description:
            recommendation.stepDescription ||
            `${recommendation.command} ${recommendation.args.join(" ")}`,
        };
        setRecordedSteps((prev) => [...prev, newStep]);

        // 4. Persist the step
        const fullCommand = [recommendation.command, ...recommendation.args].join(
          " ",
        );
        await fetch(`/api/tests/${testId}/steps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "command", command: fullCommand }),
        });
      }

      // 5. Capture updated state
      setStatusMessage("Capturing updated browser state...");
      await captureState();

      // 6. Clear prompt
      setPrompt("");
      promptRef.current?.focus();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsProcessing(false);
      setStatusMessage("");
    }
  }

  async function handleStop() {
    // Save the test with all accumulated steps
    try {
      const steps = recordedSteps.map((s) => {
        if (s.type === "prompt") {
          return { action: "prompt", instruction: s.instruction || s.description };
        }
        return { action: "command", command: [s.command, ...s.args].join(" ") };
      });

      await fetch(`/api/tests/${testId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: testName, steps }),
      });
    } catch (err) {
      console.error("Failed to save test on stop:", err);
    }

    onStop();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitPrompt();
    }
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04] bg-zinc-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <Circle className="w-3 h-3 fill-red-500 text-red-500 animate-pulse" />
            <span className="text-sm font-medium text-zinc-200 truncate">
              {testName}
            </span>
          </div>
          {statusMessage && (
            <Badge
              variant="outline"
              className="text-[10px] px-2 py-0.5 h-5 bg-white/[0.03] border-white/[0.06] text-zinc-500"
            >
              <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" />
              {statusMessage}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Button
            size="sm"
            variant="outline"
            onClick={handleStop}
            className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            <Square className="w-3 h-3 mr-1.5 fill-red-500" />
            Stop Recording
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div 
        ref={containerRef}
        className="flex-1 flex overflow-hidden relative"
      >
        {/* Left: Preview & Snapshot (Resizable) */}
        <div 
          className="flex flex-col border-r border-white/[0.04] overflow-hidden bg-zinc-950/50"
          style={{ flexBasis: `${100 - rightPanelWidth}%` }}
        >
          <Tabs defaultValue="preview" className="flex-1 flex flex-col h-full">
            <div className="px-4 py-2 border-b border-white/[0.04] flex items-center justify-between bg-zinc-950/80">
              <TabsList className="h-7 bg-white/[0.04] p-0.5">
                <TabsTrigger 
                  value="preview" 
                  className="h-6 text-[10px] px-3 data-[state=active]:bg-zinc-800"
                >
                  <Eye className="w-3 h-3 mr-1.5" />
                  Preview
                </TabsTrigger>
                <TabsTrigger 
                  value="snapshot" 
                  className="h-6 text-[10px] px-3 data-[state=active]:bg-zinc-800"
                >
                  <Code className="w-3 h-3 mr-1.5" />
                  DOM Snapshot
                  {snapshot && (
                    <span className="ml-1.5 text-[9px] opacity-60">
                      {snapshot.length > 1000
                        ? `${Math.round(snapshot.length / 1000)}k`
                        : snapshot.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="preview" className="flex-1 relative mt-0 overflow-auto p-4">
              <div className="flex items-center justify-center min-h-full">
                {isInitializing && !screenshot ? (
                  <div className="flex flex-col items-center gap-3 text-zinc-500">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-sm">Loading browser preview...</span>
                  </div>
                ) : screenshot ? (
                  <img
                    src={`data:image/png;base64,${screenshot}`}
                    alt="Browser screenshot"
                    className="max-w-full max-h-full object-contain rounded-lg border border-white/[0.04] shadow-2xl"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-zinc-500">
                    <Eye className="w-6 h-6" />
                    <span className="text-sm">No screenshot available</span>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="snapshot" className="flex-1 relative mt-0 overflow-hidden">
               <ScrollArea className="h-full">
                <pre className="p-4 text-[10px] font-mono text-zinc-400 whitespace-pre-wrap break-words">
                  {snapshot || "No snapshot captured yet."}
                </pre>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Resizer Handle */}
        <div
          className={cn(
            "w-1 bg-zinc-900 border-x border-white/[0.02] cursor-col-resize hover:bg-zinc-700 transition-colors z-10 flex items-center justify-center",
            isResizing && "bg-emerald-500/50 hover:bg-emerald-500/50"
          )}
          onMouseDown={startResizing}
        >
          <GripVertical className="w-2.5 h-2.5 text-zinc-600" />
        </div>

        {/* Right: Steps & Prompt */}
        <div 
          className="flex flex-col overflow-hidden bg-zinc-900/20"
          style={{ flexBasis: `${rightPanelWidth}%` }}
        >
          {/* Recorded steps (Top, Flex-1) */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="px-4 py-2 border-b border-white/[0.04] bg-zinc-950/40 shrink-0">
              <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                Recorded Steps ({recordedSteps.length})
              </span>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-1.5">
                {recordedSteps.length === 0 ? (
                  <p className="text-xs text-zinc-600 text-center py-4">
                    No steps recorded yet.
                  </p>
                ) : (
                  recordedSteps.map((step, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg",
                        "bg-white/[0.02] border border-white/[0.04]",
                      )}
                    >
                      <div className="w-5 h-5 rounded-md bg-white/[0.04] flex items-center justify-center text-[9px] font-mono text-zinc-500 flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] px-1 py-0 h-4 bg-white/[0.03] border-white/[0.06] flex-shrink-0",
                              step.type === "prompt" ? "text-violet-400" : "text-emerald-400",
                            )}
                          >
                            {step.type === "prompt" ? "prompt" : step.command}
                          </Badge>
                          <span className="text-[11px] text-zinc-400 truncate">
                            {step.description}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={stepsEndRef} />
              </div>
            </ScrollArea>
          </div>

          {/* User Input Area (Bottom) */}
          <div className="p-3 border-t border-white/[0.04] bg-zinc-950">
             {/* Error display */}
            {error && (
              <div className="mb-2 px-3 py-2 border border-red-500/20 bg-red-500/5 rounded-md">
                <p className="text-[11px] text-red-400">{error}</p>
              </div>
            )}
            
            <div className="flex overflow-hidden relative flex-col w-full rounded-xl border bg-white/[0.02] border-white/[0.08] focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
              <textarea
                ref={promptRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what to do next..."
                disabled={
                  isProcessing || isInitializing || backends.length === 0
                }
                className={cn(
                  "px-3 py-2 w-full h-20 text-sm bg-transparent resize-none text-zinc-200 focus:outline-none placeholder:text-zinc-600 disabled:opacity-50",
                )}
              />
              <div className="flex justify-between items-center px-3 py-2 border-t border-white/[0.04] bg-white/[0.01]">
                <div className="flex gap-3 items-center flex-1 mr-2 min-w-0">
                   <div className="flex items-center gap-2 flex-shrink-0">
                      <Label
                        className="text-[10px] text-zinc-500 cursor-pointer"
                        htmlFor="deterministic-toggle"
                      >
                        Deterministic
                      </Label>
                      <Switch
                        id="deterministic-toggle"
                        checked={deterministic}
                        onCheckedChange={setDeterministic}
                        className="scale-75 origin-left"
                      />
                    </div>
                  
                  <div className="w-[1px] h-4 bg-white/[0.08]" />

                  <Select
                    value={selectedBackend}
                    onValueChange={setSelectedBackend}
                  >
                    <SelectTrigger className="h-6 text-[10px] bg-transparent border-none text-zinc-500 hover:text-zinc-300 w-auto min-w-[100px] px-0 focus:ring-0">
                      <SelectValue placeholder="Select backend..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/[0.06]">
                      {backends.map((b) => (
                        <SelectItem
                          key={b.id}
                          value={b.id}
                          className="text-xs text-zinc-300"
                        >
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-1 items-center">
                  <Button
                    size="sm"
                    onClick={handleSubmitPrompt}
                    disabled={
                      !prompt.trim() ||
                      isProcessing ||
                      isInitializing ||
                      backends.length === 0
                    }
                    className="h-7 w-7 p-0 bg-emerald-600 hover:bg-emerald-500 text-white border-0 rounded-md ml-1"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
