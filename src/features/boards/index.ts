// Public API of the boards feature. Boards remain a cross-cutting filter
// used by several other features (history, incidents, maintenance) — see
// AGENTS.md — those features import the shared `@/types/board` Board type
// directly rather than through this barrel.
export { default as AddServiceModal } from "./components/AddServiceModal";
export { default as BoardActiveIncidentsPanel } from "./components/BoardActiveIncidentsPanel";
export { default as BoardActiveMaintenancePanel } from "./components/BoardActiveMaintenancePanel";
export { default as BoardCard } from "./components/BoardCard";
export { default as BoardDetailContent } from "./components/BoardDetailContent";
export { default as BoardsPageContent } from "./components/BoardsPageContent";
export { default as BoardSuggestedServices } from "./components/BoardSuggestedServices";
export { default as BoardTrackedServicesGrid } from "./components/BoardTrackedServicesGrid";
export { default as CreateBoardForm } from "./components/CreateBoardForm";
export { default as CreateBoardModal } from "./components/CreateBoardModal";
export { useBoardRename } from "./hooks/useBoardRename";
// useAddServiceToBoard is deliberately NOT re-exported here — see its own
// file header. It must be imported by its direct path
// (@/features/boards/hooks/useAddServiceToBoard), never through this
// barrel, which also re-exports services/boards.ts's server-only code.
export * from "./services/boards";
export * from "./services/isActiveIncident";
