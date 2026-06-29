import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { LuUsers, LuUserCheck, LuCalendarClock, LuDollarSign, LuArrowRight, LuCheck, LuX } from 'react-icons/lu';
import { getCompleteAdminDashboardMetrics } from '../../../services/dashboard/adminDashboardApi';
import { updateLeaveStatusInFM } from '../../../services/leaves/leavesApi';
import './styles/AdminDashboard.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Derive active date metrics matching screen specs (May 2026 Context)
  const targetYear = 2026;
  const targetMonth = 5; 

  const loadDashboardTelemetry = () => {
    setLoading(true);
    getCompleteAdminDashboardMetrics(targetYear, targetMonth)
      .then(res => {
        setMetrics(res);
        setLoading(false);
      })
      .catch(err => {
        console.error("Telemetry link exception:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadDashboardTelemetry();
  }, []);

  // Fast profile lookup utility map[cite: 13]
  const employeeLookup = useMemo(() => {
    const lookup = {};
    if (metrics?.employeeProfiles) {
      metrics.employeeProfiles.forEach(emp => {
        lookup[String(emp.id)] = emp;
      });
    }
    return lookup;
  }, [metrics]);

  const handleQuickLeaveAction = async (recordId, nextStatus) => {
    try {
      await updateLeaveStatusInFM(recordId, nextStatus); //[cite: 8]
      loadDashboardTelemetry();
    } catch (err) {
      alert("Could not process leave update status change.");
    }
  };

// ── DYNAMIC MONTHLY DISBURSEMENT SUMMARY MATRIX ──
  const netDisbursedSum = useMemo(() => {
    if (!metrics?.salariesList) return 0;
    // 🟢 FIXED: Adds up all deposited payroll amounts across records dynamically
    return metrics.salariesList.reduce((acc, row) => acc + row.deposited, 0);
  }, [metrics]);

  const activeMonthName = new Date().toLocaleDateString('en-US', { month: 'long' });
  const activeYearLabel = new Date().getFullYear();

  if (loading) {
    return (
      <div className="db-page">
        <p className="db-loading">loading...</p>
      </div>
    );
  }
const liveDateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return (
    <div className="db-page">
      {/* HEADER ACTION CONTAINER */}
      <div className="db-header">
   <div>
          <h2 className="db-title">Good afternoon, Admin</h2>
          {/* 🟢 FIXED: Replaced hardcoded May 2026 string with your active timeline date */}
          <p className="db-subtitle">{liveDateLabel} · Office hours active</p>
        </div>
        <div className="db-header-actions">
          <button className="btn-export" onClick={() => navigate('/adminView/transactions')}>Ledger Accounts</button>
          <button className="btn-entry" onClick={() => navigate('/adminView/timesheet')}>+ New Entry</button>
        </div>
      </div>

      {/* ── METRIC HUD OVERVIEW CARDS TRACK ── */}
      <div className="db-metrics-track">
        <div className="db-metric-card border-orange" onClick={() => navigate('/adminView/employees')} style={{ cursor: 'pointer' }}>
          <div className="db-card-icon-wrap bg-orange"><LuUsers size={18} /></div>
          <div className="db-metric-info">
            <h3>{metrics?.activeEmployeesCount || 0}</h3>
            <p>Active Employees</p>
          </div>
          <span className="db-trend-badge green">+1 this year</span>
        </div>

        <div className="db-metric-card border-green" onClick={() => navigate('/adminView/timesheet')} style={{ cursor: 'pointer' }}>
          <div className="db-card-icon-wrap bg-green"><LuUserCheck size={18} /></div>
          <div className="db-metric-info">
            <h3>{metrics?.presentTodayCount || 0}</h3>
            <p>Present Today</p>
          </div>
          <span className="db-trend-badge teal">Active Clock</span>
        </div>

        <div className="db-metric-card border-blue" onClick={() => navigate('/adminView/leaves')} style={{ cursor: 'pointer' }}>
          <div className="db-card-icon-wrap bg-blue"><LuCalendarClock size={18} /></div>
          <div className="db-metric-info">
            <h3>{metrics?.pendingLeavesCount || 0}</h3>
            <p>Pending Leaves</p>
          </div>
          <span className="db-trend-badge red">Action needed</span>
        </div>

        <div className="db-metric-card border-red" onClick={() => navigate('/adminView/leaves')} style={{ cursor: 'pointer' }}>
          <div className="db-card-icon-wrap bg-red"><LuDollarSign size={18} /></div>
          <div className="db-metric-info">
            <h3>{metrics?.unprocessedUnpaidCount || 0}</h3>
            <p>Unpaid — Unprocessed</p>
          </div>
          <span className="db-trend-badge gray">Deductions Node</span>
        </div>
      </div>

      {/* ── TWO COLUMN GRID CONTAINER BOARD MATRIX ── */}
      <div className="db-main-split">
        
        {/* LEFT COLUMN DOCK */}
        <div className="db-left-split">
          
        {/* TODAY'S ATTENDANCE PANEL */}
          <div className="db-panel-card">
            <div className="db-panel-header">
              <h4>🟢 Today's Attendance <span className="sub-tag">Office: 9:00 AM – 5:00 PM (Ramadan)</span></h4>
              <button className="panel-btn-link" onClick={() => navigate('/adminView/timesheet')}>Full view ↗</button>
            </div>
            
            <table className="db-data-table">
              <thead>
                <tr>
                  <th>EMPLOYEE</th>
                  <th>CHECK IN</th>
                  <th>CHECK OUT</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {metrics?.attendanceList?.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                      No attendance entries registered for today yet.
                    </td>
                  </tr>
                ) : (
                  metrics?.attendanceList?.map(row => {
                    const resolvedProfile = employeeLookup[String(row.employeeId)] || { 
                      name: row.employeeId || 'Staff Member', 
                      department: 'Operations' 
                    };
                    
                    return (
                      <tr key={row.id}>
                        <td>
                          <div className="db-emp-cell">
                            <div className="db-avatar-dot" style={{ backgroundColor: row.checkOut !== '—' ? '#10b981' : '#3b82f6' }} />
                            <div>
                              <p className="emp-name">{resolvedProfile.name}</p>
                              <p className="emp-dept">{resolvedProfile.department}</p>
                            </div>
                          </div>
                        </td>
                        <td><span className="time-txt">{row.checkIn}</span></td>
                        <td><span className="time-txt">{row.checkOut}</span></td>
                        <td>
                          <span className={`status-badge-short ${row.checkOut !== '—' ? 'completed' : 'active'}`} style={{
                            backgroundColor: row.checkOut !== '—' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: row.checkOut !== '—' ? '#10b981' : 'var(--accent-amber-gold)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            {row.checkOut !== '—' ? 'Completed' : 'Active Row'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

      {/* DYNAMIC LEAVE ALLOWANCE TRACK PANEL */}
          <div className="db-panel-card" style={{ marginTop: '20px' }}>
            <div className="db-panel-header">
              <h4>📅 2026 Leave Allowance Track <span className="sub-tag">Predefined balance: 24 days max</span></h4>
              <button className="panel-btn-link" onClick={() => navigate('/adminView/leaves')}>Details ↗</button>
            </div>

            <div className="db-leave-balance-grid">
              {metrics?.leaveBalances?.map(balanceRow => {
                // Find matching metadata from employeeProfiles using internal lookup matching keys
                const matchingProfile = employeeLookup[String(balanceRow.employeeId)] || { 
                  name: `User ID ${balanceRow.employeeId}`, 
                  department: 'Workforce' 
                };

                // Reconcile dynamic filled layout percentages safely to avoid division-by-zero crashes
                const totalAllowed = balanceRow.totalDays || 24;
                const leavesUsed = balanceRow.usedDays || 0;
                const fillPercentage = Math.min(100, Math.round((leavesUsed / totalAllowed) * 100));

                return (
                  <div className="db-leave-mini-card" key={balanceRow.employeeId}>
                    <p className="leave-card-name">
                      {matchingProfile.name} <span className="leave-card-dept">{matchingProfile.department}</span>
                    </p>
                    
                    {/* PROGRESS TRACK TINT BAR */}
                    <div className="leave-bar-container" style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', margin: '10px 0 6px 0', overflow: 'hidden' }}>
                      <div className="leave-bar-fill" style={{ 
                        width: `${fillPercentage}%`, 
                        height: '100%', 
                        background: 'linear-gradient(90deg, #f5b84e, #f97316)', 
                        borderRadius: '10px' 
                      }} />
                    </div>
                    
                    {/* DYNAMIC SUBMETRIC METADATA OVERVIEW */}
                    <div className="db-leave-card-meta" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '6px' }}>
                      <span className="taken-lbl" style={{ color: 'var(--text-secondary)' }}>
                        <b>{leavesUsed}</b> taken
                      </span>
                      <span className="remain-lbl" style={{ color: 'var(--text-muted)' }}>
                        <b>{balanceRow.remaining}</b> remaining
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN DOCK */}
        <div className="db-right-split">
          
          {/* LEAVE ACTIONABLE QUEUE CARD */}
          <div className="db-panel-card mb-20">
            <div className="db-panel-header">
              <h4>Leave Requests <span className="count-bubble">{metrics?.leaveRequestsList?.length || 0} pending</span></h4>
              <button className="panel-btn-link" onClick={() => navigate('/adminView/leaves')}>All ↗</button>
            </div>
            
            <div className="db-action-list">
              {metrics?.leaveRequestsList?.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>No active leave files pending.</p>
              ) : (
                metrics?.leaveRequestsList?.map(req => {
                  const resolvedName = employeeLookup[String(req.employeeId)]?.name || `Staff member (${req.employeeId})`;
                  return (
                    <div className="db-action-row" key={req.id}>
                      <div className="db-action-info">
                        <p className="action-main-title">{resolvedName}</p>
                        <p className="action-sub-title"><span className="badge-blue-txt">{req.type}</span> · {req.category}</p>
                      </div>
                      <div className="db-action-buttons">
                        <button className="btn-action-ok" onClick={() => handleQuickLeaveAction(req.id, 'Approved')}><LuCheck size={12} /></button>
                        <button className="btn-action-no" onClick={() => handleQuickLeaveAction(req.id, 'Rejected')}><LuX size={12} /></button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

       {/* DYNAMIC MONTHLY DISBURSEMENT SUMMARY */}
          <div className="db-panel-card mb-20">
            <div className="db-panel-header">
              <h4>{activeMonthName} Salary Status <span className="sub-tag">Disbursement · {activeMonthName} {activeYearLabel}</span></h4>
              <button className="panel-btn-link" onClick={() => navigate('/adminView/accounts')}>Accounts ↗</button>
            </div>

            <div className="db-salary-list">
              {metrics?.salariesList?.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '10px 0' }}>
                  No salary records initialized for this month yet.
                </p>
              ) : (
                metrics?.salariesList?.slice(0, 5).map(sal => (
                  <div className="db-salary-row" key={sal.id}>
                    <span className="sal-name">👤 {sal.name}</span>
                    <div className="sal-status-block">
                      <span className="sal-amt">Rs {sal.payable.toLocaleString()}</span>
                      <span className={`sal-status-badge ${sal.status.toLowerCase()}`} style={{
                        backgroundColor: sal.status === 'Paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: sal.status === 'Paid' ? '#10b981' : 'var(--accent-amber-gold)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {sal.status === 'Paid' ? '✓ Paid' : '⏳ Pending'}
                      </span>
                    </div>
                  </div>
                ))
              )}
              
              <div className="db-salary-footer-total" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Disbursed</span>
                <span className="total-sum" style={{ fontWeight: '700', fontSize: '15px' }}>
                  Rs {netDisbursedSum.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* SYSTEM ADMINISTRATIVE SETTINGS AND HOLIDAYS LINKS */}
          <div className="db-panel-card">
            <h4>Quick Control Links</h4>
            <div className="db-quick-actions-list" style={{ marginTop: '12px' }}>
              <div className="quick-action-item" onClick={() => navigate('/adminView/settings')}>
                <div>
                  <p className="qa-title">Adjust Settings & Policies</p>
                  <p className="qa-sub">Configure office layouts parameters variables</p>
                </div>
                <LuArrowRight size={16} className="qa-arrow" />
              </div>
              <div className="quick-action-item" onClick={() => navigate('/adminView/holidays')}>
                <div>
                  <p className="qa-title">Manage Public Holidays</p>
                  <p className="qa-sub">Update current active listing rows calendar</p>
                </div>
                <LuArrowRight size={16} className="qa-arrow" />
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default AdminDashboard;