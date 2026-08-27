import { buildSeedTasks } from './seed';

// Stand-in for the Google Tasks integration.
//
// The real build authenticates with a long-lived OAuth refresh token and calls
// tasks.googleapis.com from the server. This demo has no Google account and no
// secrets, so the same surface — list open tasks, complete one, snooze one —
// is served from an in-memory list seeded in lib/demo/seed.ts.
//
// Everything downstream is unchanged: lib/taskLinking.ts still matches task
// text to properties by street number + street name, the widget still renders
// the link chips, and completing or snoozing a task still mutates real state.
// It just resets on reload like the rest of the demo.

export interface TaskItem {
  id: string;
  tasklistId: string;
  tasklistTitle: string;
  title: string;
  notes: string;
  /** YYYY-MM-DD — the Tasks API drops the time component of due dates. */
  due: string | null;
  /** Gmail permalink when the task was created via "Add to Tasks" in Gmail. */
  emailLink: string | null;
  /** Subject line of the linked email (from the link description). */
  emailSubject: string | null;
  updated: string;
}

let open: TaskItem[] = [];

function seed(): void {
  open = buildSeedTasks();
}

seed();

/** All open tasks, overdue/soonest first, undated last — mirrors the real client's ordering. */
export async function listOpenTasks(): Promise<TaskItem[]> {
  return [...open].sort((a, b) => {
    if (a.due && b.due) return a.due.localeCompare(b.due);
    if (a.due) return -1;
    if (b.due) return 1;
    return b.updated.localeCompare(a.updated);
  });
}

/** Completing a task removes it from the open list, as it would in Google Tasks. */
export async function completeTask(taskId: string): Promise<void> {
  open = open.filter(t => t.id !== taskId);
}

export async function setTaskDue(taskId: string, due: string): Promise<TaskItem | null> {
  const task = open.find(t => t.id === taskId);
  if (!task) return null;
  task.due = due;
  task.updated = new Date().toISOString();
  return { ...task };
}

export function resetTasks(): void {
  seed();
}
