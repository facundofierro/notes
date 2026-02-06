"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  KanbanBoard,
  type KanbanCardType,
  type KanbanColumnType,
} from "@agelum/kanban";

interface Task {
  id: string;
  title: string;
  description: string;
  state:
    | "backlog"
    | "priority"
    | "fixes"
    | "pending"
    | "doing"
    | "done";
  createdAt: string;
  epic?: string;
  assignee?: string;
  path?: string;
}

const columns: KanbanColumnType[] = [
  {
    id: "backlog",
    title: "Backlog",
    color: "gray",
    order: 0,
  },
  {
    id: "fixes",
    title: "Fixes",
    color: "red",
    order: 1,
  },
  {
    id: "pending",
    title: "Pending",
    color: "yellow",
    order: 2,
  },
  {
    id: "doing",
    title: "Doing",
    color: "green",
    order: 3,
  },
  {
    id: "done",
    title: "Done",
    color: "gray",
    order: 4,
  },
];

interface TaskKanbanProps {
  repo: string;
  onTaskSelect: (task: Task) => void;
  onCreateTask?: (opts: {
    state: Task["state"];
  }) => void;
}

export default function TaskKanban({
  repo,
  onTaskSelect,
  onCreateTask,
}: TaskKanbanProps) {
  const [tasks, setTasks] = useState<
    Task[]
  >([]);
  const [refreshKey, setRefreshKey] =
    useState(0);

  const fetchTasks =
    useCallback(async () => {
      const res = await fetch(
        `/api/tasks?repo=${encodeURIComponent(repo)}`,
      );
      const data = await res.json();
      setTasks(data.tasks || []);
    }, [repo]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks, refreshKey]);

  const cards = useMemo<
    KanbanCardType[]
  >(() => {
    return tasks.map((task, index) => ({
      id: task.id,
      title: task.title,
      description: [
        task.description,
        task.epic
          ? `Epic: ${task.epic}`
          : null,
        task.assignee
          ? `Assignee: ${task.assignee}`
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
      columnId: task.state,
      order: index,
    }));
  }, [tasks]);

  const handleAddCard = useCallback(
    (columnId: string) => {
      onCreateTask?.({
        state:
          columnId as Task["state"],
      });
    },
    [onCreateTask],
  );

  const handleCardMove = useCallback(
    async (
      cardId: string,
      fromState: string,
      toState: string,
    ) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === cardId
            ? {
                ...t,
                state:
                  toState as Task["state"],
              }
            : t,
        ),
      );

      const res = await fetch(
        "/api/tasks",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            repo,
            action: "move",
            taskId: cardId,
            fromState,
            toState,
          }),
        },
      );

      if (!res.ok) {
        setRefreshKey((k) => k + 1);
        const data = await res.json();
        throw new Error(
          data.error ||
            "Failed to move task",
        );
      }

      setRefreshKey((k) => k + 1);
    },
    [repo],
  );

  return (
    <div className="h-full">
      <KanbanBoard
        columns={columns}
        cards={cards}
        onAddCard={handleAddCard}
        onCardMove={handleCardMove}
        onCardClick={(
          card: KanbanCardType,
        ) => {
          const task = tasks.find(
            (t) => t.id === card.id,
          );
          if (task) onTaskSelect(task);
        }}
        onCardEdit={(
          card: KanbanCardType,
        ) => {
          const task = tasks.find(
            (t) => t.id === card.id,
          );
          if (task) onTaskSelect(task);
        }}
        key={refreshKey}
      />
    </div>
  );
}
