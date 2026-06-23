import { useState, useEffect, useCallback } from 'react';
import '../styles/AdminTimesheet.css';
import { LuInfo } from 'react-icons/lu';
import TodaysEntry from '../../EmployeView/TimeSheet/TodaysEntry'; 
import { getAllUsers } from '../../../../services/fileMakerService'; 
// import real FileMaker integration utilities
import { loadTimesheetFromFM } from '../../../../services/timesheet/timesheetApi';

const REQUIRED_MS = 8 * 3600 * 1000;

// Pakistan/Local Time safe "YYYY-MM-DD" key builder
const todayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

function initials(name) {
  return (name || '?').slice(0, 2).toUpperCase();
}

function fmtDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

function fmtHHMM(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ap}`;
}

function totalBreakMs(entry, nowMs) {
  if (!entry?.breaks) return 0;
  return entry.breaks.reduce((acc, b) => acc + ((b.end || nowMs) - b.start), 0)
    + (entry.activeBreak ? nowMs - entry.activeBreak.start : 0);
}

function netWorkedMs(entry, nowMs) {
  if (!entry || !entry.checkIn) return 0;
  const endPoint = entry.checkOut || nowMs;
  return (endPoint - entry.checkIn) - totalBreakMs(entry, nowMs);
}

function AdminTimesheet() {
  const [employees, setEmployees] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [attendanceMatrix, setAttendanceMatrix] = useState({});
  const [tick, setTick] = useState(0);

  const dateKey = todayKey();
  const nowMs = Date.now();

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // 1. Fetch live employee roster from Enquiry Table Layout
  useEffect(() => {
    let cancelled = false;
    getAllUsers()
      .then((users) => {
        if (!cancelled) setEmployees(users);
      })
      .catch((err) => console.error('Could not load employee roster:', err))
      .finally(() => {
        if (!cancelled) setLoadingUsers(false);
      });

    return () => { cancelled = true; };
  }, []);

  // 2. Fetch live data from FileMaker Layout Contexts
  const refreshMatrixData = useCallback(async () => {
    if (employees.length === 0) return;
    const freshMatrix = {};
    
    // Scan all active profiles over real Data API channels
    await Promise.all(
      employees.map(async (emp) => {
        try {
          const entryData = await loadTimesheetFromFM(emp.id, dateKey);
          freshMatrix[emp.id] = entryData;
        } catch {
          freshMatrix[emp.id] = null;
        }
      })
    );
    setAttendanceMatrix(freshMatrix);
  }, [employees, dateKey]);

  // Sync overview panel every time user accounts change or an action finishes
  useEffect(() => {
    refreshMatrixData();
  }, [refreshMatrixData, selectedId]);

  // Live timer tick loops to compute active ticking clocks accurately
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Parse table rows from live synchronized data state matrix
  const overviewRows = employees.map((emp) => {
    const empEntry = attendanceMatrix[emp.id];
    if (!empEntry || !empEntry.checkIn) {
      return { ...emp, status: 'Leave', inTime: null, breakLabel: '—', hoursLabel: 'Off', isShort: false };
    }
    const empBreakMs = totalBreakMs(empEntry, nowMs);
    const empNetMs = netWorkedMs(empEntry, nowMs);
    const isShort = empNetMs < REQUIRED_MS;
    return {
      ...emp,
      status: isShort ? 'Short' : 'Full',
      inTime: fmtHHMM(empEntry.checkIn),
      breakLabel: empBreakMs > 0 ? fmtDuration(empBreakMs) : '—',
      hoursLabel: fmtDuration(empNetMs),
      isShort,
    };
  });

  return (
    <div className="at-page">
      <div className="at-date-nav">
        <div className="at-date-label">
          <span className="at-date-main">{dateLabel}</span>
          <span className="at-date-sub">Today · 8h required</span>
        </div>
        <span className="at-today-badge">Today</span>
      </div>

      <div className="at-grid">
        {/* Left Side: Dynamic Entry Logs */}
        <div className="at-log-card">
          <h3 className="at-card-title">Log Entry — Admin View</h3>

          <div className="at-field-group">
            <label className="at-label">Employee</label>
            <select
              className="at-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={loadingUsers}
            >
              <option value="">
                {loadingUsers ? 'Loading employees...' : 'Select employee...'}
              </option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          {selectedId ? (
            // Re-mounts correctly with clean callback hooks to update grid upon completion
            <TodaysEntry 
              key={selectedId} 
              userId={selectedId} 
              onActionComplete={refreshMatrixData} 
            />
          ) : (
            <p className="at-error-text">Select an employee above to view or edit their entry.</p>
          )}
        </div>

        {/* Right Side: Matrix Overview Row items */}
        <div className="at-overview-card">
          <h3 className="at-card-title">All Employees — Today</h3>

          {loadingUsers ? (
            <p className="at-error-text">Loading employees...</p>
          ) : (
            <table className="at-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>In</th>
                  <th>Break</th>
                  <th>Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {overviewRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="at-emp-cell">
                        <span className="at-emp-avatar">{initials(row.name)}</span>
                        {row.name}
                      </div>
                    </td>
                    <td>{row.inTime || '—'}</td>
                    <td>{row.breakLabel}</td>
                    <td className={row.isShort ? 'at-hours-short' : 'at-hours-ok'}>
                      {row.hoursLabel}
                    </td>
                    <td>
                      <span className={`at-status-badge at-status-${row.status.toLowerCase()}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminTimesheet;