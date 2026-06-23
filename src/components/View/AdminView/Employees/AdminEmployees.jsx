import { useState, useEffect } from 'react';
import { getAllUsers } from '../../../../services/fileMakerService';
import { getDetailedEmployeesList, createDetailedEmployeeInFM } from '../../../../services/employees/employeesApi';
import { FaPlus, FaSignOutAlt, FaBriefcase, FaMoneyBillWave } from 'react-icons/fa';
import '../styles/AdminEmployees.css';

function initials(name) {
  return (name || '?').slice(0, 2).toUpperCase();
}

function AdminEmployees() {
  const [baseUsers, setBaseUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal Onboarding Form state values
  const [selectedBaseUserId, setSelectedBaseUserId] = useState('');
  const [department, setDepartment] = useState('Operations');
  const [designation, setDesignation] = useState('Associate');
  const [salary, setSalary] = useState('');
  const [leaveBalance, setLeaveBalance] = useState('24');
  const [joiningDate, setJoiningDate] = useState('');
  const [status, setStatus] = useState('Present');

  const loadViewData = () => {
    setLoading(true);
    Promise.all([getAllUsers(), getDetailedEmployeesList()])
      .then(([users, completeList]) => {
        setBaseUsers(users);
        setEmployees(completeList);
      })
      .catch((err) => console.error('Error compiling directory pools:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadViewData();
  }, []);

  // Pre-fill fields automatically when dropdown picker matches a registration login row
  const handleDropdownUserChange = (id) => {
    setSelectedBaseUserId(id);
    const matchedUser = baseUsers.find(u => String(u.id) === String(id));
    if (matchedUser) {
      setJoiningDate(new Date().toLocaleDateString('en-CA')); // sets valid input day fallback string
    }
  };

  const handleFormOnsubmit = async (e) => {
    e.preventDefault();
    const matchedUser = baseUsers.find(u => String(u.id) === String(selectedBaseUserId));
    
    if (!matchedUser) {
      alert('Please match an account registration row from dropdown picker option list first.');
      return;
    }

    // Rough duration formatting string builder for tracking tenure info
    const calculateSampleTenure = (dateString) => {
      if (!dateString) return 'New';
      return '0m'; // dynamic calculation engine will update this row on backend logic trigger configurations
    };

    const payload = {
      employeeId: matchedUser.id,
      fullName: matchedUser.name,
      email: matchedUser.email,
      department,
      designation,
      salary,
      leaveBalance,
      joiningDate: joiningDate.replace(/-/g, '/'), // formats to clean matching schema layout layout masks
      status,
      tenure: calculateSampleTenure(joiningDate),
    };

    try {
      await createDetailedEmployeeInFM(payload);
      alert(`Successfully onboarded profile details for ${matchedUser.name}!`);
      setShowModal(false);
      // Reset form variables
      setSelectedBaseUserId('');
      setSalary('');
      loadViewData();
    } catch (err) {
      console.error(err);
      alert('Failed to save extended record metadata profiles.');
    }
  };

  // Header metric counts values
  const activeCount = employees.filter(e => e.status === 'Present' || e.status === 'Active').length;
  const leaveCount = employees.filter(e => e.status === 'On Leave' || e.status === 'Leave').length;

  if (loading) {
    return <div className="loading-spinner" style={{ padding: '40px', color: 'var(--text-primary)' }}>Loading Team Directory Context...</div>;
  }

  return (
    <div className="ae-page">
      <div className="ae-page-header-row">
        <div className="ae-header-text">
          <h2 className="ae-title">Employees</h2>
          <p className="ae-subtitle">{activeCount} active · {leaveCount} on leave today</p>
        </div>
        <button className="ae-add-btn" onClick={() => setShowModal(true)}>
          <FaPlus /> Add Employee
        </button>
      </div>

      {/* Renders dynamic interactive cards row block items */}
      <div className="ae-cards-grid">
        {employees.map((emp) => (
          <div key={emp.recordId} className="ae-profile-card">
            <div className="card-top-identity">
              <div className="ae-card-avatar">{initials(emp.fullName)}</div>
              <div className="identity-text-meta">
                <div className="emp-card-fullname">{emp.fullName}</div>
                <div className="emp-card-subline">{emp.department} · Joined {emp.joiningDate || 'New'}</div>
                <span className={`emp-status-badge ${emp.status.toLowerCase().replace(/\s+/g, '-')}`}>
                  {emp.status}
                </span>
              </div>
            </div>

            <div className="card-metrics-grid">
              <div className="metric-box-node">
                <span className="node-lbl">Salary</span>
                <span className="node-val">Rs {Number(emp.salary).toLocaleString()}</span>
              </div>
              <div className="metric-box-node">
                <span className="node-lbl">Leave bal.</span>
                <span className="node-val">{emp.leaveBalance} days</span>
              </div>
              <div className="metric-box-node">
                <span className="node-lbl">Tenure</span>
                <span className="node-val">{emp.tenure || '—'}</span>
              </div>
              <div className="metric-box-node">
                <span className="node-lbl">Status</span>
                <span className="node-val status-colored">{emp.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Popup Wrapper form box container view details */}
      {showModal && (
        <div className="ae-modal-overlay">
          <div className="ae-modal-card">
            <h3 className="modal-card-title">Onboard Team Profile</h3>
            
            <form onSubmit={handleFormOnsubmit}>
              <div className="ae-form-group">
                <label>Select Employee Profile Account Login</label>
                <select 
                  className="ae-select" 
                  value={selectedBaseUserId}
                  onChange={(e) => handleDropdownUserChange(e.target.value)}
                  required
                >
                  <option value="">Select employee...</option>
                  {baseUsers.map(user => (
                    <option key={user.id} value={user.id}>{user.email || user.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-split-row">
                <div className="ae-form-group">
                  <label>Department</label>
                  <select className="ae-select" value={department} onChange={(e) => setDepartment(e.target.value)}>
                    <option value="Operations">Operations</option>
                    <option value="Design">Design</option>
                    <option value="Development">Development</option>
                    <option value="Management">Management</option>
                  </select>
                </div>
                <div className="ae-form-group">
                  <label>Designation</label>
                  <input type="text" className="ae-input" value={designation} onChange={(e) => setDesignation(e.target.value)} required />
                </div>
              </div>

              <div className="form-split-row">
                <div className="ae-form-group">
                  <label>Base Salary (Rs)</label>
                  <input type="number" className="ae-input" placeholder="e.g. 150000" value={salary} onChange={(e) => setSalary(e.target.value)} required />
                </div>
                <div className="ae-form-group">
                  <label>Yearly Leave Limit</label>
                  <input type="number" className="ae-input" value={leaveBalance} onChange={(e) => setLeaveBalance(e.target.value)} required />
                </div>
              </div>

              <div className="form-split-row">
                <div className="ae-form-group">
                  <label>Joining Date</label>
                  <input type="date" className="ae-input" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} required />
                </div>
                <div className="ae-form-group">
                  <label>Initial Status</label>
                  <select className="ae-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="Present">Present</option>
                    <option value="On Leave">On Leave</option>
                    <option value="New">New</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions-row">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit">Save Employee Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminEmployees;