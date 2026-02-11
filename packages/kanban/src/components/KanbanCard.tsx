"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { KanbanCard as KanbanCardType, KanbanColumnColor } from "@/types";

interface KanbanCardProps {
  card: KanbanCardType;
  onEdit?: (card: KanbanCardType) => void;
  onDelete?: (cardId: string) => void;
  onClick?: (card: KanbanCardType) => void;
  isDragging?: boolean;
  isOverlay?: boolean;
}

const priorityConfig = {
  low: { label: "Low", color: "text-muted-foreground" },
  medium: { label: "Medium", color: "text-blue-500" },
  high: { label: "High", color: "text-orange-500" },
  urgent: { label: "Urgent", color: "text-red-500" },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `${Math.abs(diffDays)}d overdue`;
  } else if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Tomorrow";
  } else if (diffDays <= 7) {
    return `${diffDays}d`;
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
}

// Helper to parse title with date pattern: YY_MM_DD-HHMMSS-TaskName
function parseTaskTitle(title: string) {
  const regex = /^(\d{2})_(\d{2})_(\d{2})-(\d{2})(\d{2})(\d{2})-(.*)$/;
  const match = title.match(regex);

  if (match) {
    const [_, year, month, day, hour, minute, second, restOfTitle] = match;
    // Assume 20xx for year
    const date = new Date(
      2000 + parseInt(year),
      parseInt(month) - 1, // Month is 0-indexed
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second),
    );

    // Format date nicely: Feb 7, 09:21 AM
    const formattedDate = date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return {
      displayTitle: restOfTitle,
      parsedDate: formattedDate,
    };
  }

  return { displayTitle: title, parsedDate: null };
}

export function KanbanCard({
  card,
  onEdit,
  onDelete,
  onClick,
  isDragging,
  isOverlay,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: "card",
      card,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const isCurrentlyDragging = isDragging || isSortableDragging;
  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date();

  /* Only parse date for 'done' column as requested */
  const { displayTitle, parsedDate } =
    card.columnId === "done"
      ? parseTaskTitle(card.title)
      : { displayTitle: card.title, parsedDate: null };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex flex-col gap-2.5 rounded-xl p-3.5 transition-all duration-200",
        "bg-card",
        "border border-border",
        "shadow-sm shadow-black/10",
        "hover:shadow-lg hover:shadow-black/20 hover:border-muted-foreground/60 hover:bg-secondary",
        isCurrentlyDragging &&
          "opacity-50 shadow-xl scale-[1.02] ring-2 ring-blue-500/40 border-blue-500/30",
        isOverlay && "rotate-2 shadow-2xl scale-105 border-blue-400/50",
        onClick && "cursor-pointer",
        !isCurrentlyDragging && "cursor-grab active:cursor-grabbing",
      )}
      onClick={() => onClick?.(card)}
      {...attributes}
      {...listeners}
    >
      {/* Labels */}
      {card.labels && card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.labels.map((label) => (
            <Badge
              key={label.id}
              variant={label.color as KanbanColumnColor}
              className="text-[10px] px-2 py-0.5 rounded-md font-normal"
            >
              {label.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Date Badge if parsed */}
      {parsedDate && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1 select-none w-fit px-1.5 py-0.5 rounded bg-muted/50 border border-border/50">
          <Clock className="w-3 h-3" />
          <span>{parsedDate}</span>
        </div>
      )}

      {/* Title */}
      <h4 className="text-[13px] font-medium leading-snug text-foreground">
        {displayTitle}
      </h4>

      {/* Description */}
      {card.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {card.description}
        </p>
      )}

      {/* Footer: Priority, Due Date, Assignees */}
      {(card.priority ||
        card.dueDate ||
        (card.assignees && card.assignees.length > 0)) && (
        <div className="flex items-center justify-between gap-2 pt-1.5 mt-0.5">
          <div className="flex items-center gap-2.5">
            {/* Priority */}
            {card.priority && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "flex items-center",
                      priorityConfig[card.priority].color,
                    )}
                  >
                    <AlertCircle className="h-3 w-3" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="rounded-lg">
                  {priorityConfig[card.priority].label} Priority
                </TooltipContent>
              </Tooltip>
            )}

            {/* Due Date */}
            {card.dueDate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "flex items-center gap-1 text-[11px]",
                      isOverdue
                        ? "text-destructive"
                        : "text-muted-foreground/70",
                    )}
                  >
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(new Date(card.dueDate))}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="rounded-lg">
                  Due: {new Date(card.dueDate).toLocaleDateString()}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Assignees */}
          {card.assignees && card.assignees.length > 0 && (
            <div className="flex -space-x-1.5">
              {card.assignees.slice(0, 3).map((assignee) => (
                <Tooltip key={assignee.id}>
                  <TooltipTrigger asChild>
                    <Avatar className="h-5 w-5 border-2 border-card rounded-full">
                      {assignee.avatar && (
                        <AvatarImage
                          src={assignee.avatar}
                          alt={assignee.name}
                        />
                      )}
                      <AvatarFallback className="text-[9px] bg-muted/80">
                        {getInitials(assignee.name)}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent className="rounded-lg">
                    {assignee.name}
                  </TooltipContent>
                </Tooltip>
              ))}
              {card.assignees.length > 3 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="h-5 w-5 border-2 border-card rounded-full">
                      <AvatarFallback className="text-[9px] bg-muted/60">
                        +{card.assignees.length - 3}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent className="rounded-lg">
                    {card.assignees
                      .slice(3)
                      .map((a) => a.name)
                      .join(", ")}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function KanbanCardOverlay({ card }: { card: KanbanCardType }) {
  return <KanbanCard card={card} isOverlay />;
}
