import React, { useState, useEffect, useCallback } from 'react';
import '../styles/EmployeeLeaves.css';
import AnnualLeaveBalance from './AnnualLeaveBalance';
import MonthlyLeaveWarning from './MonthlyLeaveWarning';
import LeaveHistory from './LeaveHistory';
import LeaveRequestForm from './LeaveRequestForm';
import ShortHoursTracker from './ShortHoursTracker';
import { calculateShortSummary } from './shortHoursUtils';
import { calculateLeaveSummary } from './leaveUtils';
import { getTimesheetRange } from '../../../../services/timesheet/timesheetApi';
// Import your service function here
import { getEmployeeLeaves, getLeaveBalanceSummary } from '../../../../services/leaves/leavesApi';

function EmployeeLeaves() {
  const user = JSON.parse(localStorage.getItem('crm_current_user') || '{}');
  const userId = user.id || user.email || 'guest';

  const [leaves, setLeaves] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // ── 1. STATE FOR LIVE FILEMAKER DATA ──
  const [fmBalance, setFmBalance] = useState(null);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const fetchLeavesFromBackend = useCallback(() => {
    Promise.all([
      getEmployeeLeaves(userId),
      getLeaveBalanceSummary(userId, year) // Fetching from FileMaker table
    ])
      .then(([records, balance]) => {
        setLeaves(records);
        setFmBalance(balance); // Save layout details to state
      })
      .catch((err) => console.error('Failed loading from FileMaker layouts:', err));
  }, [userId, year]);

  useEffect(() => {
    fetchLeavesFromBackend();
  }, [fetchLeavesFromBackend]);

  useEffect(() => {
    let cancelled = false;
    const startKey = `${year}-01-01`;
    const endKey = `${year}-12-31`;

    getTimesheetRange(userId, startKey, endKey)
      .then((entries) => {
        if (!cancelled) {
          setAttendanceRecords(entries);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('EmployeeLeaves: failed to load timesheet range:', err);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [userId, year]);

  const shortSummary = calculateShortSummary(attendanceRecords, year);
  
  // ── 2. SINGLE SOURCE OF TRUTH CHECK ──
  // If FileMaker has a calculated balance row use it, otherwise use frontend calculation fallback
  const leaveSummary = fmBalance || calculateLeaveSummary(leaves, year, shortSummary);

  if (loading) {
    return <div className="loading-spinner" style={{padding: '40px', color: '#fff'}}>Loading Leaves Profile...</div>;
  }

  return (
    <div className="el-page">
      <div className="el-page-header">
        <h2 className="el-page-title">My Leaves</h2>
        <p className="el-page-subtitle">Your {year} leave balance · submit requests · track history</p>
      </div>

      <div className="el-grid">
        <div className="el-col">
          {/* ── 3. DATA PASSED DOWN TO RENDER ── */}
          <AnnualLeaveBalance summary={leaveSummary} year={year} />
          <MonthlyLeaveWarning leaves={leaves} year={year} month={month} />
          <LeaveHistory leaves={leaves} year={year} />
        </div>

        <div className="el-col">
          <LeaveRequestForm
            userId={userId}
            leaves={leaves}
            onSubmitted={fetchLeavesFromBackend}
          />
          <ShortHoursTracker attendanceRecords={attendanceRecords} year={year} />
        </div>
      </div>
    </div>
  );
}

export default EmployeeLeaves;