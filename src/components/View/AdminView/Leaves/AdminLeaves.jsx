import { useState, useEffect, useMemo } from 'react';
import { getAllUsers } from '../../../../services/fileMakerService';
import { getAllEmployeeLeaves, saveLeaveRequestToFM, updateLeaveStatusInFM } from '../../../../services/leaves/leavesApi';
import { FaCheck, FaTimes, FaPaperPlane } from 'react-icons/fa';
import '../styles/AdminLeaves.css';

const TABS = ['All', 'Pending', 'Approved', 'Rejected'];

function initials(name) {
  return (name || '?').slice(0, 2).toUpperCase();
}

function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function AdminLeaves() {
  const [employees, setEmployees] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [leaveType, setLeaveType] = useState('Full Day');
  const [leaveDate, setLeaveDate] = useState('');
  const [category, setCategory] = useState('Casual');
  const [reason, setReason] = useState('');

  // ── FIX: Map employee records into a fast lookup map for name resolution ──
  const employeeLookup = useMemo(() => {
    const lookup = {};
    employees.forEach(emp => {
      // emp.id maps to the user's FileMaker record ID or unique identifier
      lookup[emp.id] = emp.name;
    });
    return lookup;
  }, [employees]);

  const loadData = () => {
    setLoading(true);
    Promise.all([getAllUsers(), getAllEmployeeLeaves()])
      .then(([users, leavesList]) => {
        setEmployees(users);
        setAllLeaves(leavesList);
      })
      .catch((err) => console.error('Error loading Admin Leaves context data:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusUpdate = async (recordId, status) => {
    try {
      await updateLeaveStatusInFM(recordId, status);
      loadData(); // Re-fetch the live listing to reflect updates immediately
    } catch (err) {
      console.error(err);
      alert('Failed to update leave request status.');
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!selectedEmpId || !leaveDate) {
      alert('Please select an employee and a valid date.');
      return;
    }

    const payload = {
      type: leaveType,
      fromDate: leaveDate,
      toDate: leaveDate,
      category,
      reason
    };

    try {
      await saveLeaveRequestToFM(selectedEmpId, payload);
      alert('Leave request created successfully!');
      setLeaveDate('');
      setReason('');
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error creating request.');
    }
  };

  // Count active pending entries for the badging node
  const pendingCount = useMemo(() => {
    return allLeaves.filter(l => l.status === 'Pending').length;
  }, [allLeaves]);

  // Apply tab filters over raw rows
  const filteredLeaves = useMemo(() => {
    if (activeTab === 'All') return allLeaves;
    return allLeaves.filter(l => l.status.toLowerCase() === activeTab.toLowerCase());
  }, [allLeaves, activeTab]);

  if (loading) {
    return <div className="loading-spinner" style={{ padding: '40px', color: '#fff' }}>Loading Requests Portal...</div>;
  }

  return (
    <div className="al-page">
      <div className="al-page-header">
        <h2 className="al-page-title">Leave Management</h2>
        <p className="al-page-subtitle">Requests · Approvals · Annual balance</p>
      </div>

      <div className="al-grid">
        {/* Left Hand Card Column: Requests list */}
        <div className="al-col-list">
          <div className="pending-requests-card">
            <div className="card-header-row">
              <h3 className="card-title">
                Pending Requests <span className="pending-badge">{pendingCount}</span>
              </h3>
              <div className="al-tabs">
                {TABS.map(tab => (
                  <button
                    key={tab}
                    className={`al-tab ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="leaves-list-wrapper">
              {filteredLeaves.length === 0 && <p className="lh-empty">No matching leave records found.</p>}
              {filteredLeaves.map((leave) => {
                // Get name from lookup using the employee ID, fallback to ID details if not found yet
                const resolvedName = employeeLookup[leave.employeeId] || `User (${leave.employeeId})`;
                
                return (
                  <div key={leave.id} className="leave-management-row">
                    <div className="leave-row-left">
                      <div className="al-avatar">{initials(resolvedName)}</div>
                      <div className="leave-details">
                        <div className="emp-title-name">{resolvedName}</div>
                        <div className="leave-meta-subtitle">
                          {leave.type} · {leave.category} · {formatDateLabel(leave.fromDate)}
                        </div>
                        {leave.reason && <div className="leave-reason-text">"{leave.reason}"</div>}
                      </div>
                    </div>

                    <div className="leave-row-right">
                      {leave.status === 'Pending' ? (
                        <div className="action-buttons">
                          <button 
                            className="btn-action approve" 
                            onClick={() => handleStatusUpdate(leave.id, 'Approved')}
                            title="Approve"
                          >
                            <FaCheck />
                          </button>
                          <button 
                            className="btn-action reject" 
                            onClick={() => handleStatusUpdate(leave.id, 'Rejected')}
                            title="Reject"
                          >
                            <FaTimes />
                          </button>
                        </div>
                      ) : (
                        <span className={`static-status-badge ${leave.status.toLowerCase()}`}>
                          {leave.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Hand Card Column: Input request creation form */}
        <div className="al-col-form">
          <div className="new-request-card">
            <h3 className="card-title">New Leave Request</h3>
            <form onSubmit={handleSubmitRequest}>
              <div className="al-form-group">
                <label>Employee</label>
                <select
                  className="al-select"
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                >
                  <option value="">Select employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="al-form-group">
                <label>Leave Type</label>
                <select
                  className="al-select"
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                >
                  <option value="Full Day">Full Day</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Short Time">Short Time</option>
                </select>
              </div>

              <div className="form-row-split">
                <div className="al-form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    className="al-input"
                    value={leaveDate}
                    onChange={(e) => setLeaveDate(e.target.value)}
                  />
                </div>
                <div className="al-form-group">
                  <label>Category</label>
                  <select
                    className="al-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="Casual">Casual</option>
                    <option value="Medical">Medical</option>
                    <option value="Unpaid">Unpaid</option>
                  </select>
                </div>
              </div>

              <div className="al-form-group">
                <label>Reason</label>
                <textarea
                  className="al-textarea"
                  placeholder="Leave reason..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <button type="submit" className="al-submit-btn">
                <FaPaperPlane /> Submit Request
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLeaves;