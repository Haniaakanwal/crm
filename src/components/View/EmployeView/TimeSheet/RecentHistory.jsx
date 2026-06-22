import { useEffect, useState } from 'react';
import { LuArrowRight } from 'react-icons/lu';
import { getTimesheetRange } from '../../../../services/timesheet/timesheetApi';

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

// toISOString() converts to UTC first, which can roll the date backward
// by one day for timezones ahead of UTC (e.g. Pakistan, UTC+5). Build the
// "YYYY-MM-DD" key from local date components instead.
const toLocalDateKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const todayKey = () => toLocalDateKey(new Date());
const isToday = (dateStr) => dateStr === todayKey();

const FULL = 8 * 3600 * 1000;

// ── Convert FM range entries into the row shape this component renders ──
// (mirrors the previous localStorage-derived shape so the JSX below is
// unchanged: { dateStr, entry, totalBreakMs, netMs, status })
const toRows = (fmEntries) => {
  return fmEntries
    .filter((e) => !!e.checkIn) // only days the user actually checked in
    .map((e) => {
      const totalBreakMs = (e.breaks || []).reduce((acc, b) => {
        return acc + ((b.end || b.start) - b.start);
      }, 0);

      const endTime = e.checkOut || (isToday(e.dateStr) ? Date.now() : null);
      const netMs = endTime
        ? Math.max(0, (endTime - e.checkIn) - totalBreakMs)
        : null;

      let status = null;
      if (isToday(e.dateStr) && !e.checkOut) status = 'live';
      else if (netMs === null) status = null;
      else if (netMs >= FULL) status = 'full';
      else status = 'short';

      return {
        dateStr: e.dateStr,
        entry: { checkIn: e.checkIn, checkOut: e.checkOut },
        totalBreakMs,
        netMs,
        status,
      };
    });
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
const LOOKBACK_DAYS = 60;

function RecentHistory({ userId = 'guest' }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - LOOKBACK_DAYS);

    const startKey = toLocalDateKey(start);
    const endKey = toLocalDateKey(today);

    getTimesheetRange(userId, startKey, endKey)
      .then((fmEntries) => {
        if (cancelled) return;
        setRows(toRows(fmEntries)); // getTimesheetRange already returns newest-first
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load recent history from FileMaker:', err);
        setError('Could not load your recent history.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [userId]);

  const totalWorkedDays = rows.length;
  const visibleEntries = rows.slice(0, visibleCount);
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
        {loading && (
          <div className="rh-empty">Loading history…</div>
        )}

        {!loading && error && (
          <div className="rh-empty">{error}</div>
        )}

        {!loading && !error && visibleEntries.length === 0 && (
          <div className="rh-empty">No history yet — check in to start tracking.</div>
        )}

        {!loading && !error && visibleEntries.map(({ dateStr, entry, totalBreakMs, netMs, status }) => {
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
      {!loading && !error && totalWorkedDays > 0 && (
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