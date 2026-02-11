import type { KanbanBoardProps } from "@/types";
export declare function KanbanBoard({
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
}: KanbanBoardProps): JSX.Element;
export { KanbanColumn } from "./KanbanColumn";
export { KanbanCard, KanbanCardOverlay } from "./KanbanCard";
