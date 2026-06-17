const FULL = 8 * 3600 * 1000;
const SHORT_MIN = 6 * 3600 * 1000;

const fmtHours = (ms) => {
  const h = ms / 3600000;
  return `${h.toFixed(1)}h`;
};

const monthLabel = () =>
  new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

// ── Calculate stats from this calendar month's entries ─────────────────
const getMonthlyStats = (userId) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let present = 0;
  let shortCount = 0;
  let shortTotalMs = 0;
  let absent = 0;

  for (let day = 1; day <= today.getDate(); day++) {
    const d = new Date(year, month, day);
    const dateStr = d.toISOString().slice(0, 10);
    const key = `ams_timesheet_${userId}_${dateStr}`;

    const isWeekend = d.getDay() === 0; // Sunday off — adjust if needed
    if (isWeekend) continue;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        // Working day with no entry = absent (skip today, still in progress)
        if (dateStr !== today.toISOString().slice(0, 10)) absent++;
        continue;
      }

      const entry = JSON.parse(raw);
      if (!entry.checkIn) {
        if (dateStr !== today.toISOString().slice(0, 10)) absent++;
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
    } catch { continue; }
  }

  return { present, shortCount, shortTotalMs, absent };
};

function MonthlySummary({ userId = 'guest' }) {
  const { present, shortCount, shortTotalMs, absent } = getMonthlyStats(userId);

  return (
    <div className="ms-card">
      <h3 className="ms-title">{monthLabel()} Summary</h3>

      <div className="ms-grid">
        <div className="ms-stat">
          <span className="ms-stat-value ms-green">{present}</span>
          <span className="ms-stat-label">Present</span>
        </div>
        <div className="ms-stat">
          <span className="ms-stat-value ms-amber">{shortCount}</span>
          <span className="ms-stat-label">Short Time</span>
        </div>
        <div className="ms-stat">
          <span className="ms-stat-value">{fmtHours(shortTotalMs)}</span>
          <span className="ms-stat-label">Short total</span>
        </div>
        <div className="ms-stat">
          <span className="ms-stat-value ms-red">{absent}</span>
          <span className="ms-stat-label">Absent</span>
        </div>
      </div>
    </div>
  );
}

export default MonthlySummary;