"use client";

import {
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  KanbanBoard,
  type KanbanCardType,
  type KanbanColumnType,
} from "@agelum/kanban";

interface Epic {
  id: string;
  title: string;
  description: string;
  state:
    | "backlog"
    | "priority"
    | "pending"
    | "doing"
    | "done";
  createdAt: string;
  path: string;
}

const columns: KanbanColumnType[] = [
  {
    id: "backlog",
    title: "Backlog",
    color: "gray",
    order: 0,
  },
  {
    id: "priority",
    title: "Bugs",
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

interface EpicsKanbanProps {
  repo: string;
  onEpicSelect: (epic: Epic) => void;
  onCreateEpic?: (opts: {
    state: Epic["state"];
  }) => void;
}

export default function EpicsKanban({
  repo,
  onEpicSelect,
  onCreateEpic,
}: EpicsKanbanProps) {
  const [epics, setEpics] = useState<
    Epic[]
  >([]);
  const [refreshKey, setRefreshKey] =
    useState(0);

  const fetchEpics =
    useCallback(async () => {
      const res = await fetch(
        `/api/epics?repo=${encodeURIComponent(repo)}`,
      );
      const data = await res.json();
      setEpics(data.epics || []);
    }, [repo]);

  useEffect(() => {
    fetchEpics();
  }, [fetchEpics, refreshKey]);

  const cards =
    epics.map<KanbanCardType>(
      (epic, index) => ({
        id: epic.id,
        title: epic.title,
        description: epic.description,
        columnId: epic.state,
        order: index,
      }),
    );

  const handleAddCard = useCallback(
    (columnId: string) => {
      onCreateEpic?.({
        state:
          columnId as Epic["state"],
      });
    },
    [onCreateEpic],
  );

  const handleCardMove = useCallback(
    async (
      cardId: string,
      fromState: string,
      toState: string,
    ) => {
      setEpics((prev) =>
        prev.map((e) =>
          e.id === cardId
            ? {
                ...e,
                state:
                  toState as Epic["state"],
              }
            : e,
        ),
      );

      const res = await fetch(
        "/api/epics",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            repo,
            action: "move",
            epicId: cardId,
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
            "Failed to move epic",
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
          const epic = epics.find(
            (e) => e.id === card.id,
          );
          if (epic) onEpicSelect(epic);
        }}
        onCardEdit={(
          card: KanbanCardType,
        ) => {
          const epic = epics.find(
            (e) => e.id === card.id,
          );
          if (epic) onEpicSelect(epic);
        }}
        key={refreshKey}
      />
    </div>
  );
}
