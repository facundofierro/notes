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
  GripVertical,
} from "lucide-react";
import { VIEW_MODE_CONFIG } from "@/lib/view-config";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  restrictToVerticalAxis,
  restrictToWindowEdges,
} from "@dnd-kit/modifiers";

interface SettingsWorkflowsProps {
  settings: UserSettings;
  onChange: (
    key: keyof UserSettings,
    value: any,
  ) => void;
}

interface SortableItemProps {
  id: string;
  type: string;
  onRemove: (id: string) => void;
}

function SortableItem({
  id,
  type,
  onRemove,
}: SortableItemProps) {
  const config = VIEW_MODE_CONFIG[
    type
  ] || { label: type, icon: X };
  const Icon = config.icon;
  const isSeparator =
    type === "separator";

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform:
      CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group w-full flex items-center justify-between px-3 py-2 text-sm rounded-md border transition-all ${
        isDragging
          ? "bg-secondary border-amber-500/50 shadow-lg ring-1 ring-amber-500/20"
          : "text-gray-200 bg-secondary/50 border-transparent hover:border-border"
      }`}
    >
      <div className="flex items-center gap-2 flex-1">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-white/5 rounded"
        >
          <GripVertical className="w-3.5 h-3.5 text-gray-500" />
        </div>
        <Icon
          className={`w-4 h-4 ${isSeparator ? "text-gray-500" : "text-gray-400"}`}
        />
        <span
          className={
            isSeparator
              ? "text-gray-500 italic"
              : ""
          }
        >
          {config.label}
        </span>
      </div>
      <button
        onClick={() => onRemove(id)}
        className="p-1 hover:bg-red-500/10 rounded-md transition-colors"
      >
        <X className="w-3 h-3 text-gray-500 group-hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    </div>
  );
}

export function SettingsWorkflows({
  settings,
  onChange,
}: SettingsWorkflowsProps) {
  const [viewMode, setViewMode] =
    React.useState<"list" | "edit">(
      "list",
    );
  const [editingId, setEditingId] =
    React.useState<string | null>(null);
  const [newName, setNewName] =
    React.useState("");
  const [
    selectedItems,
    setSelectedItems,
  ] = React.useState<
    { id: string; type: string }[]
  >([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter:
        sortableKeyboardCoordinates,
    }),
  );

  const availableItems = Object.keys(
    VIEW_MODE_CONFIG,
  ).filter((k) => k !== "separator");

  const handleAddOrUpdate = () => {
    if (!newName) return;

    const itemsToSave =
      selectedItems.map((i) => i.type);

    if (editingId && editingId !== "default") {
      const updatedWorkflows = (
        settings.workflows || []
      ).map((w) =>
        w.id === editingId
          ? {
              ...w,
              name: newName,
              items: itemsToSave,
            }
          : w,
      );
      onChange(
        "workflows",
        updatedWorkflows,
      );
    } else {
      const newWorkflow: WorkflowConfig =
        {
          id: crypto.randomUUID(),
          name: newName,
          items: itemsToSave,
        };
      onChange("workflows", [
        ...(settings.workflows || []),
        newWorkflow,
      ]);
    }

    handleCancelEdit();
  };

  const handleEdit = (
    workflow: WorkflowConfig,
  ) => {
    setEditingId(workflow.id);
    setNewName(workflow.name);
    setSelectedItems(
      workflow.items.map((type) => ({
        id: `${type}-${crypto.randomUUID()}`,
        type,
      })),
    );
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

  const handleDelete = (
    id: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    onChange(
      "workflows",
      (settings.workflows || []).filter(
        (w) => w.id !== id,
      ),
    );
    if (editingId === id) {
      handleCancelEdit();
    }
  };

  const handleSelectWorkflow = (
    id: string,
  ) => {
    onChange(
      "defaultWorkflowId",
      id === "default" ? undefined : id,
    );
  };

  const addItem = (type: string) => {
    if (
      type === "separator" ||
      !selectedItems.some(
        (i) => i.type === type,
      )
    ) {
      setSelectedItems([
        ...selectedItems,
        {
          id: `${type}-${crypto.randomUUID()}`,
          type,
        },
      ]);
    }
  };

  const removeItem = (id: string) => {
    setSelectedItems(
      selectedItems.filter(
        (i) => i.id !== id,
      ),
    );
  };

  const handleDragEnd = (
    event: DragEndEvent,
  ) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSelectedItems((items) => {
        const oldIndex =
          items.findIndex(
            (i) => i.id === active.id,
          );
        const newIndex =
          items.findIndex(
            (i) => i.id === over.id,
          );
        return arrayMove(
          items,
          oldIndex,
          newIndex,
        );
      });
    }
  };

  const itemsNotInBar =
    availableItems.filter(
      (type) =>
        !selectedItems.some(
          (i) => i.type === type,
        ),
    );

  const WorkflowPreview = ({
    items,
    isActive = false,
  }: {
    items: string[];
    isActive?: boolean;
  }) => (
    <div className="flex gap-1 p-1 bg-secondary rounded-xl border border-border flex-wrap">
      {items.length > 0 ? (
        items.map((mode, index) => {
          if (mode === "separator") {
            return (
              <div
                key={`sep-${index}`}
                className="w-px h-6 bg-border mx-1 my-1"
              />
            );
          }
          const config =
            VIEW_MODE_CONFIG[mode];
          if (!config) return null;
          const Icon = config.icon;
          const isItemActive =
            index === 0 && isActive;
          return (
            <div
              key={`${mode}-${index}`}
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
              {editingId
                ? "Edit Workflow"
                : "New Workflow"}
            </h3>
            <p className="text-sm text-gray-400">
              Configure your top bar
              items and layout.
            </p>
          </div>
        </div>

        {/* Workflow Preview */}
        <div className="space-y-4">
          <Label className="text-gray-400 uppercase text-[10px] font-bold tracking-wider">
            Preview
          </Label>
          <div className="flex justify-center items-center p-4 bg-background border border-border rounded-xl">
            <WorkflowPreview
              items={selectedItems.map(
                (i) => i.type,
              )}
              isActive={true}
            />
          </div>
        </div>

        {/* Editor Section */}
        <div className="grid gap-6 p-6 rounded-xl border border-border bg-secondary/30">
          <div className="space-y-2">
            <Label className="text-gray-200">
              Workflow Name
            </Label>
            <Input
              value={newName}
              onChange={(e) =>
                setNewName(
                  e.target.value,
                )
              }
              placeholder="e.g. Frontend Development, Review Mode..."
              className="text-gray-100 bg-background border-border focus:ring-amber-600/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* Left Column: Active Items */}
            <div className="space-y-3">
              <Label className="text-gray-400 text-xs font-semibold">
                ITEMS IN BAR (LEFT TO
                RIGHT)
              </Label>
              <div className="h-[250px] overflow-y-auto p-2 bg-background rounded-lg border border-border space-y-1">
                <DndContext
                  sensors={sensors}
                  collisionDetection={
                    closestCenter
                  }
                  onDragEnd={
                    handleDragEnd
                  }
                  modifiers={[
                    restrictToVerticalAxis,
                    restrictToWindowEdges,
                  ]}
                >
                  <SortableContext
                    items={selectedItems.map(
                      (i) => i.id,
                    )}
                    strategy={
                      verticalListSortingStrategy
                    }
                  >
                    {selectedItems.map(
                      (item) => (
                        <SortableItem
                          key={item.id}
                          id={item.id}
                          type={
                            item.type
                          }
                          onRemove={
                            removeItem
                          }
                        />
                      ),
                    )}
                  </SortableContext>
                </DndContext>
                {selectedItems.length ===
                  0 && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-600 text-xs italic">
                    Click items on the
                    right to add
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Available Items */}
            <div className="space-y-3">
              <Label className="text-gray-400 text-xs font-semibold">
                AVAILABLE ITEMS
              </Label>
              <div className="h-[250px] overflow-y-auto p-2 bg-background rounded-lg border border-border space-y-1">
                {/* Special Separator Item */}
                <button
                  onClick={() =>
                    addItem("separator")
                  }
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-400 hover:text-white bg-transparent hover:bg-secondary/50 rounded-md border border-transparent hover:border-border transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <VIEW_MODE_CONFIG.separator.icon className="w-4 h-4 text-gray-500 group-hover:text-gray-300" />
                    {
                      VIEW_MODE_CONFIG
                        .separator.label
                    }
                  </div>
                  <Plus className="w-3 h-3 text-gray-600 group-hover:text-amber-400" />
                </button>

                {itemsNotInBar.map(
                  (type) => {
                    const config =
                      VIEW_MODE_CONFIG[
                        type
                      ];
                    const Icon =
                      config.icon;
                    return (
                      <button
                        key={type}
                        onClick={() =>
                          addItem(type)
                        }
                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-400 hover:text-white bg-transparent hover:bg-secondary/50 rounded-md border border-transparent hover:border-border transition-all group"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-500 group-hover:text-gray-300" />
                          {config.label}
                        </div>
                        <Plus className="w-3 h-3 text-gray-600 group-hover:text-amber-400" />
                      </button>
                    );
                  },
                )}
                {itemsNotInBar.length ===
                  0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-600 text-xs italic">
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
              onClick={
                handleAddOrUpdate
              }
              disabled={
                !newName ||
                selectedItems.length ===
                  0
              }
              className="flex-[2] text-white bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-600/20"
            >
              {editingId
                ? "Update Workflow"
                : "Add Workflow"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const allWorkflows = [
    {
      id: "default",
      name: "Default (All Items)",
      items: [
        "ideas",
        "docs",
        "separator",
        "epics",
        "kanban",
        "tests",
        "review",
        "separator",
        "ai",
        "browser",
      ],
    },
    ...(settings.workflows || []),
  ];

  const activeWorkflowId =
    settings.defaultWorkflowId ||
    "default";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-white">
            Workflows
          </h3>
          <p className="text-sm text-gray-400">
            Select or create your
            preferred top bar
            configuration.
          </p>
        </div>
        <Button
          onClick={handleAddNew}
          className="text-white bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-600/20 gap-2 px-4 py-2 border border-amber-500/30"
        >
          <Plus className="w-4 h-4" />
          New Workflow
        </Button>
      </div>

      <div className="grid gap-4">
        {allWorkflows.map(
          (workflow) => {
            const isActive =
              activeWorkflowId ===
              workflow.id;
            return (
              <div
                key={workflow.id}
                onClick={() =>
                  handleSelectWorkflow(
                    workflow.id,
                  )
                }
                className={`group relative flex flex-col gap-4 p-6 bg-secondary/30 rounded-2xl border transition-all cursor-pointer ${
                  isActive
                    ? "border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20"
                    : "border-border hover:border-gray-700 hover:bg-secondary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full transition-colors ${isActive ? "bg-amber-500 animate-pulse" : "bg-gray-700"}`}
                    />
                    <span className="font-semibold text-gray-100">
                      {workflow.name}
                    </span>
                    {workflow.id ===
                      "default" && (
                      <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                        System
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(workflow);
                      }}
                      className="h-8 w-8 text-gray-400 hover:text-white hover:bg-secondary"
                      title="Edit Workflow"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    {workflow.id !==
                      "default" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) =>
                          handleDelete(
                            workflow.id,
                            e,
                          )
                        }
                        className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-secondary"
                        title="Delete Workflow"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex justify-start">
                  <WorkflowPreview
                    items={
                      workflow.items
                    }
                    isActive={isActive}
                  />
                </div>

                {isActive && (
                  <div className="absolute -top-2 -right-2 bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                    ACTIVE
                  </div>
                )}
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}
