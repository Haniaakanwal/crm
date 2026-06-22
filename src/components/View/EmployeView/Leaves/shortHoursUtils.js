// Computes "short hours" directly from FileMaker TimeSheetDaily entries
// (the canonical shape returned by services/timesheet/timesheetApi.js's
// getTimesheetRange: { dateStr, checkIn, checkOut, breaks, ... }) — rather
// than from a separately-maintained localStorage log. Short minutes for a
// given day are derived on the fly via computeShortMinutesForEntry, so
// there's nothing to keep in sync: the timesheet data is the only source
// of truth.
import { computeShortMinutesForEntry } from '../../../../services/timesheet/timesheetApi';

export const SHORT_MINUTES_PER_DEDUCTED_DAY = 8 * 60; // 8h accumulated short = 1 day deducted

/**
 * Per-day breakdown of short hours, for displaying each day's individual
 * shortfall rather than just the running total.
 *
 * @param {Array} attendanceEntries - canonical-shape entries from
 *   getTimesheetRange (each needs dateStr, checkIn, checkOut, breaks).
 * @param {number} year
 */
export function dailyShortBreakdown(attendanceEntries, year) {
  return attendanceEntries
    .filter((e) => e.dateStr?.startsWith(String(year)))
    .map((e) => ({ date: e.dateStr, shortMinutes: computeShortMinutesForEntry(e) }))
    .filter((r) => r.shortMinutes > 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Sums up the year's shortfall (derived from FileMaker entries) and
 * converts it into a continuous fractional day value — e.g. 2h45m out of
 * an 8h day = 0.34 days, deducted right away rather than only once a full
 * 8h is reached.
 *
 * @param {Array} attendanceEntries - canonical-shape entries from
 *   getTimesheetRange (each needs dateStr, checkIn, checkOut, breaks).
 * @param {number} year
 */
export function calculateShortSummary(attendanceEntries, year) {
  const yearEntries = attendanceEntries.filter((e) => e.dateStr?.startsWith(String(year)));

  const shortMinutesTotal = yearEntries.reduce(
    (sum, e) => sum + computeShortMinutesForEntry(e),
    0
  );

  const shortDays = shortMinutesTotal / SHORT_MINUTES_PER_DEDUCTED_DAY;
  const shortPercent = shortDays * 100;

  return {
    shortMinutesTotal,
    shortDays,
    shortDaysRounded: Math.round(shortDays * 100) / 100,
    shortPercent: Math.round(shortPercent * 10) / 10,
  };
}