"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import FileBrowser from "@/components/FileBrowser";
import FileViewer from "@/components/FileViewer";
import TaskKanban from "@/components/TaskKanban";
import EpicsKanban from "@/components/EpicsKanban";
import TestKanban from "@/components/TestKanban";
import { Kanban, Files, FolderOpen, Layers } from "lucide-react";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  content?: string;
}

type ViewMode = "browser" | "epics" | "kanban";

interface Task {
  id: string;
  title: string;
  description: string;
  state: "pending" | "doing" | "done";
  createdAt: string;
  epic?: string;
}

interface Epic {
  id: string;
  title: string;
  description: string;
  state: "pending" | "doing" | "done";
  createdAt: string;
}

export default function Home() {
  const [repositories, setRepositories] = useState<string[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [selectedFile, setSelectedFile] = useState<{
    path: string;
    content: string;
  } | null>(null);
  const [basePath, setBasePath] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("epics");

  useEffect(() => {
    fetch("/api/repositories")
      .then((res) => res.json())
      .then((data) => {
        setRepositories(data.repositories || []);
        if (data.basePath) setBasePath(data.basePath);
        if (data.repositories?.length > 0) {
          setSelectedRepo(data.repositories[0]);
        }
      });
  }, []);

  useEffect(() => {
    if (selectedRepo) {
      fetch(`/api/files?repo=${selectedRepo}`)
        .then((res) => res.json())
        .then((data) => {
          setFileTree(data.tree);
          setCurrentPath(data.rootPath);
        });
    }
  }, [selectedRepo]);

  const handleFileSelect = async (node: FileNode) => {
    if (node.type === "file") {
      const content = await fetch(
        `/api/file?path=${encodeURIComponent(node.path)}`
      ).then((res) => res.json());
      setSelectedFile({ path: node.path, content: content.content || "" });
    }
  };

  const handleTaskSelect = (task: Task) => {
    if (selectedRepo && task.id) {
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      const filePath = `${homeDir}/git/${selectedRepo}/agelum/tasks/${task.state}/${task.id}.md`;
      fetch(`/api/file?path=${encodeURIComponent(filePath)}`)
        .then((res) => res.json())
        .then((data) => {
          setSelectedFile({ path: filePath, content: data.content || "" });
        });
    }
  };

  const handleEpicSelect = (epic: Epic) => {
    if (selectedRepo && epic.id) {
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      const filePath = `${homeDir}/git/${selectedRepo}/agelum/epics/${epic.state}/${epic.id}.md`;
      fetch(`/api/file?path=${encodeURIComponent(filePath)}`)
        .then((res) => res.json())
        .then((data) => {
          setSelectedFile({ path: filePath, content: data.content || "" });
        });
    }
  };

  return (
    <div className="flex w-full h-full">
      <Sidebar
        repositories={repositories}
        selectedRepo={selectedRepo}
        onSelectRepo={setSelectedRepo}
      />
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-2 border-b border-gray-700 bg-gray-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("browser")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                viewMode === "browser"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <Files className="w-4 h-4" />
              Files
            </button>
            <button
              onClick={() => setViewMode("epics")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                viewMode === "epics"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <Layers className="w-4 h-4" />
              Epics
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                viewMode === "kanban"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <Kanban className="w-4 h-4" />
              Tasks
            </button>
          </div>
          {selectedRepo && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <FolderOpen className="w-4 h-4" />
              <span>{selectedRepo}</span>
            </div>
          )}
        </div>
        <div className="flex-1 flex overflow-hidden">
          {viewMode === "browser" ? (
            <>
              <FileBrowser
                fileTree={fileTree}
                currentPath={currentPath}
                onFileSelect={handleFileSelect}
                basePath={basePath}
              />
              <FileViewer file={selectedFile} />
            </>
          ) : viewMode === "epics" ? (
            <div className="flex-1 bg-background">
              {selectedRepo && (
                <EpicsKanban
                  repo={selectedRepo}
                  onEpicSelect={handleEpicSelect}
                />
              )}
            </div>
          ) : (
            <div className="flex-1 bg-background">
              {selectedRepo && (
                <TaskKanban
                  repo={selectedRepo}
                  onTaskSelect={handleTaskSelect}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
