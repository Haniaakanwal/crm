// Shared leave calculation logic for the Leaves section.
// Everything here is computed from a `leaves` array, nothing is hardcoded.
//
// Leave record shape:
// { id, fromDate: 'YYYY-MM-DD', toDate: 'YYYY-MM-DD', type, category, reason, status, shortMinutes }
// - fromDate/toDate are the same value for Half Day and Short Time (single-day only).
// - Full Day can span a range, toDate >= fromDate.
// - category is 'Casual' | 'Medical' | 'Unpaid'. 'Unpaid' is a deliberate choice by
//   the employee and never consumes quota or counts as paid, regardless of date.

// ── Policy constants — adjust these if your actual rules differ ──────────
export const ANNUAL_LEAVE_DAYS = 24;
export const MONTHLY_PAID_LEAVES_PER_CATEGORY = 1; // 1 Casual + 1 Medical = 2 paid requests/month
export const SHORT_MINUTES_PER_DEDUCTED_DAY = 8 * 60; // 8h accumulated short time = 1 day deducted

function monthKey(dateStr) {
  return dateStr.slice(0, 7); // 'YYYY-MM'
}

function daysBetweenInclusive(fromDate, toDate) {
  const from = new Date(fromDate);
  const to = new Date(toDate || fromDate);
  const diff = Math.round((to - from) / (1000 * 60 * 60 * 24));
  return Math.max(diff + 1, 1);
}

function dayValue(leave) {
  if (leave.type === 'Short Time') return 0;
  if (leave.type === 'Half Day') return 0.5;
  if (leave.type === 'Full Day') return daysBetweenInclusive(leave.fromDate, leave.toDate);
  return 0;
}

export function computePaidStatus(leaves) {
  const usedThisMonth = {};
  const paidMap = {};

  const quotaLeaves = leaves
    .filter((l) => (l.type === 'Full Day' || l.type === 'Half Day') && l.category !== 'Unpaid')
    .slice()
    .sort((a, b) => new Date(a.fromDate) - new Date(b.fromDate));

  quotaLeaves.forEach((leave) => {
    const mKey = monthKey(leave.fromDate);
    if (!usedThisMonth[mKey]) usedThisMonth[mKey] = {};
    const usedForCategory = usedThisMonth[mKey][leave.category] || 0;

    paidMap[leave.id] = usedForCategory < MONTHLY_PAID_LEAVES_PER_CATEGORY;
    usedThisMonth[mKey][leave.category] = usedForCategory + 1;
  });

  leaves.forEach((leave) => {
    if (leave.category === 'Unpaid') paidMap[leave.id] = false;
  });

  return paidMap;
}

/**
 * Computes the Annual Leave Balance numbers for a given year.
 *
 * Only APPROVED leaves consume the annual balance — a Pending leave is
 * "on file" (visible in history) but doesn't touch paidTaken, unpaidTaken,
 * usedDays, or remaining until HR approves it. The quota-consumption order
 * (computePaidStatus) is therefore also computed from approved leaves only,
 * so a still-pending request can't "reserve" a paid slot ahead of one
 * that's actually been approved.
 */
export function calculateLeaveSummary(leaves, year, shortSummary = { shortDays: 0, shortMinutesTotal: 0, shortPercent: 0 }) {
  const yearLeaves = leaves.filter((l) => l.fromDate.startsWith(String(year)));
  const approvedLeaves = yearLeaves.filter((l) => l.status === 'Approved');
  const paidMap = computePaidStatus(approvedLeaves);

  let paidTaken = 0;
  let unpaidTaken = 0;

  approvedLeaves.forEach((leave) => {
    if (leave.type === 'Short Time') return; // short time no longer tracked as a leave entry
    const value = dayValue(leave);
    if (paidMap[leave.id]) {
      paidTaken += value;
    } else {
      unpaidTaken += value;
    }
  });

  const { shortDays = 0, shortMinutesTotal = 0, shortPercent = 0 } = shortSummary;
  const usedDays = paidTaken + unpaidTaken + shortDays;
  const remaining = Math.max(Math.round((ANNUAL_LEAVE_DAYS - usedDays) * 100) / 100, 0);

  return {
    totalDays: ANNUAL_LEAVE_DAYS,
    usedDays: Math.round(usedDays * 100) / 100,
    remaining,
    paidTaken,
    unpaidTaken,
    shortDays,
    shortMinutesTotal,
    shortPercent,
  };
}

export function getMonthlyPaidLeaveWarning(leaves, year, month) {
  const mKey = `${year}-${String(month).padStart(2, '0')}`;
  const yearLeaves = leaves.filter((l) => l.fromDate.startsWith(String(year)));
  const paidMap = computePaidStatus(yearLeaves);

  const monthLeaves = yearLeaves.filter(
    (l) => (l.type === 'Full Day' || l.type === 'Half Day') && monthKey(l.fromDate) === mKey
  );

  const usedCategories = new Set(
    monthLeaves.filter((l) => paidMap[l.id]).map((l) => l.category)
  );

  const bothUsed = ['Casual', 'Medical'].every((cat) => usedCategories.has(cat));
  if (!bothUsed) return null;

  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

  return {
    monthName,
    year,
    breakdown: `${MONTHLY_PAID_LEAVES_PER_CATEGORY} Casual + ${MONTHLY_PAID_LEAVES_PER_CATEGORY} Medical`,
  };
}

export function previewLeaveOutcome(leaves, fromDate, category) {
  if (!fromDate || category === 'Unpaid') return null;

  const d = new Date(fromDate);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const mKey = monthKey(fromDate);

  const yearLeaves = leaves.filter((l) => l.fromDate.startsWith(String(year)));
  const monthLeaves = yearLeaves.filter(
    (l) => (l.type === 'Full Day' || l.type === 'Half Day') && monthKey(l.fromDate) === mKey
  );

  const ordinal = monthLeaves.length + 1;
  const usedForCategory = monthLeaves.filter((l) => l.category === category).length;
  const willBePaid = usedForCategory < MONTHLY_PAID_LEAVES_PER_CATEGORY;
  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

  return { ordinal, willBePaid, monthName };
}