"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  KanbanBoard,
  type KanbanCardType,
  type KanbanColumnType,
} from "@agelum/kanban";

interface Task {
  id: string;
  title: string;
  description: string;
  state: "backlog" | "priority" | "fixes" | "pending" | "doing" | "done" | "inbox";
  createdAt: string;
  epic?: string;
  assignee?: string;
  reporter?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  sourceUrl?: string;
  path?: string;
}

const columns: KanbanColumnType[] = [
  {
    id: "inbox",
    title: "Inbox",
    color: "sky",
    order: 0,
    narrow: true,
  },
  {
    id: "backlog",
    title: "Backlog",
    color: "gray",
    order: 1,
  },
  {
    id: "fixes",
    title: "Fixes",
    color: "red",
    order: 2,
  },
  {
    id: "pending",
    title: "Pending",
    color: "yellow",
    order: 3,
  },
  {
    id: "doing",
    title: "Doing",
    color: "green",
    order: 4,
  },
  {
    id: "done",
    title: "Done",
    color: "gray",
    order: 5,
  },
];

interface TaskKanbanProps {
  repo: string;
  onTaskSelect: (task: Task) => void;
  onCreateTask?: (opts: { state: Task["state"] }) => void;
}

export default function TaskKanban({
  repo,
  onTaskSelect,
  onCreateTask,
}: TaskKanbanProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchTasks = useCallback(async () => {
    const res = await fetch(`/api/tasks?repo=${encodeURIComponent(repo)}`);
    const data = await res.json();
    setTasks(data.tasks || []);
  }, [repo]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks, refreshKey]);

  const cards = useMemo<KanbanCardType[]>(() => {
    // Separate tasks by column to handle 'done' specially
    const otherTasks = tasks.filter((t) => t.state !== "done" && t.state !== "inbox");
    const inboxTasks = tasks.filter((t) => t.state === "inbox");
    let doneTasks = tasks.filter((t) => t.state === "done");

    // Sort done tasks by timestamp in title (descending)
    // Format: YY_MM_DD-HHMMSS-TaskName
    const parseDateFromTitle = (title: string): number => {
      const regex = /^(\d{2})_(\d{2})_(\d{2})-(\d{2})(\d{2})(\d{2})-(.*)$/;
      const match = title.match(regex);
      if (match) {
        const [_, year, month, day, hour, minute, second] = match;
        const date = new Date(
          2000 + parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second),
        );
        return date.getTime();
      }
      return 0; // Fallback for sorting if no date found
    };

    doneTasks = doneTasks.sort((a, b) => {
      const dateA =
        parseDateFromTitle(a.title) || new Date(a.createdAt).getTime();
      const dateB =
        parseDateFromTitle(b.title) || new Date(b.createdAt).getTime();
      return dateB - dateA; // Newest first
    });

    // Limit to 10
    doneTasks = doneTasks.slice(0, 10);

    const allVisibleTasks = [...inboxTasks, ...otherTasks, ...doneTasks];

    // Re-assign order based on the new sorted list for 'done' column
    // For other columns, we keep existing order (based on index in original list effectively)
    // actually original code used `index` as order which is implicitly the creation/fetch order
    // We should map them to KanbanCardType

    return allVisibleTasks.map((task, index) => {
      const isInbox = task.state === "inbox";
      const descriptionParts = [
        task.description,
        task.epic ? `Epic: ${task.epic}` : null,
        task.assignee ? `Assignee: ${task.assignee}` : null,
        isInbox && task.sourceUrl ? `From: ${task.sourceUrl}` : null,
      ].filter(Boolean);

      return {
        id: task.id,
        title: task.title,
        description: descriptionParts.join("\n"),
        columnId: task.state,
        order: index,
        priority: task.priority,
        assignees: isInbox && task.reporter
          ? [{ id: task.reporter, name: task.reporter }]
          : undefined,
      };
    });
  }, [tasks]);

  const handleAddCard = useCallback(
    (columnId: string) => {
      onCreateTask?.({
        state: columnId as Task["state"],
      });
    },
    [onCreateTask],
  );

  const handleCardMove = useCallback(
    async (cardId: string, fromState: string, toState: string) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === cardId
            ? {
                ...t,
                state: toState as Task["state"],
              }
            : t,
        ),
      );

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repo,
          action: "move",
          taskId: cardId,
          fromState,
          toState,
        }),
      });

      if (!res.ok) {
        setRefreshKey((k) => k + 1);
        const data = await res.json();
        throw new Error(data.error || "Failed to move task");
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
        onCardClick={(card: KanbanCardType) => {
          const task = tasks.find((t) => t.id === card.id);
          if (task) onTaskSelect(task);
        }}
        onCardEdit={(card: KanbanCardType) => {
          const task = tasks.find((t) => t.id === card.id);
          if (task) onTaskSelect(task);
        }}
        key={refreshKey}
      />
    </div>
  );
}
