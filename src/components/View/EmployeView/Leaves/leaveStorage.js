const STORAGE_PREFIX = 'crm_leaves_';

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

// NOTE: short-time logging (logShortTime / getShortTimeLogs) used to live
// here, writing one { date, minutes } entry per day to localStorage at
// checkout time. That's been removed — short time is now derived directly
// from FileMaker's TimeSheetDaily records (CheckIn/CheckOut/Breaks) via
// computeShortMinutesForEntry() in services/timesheet/timesheetApi.js, and
// consumed by shortHoursUtils.js. There's no longer anything to write here;
// TodaysEntry.jsx no longer calls into this file at checkout.