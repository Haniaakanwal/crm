const STORAGE_PREFIX = 'crm_leaves_';
const SHORT_LOG_PREFIX = 'crm_short_logs_';

export function getStoredLeaves(userId) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Could not read leaves from localStorage:', err);
    return [];
  }
}

export function saveLeaveRequest(userId, leave) {
  const existing = getStoredLeaves(userId);
  const updated = [...existing, leave];
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(updated));
  } catch (err) {
    console.error('Could not save leave request to localStorage:', err);
  }
  return updated;
}

// ── Short time logs — separate from leave requests entirely ────────────
// One { date, minutes } entry per day that fell short of the 8h goal,
// written by TodaysEntry.jsx at checkout. Read by
// shortHoursUtils.calculateShortSummary to compute the year's deduction.

function readShortLogs(userId) {
  try {
    const raw = localStorage.getItem(`${SHORT_LOG_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Could not read short time logs from localStorage:', err);
    return [];
  }
}

function writeShortLogs(userId, logs) {
  try {
    localStorage.setItem(`${SHORT_LOG_PREFIX}${userId}`, JSON.stringify(logs));
  } catch (err) {
    console.error('Could not save short time logs to localStorage:', err);
  }
  return logs;
}

export function getShortTimeLogs(userId) {
  return readShortLogs(userId);
}

export function logShortTime(userId, minutes, dateStr) {
  if (!minutes || minutes <= 0) return null;
  const logs = readShortLogs(userId);
  const withoutToday = logs.filter((l) => l.date !== dateStr); // one entry per day, replace if re-logged
  const updated = [...withoutToday, { date: dateStr, minutes }];
  return writeShortLogs(userId, updated);
}