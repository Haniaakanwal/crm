import { useEffect, useState } from 'react';
import './styles/EmployeeHome.css';
import { LuClock, LuCalendarOff, LuLaptop, LuStar, LuInfo } from 'react-icons/lu';
import { getStoredLeaves, getShortTimeLogs } from './Leaves/leaveStorage';
import { calculateShortSummary } from './Leaves/shortHoursUtils';
import { calculateLeaveSummary, MONTHLY_PAID_LEAVES_PER_CATEGORY, SHORT_MINUTES_PER_DEDUCTED_DAY } from './Leaves/leaveUtils';
import { getHolidays } from './Holidays/holidayStorage';
import { Link } from 'react-router';


const todayKey = () => new Date().toISOString().slice(0, 10);
const timesheetKey = (userId) => `crm_timesheet_${userId}_${todayKey()}`;

function loadTodaysEntry(userId) {
  try {
    const raw = localStorage.getItem(timesheetKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function fmtHHMM(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  let h = d.getHours(), m = d.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ap}`;
}
function deriveDisplayName(user) {
  if (user.username) return user.username;
  if (user.email) {
    const localPart = user.email.split('@')[0];
    return localPart
      .replace(/[._-]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return 'there';
}

function getInitials(user, displayName) {
  if (user.initials) return user.initials;
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
function netElapsedMs(entry) {
  if (!entry || !entry.checkIn) return 0;
  const breaksMs = (entry.breaks || []).reduce((acc, b) => acc + ((b.end || Date.now()) - b.start), 0)
    + (entry.activeBreak ? (Date.now() - entry.activeBreak.start) : 0);
  const endpoint = entry.checkOut || Date.now();
  return Math.max(0, (endpoint - entry.checkIn) - breaksMs);
}

function fmtDuration(ms) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getNextHoliday(holidays) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = holidays
    .map((h) => ({ ...h, dateObj: parseLocalDate(h.date) }))
    .filter((h) => h.dateObj >= today)
    .sort((a, b) => a.dateObj - b.dateObj);
  if (!upcoming.length) return null;
  const next = upcoming[0];
  const daysAway = Math.round((next.dateObj - today) / 86400000);
  return { ...next, daysAway };
}

function ordinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatDays(value) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function EmployeeHome({ onNavigateTimesheet }) {
  const user = JSON.parse(localStorage.getItem('crm_current_user') || '{}');
  const userId = user.id || user.email || 'guest';
  // Assumes a `name` field on the stored user — change this line if yours differs.

const displayName = deriveDisplayName(user);
const initials = getInitials(user, displayName);


  const [entry, setEntry] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [shortLogs, setShortLogs] = useState([]);
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    setEntry(loadTodaysEntry(userId));
    setLeaves(getStoredLeaves(userId));
    setShortLogs(getShortTimeLogs(userId));
    setHolidays(getHolidays());

    const id = setInterval(() => setEntry(loadTodaysEntry(userId)), 60000); // refresh net hours every minute
    return () => clearInterval(id);
  }, [userId]);

  const now = new Date();
  const year = now.getFullYear();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const shortSummary = calculateShortSummary(shortLogs, year);
  const leaveSummary = calculateLeaveSummary(leaves, year, shortSummary);

  const isCheckedIn = !!entry?.checkIn;
  const isCheckedOut = !!entry?.checkOut;
  const netMs = netElapsedMs(entry);
  const nextHoliday = getNextHoliday(holidays);

  const totalPaidPerMonth = MONTHLY_PAID_LEAVES_PER_CATEGORY * 2;
  const policyText = `You are allowed ${totalPaidPerMonth} paid leaves per month (${MONTHLY_PAID_LEAVES_PER_CATEGORY} Casual + ${MONTHLY_PAID_LEAVES_PER_CATEGORY} Medical). The ${ordinalSuffix(totalPaidPerMonth + 1)} leave in any month is automatically unpaid. ${SHORT_MINUTES_PER_DEDUCTED_DAY / 60} accumulated short hours = 1 paid leave deducted from your annual balance.`;

  return (
    <div className="eo-page">
      <div className="eo-greeting-card">
        <div className="eo-avatar">{initials}</div>
        <div className="eo-greeting-main">
          <h2 className="eo-greeting-title">{getGreeting()}, {displayName}</h2>
          <p className="eo-greeting-sub">{dateStr} · Ramadan hours active · 9:00 AM – 5:00 PM</p>
          <div className="eo-badges">
            <span className={`eo-badge ${isCheckedIn && !isCheckedOut ? 'eo-badge-green' : 'eo-badge-muted'}`}>
              {isCheckedOut ? 'Checked out' : isCheckedIn ? 'Active' : 'Not checked in'}
            </span>
            {isCheckedIn && (
              <span className="eo-badge eo-badge-orange">Checked in at {fmtHHMM(entry.checkIn)}</span>
            )}
            <span className="eo-badge eo-badge-blue">{formatDays(leaveSummary.remaining)} days leave remaining</span>
          </div>
        </div>
      </div>
 <div className="eo-grid">

        <Link
          to="/employeView/timesheet"
          className="eo-stat-card eo-clickable"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div className="eo-stat-icon eo-icon-orange"><LuClock size={18} /></div>
          <div className="eo-stat-label">Today's Timesheet</div>
          <div className="eo-stat-value eo-value-orange">{fmtDuration(netMs)}</div>
          <div className="eo-stat-sub">Net so far · click to view</div>
        </Link>

        <Link
          to="/employeView/leaves"
          className="eo-stat-card eo-clickable"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div className="eo-stat-icon eo-icon-green"><LuCalendarOff size={18} /></div>
          <div className="eo-stat-label">Leave Balance {year}</div>
          <div className="eo-stat-value eo-value-green">{formatDays(leaveSummary.remaining)} days</div>
          <div className="eo-stat-sub">Remaining of {leaveSummary.totalDays} allowed</div>
        </Link>

        <Link
          to="/employeView/assets"
          className="eo-stat-card eo-clickable"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div className="eo-stat-icon eo-icon-purple"><LuLaptop size={18} /></div>
          <div className="eo-stat-label">My Assets</div>
          <div className="eo-stat-value eo-value-muted">—</div>
          <div className="eo-stat-sub">Assets module...</div>
        </Link>

        <Link
          to="/employeView/holidays"
          className="eo-stat-card eo-clickable"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div className="eo-stat-icon eo-icon-purple"><LuStar size={18} /></div>
          <div className="eo-stat-label">Next Holiday</div>
          {nextHoliday ? (
            <>
              <div className="eo-stat-value eo-value-purple">{nextHoliday.name}</div>
              <div className="eo-stat-sub">{nextHoliday.daysAway} day{nextHoliday.daysAway === 1 ? '' : 's'} · {nextHoliday.dateLabel}</div>
            </>
          ) : (
            <>
              <div className="eo-stat-value eo-value-muted">—</div>
              <div className="eo-stat-sub">No upcoming holidays on file</div>
            </>
          )}
        </Link>
      </div>

      <div className="eo-policy-banner">
        <span className="eo-policy-icon"><LuInfo size={16} /></span>
        <p className="eo-policy-text"><strong>HR Policy:</strong> {policyText}</p>
      </div>
    </div>
  );
}

export default EmployeeHome;