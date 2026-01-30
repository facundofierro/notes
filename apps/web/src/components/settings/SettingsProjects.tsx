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
        <p className="mb-4 text-sm text-gray-400">
          Manage your projects and
          project folders.
        </p>
      </div>

      <div className="grid gap-4 p-4 rounded-lg border border-gray-800 bg-gray-950/50">
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
              className="text-gray-100 bg-gray-900 border-gray-800"
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
              <SelectTrigger className="text-gray-100 bg-gray-900 border-gray-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800">
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
              <SelectTrigger className="text-gray-100 bg-gray-900 border-gray-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800">
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
                className={`text-gray-100 bg-gray-900 border-gray-800 ${
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
                <p className="text-xs text-gray-500">
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
              className="text-white bg-blue-600 hover:bg-blue-700"
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
              className="flex justify-between items-center p-3 bg-gray-900 rounded-lg border border-gray-800"
            >
              <div className="flex gap-3 items-center">
                {project.type ===
                "folder" ? (
                  <FolderTree className="w-5 h-5 text-blue-400" />
                ) : (
                  <Folder className="w-5 h-5 text-green-400" />
                )}
                <div>
                  <div className="font-medium text-gray-200">
                    {project.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {project.path}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  handleDelete(
                    project.id,
                  )
                }
                className="text-gray-500 hover:text-red-400 hover:bg-gray-800"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ),
        )}
        {(settings.projects || [])
          .length === 0 && (
          <div className="py-8 text-center text-gray-500 rounded-lg border border-gray-800 border-dashed">
            No projects configured
          </div>
        )}
      </div>
    </div>
  );
}
