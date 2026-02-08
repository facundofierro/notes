import * as React from "react";
import {
  Button,
} from "@agelum/shadcn";
import {
  Trash2,
  Folder,
  FolderTree,
  Plus,
} from "lucide-react";
import {
  ProjectConfig,
  UserSettings,
} from "@/hooks/use-settings";
import { DirectoryPicker } from "@/components/shared/DirectoryPicker";

interface SettingsProjectsProps {
  settings: UserSettings;
  onChange: (
    key: keyof UserSettings,
    value: any,
  ) => void;
}

export function SettingsProjects({
  settings,
  onChange,
}: SettingsProjectsProps) {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [newType, setNewType] = React.useState<"project" | "folder">("project");
  
  const handleStartAdd = (type: "project" | "folder") => {
      setNewType(type);
      setPickerOpen(true);
  };

  const handleSelectPath = (path: string) => {
      if (!path) return;

      // Auto-generate name from folder name
      const parts = path.split(/[/\\]/).filter(Boolean);
      const name = parts.length > 0 ? parts[parts.length - 1] : "New Project";

      const newProject: ProjectConfig = {
        id: crypto.randomUUID(),
        name: name,
        path: path,
        type: newType,
      };
      
      onChange("projects", [...(settings.projects || []), newProject]);
  };

  const handleDelete = (id: string) => {
    onChange(
      "projects",
      (settings.projects || []).filter((p) => p.id !== id),
    );
  };

  const projects = settings.projects || [];

  return (
    <div className="space-y-6">
      <DirectoryPicker 
        open={pickerOpen} 
        onOpenChange={setPickerOpen} 
        onSelect={handleSelectPath}
        title={newType === 'folder' ? "Select Projects Folder" : "Select Project"}
      />

      <div className="flex items-center justify-between">
          <div>
              <h3 className="text-lg font-medium text-foreground">Projects Configuration</h3>
              <p className="text-sm text-muted-foreground">
                  Manage your projects and project folders.
              </p>
          </div>
          <div className="flex gap-2">
              <Button 
                  variant="outline"
                  onClick={() => handleStartAdd('folder')}
                  className="gap-2"
              >
                  <FolderTree className="w-4 h-4" />
                  Add Folder
              </Button>
              <Button 
                  onClick={() => handleStartAdd('project')}
                  className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20 gap-2"
              >
                  <Plus className="w-4 h-4" />
                  Add Project
              </Button>
          </div>
      </div>

      <div className="space-y-2">
          {projects.length === 0 ? (
              <div className="py-12 text-center border rounded-lg border-dashed border-border bg-background/50">
                  <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                      <Folder className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h4 className="text-sm font-medium text-foreground mb-1">No projects configured</h4>
                  <p className="text-xs text-muted-foreground mb-4">Add a project to get started</p>
                  <div className="flex justify-center gap-4">
                       <Button 
                          variant="outline"
                          onClick={() => handleStartAdd('folder')}
                          className="gap-2"
                      >
                          <FolderTree className="w-4 h-4" />
                          Add Folder
                      </Button>
                      <Button 
                          onClick={() => handleStartAdd('project')}
                          className="gap-2 bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20"
                      >
                          <Plus className="w-4 h-4" />
                          Add Project
                      </Button>
                  </div>
              </div>
          ) : (
              <div className="grid gap-2">
                  {projects.map((project) => (
                      <div
                          key={project.id}
                          className="flex items-center justify-between p-4 bg-background border border-border rounded-lg group hover:border-amber-500/50 transition-colors"
                      >
                          <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-lg ${
                                  project.type === "folder" ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"
                              }`}>
                                  {project.type === "folder" ? (
                                      <FolderTree className="w-5 h-5" />
                                  ) : (
                                      <Folder className="w-5 h-5" />
                                  )}
                              </div>
                              <div>
                                  <div className="font-medium text-foreground flex items-center gap-2">
                                      {project.name}
                                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-semibold">
                                          {project.type === "folder" ? "Container" : "Project"}
                                      </span>
                                  </div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                      {project.path}
                                  </div>
                              </div>
                          </div>
                          <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(project.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
                          >
                              <Trash2 className="w-4 h-4" />
                          </Button>
                      </div>
                  ))}
              </div>
          )}
      </div>
    </div>
  );
}
