"use client";

import { useState } from "react";
import { KanbanBoard } from "@/components/Kanban";
import type { KanbanColumn, KanbanCard } from "@/types";

const initialColumns: KanbanColumn[] = [
  { id: "backlog", title: "Backlog", color: "gray" },
  { id: "todo", title: "To Do", color: "blue" },
  { id: "in-progress", title: "In Progress", color: "amber" },
  { id: "review", title: "Review", color: "purple" },
  { id: "done", title: "Done", color: "green" },
];

const initialCards: KanbanCard[] = [
  {
    id: "1",
    title: "Research competitors",
    description: "Analyze top 5 competitors and document their features",
    columnId: "backlog",
    labels: [{ id: "l1", name: "Research", color: "blue" }],
    assignees: [
      {
        id: "u1",
        name: "John Doe",
        avatar: "https://i.pravatar.cc/150?u=john",
      },
    ],
    priority: "low",
    order: 0,
  },
  {
    id: "2",
    title: "Design system setup",
    description:
      "Set up the design system with Figma and create component library",
    columnId: "backlog",
    labels: [
      { id: "l2", name: "Design", color: "pink" },
      { id: "l3", name: "Foundation", color: "violet" },
    ],
    assignees: [
      {
        id: "u2",
        name: "Jane Smith",
        avatar: "https://i.pravatar.cc/150?u=jane",
      },
    ],
    priority: "medium",
    order: 1,
  },
  {
    id: "3",
    title: "User authentication",
    description: "Implement OAuth2 login with Google and GitHub providers",
    columnId: "todo",
    labels: [
      { id: "l4", name: "Backend", color: "green" },
      { id: "l5", name: "Security", color: "red" },
    ],
    assignees: [
      {
        id: "u3",
        name: "Mike Johnson",
        avatar: "https://i.pravatar.cc/150?u=mike",
      },
      {
        id: "u1",
        name: "John Doe",
        avatar: "https://i.pravatar.cc/150?u=john",
      },
    ],
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    priority: "high",
    order: 0,
  },
  {
    id: "4",
    title: "Dashboard layout",
    description: "Create responsive dashboard with sidebar navigation",
    columnId: "todo",
    labels: [{ id: "l6", name: "Frontend", color: "cyan" }],
    assignees: [
      {
        id: "u2",
        name: "Jane Smith",
        avatar: "https://i.pravatar.cc/150?u=jane",
      },
    ],
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    priority: "medium",
    order: 1,
  },
  {
    id: "5",
    title: "API integration",
    description: "Connect frontend with REST API endpoints",
    columnId: "in-progress",
    labels: [
      { id: "l6", name: "Frontend", color: "cyan" },
      { id: "l4", name: "Backend", color: "green" },
    ],
    assignees: [
      {
        id: "u3",
        name: "Mike Johnson",
        avatar: "https://i.pravatar.cc/150?u=mike",
      },
    ],
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    priority: "urgent",
    order: 0,
  },
  {
    id: "6",
    title: "Database schema",
    description: "Design and implement PostgreSQL database schema",
    columnId: "in-progress",
    labels: [{ id: "l4", name: "Backend", color: "green" }],
    assignees: [
      {
        id: "u1",
        name: "John Doe",
        avatar: "https://i.pravatar.cc/150?u=john",
      },
    ],
    priority: "high",
    order: 1,
  },
  {
    id: "7",
    title: "Unit tests for auth",
    description: "Write comprehensive unit tests for authentication module",
    columnId: "review",
    labels: [{ id: "l7", name: "Testing", color: "orange" }],
    assignees: [
      {
        id: "u3",
        name: "Mike Johnson",
        avatar: "https://i.pravatar.cc/150?u=mike",
      },
    ],
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Overdue
    priority: "medium",
    order: 0,
  },
  {
    id: "8",
    title: "Project setup",
    description: "Initialize monorepo with Turborepo and configure CI/CD",
    columnId: "done",
    labels: [{ id: "l8", name: "DevOps", color: "indigo" }],
    assignees: [
      {
        id: "u1",
        name: "John Doe",
        avatar: "https://i.pravatar.cc/150?u=john",
      },
      {
        id: "u2",
        name: "Jane Smith",
        avatar: "https://i.pravatar.cc/150?u=jane",
      },
      {
        id: "u3",
        name: "Mike Johnson",
        avatar: "https://i.pravatar.cc/150?u=mike",
      },
    ],
    priority: "high",
    order: 0,
  },
  {
    id: "9",
    title: "Landing page",
    description: "Design and implement marketing landing page",
    columnId: "done",
    labels: [
      { id: "l2", name: "Design", color: "pink" },
      { id: "l6", name: "Frontend", color: "cyan" },
    ],
    assignees: [
      {
        id: "u2",
        name: "Jane Smith",
        avatar: "https://i.pravatar.cc/150?u=jane",
      },
    ],
    priority: "low",
    order: 1,
  },
];

export default function Home() {
  const [columns] = useState<KanbanColumn[]>(initialColumns);
  const [cards, setCards] = useState<KanbanCard[]>(initialCards);

  const handleCardMove = (
    cardId: string,
    sourceColumnId: string,
    targetColumnId: string,
  ) => {
    setCards((prevCards) =>
      prevCards.map((card) =>
        card.id === cardId ? { ...card, columnId: targetColumnId } : card,
      ),
    );
  };

  const handleCardClick = (card: KanbanCard) => {
    console.log("Card clicked:", card);
  };

  const handleCardEdit = (card: KanbanCard) => {
    console.log("Edit card:", card);
  };

  const handleCardDelete = (cardId: string) => {
    setCards((prevCards) => prevCards.filter((card) => card.id !== cardId));
  };

  const handleAddCard = (columnId: string) => {
    const newCard: KanbanCard = {
      id: `card-${Date.now()}`,
      title: "New Task",
      description: "Click to edit this task",
      columnId,
      order: cards.filter((c) => c.columnId === columnId).length,
    };
    setCards((prevCards) => [...prevCards, newCard]);
  };

  return (
    <main className="h-screen flex flex-col">
      <header className="border-b px-6 py-4 shrink-0">
        <h1 className="text-2xl font-bold">✨ Beautiful Kanban Board</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Drag and drop cards between columns. Try the demo!
        </p>
      </header>
      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          columns={columns}
          cards={cards}
          onCardMove={handleCardMove}
          onCardClick={handleCardClick}
          onCardEdit={handleCardEdit}
          onCardDelete={handleCardDelete}
          onAddCard={handleAddCard}
        />
      </div>
    </main>
  );
}
