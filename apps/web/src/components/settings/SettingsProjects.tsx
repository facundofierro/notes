import * as React from "react";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@agelum/shadcn";
import {
  Trash2,
  Plus,
  Folder,
  FolderTree,
} from "lucide-react";
import {
  ProjectConfig,
  UserSettings,
} from "@/hooks/use-settings";

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
  const [newPath, setNewPath] =
    React.useState("");
  const [newType, setNewType] =
    React.useState<
      "project" | "folder"
    >("project");
  const [newName, setNewName] =
    React.useState("");
  const [
    newWorkflowId,
    setNewWorkflowId,
  ] = React.useState<string>("default");

  const [
    isValidating,
    setIsValidating,
  ] = React.useState(false);
  const [pathError, setPathError] =
    React.useState<string | null>(null);
  const [isPathValid, setIsPathValid] =
    React.useState(false);

  const validatePath = async (
    path: string,
  ) => {
    if (!path) {
      setPathError(null);
      setIsPathValid(false);
      return;
    }

    setIsValidating(true);
    setPathError(null);
    setIsPathValid(false);

    try {
      const res = await fetch(
        "/api/validate-path",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            path,
          }),
        },
      );
      const data = await res.json();

      if (data.valid) {
        setIsPathValid(true);
      } else {
        setPathError(
          data.error || "Invalid path",
        );
      }
    } catch (err) {
      setPathError(
        "Failed to validate path",
      );
    } finally {
      setIsValidating(false);
    }
  };

  const handleAdd = () => {
    if (
      !newPath ||
      !newName ||
      !isPathValid
    )
      return;
    const newProject: ProjectConfig = {
      id: crypto.randomUUID(),
      name: newName,
      path: newPath,
      type: newType,
      workflowId:
        newWorkflowId === "default"
          ? undefined
          : newWorkflowId,
    };
    onChange("projects", [
      ...(settings.projects || []),
      newProject,
    ]);
    setNewPath("");
    setNewName("");
    setNewType("project");
    setNewWorkflowId("default");
    setIsPathValid(false);
    setPathError(null);
  };

  const handleDelete = (id: string) => {
    onChange(
      "projects",
      (settings.projects || []).filter(
        (p) => p.id !== id,
      ),
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-medium text-white">
          Projects Configuration
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Manage your projects and
          project folders.
        </p>
      </div>

      <div className="grid gap-4 p-4 rounded-lg border border-border bg-background/50">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Project Name</Label>
            <Input
              value={newName}
              onChange={(e) =>
                setNewName(
                  e.target.value,
                )
              }
              placeholder="My Project"
              className="text-foreground bg-background border-border"
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={newType}
              onValueChange={(
                v: "project" | "folder",
              ) => setNewType(v)}
            >
              <SelectTrigger className="text-foreground bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                <SelectItem value="project">
                  Single Project
                </SelectItem>
                <SelectItem value="folder">
                  Project Folder
                  (Container)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Workflow</Label>
            <Select
              value={newWorkflowId}
              onValueChange={
                setNewWorkflowId
              }
            >
              <SelectTrigger className="text-foreground bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                <SelectItem value="default">
                  Default
                </SelectItem>
                {(
                  settings.workflows ||
                  []
                ).map((w) => (
                  <SelectItem
                    key={w.id}
                    value={w.id}
                  >
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Path</Label>
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Input
                value={newPath}
                onChange={(e) => {
                  setNewPath(
                    e.target.value,
                  );
                  setIsPathValid(false);
                  setPathError(null);
                }}
                onBlur={() =>
                  validatePath(newPath)
                }
                placeholder="/absolute/path/to/project"
                className={`text-foreground bg-background border-border ${
                  pathError
                    ? "border-red-500"
                    : isPathValid
                      ? "border-green-500"
                      : ""
                }`}
              />
              {pathError && (
                <p className="text-xs text-red-500">
                  {pathError}
                </p>
              )}
              {isPathValid && (
                <p className="text-xs text-green-500">
                  Path is valid
                </p>
              )}
              {isValidating && (
                <p className="text-xs text-muted-foreground">
                  Validating...
                </p>
              )}
            </div>
            <Button
              onClick={handleAdd}
              disabled={
                !newPath ||
                !newName ||
                !isPathValid ||
                isValidating
              }
              className="text-white bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-600/20"
            >
              <Plus className="mr-2 w-4 h-4" />
              Add
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {(settings.projects || []).map(
          (project) => (
            <div
              key={project.id}
              className="flex justify-between items-center p-3 bg-background rounded-lg border border-border"
            >
              <div className="flex gap-3 items-center">
                {project.type ===
                "folder" ? (
                  <FolderTree className="w-5 h-5 text-amber-400" />
                ) : (
                  <Folder className="w-5 h-5 text-green-400" />
                )}
                <div>
                  <div className="font-medium text-foreground">
                    {project.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {project.path}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-48">
                  <Select
                    value={project.workflowId || "default"}
                    onValueChange={(value) => {
                      const updatedProjects = (settings.projects || []).map(p => 
                        p.id === project.id 
                          ? { ...p, workflowId: value === "default" ? undefined : value }
                          : p
                      );
                      onChange("projects", updatedProjects);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs text-foreground bg-background border-border">
                      <SelectValue placeholder="Workflow" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border">
                      <SelectItem value="default">
                        Default
                      </SelectItem>
                      {(
                        settings.workflows ||
                        []
                      ).map((w) => (
                        <SelectItem
                          key={w.id}
                          value={w.id}
                        >
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    handleDelete(
                      project.id,
                    )
                  }
                  className="text-muted-foreground hover:text-red-400 hover:bg-secondary h-8 w-8"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ),
        )}
        {(settings.projects || [])
          .length === 0 && (
          <div className="py-8 text-center text-muted-foreground rounded-lg border border-border border-dashed">
            No projects configured
          </div>
        )}
      </div>
    </div>
  );
}
