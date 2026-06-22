import { useEffect, useState } from 'react';
import { getTimesheetRange } from '../../../../services/timesheet/timesheetApi';

const FULL = 8 * 3600 * 1000;

// toISOString() converts to UTC first, which can roll the date backward
// by one day for timezones ahead of UTC (e.g. Pakistan, UTC+5) — a local
// midnight Date can serialize to the previous day's UTC date. Build the
// "YYYY-MM-DD" key from local components instead so it always matches
// the dateStr FileMaker entries actually use.
const toLocalDateKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const fmtHours = (ms) => {
  const h = ms / 3600000;
  return `${h.toFixed(1)}h`;
};

const monthLabel = () =>
  new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

// ── Calculate stats from this calendar month's FileMaker entries ───────
// `entries` is the canonical shape from getTimesheetRange:
//   { dateStr, checkIn, checkOut, breaks, ... }
const getMonthlyStats = (entries) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayStr = toLocalDateKey(today);

  const entryByDate = new Map(entries.map((e) => [e.dateStr, e]));

  let present = 0;
  let shortCount = 0;
  let shortTotalMs = 0;
  let absent = 0;

  for (let day = 1; day <= today.getDate(); day++) {
    const d = new Date(year, month, day);
    const dateStr = toLocalDateKey(d);

    const isWeekend = d.getDay() === 0; // Sunday off — adjust if needed
    if (isWeekend) continue;

    const entry = entryByDate.get(dateStr);

    if (!entry || !entry.checkIn) {
      // Working day with no entry = absent (skip today, still in progress)
      if (dateStr !== todayStr) absent++;
      continue;
    }

    present++;

    const totalBreakMs = (entry.breaks || []).reduce((acc, b) => {
      return acc + ((b.end || b.start) - b.start);
    }, 0);

    const endTime = entry.checkOut || Date.now();
    const netMs = Math.max(0, (endTime - entry.checkIn) - totalBreakMs);

    if (netMs < FULL) {
      shortCount++;
      shortTotalMs += (FULL - netMs); // hours short of target
    }
  }

  return { present, shortCount, shortTotalMs, absent };
};

function MonthlySummary({ userId = 'guest' }) {
  const [stats, setStats] = useState({ present: 0, shortCount: 0, shortTotalMs: 0, absent: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const startKey = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endKey = toLocalDateKey(today);

    getTimesheetRange(userId, startKey, endKey)
      .then((entries) => {
        if (cancelled) return;
        setStats(getMonthlyStats(entries));
      })
      .catch((err) => {
        console.error('MonthlySummary: failed to load timesheet range from FileMaker:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [userId]);

  const { present, shortCount, shortTotalMs, absent } = stats;

  return (
    <div className="ms-card">
      <h3 className="ms-title">{monthLabel()} Summary</h3>

      <div className="ms-grid">
        <div className="ms-stat">
          <span className="ms-stat-value ms-green">{loading ? '—' : present}</span>
          <span className="ms-stat-label">Present</span>
        </div>
        <div className="ms-stat">
          <span className="ms-stat-value ms-amber">{loading ? '—' : shortCount}</span>
          <span className="ms-stat-label">Short Time</span>
        </div>
        <div className="ms-stat">
          <span className="ms-stat-value">{loading ? '—' : fmtHours(shortTotalMs)}</span>
          <span className="ms-stat-label">Short total</span>
        </div>
        <div className="ms-stat">
          <span className="ms-stat-value ms-red">{loading ? '—' : absent}</span>
          <span className="ms-stat-label">Absent</span>
        </div>
      </div>
    </div>
  );
}

export default MonthlySummary;