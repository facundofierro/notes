export type KanbanColumnColor =
  | "gray"
  | "red"
  | "orange"
  | "amber"
  | "yellow"
  | "lime"
  | "green"
  | "emerald"
  | "teal"
  | "cyan"
  | "sky"
  | "blue"
  | "indigo"
  | "violet"
  | "purple"
  | "fuchsia"
  | "pink"
  | "rose";
export interface KanbanLabel {
  id: string;
  name: string;
  color: KanbanColumnColor;
}
export interface KanbanAssignee {
  id: string;
  name: string;
  avatar?: string;
}
export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  columnId: string;
  labels?: KanbanLabel[];
  assignees?: KanbanAssignee[];
  dueDate?: Date;
  priority?: "low" | "medium" | "high" | "urgent";
  order?: number;
}
export interface KanbanColumn {
  id: string;
  title: string;
  color?: KanbanColumnColor;
  order?: number;
}
export interface KanbanBoardProps {
  columns: KanbanColumn[];
  cards: KanbanCard[];
  onCardMove?: (
    cardId: string,
    sourceColumnId: string,
    targetColumnId: string,
  ) => void;
  onCardClick?: (card: KanbanCard) => void;
  onCardEdit?: (card: KanbanCard) => void;
  onCardDelete?: (cardId: string) => void;
  onAddCard?: (columnId: string) => void;
  onColumnAdd?: () => void;
  renderCard?: (card: KanbanCard) => React.ReactNode;
  className?: string;
}
