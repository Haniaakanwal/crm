import { useState, useEffect, useMemo } from 'react';
import '../styles/AdminTimesheet.css';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import TodaysEntry from '../../EmployeView/TimeSheet/TodaysEntry'; 
import {
  dateKeyFor,
  loadTimesheetEntry,
  fmtDuration,
  fmtHHMM,
  totalBreakMs,
  netWorkedMs,
} from './timesheetStorage';

import { getAllUsers } from '../../../../services/fileMakerService'; 

const REQUIRED_MS = 8 * 3600 * 1000;

function initials(name) {
  return (name || '?').slice(0, 2).toUpperCase();
}

function AdminTimesheet() {
  const [employees, setEmployees] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [tick, setTick] = useState(0);


  useEffect(() => {
    let cancelled = false;
    setLoadingUsers(true);
    setUsersError('');

    getAllUsers()
      .then((users) => {
        if (!cancelled) setEmployees(users);
      })
      .catch((err) => {
        if (!cancelled) setUsersError(err.message || 'Could not load employee list');
      })
      .finally(() => {
        if (!cancelled) setLoadingUsers(false);
      });

    return () => { cancelled = true; };
  }, []);

  // Live ticker so the overview table's "ongoing" hours update each second
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const today = new Date();
  const dateKey = dateKeyFor(today);
  const nowMs = Date.now();

  const dateLabel = today.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // ── All-employees overview table for today ───────────────────────────
  const overviewRows = useMemo(() => {
    return employees.map((emp) => {
      const empEntry = loadTimesheetEntry(emp.id, dateKey);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, dateKey, tick]);

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
        {/* ── Left: pick an employee, then edit their day using the
             exact same TodaysEntry component they themselves use ── */}
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
            {usersError && <p className="at-error-text">{usersError}</p>}
            {!loadingUsers && !usersError && employees.length === 0 && (
              <p className="at-error-text">No registered accounts found.</p>
            )}
          </div>

          {selectedId ? (
            // Same component, same storage, same check-in/break/checkout
            // behavior an employee gets on their own Timesheet page —
            // just scoped to whichever employee the admin picked above.
            <TodaysEntry key={selectedId} userId={selectedId} />
          ) : (
            <p className="at-error-text">Select an employee above to view or edit their entry.</p>
          )}
        </div>

        {/* ── Right: All Employees overview ── */}
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