import { useEffect, useState } from 'react';
import './styles/EmployeeHome.css';
import { LuClock, LuCalendarOff, LuLaptop, LuStar, LuInfo } from 'react-icons/lu';
import { calculateShortSummary } from './Leaves/shortHoursUtils';
import { calculateLeaveSummary } from './Leaves/leaveUtils';
import { loadTimesheetFromFM, getTimesheetRange } from '../../../services/timesheet/timesheetApi';
import { getEmployeeLeaves, getLeaveBalanceSummary } from '../../../services/leaves/leavesApi';
import { fetchPublicHolidaysFromFM } from '../../../services/holidays/holidaysApi';
import { getEmployeeAssignedAssets } from '../../../services/assets/assetsApi'; // 🟢 Added asset API import
import { Link } from 'react-router';

const todayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

function yearBounds(year) {
  return {
    startKey: `${year}-01-01`,
    endKey: `${year}-12-31`,
  };
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

function formatDays(value) {
  if (value === undefined || value === null) return '0';
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function EmployeeHome() {
  const user = JSON.parse(localStorage.getItem('crm_current_user') || '{}');
  const userId = user.id || user.email || 'guest';

  const displayName = deriveDisplayName(user);
  const initials = getInitials(user, displayName);

  const [entry, setEntry] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [fmBalance, setFmBalance] = useState(null);
  const [yearEntries, setYearEntries] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [assetCount, setAssetCount] = useState(null); // 🟢 State to hold total dynamic assets

  const now = new Date();
  const year = now.getFullYear();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // 1. Live real-time active timesheet counters from FileMaker
  useEffect(() => {
    let cancelled = false;
    const loadToday = () => {
      loadTimesheetFromFM(userId, todayKey())
        .then((loaded) => { if (!cancelled) setEntry(loaded); })
        .catch((err) => console.error('EmployeeHome: failed to load today\'s entry:', err));
    };

    loadToday();
    const id = setInterval(loadToday, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, [userId]);

  // 2. Load Leaves, Balances, and Global Public Holidays from FileMaker layouts
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getEmployeeLeaves(userId),
      getLeaveBalanceSummary(userId, year),
      fetchPublicHolidaysFromFM()
    ])
      .then(([records, balance, holidayRecords]) => {
        if (!cancelled) {
          setLeaves(records);
          setFmBalance(balance);
          setHolidays(holidayRecords);
        }
      })
      .catch((err) => console.error('EmployeeHome: failed to connect to layout contexts:', err));

    return () => { cancelled = true; };
  }, [userId, year]);

  // 3. Load entire year window logs to evaluate short hour summaries
  useEffect(() => {
    let cancelled = false;
    const { startKey, endKey } = yearBounds(year);

    getTimesheetRange(userId, startKey, endKey)
      .then((entries) => { if (!cancelled) setYearEntries(entries); })
      .catch((err) => console.error('EmployeeHome: failed to load range timeline details:', err));

    return () => { cancelled = true; };
  }, [userId, year]);

  // 4. Live active items counter synchronized with FileMaker record rows
  useEffect(() => {
    let cancelled = false;
    getEmployeeAssignedAssets(userId)
      .then((records) => {
        if (!cancelled) {
          setAssetCount(records ? records.length : 0);
        }
      })
      .catch((err) => console.error('EmployeeHome: failed to count asset lines:', err));

    return () => { cancelled = true; };
  }, [userId]);

  const shortSummary = calculateShortSummary(yearEntries, year);
  
  // Use fallback local runtime calculation if the primary LeaveBalance table record row is missing
  const leaveSummary = fmBalance || calculateLeaveSummary(leaves, year, shortSummary);

  const isCheckedIn = !!entry?.checkIn;
  const isCheckedOut = !!entry?.checkOut;
  const netMs = netElapsedMs(entry);
  const nextHoliday = getNextHoliday(holidays);

  // Policy text configuration matching the 3rd rule alignment check
  const policyText = `You are allowed 2 paid leaves per month (1 Casual + 1 Medical). The 3rd leave in any month is automatically unpaid. 8 accumulated short hours = 1 paid leave deducted from your annual balance.`;

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
          <div className="eo-stat-sub">Remaining of {leaveSummary.totalDays || 24} allowed</div>
        </Link>

        {/* ── Dynamic Assets Display matching image_88e444.png ── */}
        <Link
          to="/employeView/assets"
          className="eo-stat-card eo-clickable"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div className="eo-stat-icon eo-icon-purple"><LuLaptop size={18} /></div>
          <div className="eo-stat-label">My Assets</div>
          <div className="eo-stat-value eo-value-blue">
            {assetCount !== null ? assetCount : '—'}
          </div>
          <div className="eo-stat-sub">Items currently with you</div>
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