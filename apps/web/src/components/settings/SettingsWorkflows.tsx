import * as React from "react";
import {
  Button,
  Input,
  Label,
} from "@agelum/shadcn";
import {
  UserSettings,
  WorkflowConfig,
} from "@/hooks/use-settings";
import {
  Plus,
  Trash2,
} from "lucide-react";

interface SettingsWorkflowsProps {
  settings: UserSettings;
  onChange: (
    key: keyof UserSettings,
    value: any,
  ) => void;
}

export function SettingsWorkflows({
  settings,
  onChange,
}: SettingsWorkflowsProps) {
  const [newName, setNewName] =
    React.useState("");
  const [
    selectedItems,
    setSelectedItems,
  ] = React.useState<string[]>([
    "epics",
    "tasks",
  ]);

  const availableItems = [
    { value: "ideas", label: "Ideas" },
    { value: "docs", label: "Docs" },
    { value: "plan", label: "Plan" },
    { value: "epics", label: "Epics" },
    { value: "kanban", label: "Tasks" },
    { value: "tests", label: "Tests" },
    {
      value: "commands",
      label: "Commands",
    },
    {
      value: "cli-tools",
      label: "CLI Tools",
    },
  ];

  const handleAdd = () => {
    if (!newName) return;
    const newWorkflow: WorkflowConfig =
      {
        id: crypto.randomUUID(),
        name: newName,
        items: selectedItems,
      };
    onChange("workflows", [
      ...(settings.workflows || []),
      newWorkflow,
    ]);
    setNewName("");
    setSelectedItems([
      "epics",
      "tasks",
    ]);
  };

  const handleDelete = (id: string) => {
    onChange(
      "workflows",
      (settings.workflows || []).filter(
        (w) => w.id !== id,
      ),
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-medium text-white">
          Workflows
        </h3>
        <p className="text-sm text-gray-400">
          Create and manage different
          workflows (top bar
          configurations).
        </p>
      </div>

      <div className="grid gap-4 p-4 rounded-lg border border-gray-800 bg-gray-950/50">
        <div className="space-y-2">
          <Label>Workflow Name</Label>
          <Input
            value={newName}
            onChange={(e) =>
              setNewName(e.target.value)
            }
            placeholder="New Workflow Name"
            className="text-gray-100 bg-gray-900 border-gray-800"
          />
        </div>

        <div className="space-y-2">
          <Label>Included Items</Label>
          <div className="grid grid-cols-2 gap-3 p-2 bg-gray-900 rounded-md border border-gray-800">
            {availableItems.map(
              (item) => (
                <div
                  key={item.value}
                  className="flex items-center space-x-2"
                >
                  <input
                    type="checkbox"
                    id={`workflow-${item.value}`}
                    checked={selectedItems.includes(
                      item.value,
                    )}
                    onChange={(e) => {
                      if (
                        e.target.checked
                      ) {
                        setSelectedItems(
                          [
                            ...selectedItems,
                            item.value,
                          ],
                        );
                      } else {
                        setSelectedItems(
                          selectedItems.filter(
                            (i) =>
                              i !==
                              item.value,
                          ),
                        );
                      }
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-700 rounded focus:ring-blue-500 focus:ring-offset-gray-900"
                  />
                  <Label
                    htmlFor={`workflow-${item.value}`}
                    className="cursor-pointer text-gray-300"
                  >
                    {item.label}
                  </Label>
                </div>
              ),
            )}
          </div>
        </div>

        <Button
          onClick={handleAdd}
          disabled={
            !newName ||
            selectedItems.length === 0
          }
          className="w-full text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="mr-2 w-4 h-4" />
          Add Workflow
        </Button>
      </div>

      <div className="space-y-2">
        {(settings.workflows || []).map(
          (workflow) => (
            <div
              key={workflow.id}
              className="flex justify-between items-center p-3 bg-gray-900 rounded-lg border border-gray-800"
            >
              <div>
                <div className="font-medium text-gray-200">
                  {workflow.name}
                </div>
                <div className="text-xs text-gray-500">
                  {workflow.items.join(
                    ", ",
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  handleDelete(
                    workflow.id,
                  )
                }
                className="text-gray-500 hover:text-red-400 hover:bg-gray-800"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ),
        )}
        {(settings.workflows || [])
          .length === 0 && (
          <div className="py-8 text-center text-gray-500 rounded-lg border border-gray-800 border-dashed">
            No workflows configured
          </div>
        )}
      </div>
    </div>
  );
}
