import { useState, useEffect, useCallback } from 'react';
import { LuPhone, LuClock, LuLogIn, LuLogOut, LuPlay, LuCircleStop, LuTriangleAlert } from 'react-icons/lu';
import { loadTimesheetFromFM, syncTimesheetEntry } from '../../../../services/timesheet/timesheetApi';

const REQUIRED_SECONDS = 8 * 3600;
const BREAK_LIMIT_SECONDS = 60 * 60;

const now = () => Date.now();

const fmt = (ms) => {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
};

const fmtHHMM = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  let h = d.getHours(), m = d.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ap}`;
};

// toISOString() converts to UTC first, which can roll the date backward
// by one day for timezones ahead of UTC (e.g. Pakistan, UTC+5). Build the
// "YYYY-MM-DD" key from local date components instead so it always
// matches the dateStr FileMaker entries actually use.
const todayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const defaultEntry = () => ({
  checkIn: null,
  checkOut: null,
  breaks: [],
  activeBreak: null,
});

function TodaysEntry({ userId = 'default_user' }) {
  const [entry, setEntry] = useState(defaultEntry);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [, setTick] = useState(0);

  // Tick once a second so running totals (elapsed, break duration) stay live
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Load today's entry from FileMaker on mount (and whenever userId changes)
  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setLoadError(null);

    loadTimesheetFromFM(userId, todayKey())
      .then((loaded) => {
        if (cancelled) return;
        setEntry(loaded || defaultEntry());
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load timesheet from FileMaker:', err);
        setLoadError('Could not load today\u2019s entry. Please refresh to try again.');
        setEntry(defaultEntry());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [userId]);

  const isCheckedIn = !!entry.checkIn;
  const isCheckedOut = !!entry.checkOut;
  const onActiveBreak = !!entry.activeBreak;

  const totalBreakMs = entry.breaks.reduce((acc, b) => {
    return acc + ((b.end || now()) - b.start);
  }, 0) + (entry.activeBreak ? (now() - entry.activeBreak.start) : 0);

  const elapsedMs = isCheckedIn
    ? ((isCheckedOut ? entry.checkOut : now()) - entry.checkIn) - totalBreakMs
    : 0;

  const remainingMs = Math.max(0, REQUIRED_SECONDS * 1000 - elapsedMs);
  const progressPct = Math.min(100, (elapsedMs / (REQUIRED_SECONDS * 1000)) * 100);
  const breakOverLimit = totalBreakMs > BREAK_LIMIT_SECONDS * 1000;

  const status = !isCheckedIn ? 'Active'
    : isCheckedOut ? 'Checked Out'
    : 'In Progress';

  const statusColor = !isCheckedIn ? 'var(--text-secondary)'
    : isCheckedOut ? 'var(--danger-red)'
    : 'var(--success-green)';

  // ── Actions ────────────────────────────────────────────────────────
  // Each action computes the intended new state, syncs it to FileMaker,
  // then adopts whatever FileMaker actually persisted as the new source
  // of truth (rather than trusting the optimistic local value forever).

  const runSync = useCallback(async (nextEntry) => {
    setActionPending(true);
    setActionError(null);
    try {
      const persisted = await syncTimesheetEntry(userId, todayKey(), nextEntry);
      setEntry(persisted || nextEntry);
    } catch (err) {
      console.error('Failed to sync timesheet entry:', err);
      setActionError('That action didn\u2019t save — please try again.');
      // Roll back to last-known-good by re-loading from FM
      try {
        const reloaded = await loadTimesheetFromFM(userId, todayKey());
        setEntry(reloaded || defaultEntry());
      } catch {
        // If even the reload fails, leave entry as the last good state.
      }
    } finally {
      setActionPending(false);
    }
  }, [userId]);

  const handleCheckIn = useCallback(() => {
    if (actionPending) return;
    const nextEntry = { ...entry, checkIn: now() };
    setEntry(nextEntry); // optimistic UI
    runSync(nextEntry);
  }, [entry, actionPending, runSync]);

  const handleCheckOut = useCallback(() => {
    if (actionPending || onActiveBreak || isCheckedOut) return;
    const nextEntry = { ...entry, checkOut: now() };
    setEntry(nextEntry);
    runSync(nextEntry);
  }, [actionPending, onActiveBreak, isCheckedOut, entry, runSync]);

  const handleStartBreak = useCallback(() => {
    if (actionPending || onActiveBreak || !isCheckedIn || isCheckedOut) return;
    const nextEntry = { ...entry, activeBreak: { start: now() } };
    setEntry(nextEntry);
    runSync(nextEntry);
  }, [actionPending, onActiveBreak, isCheckedIn, isCheckedOut, entry, runSync]);

  const handleEndBreak = useCallback(() => {
    if (actionPending || !entry.activeBreak) return;
    const completedBreak = { start: entry.activeBreak.start, end: now() };
    const nextEntry = {
      ...entry,
      breaks: [...entry.breaks, completedBreak],
      activeBreak: null,
    };
    setEntry(nextEntry);
    runSync(nextEntry);
  }, [actionPending, entry, runSync]);

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  if (loading) {
    return (
      <div className="te-card">
        <div className="te-header">
          <div className="te-header-left">
            <h3 className="te-title">Today's Entry</h3>
            <p className="te-subtitle">Loading today\u2019s entry…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="te-card">

      <div className="te-header">
        <div className="te-header-left">
          <h3 className="te-title">Today's Entry</h3>
          <p className="te-subtitle">
            {dateStr} · <span className="te-ramadan">Ramadan</span> · 8 hours required
          </p>
        </div>
        <span className="te-status-badge" style={{ color: statusColor, borderColor: statusColor }}>
          {status}
        </span>
      </div>

      {loadError && (
        <div className="te-break-warning">
          <LuTriangleAlert size={13} className='warning' />
          {loadError}
        </div>
      )}

      <div className="te-inout-row">
        <div className={`te-inout-box ${isCheckedIn ? 'te-inout-filled' : ''}`}>
          <span className="te-inout-label">CHECK IN</span>
          <span className="te-inout-time">
            {isCheckedIn ? fmtHHMM(entry.checkIn) : '—'}
          </span>
          {isCheckedIn && (
            <span className="te-inout-sub">
              +{Math.round((entry.checkIn - new Date().setHours(9, 0, 0, 0)) / 60000)}m from 9:00 AM
            </span>
          )}
        </div>

        <div className={`te-inout-box ${isCheckedOut ? 'te-inout-filled' : ''}`}>
          <span className="te-inout-label">CHECK OUT</span>
          <span className="te-inout-time">
            {isCheckedOut ? fmtHHMM(entry.checkOut) : '—'}
          </span>
          {!isCheckedOut && <span className="te-inout-sub">Not yet</span>}
        </div>
      </div>

      {isCheckedIn && (
        <div className="te-net-section">
          <div className="te-net-row">
            <div>
              <p className="te-net-label">Net hours {isCheckedOut ? '' : '(running)'}</p>
              <p className="te-net-value">{fmt(elapsedMs)}</p>
            </div>
            <div className="te-net-goal">→ 8h goal</div>
            <div className="te-remaining">
              <p className="te-net-label">Remaining</p>
              <p className="te-remaining-value">{fmt(remainingMs)}</p>
            </div>
          </div>
          <div className="te-progress-track">
            <div className="te-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {isCheckedIn && (
        <div className="te-breaks-section">
          <div className="te-breaks-header">
            <span className="te-breaks-title">BREAKS TODAY</span>
            <span className="te-breaks-total">Total: {fmt(totalBreakMs)}</span>
          </div>

          {entry.breaks.map((b, i) => (
            <div key={i} className="te-break-row te-break-done">
              <span className="te-break-icon"><LuPhone size={13} /></span>
              <span className="te-break-time">
                {fmtHHMM(b.start)} – {fmtHHMM(b.end)}
              </span>
              <span className="te-break-dur">{fmt(b.end - b.start)}</span>
            </div>
          ))}

          {entry.activeBreak && (
            <div className="te-break-row te-break-live">
              <span className="te-break-icon"><LuClock size={13} /></span>
              <span className="te-break-time">
                {fmtHHMM(entry.activeBreak.start)} – ongoing
              </span>
              <span className="te-break-live-dot">● Live</span>
            </div>
          )}

          {!isCheckedOut && (
            <div className="te-break-actions">
              {onActiveBreak ? (
                <button className="te-btn te-btn-end" onClick={handleEndBreak} disabled={actionPending}>
                  <LuCircleStop size={14} /> End Break
                </button>
              ) : (
                <button className="te-btn te-btn-new" onClick={handleStartBreak} disabled={actionPending}>
                  <LuPlay size={14} /> + New Break
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="te-cta-section">
        {actionError && (
          <p className="te-cta-hint">{actionError}</p>
        )}

        {!isCheckedIn && (
          <button className="te-cta-btn te-cta-checkin" onClick={handleCheckIn} disabled={actionPending}>
            <LuLogIn size={16} />
            Check In for Today
          </button>
        )}

        {isCheckedIn && !isCheckedOut && (
          <>
            <button
              className={`te-cta-btn te-cta-checkout ${onActiveBreak ? 'te-cta-disabled' : ''}`}
              onClick={handleCheckOut}
              disabled={onActiveBreak || actionPending}
            >
              <LuLogOut size={16} />
              Check Out for Today
            </button>
            {onActiveBreak && (
              <p className="te-cta-hint">End your active break first before checking out.</p>
            )}
          </>
        )}

        {isCheckedOut && (
          <div className="te-completed-msg">
            ✓ Day complete · {fmt(elapsedMs)} net · checked out at {fmtHHMM(entry.checkOut)}
          </div>
        )}

        {breakOverLimit && (
          <div className="te-break-warning">
            <LuTriangleAlert size={13} className='warning' />
            Break limit: 60 min/day. You've used {fmt(totalBreakMs)}.
            Extra time deducted from net hours.
          </div>
        )}
      </div>

    </div>
  );
}

export default TodaysEntry;