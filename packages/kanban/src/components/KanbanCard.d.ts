import type { KanbanCard as KanbanCardType } from "@/types";
interface KanbanCardProps {
  card: KanbanCardType;
  onEdit?: (card: KanbanCardType) => void;
  onDelete?: (cardId: string) => void;
  onClick?: (card: KanbanCardType) => void;
  isDragging?: boolean;
  isOverlay?: boolean;
}
export declare function KanbanCard({
  card,
  onEdit,
  onDelete,
  onClick,
  isDragging,
  isOverlay,
}: KanbanCardProps): JSX.Element;
export declare function KanbanCardOverlay({
  card,
}: {
  card: KanbanCardType;
}): JSX.Element;
export {};
