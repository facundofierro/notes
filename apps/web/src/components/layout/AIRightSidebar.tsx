"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {
  Terminal,
  Play,
  AtSign,
  Image as ImageIcon,
  Mic,
  Copy,
  Search,
  X,
  ChevronDown,
  Globe,
  Monitor,
  Loader2,
} from "lucide-react";
import { usePromptBuilder, PromptBuilderOptions } from "@/hooks/usePromptBuilder";
import { inferTestExecutionStatus } from "@/lib/test-output";
import { useHomeStore } from "@/store/useHomeStore";

const TerminalViewer = dynamic(
  () => import("@/components/features/terminal/TerminalViewer").then((mod) => mod.TerminalViewer),
  { ssr: false }
);

interface AIRightSidebarProps {
  selectedRepo: string | null;
  basePath: string;
  projectPath?: string | null;
  agentTools: Array<{ name: string; displayName: string; available: boolean; type?: string }>;
  viewMode: string;
  file?: { path: string } | null;
  workDocIsDraft?: boolean;
  testViewMode?: "steps" | "code" | "results";
  testOutput?: string;
  isTestRunning?: boolean;
  onRunTest?: (path: string) => void;
  className?: string;
  contextKey?: string;
}

export function AIRightSidebar({
  selectedRepo,
  basePath,
  projectPath,
  agentTools,
  viewMode,
  file,
  workDocIsDraft,
  testViewMode = "code",
  testOutput = "",
  isTestRunning = false,
  onRunTest,
  className = "",
  contextKey = "",
}: AIRightSidebarProps) {
  const { buildToolPrompt } = usePromptBuilder();
  const { registerTerminalSession, updateTerminalSession, removeTerminalSession, getTerminalSessionForContext, setTabFile, setSelectedFile } = useHomeStore();
  const terminalAbortControllerRef = React.useRef<AbortController | null>(null);
  const recognitionRef = React.useRef<any>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const reconnectAttemptedRef = React.useRef<string | null>(null);

  const [rightSidebarView, setRightSidebarView] = React.useState<"prompt" | "terminal" | "iframe">("prompt");
  const [terminalOutput, setTerminalOutput] = React.useState("");
  const [isTerminalRunning, setIsTerminalRunning] = React.useState(false);
  const [terminalToolName, setTerminalToolName] = React.useState("");
  const [terminalProcessId, setTerminalProcessId] = React.useState<string | null>(null);
  const [iframeUrl, setIframeUrl] = React.useState("");
  const [isOpenCodeWebLoading, setIsOpenCodeWebLoading] = React.useState(false);
  const [openCodeWebLoadingLabel, setOpenCodeWebLoadingLabel] = React.useState("");
  const [openCodeWebError, setOpenCodeWebError] = React.useState("");
  const [pendingOpenCodeWebMessage, setPendingOpenCodeWebMessage] = React.useState<any>(null);
  const [promptMode, setPromptMode] = React.useState<"agent" | "plan" | "chat">("agent");
  const [docAiMode, setDocAiMode] = React.useState<"modify" | "start" | "plan">("modify");
  const docAiModeRef = React.useRef(docAiMode);
  React.useEffect(() => { docAiModeRef.current = docAiMode; }, [docAiMode]);

  const [prompts, setPrompts] = React.useState<{ modify: string; start: string; plan: string }>({
    modify: "",
    start: "Let's work on this task",
    plan: "",

  });
  const promptText = prompts[docAiMode];

  const setPromptText = React.useCallback((value: string | ((prev: string) => string)) => {
    setPrompts((prev) => {
      const mode = docAiModeRef.current;
      const current = prev[mode];
      const next = typeof value === "function" ? value(current) : value;
      return { ...prev, [mode]: next };
    });
  }, []);
  const [isRecording, setIsRecording] = React.useState(false);
  const [filePickerOpen, setFilePickerOpen] = React.useState(false);
  const [fileSearch, setFileSearch] = React.useState("");
  const [allFiles, setAllFiles] = React.useState<any[]>([]);
  const [fileMap, setFileMap] = React.useState<Record<string, string>>({});
  const [toolModelsByTool, setToolModelsByTool] = React.useState<Record<string, string[]>>({});
  const [toolModelByTool, setToolModelByTool] = React.useState<Record<string, string>>({});
  const [isToolModelsLoading, setIsToolModelsLoading] = React.useState<Record<string, boolean>>({});
  // Use larger default to accommodate wide terminals before onResize fires
  const [termSize, setTermSize] = React.useState({ cols: 300, rows: 60 });
  const [allowModify, setAllowModify] = React.useState(false);
  const [loadingIndicatorVisible, setLoadingIndicatorVisible] = React.useState(false);

  // Helper to trigger loading indicator
  const triggerLoadingIndicator = React.useCallback(() => {
    setLoadingIndicatorVisible(true);
    setTimeout(() => {
      setLoadingIndicatorVisible(false);
    }, 10000);
  }, []);

  const refreshCurrentFile = React.useCallback(async () => {
    if (!file?.path) return;
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(file.path)}`);
      if (res.ok) {
        const data = await res.json();
        if (["tasks", "epics", "ideas"].includes(viewMode)) {
          setTabFile(viewMode, { path: file.path, content: data.content });
        } else {
          setSelectedFile({ path: file.path, content: data.content });
        }
      }
    } catch (error) {
      console.error("Failed to refresh file:", error);
    }
  }, [file, viewMode, setTabFile, setSelectedFile]);

  const reconnectToSession = React.useCallback(async (processId: string, toolName: string) => {
    terminalAbortControllerRef.current?.abort();
    const controller = new AbortController();
    terminalAbortControllerRef.current = controller;

    setTerminalToolName(toolName);
    setTerminalOutput("");
    setTerminalProcessId(processId);
    setTerminalProcessId(processId);
    setRightSidebarView("terminal");
    triggerLoadingIndicator();

    try {
      const statusRes = await fetch(`/api/terminal?id=${processId}&action=status`);
      if (!statusRes.ok) {
        if (contextKey) removeTerminalSession(processId);
        setRightSidebarView("prompt");
        return;
      }
      const status = await statusRes.json();
      setIsTerminalRunning(status.alive);

      const res = await fetch(`/api/terminal?id=${processId}`, {
        signal: controller.signal,
      });

      const reader = res.body?.getReader();
      if (!reader) {
        setTerminalOutput("Failed to reconnect");
        setIsTerminalRunning(false);
        return;
      }

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) setTerminalOutput((prev) => prev + chunk);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        setTerminalOutput((prev) => `${prev}\nReconnect error: ${error.message}`);
      }
    } finally {
      if (terminalAbortControllerRef.current === controller) {
        terminalAbortControllerRef.current = null;
      }
      setIsTerminalRunning(false);
      if (contextKey) updateTerminalSession(processId, { isRunning: false });
    }
  }, [contextKey, removeTerminalSession, updateTerminalSession, triggerLoadingIndicator]);

  React.useEffect(() => {
    if (!contextKey) return;
    const session = getTerminalSessionForContext(contextKey);
    if (!session || !session.isRunning) return;
    if (reconnectAttemptedRef.current === session.processId) return;
    reconnectAttemptedRef.current = session.processId;
    reconnectToSession(session.processId, session.toolName);
  }, [contextKey, getTerminalSessionForContext, reconnectToSession]);

  const cancelTerminal = React.useCallback(() => {
    terminalAbortControllerRef.current?.abort();
    terminalAbortControllerRef.current = null;
    if (terminalProcessId && contextKey) {
      updateTerminalSession(terminalProcessId, { isRunning: false });
    }
    setIsTerminalRunning(false);
    setLoadingIndicatorVisible(false);
    setTerminalProcessId(null);
    setTerminalOutput((prev) => (prev ? `${prev}

Cancelled` : "Cancelled"));
    setRightSidebarView("prompt");
    if (docAiMode === "modify") {
      refreshCurrentFile();
    }
  }, [terminalProcessId, contextKey, updateTerminalSession, refreshCurrentFile, docAiMode]);

  const openInteractiveTerminal = React.useCallback(async () => {
    const cwd = projectPath || (basePath && selectedRepo ? `${basePath}/${selectedRepo}`.replace(/\/+/g, "/") : undefined);

    setTerminalToolName("Interactive Terminal");
    setTerminalOutput("");
    setTerminalProcessId(null);
    setIsTerminalRunning(true);
    setIsTerminalRunning(true);
    setRightSidebarView("terminal");
    triggerLoadingIndicator();

    // Calculate expected terminal dimensions based on container size
    // Terminal sidebar is 50% width when running, with p-3 padding (12px each side)
    const expectedWidth = (window.innerWidth * 0.5) - 48; // 24px padding + 24px buffer
    const expectedHeight = window.innerHeight - 200; // Approximate usable height
    const charWidth = 7.2; // Typical monospace char width for 12px font
    const charHeight = 18; // Typical line height
    const calculatedCols = Math.floor(expectedWidth / charWidth);
    const calculatedRows = Math.floor(expectedHeight / charHeight);

    // Use calculated dimensions or fall back to current termSize
    const cols = calculatedCols > 0 ? calculatedCols : termSize.cols;
    const rows = calculatedRows > 0 ? calculatedRows : termSize.rows;

    terminalAbortControllerRef.current = new AbortController();
    const ac = terminalAbortControllerRef.current;
    let localProcessId: string | null = null;

    try {
      const res = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cwd,
          cols,
          rows,
          allowModify
        }),
        signal: ac.signal,
      });

      const processId = res.headers.get("X-Agent-Process-ID");
      localProcessId = processId;
      if (processId) {
        setTerminalProcessId(processId);
        if (contextKey) {
          registerTerminalSession({
            processId,
            toolName: "Interactive Terminal",
            contextKey,
            isRunning: true,
            startedAt: Date.now(),
          });
        }
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setTerminalOutput("Failed to open terminal");
        setIsTerminalRunning(false);
        return;
      }

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) setTerminalOutput((prev) => prev + chunk);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        setTerminalOutput((prev) => `${prev}
Error: ${error.message}`);
      }
    } finally {
      if (terminalAbortControllerRef.current === ac) {
        terminalAbortControllerRef.current = null;
      }
      setIsTerminalRunning(false);
      setLoadingIndicatorVisible(false);
      if (localProcessId && contextKey) {
        updateTerminalSession(localProcessId, { isRunning: false });
      }
    }
  }, [selectedRepo, basePath, projectPath, contextKey, registerTerminalSession, updateTerminalSession, termSize.cols, termSize.rows, triggerLoadingIndicator]);

  const handleTerminalInput = React.useCallback(async (data: string) => {
    if (!terminalProcessId) return;
    try {
      await fetch("/api/agents/input", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: terminalProcessId, data }),
      });
    } catch (error) {
      console.error("Failed to send input:", error);
    }
  }, [terminalProcessId]);

  const runTool = React.useCallback(async (toolName: string) => {
    const trimmedPrompt = promptText.trim();
    if (!trimmedPrompt) return;

    terminalAbortControllerRef.current?.abort();
    const controller = new AbortController();
    terminalAbortControllerRef.current = controller;

    setTerminalToolName(toolName);
    setTerminalOutput("");
    setTerminalProcessId(null);
    setIsTerminalRunning(true);
    setIsTerminalRunning(true);
    setRightSidebarView("terminal");
    triggerLoadingIndicator();

    // Calculate expected terminal dimensions based on container size
    // Terminal sidebar is 50% width when running, with p-3 padding (12px each side)
    const expectedWidth = (window.innerWidth * 0.5) - 48; // 24px padding + 24px buffer
    const expectedHeight = window.innerHeight - 200; // Approximate usable height
    const charWidth = 7.2; // Typical monospace char width for 12px font
    const charHeight = 18; // Typical line height
    const calculatedCols = Math.floor(expectedWidth / charWidth);
    const calculatedRows = Math.floor(expectedHeight / charHeight);

    // Use calculated dimensions or fall back to current termSize
    const cols = calculatedCols > 0 ? calculatedCols : termSize.cols;
    const rows = calculatedRows > 0 ? calculatedRows : termSize.rows;

    const rawPrompt = buildToolPrompt({
      promptText: trimmedPrompt,
      mode: promptMode,
      docMode: docAiMode,
      file: file ? { path: file.path } : undefined,
      viewMode: viewMode as any,
      testContext: viewMode === "tests" ? {
        testViewMode,
        testOutput,
        testStatus: inferTestExecutionStatus(testOutput, isTestRunning),
      } : undefined,
      selectedRepo,
    } as PromptBuilderOptions);

    let prompt = rawPrompt;
    Object.entries(fileMap).forEach(([name, path]) => {
      prompt = prompt.split(`@${name}`).join(path);
    });

    const cwd = projectPath || (basePath && selectedRepo ? `${basePath}/${selectedRepo}`.replace(/\/+/g, "/") : undefined);

    try {
      if (agentTools.find(t => t.name === toolName)?.type === "web") {
        setRightSidebarView("iframe");
        setIframeUrl("");
        setOpenCodeWebError("");
        setIsOpenCodeWebLoading(true);
        setOpenCodeWebLoadingLabel(`Starting ${toolName}...`);
        setPendingOpenCodeWebMessage(null);

        let apiPath = `/api/${toolName.toLowerCase().replace("-web", "")}`;
        const params = new URLSearchParams();
        let fullPath = "";
        const nextFullPath = projectPath || (basePath && selectedRepo ? `${basePath}/${selectedRepo}`.replace(/\/+/g, "/") : "");
        if (nextFullPath) {
          fullPath = nextFullPath;
          params.set("path", nextFullPath);
        }
        if (trimmedPrompt) {
          params.set("deferPrompt", "1");
          params.set("createSession", "1");
        }
        const queryString = params.toString();
        if (queryString) apiPath += `?${queryString}`;
        
        const res = await fetch(apiPath);
        const data = await res.json();
        if (data?.url) {
          setIframeUrl(data.url);
          setOpenCodeWebLoadingLabel(`Loading ${toolName}...`);
          if (trimmedPrompt && data?.sessionId) {
            setPendingOpenCodeWebMessage({
              sessionId: data.sessionId,
              prompt: trimmedPrompt,
              path: fullPath || undefined,
            });
          }
        } else {
          setIsOpenCodeWebLoading(false);
          setOpenCodeWebError(`Failed to open ${toolName}`);
        }
        return;
      }

      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: toolName,
          prompt,
          model: toolModelByTool[toolName] || undefined,
          cwd,
          cols,
          rows,
          allowModify
        }),
        signal: controller.signal,
      });

      const processId = res.headers.get("X-Agent-Process-ID");
      if (processId) {
        setTerminalProcessId(processId);
        if (contextKey) {
          registerTerminalSession({
            processId,
            toolName,
            contextKey,
            isRunning: true,
            startedAt: Date.now(),
          });
        }
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setTerminalOutput(res.ok ? "" : await res.text().catch(() => "Tool execution failed"));
        return;
      }

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) setTerminalOutput((prev) => prev + chunk);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setTerminalOutput((prev) => prev ? `${prev}

Cancelled` : "Cancelled");
        return;
      }
      setTerminalOutput("Tool execution failed");
    } finally {
      if (terminalAbortControllerRef.current === controller) {
        terminalAbortControllerRef.current = null;
      }
      setIsTerminalRunning(false);
      setLoadingIndicatorVisible(false);
      if (contextKey && terminalProcessId) {
        updateTerminalSession(terminalProcessId, { isRunning: false });
      }
    }
  }, [file, promptText, promptMode, docAiMode, viewMode, testViewMode, testOutput, isTestRunning, selectedRepo, fileMap, basePath, projectPath, toolModelByTool, buildToolPrompt, contextKey, registerTerminalSession, updateTerminalSession, terminalProcessId, agentTools, termSize.cols, termSize.rows, triggerLoadingIndicator]);

  const ensureModelsForTool = React.useCallback(async (toolName: string) => {
    if (toolModelsByTool[toolName] || isToolModelsLoading[toolName]) return;
    setIsToolModelsLoading(prev => ({ ...prev, [toolName]: true }));
    try {
      const res = await fetch(`/api/agents?action=models&tool=${encodeURIComponent(toolName)}`);
      const data = await res.json();
      const models = Array.isArray(data.models) ? data.models : [];
      setToolModelsByTool(prev => ({ ...prev, [toolName]: models }));
      if (models.length > 0 && toolModelByTool[toolName] === undefined) {
        setToolModelByTool(prev => ({ ...prev, [toolName]: models[0] }));
      }
    } catch {
      setToolModelsByTool(prev => ({ ...prev, [toolName]: [] }));
    } finally {
      setIsToolModelsLoading(prev => ({ ...prev, [toolName]: false }));
    }
  }, [toolModelsByTool, isToolModelsLoading, toolModelByTool]);

  const fetchFiles = React.useCallback(async () => {
    if (!selectedRepo) return;
    try {
      const res = await fetch(`/api/files?repo=${selectedRepo}`);
      const data = await res.json();
      const flatten = (nodes: any[]): any[] => nodes.reduce((acc, node) => {
        if (node.type === "file") acc.push({ name: node.name, path: node.path });
        else if (node.children) acc.push(...flatten(node.children));
        return acc;
      }, []);
      if (data.tree?.children) setAllFiles(flatten(data.tree.children));
    } catch (error) {
      console.error("Failed to fetch files:", error);
    }
  }, [selectedRepo]);

  const handleRecordAudio = React.useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript) setPromptText(prev => prev ? `${prev} ${finalTranscript}` : finalTranscript);
    };
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
  }, [isRecording, setPromptText]);

  const handleFileUpload = React.useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.path) {
        setPromptText(prev => prev ? `${prev}
![${data.name}](${data.path})` : `![${data.name}](${data.path})`);
      }
    } catch (error) {
      console.error("Upload failed:", error);
    }
  }, [setPromptText]);

  const handleCopyFullPrompt = React.useCallback(() => {
    const prompt = buildToolPrompt({
      promptText,
      mode: promptMode,
      docMode: docAiMode,
      file: file ? { path: file.path } : undefined,
      viewMode: viewMode as any,
      testContext: viewMode === "tests" ? {
        testViewMode,
        testOutput,
        testStatus: inferTestExecutionStatus(testOutput, isTestRunning),
      } : undefined,
      selectedRepo,
    } as PromptBuilderOptions);
    let finalPrompt = prompt;
    Object.entries(fileMap).forEach(([name, path]) => {
      finalPrompt = finalPrompt.split(`@${name}`).join(path);
    });
    navigator.clipboard.writeText(finalPrompt);
  }, [file, promptText, promptMode, docAiMode, viewMode, testViewMode, testOutput, isTestRunning, selectedRepo, fileMap, buildToolPrompt]);

  const isWide = (rightSidebarView === "terminal" && isTerminalRunning) || rightSidebarView === "iframe";

  return (
    <div className={`flex overflow-hidden flex-col bg-background border-l border-border transition-all duration-300 ${ isWide ? "w-[50%]" : "w-[360px]" } ${className}`}>
        {/* Terminal View */}
        <div className={`flex overflow-hidden flex-col flex-1 h-full ${ rightSidebarView === "terminal" ? "" : "hidden" }`}>
          <div className="flex-1 min-h-0 bg-black relative">
            {(terminalOutput || isTerminalRunning) ? (
              <>
                <TerminalViewer 
                  output={terminalOutput} 
                  className="w-full h-full" 
                  onInput={handleTerminalInput}
                  onResize={(cols, rows) => setTermSize({ cols, rows })}
                  autoFocus={rightSidebarView === "terminal"}
                />
                {loadingIndicatorVisible && isTerminalRunning && (
                   <div className="absolute bottom-4 right-4 z-10 bg-zinc-900/80 text-xs text-zinc-400 px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10 shadow-lg backdrop-blur-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Initializing env...</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-center items-center h-full text-xs text-muted-foreground">No terminal output</div>
            )}
          </div>
          <div className="flex gap-2 p-2 border-t border-border">
            {isTerminalRunning && (
              <>
                <button onClick={() => handleTerminalInput('\u001b')} className="flex-1 px-3 py-2 text-sm text-white rounded-xl border border-yellow-800 bg-yellow-900/50 hover:bg-yellow-900">Stop</button>
                <button onClick={cancelTerminal} className="flex-1 px-3 py-2 text-sm text-white rounded-xl border border-red-800 bg-red-900/50 hover:bg-red-900">Close</button>
              </>
            )}
            <button onClick={() => { setRightSidebarView("prompt"); if (docAiMode === "modify") refreshCurrentFile(); }} className="flex-1 px-3 py-2 text-sm text-white rounded-xl border bg-secondary border-border hover:bg-accent">
              {isTerminalRunning ? "Return to Prompt" : "Back to Prompt"}
            </button>
          </div>
        </div>

        {/* Iframe View */}
        <div className={`flex overflow-hidden flex-col flex-1 h-full ${ rightSidebarView === "iframe" ? "" : "hidden" }`}>
          <div className="relative flex-1 min-h-0 bg-black">
            {iframeUrl ? (
              <iframe
                src={iframeUrl}
                className="w-full h-full bg-black border-0"
                onLoad={() => {
                  setIsOpenCodeWebLoading(false);
                  if (pendingOpenCodeWebMessage) {
                    setPendingOpenCodeWebMessage(null);
                    fetch("/api/opencode/message", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(pendingOpenCodeWebMessage),
                    }).catch(() => {});
                  }
                }}
              />
            ) : (
              <div className="flex justify-center items-center h-full text-xs text-muted-foreground">{openCodeWebError || "No URL loaded"}</div>
            )}
            {isOpenCodeWebLoading && (
              <div className="flex absolute inset-0 flex-col gap-3 justify-center items-center bg-black">
                <div className="w-6 h-6 rounded-full border-2 animate-spin border-muted-foreground border-t-transparent" />
                <div className="text-xs text-muted-foreground">{openCodeWebLoadingLabel || "Loading…"}</div>
              </div>
            )}
          </div>
          <div className="flex justify-end p-2 border-t border-border">
            <button onClick={() => setRightSidebarView("prompt")} className="px-3 py-2 w-full text-sm text-white rounded border bg-secondary border-border hover:bg-accent">Return to Prompt</button>
          </div>
        </div>

        {/* Prompt View */}
        <div className={`flex overflow-hidden flex-col flex-1 ${ rightSidebarView === "prompt" ? "" : "hidden" }`}>
          <div className="flex gap-2 p-3 border-b border-border">
            {viewMode === "tests" && file ? (
              <button
                onClick={() => onRunTest?.(file.path)}
                disabled={isTestRunning}
                className="flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-lg border border-border bg-background text-foreground hover:bg-secondary hover:text-white disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                {isTestRunning ? "Running…" : "Run test"}
              </button>
            ) : viewMode === "ai" || workDocIsDraft ? (
              <button
                onClick={openInteractiveTerminal}
                disabled={isTerminalRunning}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background text-foreground hover:bg-secondary hover:text-white disabled:opacity-50"
              >
                <Terminal className="w-3.5 h-3.5" />
                Terminal
              </button>
            ) : (
              <div className="flex flex-1 p-1 rounded-lg border border-border bg-background">
                <button onClick={() => setDocAiMode("modify")} className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all ${ docAiMode === "modify" ? "bg-secondary text-white shadow-sm" : "text-muted-foreground" }`}>Modify</button>
                <button onClick={() => setDocAiMode("start")} className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all ${ docAiMode === "start" ? "bg-secondary text-white shadow-sm" : "text-muted-foreground" }`}>
                  {(file?.path.includes("/epics/") || viewMode === "epics") ? "Create tasks" : "Start"}
                </button>
                <button onClick={() => setDocAiMode("plan")} className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all ${ docAiMode === "plan" ? "bg-secondary text-white shadow-sm" : "text-muted-foreground" }`}>Plan</button>
              </div>
            )}
            <div className="flex relative flex-1 justify-end items-center">
              <select value={promptMode} onChange={(e) => setPromptMode(e.target.value as any)} className="pr-6 w-full h-full text-xs text-right bg-transparent appearance-none outline-none text-muted-foreground">
                <option value="agent">Agent</option>
                <option value="plan">Plan</option>
                <option value="chat">Chat</option>
              </select>
              <ChevronDown className="absolute right-0 top-1/2 w-4 h-4 -translate-y-1/2 pointer-events-none text-muted-foreground" />
            </div>
          </div>

          <div className="p-3 border-b border-border">
            <div className="flex overflow-hidden relative flex-col w-full rounded-xl border bg-secondary border-border focus-within:ring-2 focus-within:ring-blue-600/50">
              <textarea
                value={promptText}
                onChange={(e) => {
                  setPromptText(e.target.value);
                  if (e.target.value.endsWith("@")) { setFilePickerOpen(true); fetchFiles(); }
                }}
                className="px-3 py-2 w-full h-32 text-sm bg-transparent resize-none text-foreground focus:outline-none"
                placeholder="Write a prompt…"
              />
              {filePickerOpen && (
                <div className="overflow-auto absolute left-3 bottom-12 z-10 w-64 max-h-48 rounded-lg border shadow-xl bg-background border-border">
                  <div className="flex sticky top-0 gap-2 items-center p-2 border-b bg-background border-border">
                    <Search className="w-3 h-3 text-muted-foreground" />
                    <input autoFocus value={fileSearch} onChange={(e) => setFileSearch(e.target.value)} placeholder="Search files..." className="flex-1 text-xs bg-transparent outline-none" />
                    <button onClick={() => setFilePickerOpen(false)}><X className="w-3 h-3" /></button>
                  </div>
                  {allFiles.filter(f => f.name.toLowerCase().includes(fileSearch.toLowerCase())).map(f => (
                    <button key={f.path} onClick={() => {
                      setPromptText(prev => prev.substring(0, prev.lastIndexOf("@") + 1) + f.name + " ");
                      setFileMap(prev => ({ ...prev, [f.name]: f.path }));
                      setFilePickerOpen(false);
                      setFileSearch("");
                    }} className="w-full px-3 py-1.5 text-left text-xs hover:bg-secondary truncate">{f.name}</button>
                  ))}
                </div>
              )}
              <div className="flex justify-between items-center px-3 py-2 border-t border-border/50 bg-secondary/30">
                <div className="flex gap-1 items-center">
                  <button onClick={() => { setFilePickerOpen(true); fetchFiles(); }} className="p-1.5 text-muted-foreground hover:bg-background rounded-md"><AtSign className="w-4 h-4" /></button>
                  <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-muted-foreground hover:bg-background rounded-md"><ImageIcon className="w-4 h-4" /></button>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                  <div className="flex items-center gap-2 ml-2 border-l pl-2 border-border/50">
                    <input 
                      type="checkbox" 
                      id="allow-modify"
                      checked={allowModify} 
                      onChange={(e) => setAllowModify(e.target.checked)} 
                      className="accent-blue-500 h-3 w-3" 
                    />
                    <label htmlFor="allow-modify" className="text-[10px] text-muted-foreground whitespace-nowrap cursor-pointer select-none">Allow Modify</label>
                  </div>
                </div>
                <div className="flex gap-1 items-center">
                  <button onClick={handleRecordAudio} className={`p-1.5 rounded-md ${isRecording ? "text-red-500 bg-red-500/10" : "text-muted-foreground"}`}><Mic className={`w-4 h-4 ${isRecording ? "animate-pulse" : ""}`} /></button>
                  <button onClick={handleCopyFullPrompt} className="p-1.5 text-muted-foreground hover:bg-background rounded-md"><Copy className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex overflow-auto flex-col flex-1 p-3 border-b border-border">
            <div className="grid grid-cols-2 gap-3">
              {/* Left Column: CLI & Web */}
              <div className="flex flex-col gap-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-1 mb-1">CLI & Web</div>
                {agentTools.filter(t => t.type === "cli" || t.type === "web").map(tool => {
                  const isActive = isTerminalRunning && terminalToolName === tool.name;
                  const savedSession = contextKey ? getTerminalSessionForContext(contextKey) : undefined;
                  const hasSavedSession = savedSession?.toolName === tool.name && savedSession?.isRunning && !isActive;
                  const isHighlighted = isActive || hasSavedSession;
                  const getToolIcon = (type?: string) => {
                    switch (type) {
                      case "cli": return <Terminal className="w-3.5 h-3.5" />;
                      case "web": return <Globe className="w-3.5 h-3.5" />;
                      case "app": return <Monitor className="w-3.5 h-3.5" />;
                      default: return <Terminal className="w-3.5 h-3.5" />;
                    }
                  };
                  const handleClick = () => {
                    if (isActive) { setRightSidebarView("terminal"); return; }
                    if (hasSavedSession && savedSession) { reconnectToSession(savedSession.processId, savedSession.toolName); return; }
                    runTool(tool.name);
                  };
                  
                  return (
                    <div key={tool.name} onMouseEnter={() => ensureModelsForTool(tool.name)} className={`flex flex-col w-full rounded-lg border overflow-hidden ${tool.available ? isHighlighted ? "border-blue-600/50 bg-blue-900/10 shadow-lg" : "border-border bg-secondary" : "opacity-50"}`}>
                      <button onClick={handleClick} disabled={!tool.available || (!isHighlighted && !promptText.trim())} className="flex-1 px-3 py-3 text-left group relative">
                        <div className="flex gap-2 items-center mb-0.5 pr-5">
                          <div className="text-sm font-medium group-hover:text-white truncate">{tool.displayName}</div>
                          {isHighlighted && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />}
                        </div>
                        <div className="absolute top-3.5 right-3 text-muted-foreground group-hover:text-white transition-colors">
                          {getToolIcon(tool.type)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{isHighlighted ? "Continue" : "Run"}</div>
                      </button>
                      <div className="p-1 border-t bg-background border-border">
                        <select value={toolModelByTool[tool.name] || ""} onChange={(e) => setToolModelByTool(prev => ({ ...prev, [tool.name]: e.target.value }))} className="w-full bg-transparent text-[10px] text-muted-foreground outline-none cursor-pointer py-0.5 px-1 rounded hover:bg-secondary">
                          <option value="">Default</option>
                          {(toolModelsByTool[tool.name] || []).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Applications */}
              <div className="flex flex-col gap-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-1 mb-1">Applications</div>
                {agentTools.filter(t => t.type === "app").map(tool => {
                  const isActive = isTerminalRunning && terminalToolName === tool.name;
                  const savedSession = contextKey ? getTerminalSessionForContext(contextKey) : undefined;
                  const hasSavedSession = savedSession?.toolName === tool.name && savedSession?.isRunning && !isActive;
                  const isHighlighted = isActive || hasSavedSession;
                  const getToolIcon = (type?: string) => {
                    switch (type) {
                      case "cli": return <Terminal className="w-3.5 h-3.5" />;
                      case "web": return <Globe className="w-3.5 h-3.5" />;
                      case "app": return <Monitor className="w-3.5 h-3.5" />;
                      default: return <Terminal className="w-3.5 h-3.5" />;
                    }
                  };
                  const handleClick = () => {
                    if (isActive) { setRightSidebarView("terminal"); return; }
                    if (hasSavedSession && savedSession) { reconnectToSession(savedSession.processId, savedSession.toolName); return; }
                    runTool(tool.name);
                  };
                  
                  return (
                    <div key={tool.name} onMouseEnter={() => ensureModelsForTool(tool.name)} className={`flex flex-col w-full rounded-lg border overflow-hidden ${tool.available ? isHighlighted ? "border-blue-600/50 bg-blue-900/10 shadow-lg" : "border-border bg-secondary" : "opacity-50"}`}>
                      <button onClick={handleClick} disabled={!tool.available || (!isHighlighted && !promptText.trim())} className="flex-1 px-3 py-3 text-left group relative">
                        <div className="flex gap-2 items-center mb-0.5 pr-5">
                          <div className="text-sm font-medium group-hover:text-white truncate">{tool.displayName}</div>
                          {isHighlighted && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />}
                        </div>
                        <div className="absolute top-3.5 right-3 text-muted-foreground group-hover:text-white transition-colors">
                          {getToolIcon(tool.type)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{isHighlighted ? "Continue" : "Run"}</div>
                      </button>
                      <div className="p-1 border-t bg-background border-border">
                        <select value={toolModelByTool[tool.name] || ""} onChange={(e) => setToolModelByTool(prev => ({ ...prev, [tool.name]: e.target.value }))} className="w-full bg-transparent text-[10px] text-muted-foreground outline-none cursor-pointer py-0.5 px-1 rounded hover:bg-secondary">
                          <option value="">Default</option>
                          {(toolModelsByTool[tool.name] || []).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
