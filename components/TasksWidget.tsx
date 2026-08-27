import { useRef, useState } from 'react';
import Link from 'next/link';
import GlassSurface from '@/components/GlassSurface';
import Icon from '@/components/Icon';
import * as api from '@/lib/demo/api';
import { shared, color } from '@/lib/tokens';
import type { LinkedTask } from '@/lib/taskLinking';

const COLLAPSED_COUNT = 5;

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(base: string, days: number): string {
  const d = new Date(`${base}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dueMeta(due: string | null): { label: string; hex: string } | null {
  if (!due) return null;
  const today = todayISO();
  if (due < today) return { label: 'overdue', hex: color.red };
  if (due === today) return { label: 'today', hex: color.orange };
  if (due === addDays(today, 1)) return { label: 'tomorrow', hex: color.orange };
  const d = new Date(`${due}T00:00:00`);
  return { label: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), hex: 'rgba(255,255,255,0.45)' };
}

/**
 * Task panel. In the full product these come from Google Tasks — including
 * tasks created in Gmail via "Add to Tasks", which carry a link back to the
 * email. Here they're sample tasks held in memory (lib/demo/tasks.ts); the
 * behaviour around them is unchanged.
 *
 * Tasks whose text mentions a street number + name get linked to that property
 * (see lib/taskLinking.ts). On the dashboard the link renders as a chip jumping
 * to the property page; with a `propertyId` prop the widget instead shows only
 * that property's tasks (property page mode).
 */
export default function TasksWidget({ propertyId }: { propertyId?: string }) {
  const [tasks, setTasks] = useState<LinkedTask[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const loadedRef = useRef(false);

  async function load() {
    loadedRef.current = true;
    setLoading(true);
    setLoadError(false);
    try {
      const all = await api.listTasks();
      setTasks(propertyId ? all.filter(t => t.propertyId === propertyId) : all);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  // The panel starts minimised and nobody has loaded yet — the first time a
  // user opens it triggers this, so an unopened widget never does the work.
  function ensureLoaded() {
    if (!loadedRef.current) load();
  }

  async function patchTask(task: LinkedTask, body: { completed?: boolean; due?: string }) {
    setBusyId(task.id);
    const prev = tasks;
    // Optimistic: completing removes the row, snoozing moves its due date.
    setTasks(t =>
      t?.filter(x => !(body.completed && x.id === task.id))
        .map(x => (x.id === task.id && body.due ? { ...x, due: body.due } : x)) ?? null
    );
    try {
      await api.patchTask(task.id, body);
    } catch {
      setTasks(prev); // revert — the change didn't take
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <TaskPanel
        propertyId={propertyId}
        busyId={busyId}
        loading={loading}
        loadError={loadError}
        onOpen={ensureLoaded}
        onPatch={patchTask}
        onRefresh={load}
        title={propertyId ? 'Linked tasks' : 'Tasks'}
        tasks={tasks}
        emptyText={propertyId
          ? 'No tasks linked to this property. Mention the street number and name (e.g. "24 Sandpiper") in a task to link it.'
          : 'All clear, no open tasks.'}
      />
    </div>
  );
}

interface PanelProps {
  title: string;
  tasks: LinkedTask[] | null;
  emptyText: string;
  propertyId?: string;
  busyId: string | null;
  loading: boolean;
  loadError: boolean;
  onOpen: () => void;
  onPatch: (task: LinkedTask, body: { completed?: boolean; due?: string }) => void;
  onRefresh: () => void;
}

// Starts minimised and doesn't know its task data until the first open —
// that first open is also what triggers the load (see onOpen).
function TaskPanel({ title, tasks, emptyText, propertyId, busyId, loading, loadError, onOpen, onPatch, onRefresh }: PanelProps) {
  const [minimized, setMinimized] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const loaded = tasks !== null;
  const visible = loaded ? (expanded ? tasks : tasks.slice(0, COLLAPSED_COUNT)) : [];
  const overdueCount = loaded ? tasks.filter(t => t.due && t.due < todayISO()).length : 0;

  function toggle() {
    if (minimized) onOpen();
    setMinimized(m => !m);
  }

  return (
    <GlassSurface borderRadius={16} backgroundOpacity={0.05} style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 30, marginBottom: minimized || (loaded && !tasks.length) ? 0 : 12 }}>
        <button
          onClick={toggle}
          aria-expanded={!minimized}
          title={minimized ? 'Expand' : 'Minimise'}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'inherit', minWidth: 0 }}
        >
          <span
            style={{
              color: 'rgba(255,255,255,0.45)', display: 'inline-flex', flexShrink: 0,
              transform: minimized ? 'none' : 'rotate(90deg)', transition: 'transform 0.2s ease',
            }}
          >
            <Icon name="chevron-right" size={15} />
          </span>
          <span style={{ ...shared.cardLabel, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}{loaded && ` · ${tasks.length} open`}
            {overdueCount > 0 && <span style={{ color: color.red }}> · {overdueCount} overdue</span>}
          </span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            className="btn-ghost"
            style={{ ...shared.buttonGhost, padding: '5px 9px', fontSize: 11 }}
            onClick={onRefresh}
            title="Reload tasks"
            aria-label="Reload tasks"
          >
            <Icon name="refresh" size={13} />
          </button>
        </div>
      </div>

      {!minimized && loadError && (
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
          Couldn&apos;t load tasks.{' '}
          <button className="btn-ghost" style={{ ...shared.buttonGhost, padding: '3px 8px', fontSize: 11, marginLeft: 6 }} onClick={onRefresh}>Retry</button>
        </p>
      )}

      {!minimized && !loadError && (!loaded || loading) && (
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)' }}>Loading tasks…</p>
      )}

      {!minimized && !loadError && loaded && !loading && tasks.length === 0 && (
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)' }}>{emptyText}</p>
      )}

      {!minimized && !loadError && loaded && !loading && tasks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {visible.map(task => {
            const due = dueMeta(task.due);
            const busy = busyId === task.id;
            return (
              <div
                key={`${task.tasklistId}:${task.id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                  borderTop: '1px solid rgba(255,255,255,0.06)', opacity: busy ? 0.5 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={false}
                  disabled={busy}
                  onChange={() => onPatch(task, { completed: true })}
                  title="Mark done"
                  style={{ accentColor: color.sky, width: 15, height: 15, cursor: 'pointer', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {task.title}
                  </p>
                  {task.propertyId && !propertyId && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2, minWidth: 0 }}>
                      <Link
                        href={`/property/${task.propertyId}`}
                        title={task.propertyAddress ?? undefined}
                        className="menu-item"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: 10.5, fontWeight: 700, color: color.skyLight, textDecoration: 'none',
                          background: 'rgba(62,182,240,0.12)', border: '1px solid rgba(62,182,240,0.35)',
                          borderRadius: 999, padding: '2px 9px', whiteSpace: 'nowrap', overflow: 'hidden',
                          textOverflow: 'ellipsis', flexShrink: 0, maxWidth: 220,
                        }}
                      >
                        <Icon name="home" size={11} />
                        {task.propertyAddress?.split(',')[0]}
                        <Icon name="chevron-right" size={10} />
                      </Link>
                    </div>
                  )}
                </div>
                {due && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: due.hex, flexShrink: 0 }}>{due.label}</span>
                )}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    className="btn-ghost"
                    style={{ ...shared.buttonGhost, padding: '3px 8px', fontSize: 10 }}
                    disabled={busy}
                    title="Snooze to tomorrow"
                    onClick={() => onPatch(task, { due: addDays(todayISO(), 1) })}
                  >
                    +1d
                  </button>
                  <button
                    className="btn-ghost"
                    style={{ ...shared.buttonGhost, padding: '3px 8px', fontSize: 10 }}
                    disabled={busy}
                    title="Snooze one week"
                    onClick={() => onPatch(task, { due: addDays(todayISO(), 7) })}
                  >
                    +1w
                  </button>
                </div>
              </div>
            );
          })}

          {tasks.length > COLLAPSED_COUNT && (
            <button
              className="btn-ghost"
              style={{ ...shared.buttonGhost, padding: '6px 10px', fontSize: 11, marginTop: 8, alignSelf: 'flex-start' }}
              onClick={() => setExpanded(e => !e)}
            >
              {expanded ? 'Show less' : `Show all ${tasks.length}`}
            </button>
          )}
        </div>
      )}
    </GlassSurface>
  );
}
