import React, { useEffect, useState } from "react";
import { Annotation, AnnotationType, burnAnnotations } from "@agelum/annotation";
import { getSettings } from "../shared/storage";
import { createReport } from "../shared/api-client";
import { Camera, Square, ArrowRight, Trash2, Send, CheckCircle2, Loader2, X } from "lucide-react";

type AppState = "idle" | "capturing" | "annotating" | "prompting" | "submitting" | "success" | "error";

export default function App() {
  const [state, setState] = useState<AppState>("idle");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");

  useEffect(() => {
    const listener = (message: any) => {
      if (message.type === "INJECT_OVERLAY") {
        setScreenshot(message.screenshotDataUrl);
        setState("annotating");
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.url) setSourceUrl(tabs[0].url);
        });
      } else if (message.type === "ANNOTATIONS_COMPLETE") {
        setAnnotations(message.annotations);
        setDisplaySize({ width: message.displayWidth, height: message.displayHeight });
        setState("prompting");
      } else if (message.type === "OVERLAY_DISMISSED") {
        setState("idle");
        setScreenshot(null);
        setAnnotations([]);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleCapture = () => {
    setState("capturing");
    chrome.runtime.sendMessage({ type: "CAPTURE_TAB" });
  };

  const handleSetTool = (tool: AnnotationType) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        chrome.tabs.sendMessage(activeTab.id, { type: "SET_TOOL", tool });
      }
    });
  };

  const handleSubmit = async () => {
    setState("submitting");
    try {
      const settings = await getSettings();
      if (!settings.apiKey) throw new Error("API Key not configured. Open settings (popup) to set it up.");

      const burnedScreenshot = await burnAnnotations({
        screenshotDataUrl: screenshot!,
        annotations,
        displayWidth: displaySize.width,
        displayHeight: displaySize.height,
      });

      const description = annotations.map(a => `Annotation ${a.id}: ${a.prompt || "(no prompt)"}`).join("

");

      await createReport(settings, {
        repo: settings.projectRepo,
        title: title || "Issue from Chrome Plugin",
        description,
        screenshotDataUrl: burnedScreenshot,
        state: "fixes",
        sourceUrl,
      });

      setState("success");
    } catch (err: any) {
      setError(err.message);
      setState("error");
    }
  };

  return (
    <div className="flex flex-col h-screen dark bg-background text-foreground p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded flex items-center justify-center text-primary-foreground text-xs">A</div>
          Agelum
        </h1>
        <div className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
          state === "idle" ? "bg-secondary text-secondary-foreground" :
          state === "success" ? "bg-green-500/20 text-green-500" :
          "bg-blue-500/20 text-blue-500"
        }`}>
          {state}
        </div>
      </div>

      {state === "idle" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
            <Camera className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Start reporting</h2>
            <p className="text-sm text-muted-foreground">Capture a screenshot of the current tab to start</p>
          </div>
          <button 
            onClick={handleCapture}
            className="mt-2 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            <Camera className="w-4 h-4" />
            Capture Screenshot
          </button>
        </div>
      )}

      {state === "capturing" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Capturing tab...</p>
        </div>
      )}

      {state === "annotating" && (
        <div className="flex-1 flex flex-col gap-6">
          <div className="p-4 bg-secondary/50 rounded-xl border border-border">
            <h3 className="text-sm font-medium mb-3">Annotation Tools</h3>
            <div className="flex gap-2">
              <button onClick={() => handleSetTool("modify")} className="flex-1 flex flex-col items-center gap-2 p-3 bg-background border border-border rounded-lg hover:border-orange-500/50 hover:bg-orange-500/5 transition-all group">
                <Square className="w-5 h-5 text-orange-500" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground group-hover:text-foreground">Modify</span>
              </button>
              <button onClick={() => handleSetTool("arrow")} className="flex-1 flex flex-col items-center gap-2 p-3 bg-background border border-border rounded-lg hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group">
                <ArrowRight className="w-5 h-5 text-blue-500" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground group-hover:text-foreground">Arrow</span>
              </button>
              <button onClick={() => handleSetTool("remove")} className="flex-1 flex flex-col items-center gap-2 p-3 bg-background border border-border rounded-lg hover:border-red-500/50 hover:bg-red-500/5 transition-all group">
                <Trash2 className="w-5 h-5 text-red-500" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground group-hover:text-foreground">Remove</span>
              </button>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <p className="text-sm text-muted-foreground">Drawing annotations on the page...</p>
            <p className="text-xs text-muted-foreground/60 mt-2">Click "Done" on the page overlay when finished</p>
          </div>
        </div>
      )}

      {state === "prompting" && (
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Report Title</label>
            <input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Broken login button"
              className="bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Annotations ({annotations.length})</label>
            {annotations.map((ann, idx) => (
              <div key={ann.id} className="flex flex-col gap-2 p-3 bg-secondary/30 rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                    ann.type === "modify" ? "bg-orange-500" :
                    ann.type === "remove" ? "bg-red-500" :
                    "bg-blue-500"
                  }`}>
                    {ann.id}
                  </div>
                  <span className="text-xs font-medium capitalize">{ann.type}</span>
                </div>
                <textarea 
                  placeholder="What needs to change?"
                  className="bg-background border border-border rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary h-16 resize-none"
                  value={ann.prompt}
                  onChange={(e) => {
                    const newAnnotations = [...annotations];
                    newAnnotations[idx].prompt = e.target.value;
                    setAnnotations(newAnnotations);
                  }}
                />
              </div>
            ))}
          </div>

          <button 
            onClick={handleSubmit}
            className="mt-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity"
          >
            <Send className="w-4 h-4" />
            Create Task
          </button>
        </div>
      )}

      {state === "submitting" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Uploading report...</p>
        </div>
      )}

      {state === "success" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Report Created!</h2>
            <p className="text-sm text-muted-foreground">The task has been added to your project.</p>
          </div>
          <button 
            onClick={() => {
              setState("idle");
              setScreenshot(null);
              setAnnotations([]);
              setTitle("");
            }}
            className="mt-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg font-medium hover:bg-secondary/80 transition-all"
          >
            Create Another
          </button>
        </div>
      )}

      {state === "error" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-red-500">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mt-1">{error || "An unknown error occurred"}</p>
          </div>
          <button 
            onClick={() => setState("prompting")}
            className="mt-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
