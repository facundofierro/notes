"use client";

import * as React from "react";
import {
  cn,
  Button,
  Input,
  Label,
  ScrollArea,
  Card, CardContent,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Badge
} from "@agelum/shadcn";
import {
  ChevronLeft, Plus, Trash2, Save, Play, Loader2, GripVertical,
  ListChecks, Clock, Globe, Sparkles, Terminal
} from "lucide-react";
import { ExecutionHistory } from "./ExecutionHistory";
import { TestStepVisualizer } from "./TestStepVisualizer";
import type { TestStep, TestExecutionSummary } from "./types";

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

interface TestDetailViewProps {
  testId: string;
  executions: TestExecutionSummary[];
  executionsLoading: boolean;
  isRunning: boolean;
  onBack: () => void;
  onRun: (testId: string) => void;
  onSelectExecution: (executionId: string, testId: string) => void;
  fetchExecutions: (testId: string) => void;
}

export function TestDetailView({
  testId,
  executions,
  executionsLoading,
  isRunning,
  onBack,
  onRun,
  onSelectExecution,
  fetchExecutions,
}: TestDetailViewProps) {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [steps, setSteps] = React.useState<TestStep[]>([]);
  const [testName, setTestName] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"steps" | "history">("steps");

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingStepIndex, setEditingStepIndex] = React.useState<number | null>(null);
  const [currentStep, setCurrentStep] = React.useState<TestStep>({ action: "open" });

  // Fetch test data
  React.useEffect(() => {
    const fetchTest = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tests/${testId}`);
        if (res.ok) {
          const data = await res.json();
          setTestName(data.name || "Untitled Test");
          setSteps(data.steps || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
    fetchExecutions(testId);
  }, [testId, fetchExecutions]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/tests/${testId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: testName, steps }),
      });
      // Also update the index
      await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: testId, name: testName, steps }),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    await handleSave();
    onRun(testId);
  };

  // Step management
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
    setSteps(steps.filter((_, i) => i !== index));
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04] bg-zinc-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="w-7 h-7 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.05] flex-shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Input
            value={testName}
            onChange={e => setTestName(e.target.value)}
            className="font-medium text-sm border-none focus-visible:ring-0 bg-transparent text-zinc-200 h-8 px-2 max-w-[300px]"
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-0.5 border border-white/[0.04]">
          <button
            onClick={() => setActiveTab("steps")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200",
              activeTab === "steps"
                ? "bg-white/[0.08] text-zinc-200"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <ListChecks className="w-3.5 h-3.5" />
            Steps
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200",
              activeTab === "history"
                ? "bg-white/[0.08] text-zinc-200"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            History
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-7 text-xs text-zinc-400 hover:text-white"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button
            size="sm"
            onClick={handleRun}
            disabled={isRunning}
            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white border-0 rounded-lg"
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 mr-1.5" />
            )}
            {isRunning ? "Running..." : "Run"}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "steps" ? (
          <ScrollArea className="h-full">
            <div className="p-5 max-w-2xl mx-auto space-y-3">
              {steps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-white/[0.06] rounded-2xl">
                  <ListChecks className="w-6 h-6 text-zinc-600 mb-3" />
                  <p className="text-sm text-zinc-400 mb-1">No steps defined</p>
                  <p className="text-xs text-zinc-600 mb-4">Add steps to build your test scenario.</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addStep}
                    className="text-emerald-400 hover:text-emerald-300 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Add first step
                  </Button>
                </div>
              ) : (
                <>
                  {steps.map((step, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl",
                        "bg-white/[0.02] border border-white/[0.04]",
                        "hover:bg-white/[0.04] hover:border-white/[0.06] transition-all duration-200 group"
                      )}
                    >
                      <div className="w-6 h-6 rounded-lg bg-white/[0.04] flex items-center justify-center text-[10px] font-mono text-zinc-500 flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-white/[0.03] border-white/[0.06] text-zinc-400">
                            {step.action}
                          </Badge>
                          <span className="text-xs text-zinc-300 truncate">
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
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => editStep(index)}
                          className="w-6 h-6 text-zinc-500 hover:text-white hover:bg-white/[0.05]"
                        >
                          <svg width="12" height="12" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.8536 1.14645C11.6583 0.951184 11.3417 0.951184 11.1464 1.14645L3.71455 8.57836C3.62459 8.66832 3.55263 8.77461 3.50251 8.89291L2.16918 12.0396C2.04623 12.3297 2.32969 12.6132 2.61985 12.4902L5.76651 11.1569C5.88481 11.1068 5.9911 11.0348 6.08106 10.9449L13.5129 3.51296C13.7081 3.3177 13.7081 3.00111 13.5129 2.80585L11.8536 1.14645ZM4.42169 9.28547L11.5 2.20711L12.7929 3.5L5.71455 10.5784C5.74836 10.5332 5.76686 10.4913 5.76651 10.4902L2.61985 11.8236L3.95319 8.67691C3.95201 8.67656 3.91004 8.69506 3.86493 8.72887L4.42169 9.28547Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteStep(index)}
                          className="w-6 h-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {steps.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={addStep}
                  className="w-full border border-dashed border-white/[0.06] rounded-xl h-10 text-xs text-zinc-500 hover:text-zinc-300 hover:border-white/[0.1] hover:bg-white/[0.02]"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add Step
                </Button>
              )}
            </div>
          </ScrollArea>
        ) : (
          <ExecutionHistory
            executions={executions.filter(e => e.testId === testId)}
            loading={executionsLoading}
            onSelect={onSelectExecution}
            showTestName={false}
            className="h-full"
          />
        )}
      </div>

      {/* Step Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/[0.06]">
          <DialogHeader>
            <DialogTitle className="text-zinc-200">
              {editingStepIndex !== null ? "Edit Step" : "Add Step"}
            </DialogTitle>
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
                      className={cn(
                        "relative overflow-hidden cursor-pointer rounded-xl border transition-all duration-300 group active:scale-95",
                        isSelected
                          ? "bg-white/[0.06] border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.05)] ring-1 ring-white/10"
                          : "border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 hover:shadow-lg"
                      )}
                    >
                      <div className="p-3 flex flex-col items-center gap-2 text-center h-full justify-center">
                        <div className={cn(
                          "p-2 rounded-lg transition-colors duration-300",
                          isSelected ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-zinc-500 group-hover:text-zinc-200"
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className={cn(
                            "text-xs font-bold mb-0.5",
                            isSelected ? "text-zinc-100" : "text-zinc-400 group-hover:text-zinc-200"
                          )}>{t.label}</div>
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
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-white/[0.06]">Cancel</Button>
            <Button onClick={saveStep} className="bg-emerald-600 hover:bg-emerald-500 text-white border-0">Save Step</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
