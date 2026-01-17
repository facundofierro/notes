'use client';

import * as React from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, TooltipProvider } from '@agelum/shadcn';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCardOverlay } from './KanbanCard';
import type {
  KanbanBoardProps,
  KanbanCard as KanbanCardType,
  KanbanColumn as KanbanColumnType,
} from '@/types';

export function KanbanBoard({
  columns,
  cards,
  onCardMove,
  onCardClick,
  onCardEdit,
  onCardDelete,
  onAddCard,
  onColumnAdd,
  renderCard,
  className,
}: KanbanBoardProps) {
  const [activeCard, setActiveCard] = React.useState<KanbanCardType | null>(null);
  const [localCards, setLocalCards] = React.useState(cards);

  // Update local cards when props change
  React.useEffect(() => {
    setLocalCards(cards);
  }, [cards]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const getCardsByColumnId = React.useCallback(
    (columnId: string) => {
      return localCards
        .filter((card) => card.columnId === columnId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },
    [localCards]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = localCards.find((c) => c.id === active.id);
    if (card) {
      setActiveCard(card);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeCard = localCards.find((c) => c.id === activeId);
    if (!activeCard) return;

    // Check if we're over a column
    const overColumn = columns.find((c) => c.id === overId);
    const overCard = localCards.find((c) => c.id === overId);

    const targetColumnId = overColumn?.id || overCard?.columnId;

    if (targetColumnId && activeCard.columnId !== targetColumnId) {
      setLocalCards((cards) =>
        cards.map((card) =>
          card.id === activeId ? { ...card, columnId: targetColumnId } : card
        )
      );
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeCard = localCards.find((c) => c.id === activeId);
    if (!activeCard) return;

    // Get the target column
    const overColumn = columns.find((c) => c.id === overId);
    const overCard = localCards.find((c) => c.id === overId);
    const targetColumnId = overColumn?.id || overCard?.columnId || activeCard.columnId;

    // If moved to a different column, call onCardMove
    if (activeCard.columnId !== targetColumnId) {
      onCardMove?.(activeId, activeCard.columnId, targetColumnId);
    }

    // Reorder within column
    if (overCard && activeCard.columnId === overCard.columnId) {
      const columnCards = getCardsByColumnId(activeCard.columnId);
      const oldIndex = columnCards.findIndex((c) => c.id === activeId);
      const newIndex = columnCards.findIndex((c) => c.id === overId);

      if (oldIndex !== newIndex) {
        const reorderedCards = arrayMove(columnCards, oldIndex, newIndex);
        setLocalCards((cards) => {
          const otherCards = cards.filter((c) => c.columnId !== activeCard.columnId);
          return [...otherCards, ...reorderedCards];
        });
      }
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          className={cn(
            'flex h-full gap-3 p-4 bg-transparent',
            className
          )}
        >
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              cards={getCardsByColumnId(column.id)}
              onAddCard={onAddCard}
              onCardEdit={onCardEdit}
              onCardDelete={onCardDelete}
              onCardClick={onCardClick}
            />
          ))}

          {/* Add Column Button */}
          {onColumnAdd && (
            <div className="flex-shrink-0 flex-1 min-w-[200px]">
              <Button
                variant="ghost"
                className="h-12 w-full gap-2 border border-dashed border-border/40 rounded-2xl text-muted-foreground hover:text-foreground hover:border-border/60 hover:bg-muted/30 transition-all"
                onClick={onColumnAdd}
              >
                <Plus className="h-4 w-4" />
                Add column
              </Button>
            </div>
          )}
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
          {activeCard && <KanbanCardOverlay card={activeCard} />}
        </DragOverlay>
      </DndContext>
    </TooltipProvider>
  );
}

export { KanbanColumn } from './KanbanColumn';
export { KanbanCard, KanbanCardOverlay } from './KanbanCard';
