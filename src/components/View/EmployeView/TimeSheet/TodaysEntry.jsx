import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LuPhone, LuClock, LuLogIn, LuLogOut, LuPlay,LuCircleStop , LuTriangleAlert } from 'react-icons/lu';
import { logShortTime } from '../Leaves/leaveStorage';

// ── Constants ────────────────────────────────────────────────────────
const REQUIRED_SECONDS = 8 * 3600; // 8 hours
const BREAK_LIMIT_SECONDS = 60 * 60; // 60 min

// ── Helpers ──────────────────────────────────────────────────────────
const now = () => Date.now();

const fmt = (ms) => {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
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

const todayKey = () => new Date().toISOString().slice(0, 10); // "2026-06-16"
const storageKey = (userId) => `crm_timesheet_${userId}_${todayKey()}`;

const loadEntry = (userId) => {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const saveEntry = (userId, entry) => {
  localStorage.setItem(storageKey(userId), JSON.stringify(entry));
};

const defaultEntry = () => ({
  checkIn: null,
  checkOut: null,
  breaks: [],          // [{ start, end }]
  activeBreak: null,   // { start }
});

// ── Component ─────────────────────────────────────────────────────────
function TodaysEntry({ userId = 'default_user' }) {
  const [entry, setEntry] = useState(() => loadEntry(userId) || defaultEntry());
  const [tick, setTick] = useState(0);
  const intervalRef = useRef(null);

  // Live ticker — updates every second when checked in and not checked out
  useEffect(() => {
    intervalRef.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Persist on every change
  useEffect(() => {
    saveEntry(userId, entry);
  }, [entry, userId]);

  // ── Derived values ─────────────────────────────────────────────────
  const isCheckedIn  = !!entry.checkIn;
  const isCheckedOut = !!entry.checkOut;
  const onActiveBreak = !!entry.activeBreak;

  // Total break time (ms)
  const totalBreakMs = entry.breaks.reduce((acc, b) => {
    return acc + ((b.end || now()) - b.start);
  }, 0) + (entry.activeBreak ? (now() - entry.activeBreak.start) : 0);

  // Net work time (ms) = elapsed since check-in minus breaks
  const elapsedMs = isCheckedIn
    ? ((isCheckedOut ? entry.checkOut : now()) - entry.checkIn) - totalBreakMs
    : 0;

  const remainingMs = Math.max(0, REQUIRED_SECONDS * 1000 - elapsedMs);
  const progressPct = Math.min(100, (elapsedMs / (REQUIRED_SECONDS * 1000)) * 100);

  const breakOverLimit = totalBreakMs > BREAK_LIMIT_SECONDS * 1000;

  // Status label
  const status = !isCheckedIn ? 'Active'
    : isCheckedOut ? 'Checked Out'
    : 'In Progress';

  const statusColor = !isCheckedIn ? 'var(--text-secondary)'
    : isCheckedOut ? 'var(--danger-red)'
    : 'var(--success-green)';

  // ── Actions ────────────────────────────────────────────────────────
  const handleCheckIn = useCallback(() => {
    setEntry(e => ({ ...e, checkIn: now() }));
  }, []);

const handleCheckOut = useCallback(() => {
  if (onActiveBreak || isCheckedOut) return; // must end break first; guard double-checkout

  const checkOutTime = now();
  const finalElapsedMs = (checkOutTime - entry.checkIn) - totalBreakMs;
  const shortfallMs = REQUIRED_SECONDS * 1000 - finalElapsedMs;
  const shortMinutes = shortfallMs > 0 ? Math.round(shortfallMs / 60000) : 0;

  if (shortMinutes > 0) {
    logShortTime(userId, shortMinutes, todayKey());
  }

  setEntry(e => ({ ...e, checkOut: checkOutTime }));
}, [onActiveBreak, isCheckedOut, entry, totalBreakMs, userId]);

  const handleStartBreak = useCallback(() => {
    setEntry(e => ({ ...e, activeBreak: { start: now() } }));
  }, []);

  const handleEndBreak = useCallback(() => {
    setEntry(e => {
      if (!e.activeBreak) return e;
      const completedBreak = { start: e.activeBreak.start, end: now() };
      return {
        ...e,
        breaks: [...e.breaks, completedBreak],
        activeBreak: null,
      };
    });
  }, []);

  // ── Date string ────────────────────────────────────────────────────
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <div className="te-card">

      {/* ── Header ── */}
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

      {/* ── Check In / Out boxes ── */}
      <div className="te-inout-row">
        <div className={`te-inout-box ${isCheckedIn ? 'te-inout-filled' : ''}`}>
          <span className="te-inout-label">CHECK IN</span>
          <span className="te-inout-time">
            {isCheckedIn ? fmtHHMM(entry.checkIn) : '—'}
          </span>
          {isCheckedIn && (
            <span className="te-inout-sub">
              +{Math.round((entry.checkIn - new Date().setHours(9,0,0,0)) / 60000)}m from 9:00 AM
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

      {/* ── Net Hours ── */}
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

      {/* ── Breaks ── */}
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

      
          {/* Break action buttons */}
          {!isCheckedOut && (
            <div className="te-break-actions">
              {onActiveBreak ? (
                <button className="te-btn te-btn-end" onClick={handleEndBreak}>
                  <LuCircleStop size={14} /> End Break
                </button>
              ) : (
                <button className="te-btn te-btn-new" onClick={handleStartBreak}>
                  <LuPlay size={14} /> + New Break
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Main CTA ── */}
      <div className="te-cta-section">
        {!isCheckedIn && (
          <button className="te-cta-btn te-cta-checkin" onClick={handleCheckIn}>
            <LuLogIn size={16} />
            Check In for Today
          </button>
        )}

        {isCheckedIn && !isCheckedOut && (
          <>
            <button
              className={`te-cta-btn te-cta-checkout ${onActiveBreak ? 'te-cta-disabled' : ''}`}
              onClick={handleCheckOut}
              disabled={onActiveBreak}
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
              <LuTriangleAlert size={13} className='warning'/>
              Break limit: 60 min/day. You've used {fmt(totalBreakMs)}.
              Extra time deducted from net hours.
            </div>
          )}

      </div>

    </div>
  );
}

export default TodaysEntry;