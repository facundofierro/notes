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
  X,
  Edit2,
} from "lucide-react";
import { VIEW_MODE_CONFIG } from "@/lib/view-config";

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
  const [viewMode, setViewMode] = React.useState<"list" | "edit">("list");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [newName, setNewName] = React.useState("");
  const [selectedItems, setSelectedItems] = React.useState<string[]>([]);

  const availableItems = Object.keys(VIEW_MODE_CONFIG);

  const handleAddOrUpdate = () => {
    if (!newName) return;

    if (editingId) {
      const updatedWorkflows = (settings.workflows || []).map((w) =>
        w.id === editingId
          ? {
              ...w,
              name: newName,
              items: selectedItems,
            }
          : w,
      );
      onChange("workflows", updatedWorkflows);
    } else {
      const newWorkflow: WorkflowConfig = {
        id: crypto.randomUUID(),
        name: newName,
        items: selectedItems,
      };
      onChange("workflows", [...(settings.workflows || []), newWorkflow]);
    }

    handleCancelEdit();
  };

  const handleEdit = (workflow: WorkflowConfig) => {
    setEditingId(workflow.id);
    setNewName(workflow.name);
    setSelectedItems(workflow.items);
    setViewMode("edit");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewName("");
    setSelectedItems([]);
    setViewMode("list");
  };

  const handleAddNew = () => {
    setEditingId(null);
    setNewName("");
    setSelectedItems([]);
    setViewMode("edit");
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(
      "workflows",
      (settings.workflows || []).filter((w) => w.id !== id),
    );
    if (editingId === id) {
      handleCancelEdit();
    }
  };

  const handleSelectWorkflow = (id: string) => {
    onChange("defaultWorkflowId", id === "default" ? undefined : id);
  };

  const addItem = (item: string) => {
    if (!selectedItems.includes(item)) {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const removeItem = (item: string) => {
    setSelectedItems(selectedItems.filter((i) => i !== item));
  };

  const itemsNotInBar = availableItems.filter(
    (item) => !selectedItems.includes(item),
  );

  const WorkflowPreview = ({ items, isActive = false }: { items: string[], isActive?: boolean }) => (
    <div className="flex gap-1 p-1 bg-secondary rounded-xl border border-border">
      {items.length > 0 ? (
        items.map((mode, index) => {
          const config = VIEW_MODE_CONFIG[mode];
          if (!config) return null;
          const Icon = config.icon;
          // In the actual top bar, the first item is usually active by default or based on current view
          const isItemActive = index === 0 && isActive; 
          return (
            <div
              key={mode}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                isItemActive
                  ? "bg-amber-500/15 text-amber-500 border border-amber-500/20"
                  : "text-muted-foreground border border-transparent"
              }`}
            >
              <Icon className="w-4 h-4" />
              {config.label}
            </div>
          );
        })
      ) : (
        <div className="px-4 py-1.5 text-sm text-muted-foreground italic">
          Empty Bar
        </div>
      )}
    </div>
  );

  if (viewMode === "edit") {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-white">
              {editingId ? "Edit Workflow" : "New Workflow"}
            </h3>
            <p className="text-sm text-gray-400">
              Configure your top bar items and layout.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancelEdit}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Workflow Preview */}
        <div className="space-y-4">
          <Label className="text-gray-400 uppercase text-[10px] font-bold tracking-wider">
            Preview
          </Label>
          <div className="flex justify-center items-center p-4 bg-background border border-border rounded-xl">
            <WorkflowPreview items={selectedItems} isActive={true} />
          </div>
        </div>

        {/* Editor Section */}
        <div className="grid gap-6 p-6 rounded-xl border border-border bg-secondary/30">
          <div className="space-y-2">
            <Label className="text-gray-200">Workflow Name</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Frontend Development, Review Mode..."
              className="text-gray-100 bg-background border-border focus:ring-amber-600/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* Left Column: Active Items */}
            <div className="space-y-3">
              <Label className="text-gray-400 text-xs font-semibold">
                ITEMS IN BAR (LEFT TO RIGHT)
              </Label>
              <div className="min-h-[200px] p-2 bg-background rounded-lg border border-border space-y-1">
                {selectedItems.map((item) => {
                  const config = VIEW_MODE_CONFIG[item];
                  const Icon = config.icon;
                  return (
                    <button
                      key={item}
                      onClick={() => removeItem(item)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-200 bg-secondary/50 hover:bg-secondary rounded-md border border-transparent hover:border-border transition-all group"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-gray-400" />
                        {config.label}
                      </div>
                      <X className="w-3 h-3 text-gray-500 group-hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
                {selectedItems.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-[180px] text-gray-600 text-xs italic">
                    Click items on the right to add
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Available Items */}
            <div className="space-y-3">
              <Label className="text-gray-400 text-xs font-semibold">
                AVAILABLE ITEMS
              </Label>
              <div className="min-h-[200px] p-2 bg-background rounded-lg border border-border space-y-1">
                {itemsNotInBar.map((item) => {
                  const config = VIEW_MODE_CONFIG[item];
                  const Icon = config.icon;
                  return (
                    <button
                      key={item}
                      onClick={() => addItem(item)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-400 hover:text-white bg-transparent hover:bg-secondary/50 rounded-md border border-transparent hover:border-border transition-all group"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-gray-500 group-hover:text-gray-300" />
                        {config.label}
                      </div>
                      <Plus className="w-3 h-3 text-gray-600 group-hover:text-amber-400" />
                    </button>
                  );
                })}
                {itemsNotInBar.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-[180px] text-gray-600 text-xs italic">
                    All items added
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              className="flex-1 text-gray-300 border-border hover:bg-secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddOrUpdate}
              disabled={!newName || selectedItems.length === 0}
              className="flex-[2] text-white bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-600/20"
            >
              {editingId ? "Update Workflow" : "Add Workflow"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const allWorkflows = [
    { id: "default", name: "Default (All Items)", items: availableItems },
    ...(settings.workflows || []),
  ];

  const activeWorkflowId = settings.defaultWorkflowId || "default";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-white">Workflows</h3>
          <p className="text-sm text-gray-400">
            Select or create your preferred top bar configuration.
          </p>
        </div>
        <Button
          onClick={handleAddNew}
          className="text-white bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-600/20 gap-2"
        >
          <Plus className="w-4 h-4" />
          New Workflow
        </Button>
      </div>

      <div className="grid gap-4">
        {allWorkflows.map((workflow) => {
          const isActive = activeWorkflowId === workflow.id;
          return (
            <div
              key={workflow.id}
              onClick={() => handleSelectWorkflow(workflow.id)}
              className={`group relative flex flex-col gap-4 p-6 bg-secondary/30 rounded-2xl border transition-all cursor-pointer ${
                isActive
                  ? "border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20"
                  : "border-border hover:border-gray-700 hover:bg-secondary/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full transition-colors ${isActive ? "bg-amber-500 animate-pulse" : "bg-gray-700"}`} />
                  <span className="font-semibold text-gray-100">
                    {workflow.name}
                  </span>
                  {workflow.id === "default" && (
                    <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">System</span>
                  )}
                </div>
                {workflow.id !== "default" && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(workflow);
                      }}
                      className="h-8 w-8 text-gray-400 hover:text-white hover:bg-secondary"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDelete(workflow.id, e)}
                      className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-secondary"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="flex justify-start">
                <WorkflowPreview items={workflow.items} isActive={isActive} />
              </div>

              {isActive && (
                <div className="absolute -top-2 -right-2 bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                  ACTIVE
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
