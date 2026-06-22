// Mirrors the storage shape TodaysEntry.jsx already uses, so admin-entered
// data and an employee's own entries are the exact same record, not two


export const dateKeyFor = (date) => date.toISOString().slice(0, 10); // "2026-06-16"

export const timesheetStorageKey = (userId, dateKey) => `crm_timesheet_${userId}_${dateKey}`;

export const defaultTimesheetEntry = () => ({
  checkIn: null,
  checkOut: null,
  breaks: [],
  activeBreak: null,
});

export function loadTimesheetEntry(userId, dateKey) {
  const key = timesheetStorageKey(userId, dateKey);
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveTimesheetEntry(userId, dateKey, entry) {
  localStorage.setItem(timesheetStorageKey(userId, dateKey), JSON.stringify(entry));
}

// ── Time helpers (same formatting as TodaysEntry.jsx) ─────────────────

export function fmtDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

export function fmtHHMM(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ap}`;
}

export function totalBreakMs(entry, nowMs) {
  return entry.breaks.reduce((acc, b) => acc + ((b.end || nowMs) - b.start), 0)
    + (entry.activeBreak ? nowMs - entry.activeBreak.start : 0);
}

export function netWorkedMs(entry, nowMs) {
  if (!entry.checkIn) return 0;
  const endPoint = entry.checkOut || nowMs;
  return (endPoint - entry.checkIn) - totalBreakMs(entry, nowMs);
}
