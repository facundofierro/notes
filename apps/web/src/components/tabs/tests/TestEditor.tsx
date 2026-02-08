
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
import { ChevronLeft, Plus, Trash2, Save, Play, Image as ImageIcon, Terminal } from "lucide-react";

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
  { value: "open", label: "Open URL" },
  { value: "click", label: "Click" },
  { value: "type", label: "Type Text" },
  { value: "wait", label: "Wait" },
  { value: "snapshot", label: "Snapshot (AI)" },
  { value: "prompt", label: "AI Prompt" },
  { value: "verifyVisible", label: "Verify Visible" },
  { value: "screenshot", label: "Screenshot" },
  { value: "setViewport", label: "Set Viewport" },
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

  React.useEffect(() => {
    fetchTest();
  }, [testId]);

  const fetchTest = async () => {
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
  };

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
    setCurrentStep({ action: "click" });
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
      case "click":
      case "check":
      case "hover":
      case "verifyVisible":
        return (
          <div className="space-y-2">
            <Label>Selector / Ref</Label>
            <Input 
                value={currentStep.selector || ""} 
                onChange={e => updateCurrentStep("selector", e.target.value)} 
                placeholder="@e1 or #submit-btn or text=Submit"
            />
          </div>
        );
      case "type":
        return (
            <>
              <div className="space-y-2">
                <Label>Selector / Ref</Label>
                <Input 
                    value={currentStep.selector || ""} 
                    onChange={e => updateCurrentStep("selector", e.target.value)} 
                    placeholder="@input or #email"
                />
              </div>
              <div className="space-y-2">
                <Label>Valid Text</Label>
                <Input 
                    value={currentStep.text || ""} 
                    onChange={e => updateCurrentStep("text", e.target.value)} 
                    placeholder="Hello World"
                />
              </div>
            </>
        );
      case "wait":
        return (
            <>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select 
                    value={currentStep.type || "time"} 
                    onValueChange={v => updateCurrentStep("type", v)}
                >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="time">Time (ms)</SelectItem>
                        <SelectItem value="element">Element</SelectItem>
                        <SelectItem value="url">URL</SelectItem>
                    </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Value</Label>
                <Input 
                    value={currentStep.value || ""} 
                    onChange={e => updateCurrentStep("value", e.target.value)} 
                    placeholder="1000 or #element"
                />
              </div>
            </>
        );
      case "prompt":
        return (
            <div className="space-y-2">
                <Label>Instruction</Label>
                <Input 
                    value={currentStep.instruction || ""} 
                    onChange={e => updateCurrentStep("instruction", e.target.value)} 
                    placeholder="Click the blue button and wait for modal"
                />
            </div>
        );
      case "screenshot":
        return (
            <div className="space-y-2">
                <Label>Name (optional)</Label>
                <Input 
                    value={currentStep.name || ""} 
                    onChange={e => updateCurrentStep("name", e.target.value)} 
                    placeholder="login-page"
                />
            </div>
        );
      case "setViewport":
        return (
            <div className="flex gap-4">
                <div className="space-y-2 flex-1">
                    <Label>Width</Label>
                    <Input 
                        type="number"
                        value={currentStep.width || 1280} 
                        onChange={e => updateCurrentStep("width", parseInt(e.target.value || "0"))} 
                    />
                </div>
                <div className="space-y-2 flex-1">
                    <Label>Height</Label>
                    <Input 
                        type="number"
                        value={currentStep.height || 720} 
                        onChange={e => updateCurrentStep("height", parseInt(e.target.value || "0"))} 
                    />
                </div>
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
                                        {step.action === "click" && step.selector}
                                        {step.action === "type" && `${step.selector} = "${step.text}"`}
                                        {step.action === "prompt" && step.instruction}
                                        {step.action === "wait" && `${step.type}: ${step.value}`}
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
                <div className="space-y-2">
                    <Label>Action</Label>
                    <Select 
                        value={currentStep.action} 
                        onValueChange={v => updateCurrentStep("action", v)}
                    >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {STEP_TYPES.map(t => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
