import type {
  KanbanColumn as KanbanColumnType,
  KanbanCard as KanbanCardType,
} from "@/types";
interface KanbanColumnProps {
  column: KanbanColumnType;
  cards: KanbanCardType[];
  onAddCard?: (columnId: string) => void;
  onCardEdit?: (card: KanbanCardType) => void;
  onCardDelete?: (cardId: string) => void;
  onCardClick?: (card: KanbanCardType) => void;
}
export declare function KanbanColumn({
  column,
  cards,
  onAddCard,
  onCardEdit,
  onCardDelete,
  onCardClick,
}: KanbanColumnProps): JSX.Element;
export {};
