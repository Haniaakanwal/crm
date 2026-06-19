import React from 'react'
import { useState, useEffect } from 'react';
import '../styles/EmployeeLeaves.css';
import AnnualLeaveBalance from './AnnualLeaveBalance';
import MonthlyLeaveWarning from './MonthlyLeaveWarning';
import LeaveHistory from './LeaveHistory';
import LeaveRequestForm from './LeaveRequestForm';
import ShortHoursTracker from './ShortHoursTracker';
import { getStoredLeaves, getShortTimeLogs } from './leaveStorage';
import { calculateShortSummary } from './shortHoursUtils';
import { calculateLeaveSummary } from './leaveUtils';


function EmployeeLeaves() {
  const user = JSON.parse(localStorage.getItem('crm_current_user') || '{}');
  const userId = user.id || user.email || 'guest';

  const [leaves, setLeaves] = useState([]);

  const [shortTimeLogs, setShortTimeLogs] = useState([]);

  useEffect(() => {
    setLeaves(getStoredLeaves(userId));
    setShortTimeLogs(getShortTimeLogs(userId));
  }, [userId]);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const shortSummary = calculateShortSummary(shortTimeLogs, year);
  const leaveSummary = calculateLeaveSummary(leaves, year, shortSummary);

  return (
    <div className="el-page">
      <div className="el-page-header">
        <h2 className="el-page-title">My Leaves</h2>
        <p className="el-page-subtitle">Your {year} leave balance · submit requests · track history</p>
      </div>

      <div className="el-grid">
        <div className="el-col">
          <AnnualLeaveBalance leaves={leaves} year={year} shortSummary={shortSummary} />
          <MonthlyLeaveWarning leaves={leaves} year={year} month={month} />
          <LeaveHistory leaves={leaves} year={year} />
        </div>

        <div className="el-col">
          <LeaveRequestForm
            userId={userId}
            leaves={leaves}
            onSubmitted={() => setLeaves(getStoredLeaves(userId))}
          />
          <ShortHoursTracker attendanceRecords={shortTimeLogs} year={year} />

        </div>
      </div>
    </div>
  );
}

export default EmployeeLeaves