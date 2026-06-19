// Computes "short hours" from the daily shortfall logs TodaysEntry.jsx
// already writes via leaveStorage's logShortTime() at checkout time —
// one { date, minutes } entry per day that fell short of the 8h goal.

export const SHORT_MINUTES_PER_DEDUCTED_DAY = 8 * 60; // 8h accumulated short = 1 day deducted

/**
 * Per-day breakdown of short hours, for displaying each day's individual
 * shortfall rather than just the running total.
 */
export function dailyShortBreakdown(shortTimeLogs, year) {
  return shortTimeLogs
    .filter((r) => r.date.startsWith(String(year)) && r.minutes > 0)
    .map((r) => ({ date: r.date, shortMinutes: r.minutes }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Sums up the year's logged shortfall and converts it into a continuous
 * fractional day value — e.g. 2h45m out of an 8h day = 0.34 days,
 * deducted right away rather than only once a full 8h is reached.
 */
export function calculateShortSummary(shortTimeLogs, year) {
  const yearLogs = shortTimeLogs.filter((r) => r.date.startsWith(String(year)));

  const shortMinutesTotal = yearLogs.reduce((sum, r) => sum + (r.minutes || 0), 0);

  const shortDays = shortMinutesTotal / SHORT_MINUTES_PER_DEDUCTED_DAY;
  const shortPercent = shortDays * 100;

  return {
    shortMinutesTotal,
    shortDays,
    shortDaysRounded: Math.round(shortDays * 100) / 100,
    shortPercent: Math.round(shortPercent * 10) / 10,
  };
}