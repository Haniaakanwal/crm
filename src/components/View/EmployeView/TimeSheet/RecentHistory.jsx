import { useState } from 'react';
import { LuArrowRight } from 'react-icons/lu';

// ── Helpers ──────────────────────────────────────────────────────────
const fmtHHMM = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  let h = d.getHours(), m = d.getMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const fmtDuration = (ms) => {
  if (!ms || ms <= 0) return '—';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const fmtDateLabel = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'short' });
  const weekday = d.toLocaleString('en-US', { weekday: 'short' });
  return { day: `${day} ${month}`, weekday };
};

const isToday = (dateStr) => dateStr === new Date().toISOString().slice(0, 10);

const FULL = 8 * 3600 * 1000;
const SHORT_MIN = 6 * 3600 * 1000;

// ── Build entries from localStorage — only days the user actually worked ──
const getRecentEntries = (userId, lookbackDays = 14) => {
  const entries = [];
  const today = new Date();

  for (let i = 0; i < lookbackDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const key = `crm_timesheet_${userId}_${dateStr}`;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const entry = JSON.parse(raw);
      if (!entry.checkIn) continue; // only count days they actually checked in

      const totalBreakMs = (entry.breaks || []).reduce((acc, b) => {
        return acc + ((b.end || b.start) - b.start);
      }, 0);

      const endTime = entry.checkOut || (isToday(dateStr) ? Date.now() : null);
      const netMs = endTime
        ? Math.max(0, (endTime - entry.checkIn) - totalBreakMs)
        : null;

      let status = null;
      if (isToday(dateStr) && !entry.checkOut) status = 'live';
      else if (netMs === null) status = null;
      else if (netMs >= FULL) status = 'full';
      else status = 'short';

      entries.push({ dateStr, entry, totalBreakMs, netMs, status });
    } catch { continue; }
  }

  return entries; // already newest-first since loop counts down from today
};

// ── Status badge ─────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  if (!status) return null;
  const map = {
    live:  { label: 'Live',  bg: 'var(--success-green)', color: '#070B13' },
    full:  { label: 'Full',  bg: 'var(--bg-hover)', color: 'var(--success-green)', border: 'rgba(52,211,153,0.3)' },
    short: { label: 'Short', bg: 'var(--bg-hover)', color: 'var(--accent-amber-gold)', border: 'rgba(245,184,78,0.3)' },
  };
  const s = map[status];
  return (
    <span className="rh-badge" style={{
      backgroundColor: s.bg, color: s.color,
      border: s.border ? `1px solid ${s.border}` : 'none',
    }}>
      {s.label}
    </span>
  );
};

// ── Component ─────────────────────────────────────────────────────────
const PAGE_SIZE = 7;

function RecentHistory({ userId = 'guest' }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Pull a wide lookback window (e.g. 60 days) so "Load more" has real data to reveal
  const allEntries = getRecentEntries(userId, 60);
  const totalWorkedDays = allEntries.length; // dynamic — only real worked days
  const visibleEntries = allEntries.slice(0, visibleCount);
  const hasMore = visibleCount < totalWorkedDays;

  return (
    <div className="rh-card">
      <div className="rh-header">
        <div className="rh-header-left">
          <h3 className="rh-title">My Recent History</h3>
          <p className="rh-subtitle">Last {Math.min(14, totalWorkedDays)} working days</p>
        </div>
        <button className="rh-monthly-btn">
          Monthly view <LuArrowRight size={13} />
        </button>
      </div>

      <div className="rh-list">
        {visibleEntries.length === 0 && (
          <div className="rh-empty">No history yet — check in to start tracking.</div>
        )}

        {visibleEntries.map(({ dateStr, entry, totalBreakMs, netMs, status }) => {
          const { day, weekday } = fmtDateLabel(dateStr);
          const todayFlag = isToday(dateStr);

          return (
            <div key={dateStr} className={`rh-row ${todayFlag ? 'rh-row-today' : ''}`}>
              <div className="rh-date">
                <span className="rh-date-day">{day}</span>
                <span className="rh-date-week">{todayFlag ? 'Today' : weekday}</span>
              </div>

              <div className="rh-cols">
                <div className="rh-col">
                  <span className="rh-col-label">In</span>
                  <span className="rh-col-val">{fmtHHMM(entry.checkIn)}</span>
                </div>
                <span className="rh-sep">–</span>
                <div className="rh-col">
                  <span className="rh-col-label">Out</span>
                  <span className="rh-col-val">{entry.checkOut ? fmtHHMM(entry.checkOut) : '—'}</span>
                </div>
                <div className="rh-col rh-col-breaks">
                  <span className="rh-col-label">Breaks</span>
                  <span className="rh-col-val">{fmtDuration(totalBreakMs)}</span>
                </div>
              </div>

              <div className="rh-net">
                <div>
                  <span className="rh-col-label">Net hours</span>
                  <span className="rh-net-val">
                    {netMs !== null ? fmtDuration(netMs) : '—'}
                    {todayFlag && !entry.checkOut ? '*' : ''}
                  </span>
                </div>
                <StatusBadge status={status} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer: Showing X of Y · Load more ── */}
      {totalWorkedDays > 0 && (
        <div className="rh-footer">
          <span className="rh-footer-text">
            Showing {visibleEntries.length} of {totalWorkedDays} days
          </span>
          {hasMore && (
            <button
              className="rh-loadmore-btn"
              onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default RecentHistory;