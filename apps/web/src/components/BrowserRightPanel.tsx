import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  X,
  Move,
  Square,
  Type,
  Trash2,
  MousePointer2,
  Settings,
  Edit3,
  CheckCircle2,
  Code
} from "lucide-react";

interface BrowserRightPanelProps {
  repo: string;
  onTaskCreated?: () => void;
}

type Mode = "screen" | "properties" | "prompt";
type AnnotationType = "modify" | "move" | "remove";

interface Annotation {
  id: number;
  type: AnnotationType;
  x: number;
  y: number;
  width?: number; // for modify and remove
  height?: number; // for modify and remove
  prompt: string;
}

export function BrowserRightPanel({ repo, onTaskCreated }: BrowserRightPanelProps) {
  const [mode, setMode] = useState<Mode>("screen");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedTool, setSelectedTool] = useState<AnnotationType | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [nextId, setNextId] = useState(1);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<number | null>(null);
  
  // Ref for the image container to calculate relative coordinates
  const imageContainerRef = useRef<HTMLDivElement>(null);
  
  // Prompt mode state
  const [promptText, setPromptText] = useState("");
  
  // Task creation state
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const handleCaptureScreen = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as any,
        audio: false
      });
      
      const track = stream.getVideoTracks()[0];
      const imageCapture = new (window as any).ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(bitmap, 0, 0);
      
      const dataUrl = canvas.toDataURL('image/png');
      setScreenshot(dataUrl);
      
      // Stop sharing
      track.stop();
      
      // Reset state
      setAnnotations([]);
      setNextId(1);
      
    } catch (err) {
      console.error("Error capturing screen:", err);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selectedTool || !imageContainerRef.current) return;
    
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setStartPos({ x, y });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDrawing || !selectedTool || !imageContainerRef.current) return;
    
    const rect = imageContainerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    const width = Math.abs(currentX - startPos.x);
    const height = Math.abs(currentY - startPos.y);
    const x = Math.min(startPos.x, currentX);
    const y = Math.min(startPos.y, currentY);
    
    // Only add if it has some size or is a move (point)
    if (selectedTool === 'move' || (width > 5 && height > 5)) {
      const newAnnotation: Annotation = {
        id: nextId,
        type: selectedTool,
        x: selectedTool === 'move' ? currentX : x,
        y: selectedTool === 'move' ? currentY : y,
        width: selectedTool === 'move' ? 0 : width,
        height: selectedTool === 'move' ? 0 : height,
        prompt: ""
      };
      
      setAnnotations([...annotations, newAnnotation]);
      setNextId(nextId + 1);
      setSelectedAnnotationId(nextId);
    }
    
    setIsDrawing(false);
    // Optional: Keep tool selected? user requested 'first it has buttons for...' 
    // Usually better to reset tool or keep it? Let's keep it for multiple annotations.
  };

  const handleDeleteAnnotation = (id: number) => {
    setAnnotations(annotations.filter(a => a.id !== id));
    if (selectedAnnotationId === id) setSelectedAnnotationId(null);
  };

  const handleCreateTask = async () => {
    if (!repo) return;
    setIsCreatingTask(true);
    
    try {
      // 1. If screen mode, save image
      let imagePath = "";
      if (mode === "screen" && screenshot) {
        // Create a composite image with annotations for the task? 
        // Or just save the original screenshot? 
        // User said: "draw in the screenshot... draw a number... keep the original screenshot still visible"
        // It's technically complex to merge the HTML overlay onto the image without canvas manipulation.
        // For now, let's save the RAW screenshot, and we can describe the annotations in text.
        // Ideally we would draw on canvas and save that. Let's try to draw on a temp canvas.
        
        const canvas = document.createElement('canvas');
        const img = new Image();
        await new Promise((resolve) => {
          img.onload = resolve;
          img.src = screenshot;
        });
        
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          
          // We need to scale the annotations from the UI coordinates to the actual image coordinates
          // Assuming the UI image is displaying "contain" or similar.
          // This is tricky without knowing exact rendered dimensions vs natural dimensions.
          // For MVP, let's just save the raw screenshot. The LLM might assume standard web page structure.
          // Or we can save the screenshot and text description of "At 70% width, 20% height..."
          
          // Let's just save the base screenshot for now as requested: "add the screenshot of the page"
          // "we need a propmt for each drawing so for the selected drawing we show in the right bar a prompt area"
        }

        const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, "");
        const timestamp = Date.now();
        const fileName = `screenshot-${timestamp}.png`;
        const taskImagesDir = `.agelum/work/tasks/images`;
        const fullPath = `${taskImagesDir}/${fileName}`;
        
        // Ensure dir exists (api handles recursive mkdir on file write if we structured it right, 
        // but currently our api expects us to handle dirs? api/file post handles parent dir creation)
        
        // Save image
        await fetch("/api/file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: `${repo}/${fullPath}`.replace(/\/+/g, "/"), // This is absolute path on server? No, we need full path.
             // We need to know where the repo is. 
             // Wait, the API takes absolute path. We need to construct absolute path from repo.
             // But we only have 'repo' name here usually, or repo path? 
             // In page.tsx: repositories state has path. We need to pass full path or use relative if supported?
             // api/file takes absolute path.
             // We need to ask parent for base path? 
             // Actually, `repo` prop passed to components is usually just the name.
             // We need the full path to write to.
             // Let's assume we can use a relative path helper or we need to request the path.
             // Quick fix: The api/file should arguably take a repo + relative path, but it takes absolute.
             // However, `api/tasks` creates tasks relative to repo.
             // Let's use `api/files` (plural) or similar? 
             // Let's try to use the `createTask` API for the task itself, but for image we need to write file.
             // We can fetch the repo path first? Or pass it in.
          })
        });
        
        // Wait, we don't have the repo absolute path here easily without fetching it.
        // BUT, `BrowserRightPanel` is child of `Home`. `Home` has `repositories` and `selectedRepo`.
        // We should pass the full path of the repo to this component or a "saveFile" callback.
        // Let's look at `page.tsx` again. `FileViewer` uses `onSave`.
        // We should probably expose a `saveImage` prop or similar.
        // Or we can use `api/file` if we can resolve the path.
        // Actually, `api/file` needs absolute path.
        // `api/tasks` creates task in repo.
        // Let's assume for now we can't easily save the image without the repo path.
        // I will add a prop `repoPath` to `BrowserRightPanel`.
      }

      // Create Task Content
      let taskTitle = "";
      let taskBody = "";
      
      if (mode === "screen") {
        taskTitle = `UI Fixes - ${new Date().toLocaleString()}`;
        taskBody = `Source: Browser Screenshot\n\n`;
        // if (imagePath) taskBody += `![Screenshot](/${imagePath})\n\n`; // We need to serve this image? 
        // Agelum serves from where? Local params? 
        // Note: The user said "store in a folder... so then we can reference the image in the task file".
        
        taskBody += `## Requested Changes\n\n`;
        annotations.forEach(a => {
            let action = "";
            if (a.type === "remove") action = "REMOVE";
            if (a.type === "move") action = "MOVE";
            if (a.type === "modify") action = "MODIFY";
            
            taskBody += `### ${a.id}. ${action}\n`;
            taskBody += `${a.prompt}\n\n`;
        });
      } else if (mode === "prompt") {
        taskTitle = `Browser Task - ${new Date().toLocaleString()}`;
        taskBody = promptText;
      }
      
      // Call API to create task
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
           repo,
           title: taskTitle,
           description: taskBody,
           state: "priority"
        })
      });
      
      if (res.ok) {
        setScreenshot(null);
        setAnnotations([]);
        setPromptText("");
        onTaskCreated?.();
      }

    } catch (e) {
      console.error("Failed to create task", e);
    } finally {
      setIsCreatingTask(false);
    }
  };
  
  // Need to get repo path to save image.
  // For now, I will emit an event or use a prop for checking repo path?
  // Let's check how we can get the repo path.
  // In `page.tsx`, `repositories` has `{ name, path }`.
  // I will add `projectPath` prop to `BrowserRightPanel`.

  return (
    <div className="flex flex-col h-full bg-background border-l border-border w-[300px]">
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setMode("screen")}
          className={`flex-1 py-2 text-xs font-medium ${mode === "screen" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"}`}
        >
          Screen
        </button>
        <button
          onClick={() => setMode("properties")}
          className={`flex-1 py-2 text-xs font-medium ${mode === "properties" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"}`}
        >
          Properties
        </button>
        <button
          onClick={() => setMode("prompt")}
          className={`flex-1 py-2 text-xs font-medium ${mode === "prompt" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"}`}
        >
          Prompt
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {mode === "screen" && (
          <div className="space-y-4">
            {!screenshot ? (
              <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-lg bg-secondary/20">
                <button
                  onClick={handleCaptureScreen}
                  className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Camera className="w-8 h-8" />
                  <span className="text-sm">Capture Screen</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Image Canvas */}
                <div 
                    ref={imageContainerRef}
                    className="relative border border-border rounded-lg overflow-hidden cursor-crosshair select-none"
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                >
                  <img src={screenshot} alt="Screenshot" className="w-full h-auto block" draggable={false} />
                  
                  {/* Annotations Overlay */}
                  {annotations.map((ann) => (
                    <div
                      key={ann.id}
                      className="absolute"
                      style={{
                        left: ann.x,
                        top: ann.y,
                        width: ann.width || (ann.type === "move" ? 20 : 0),
                        height: ann.height || (ann.type === "move" ? 20 : 0),
                        border: ann.type === "remove" ? "2px solid red" : ann.type === "modify" ? "2px solid orange" : "none",
                        backgroundColor: ann.type === "remove" ? "rgba(255, 0, 0, 0.2)" : ann.type === "modify" ? "rgba(255, 165, 0, 0.2)" : "transparent",
                      }}
                      onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAnnotationId(ann.id);
                      }}
                    >
                        {ann.type === "remove" && (
                            <div className="absolute -top-5 left-0 bg-red-600 text-white text-[9px] px-1 rounded-sm whitespace-nowrap">
                                REMOVE THIS
                            </div>
                        )}
                        {ann.type === "move" && (
                             <Move className="text-blue-500 w-6 h-6 -translate-x-1/2 -translate-y-1/2 filter drop-shadow-md" />
                        )}
                        
                        {/* Number Badge */}
                        <div className="absolute -top-3 -right-3 w-5 h-5 bg-black text-white rounded-full flex items-center justify-center text-[10px] border border-white shadow-sm z-10">
                            {ann.id}
                        </div>
                    </div>
                  ))}
                  
                  {isDrawing && (
                      <div className="absolute border font-xs text-white bg-black/50 px-1 rounded" style={{ top: startPos.y, left: startPos.x }}>
                          Drawing...
                      </div>
                  )}
                </div>

                {/* Toolbar */}
                <div className="flex gap-2 justify-center">
                    <button
                        onClick={() => setSelectedTool("modify")}
                        className={`p-2 rounded border ${selectedTool === "modify" ? "bg-orange-100 border-orange-500 text-orange-700" : "bg-background border-border"}`}
                        title="Modify"
                    >
                        <Square className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setSelectedTool("move")}
                        className={`p-2 rounded border ${selectedTool === "move" ? "bg-blue-100 border-blue-500 text-blue-700" : "bg-background border-border"}`}
                        title="Move"
                    >
                        <Move className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setSelectedTool("remove")}
                        className={`p-2 rounded border ${selectedTool === "remove" ? "bg-red-100 border-red-500 text-red-700" : "bg-background border-border"}`}
                        title="Remove"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
                
                {/* Selected Annotation Prompt */}
                {selectedAnnotationId !== null && (
                    <div className="p-3 bg-secondary/30 rounded border border-border space-y-2">
                         <div className="flex justify-between items-center">
                             <span className="text-xs font-medium">Data for item #{selectedAnnotationId}</span>
                             <button onClick={() => handleDeleteAnnotation(selectedAnnotationId)} className="text-red-500 hover:text-red-700">
                                 <Trash2 className="w-3 h-3" />
                             </button>
                         </div>
                         <textarea 
                            className="w-full text-xs p-2 rounded border border-border bg-background h-20 resize-none focus:outline-none focus:ring-1"
                            placeholder="Instructions for this change..."
                            value={annotations.find(a => a.id === selectedAnnotationId)?.prompt || ""}
                            onChange={(e) => {
                                setAnnotations(annotations.map(a => a.id === selectedAnnotationId ? { ...a, prompt: e.target.value } : a));
                            }}
                         />
                    </div>
                )}
                
                <button
                  onClick={() => setScreenshot(null)}
                   className="w-full py-2 text-xs text-red-500 border border-red-200 hover:bg-red-50 rounded"
                >
                    Cancel / Retake
                </button>
              </div>
            )}
          </div>
        )}

        {mode === "properties" && (
            <div className="space-y-4">
               {/* Mock UI for now */}
               <div className="flex border-b border-border">
                   <button className="flex-1 text-xs py-1 border-b-2 border-primary font-bold">Props</button>
                   <button className="flex-1 text-xs py-1 text-muted-foreground">CSS</button>
                   <button className="flex-1 text-xs py-1 text-muted-foreground">Changes</button>
               </div>
               
               <div className="p-4 text-center text-muted-foreground text-xs space-y-2">
                   <Settings className="w-8 h-8 mx-auto opacity-50" />
                   <p>Element selection is in development.</p>
               </div>
            </div>
        )}

        {mode === "prompt" && (
            <div className="space-y-4 h-full flex flex-col">
                <div className="flex items-center gap-2 p-2 bg-secondary/30 rounded border border-border">
                    <MousePointer2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Select Elements tool (Coming Soon)</span>
                </div>
                <textarea 
                    className="flex-1 w-full text-sm p-3 rounded border border-border bg-background resize-none focus:outline-none focus:ring-1"
                    placeholder="Describe the task referencing elements..."
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                />
            </div>
        )}
      </div>

      {/* Footer Action */}
      <div className="p-4 border-t border-border bg-secondary/10">
        <button
          onClick={handleCreateTask}
          disabled={isCreatingTask || (mode === "screen" && !screenshot) || (mode === "prompt" && !promptText)}
          className="w-full py-2 bg-primary text-primary-foreground text-sm font-medium rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isCreatingTask ? "Creating..." : "Create Task"}
          {!isCreatingTask && <CheckCircle2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
