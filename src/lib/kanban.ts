// Task Manager (Kanban) — exactly four permanent, hardcoded lists, identical
// across every org. Not renameable/deletable/archivable (§5 of the brief).
export const KANBAN_LISTS = [
  { key: 'new', label: 'New' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'stalled', label: 'Stalled' },
  { key: 'completed', label: 'Completed' },
] as const

export type KanbanListKey = typeof KANBAN_LISTS[number]['key']

// Badge shown on a completed card, from the initials of the list it was
// checked from (New -> "N", In Progress -> "IP", Stalled -> "ST").
export const ORIGIN_BADGE: Record<string, string> = {
  new: 'N',
  in_progress: 'IP',
  stalled: 'ST',
}
