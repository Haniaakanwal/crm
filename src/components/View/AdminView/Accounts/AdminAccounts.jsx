import React, { useState, useEffect, useMemo } from 'react';
import { LuChevronLeft, LuChevronRight, LuPlus} from 'react-icons/lu';
import { getAllUsers } from '../../../../services/fileMakerService';
import { getDetailedEmployeesList } from '../../../../services/employees/employeesApi';
import { getMonthlySalaryRecords, generateMonthlySalaryRecordsInFM, updateEmployeeMonthlySalaryInFM } from '../../../../services/accounts/accountsApi';
import '../styles/AdminAccounts.css';

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function initials(name) {
  return (name || '?').slice(0, 2).toUpperCase();
}

function AdminAccounts() {

    const monthNumber = new Date().getMonth()

  const [currentDate, setCurrentDate] = useState(new Date(2026, monthNumber, 1)); 
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Form / Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [formBasicSalary, setFormBasicSalary] = useState('');
  const [formDeductions, setFormDeductions] = useState('');
  const [formDeposited, setFormDeposited] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const monthName = MONTHS[currentDate.getMonth()];

  const loadSalaryData = () => {
    setLoading(true);
    getMonthlySalaryRecords(year, month)
      .then(data => setRecords(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSalaryData();
  }, [year, month]);

  const handleGenerateRecords = async () => {
    if (records.length > 0) {
      alert(`Records for ${monthName} ${year} have already been generated!`);
      return;
    }
    setGenerating(true);
    try {
      let activeEmployees = [];
      try { activeEmployees = await getDetailedEmployeesList(); } 
      catch (e) { activeEmployees = await getAllUsers(); }

      if (activeEmployees.length === 0) {
        alert("No active employees found to generate salaries for.");
        return;
      }
      await generateMonthlySalaryRecordsInFM(year, month, `${monthName} ${year}`, activeEmployees);
      alert(`Successfully generated salary ledger statements for ${activeEmployees.length} employees!`);
      loadSalaryData();
    } catch (err) {
      console.error(err);
      alert("Failed to initialize monthly records generation sheet.");
    } finally {
      setGenerating(false);
    }
  };

  // Open Edit Dialog and Pre-populate with existing backend field data values
  const openEditForm = (row) => {
    setSelectedRecord(row);
    setFormBasicSalary(row.basicSalary);
    setFormDeductions(row.deductions);
    setFormDeposited(row.deposited);
    setFormNotes('');
    setShowEditModal(true);
  };

  // Automated Inline Field Value Calculation Helpers
  const computedNetPayable = useMemo(() => {
    return Math.max(0, Number(formBasicSalary) - Number(formDeductions));
  }, [formBasicSalary, formDeductions]);


  const computedBalance = useMemo(() => {
    return Math.max(0, computedNetPayable - Number(formDeposited || 0));
  }, [computedNetPayable, formDeposited]);

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await updateEmployeeMonthlySalaryInFM(selectedRecord.recordId, {
        basicSalary: formBasicSalary,
        deductions: formDeductions,
        netPayable: computedNetPayable,
        deposited: formDeposited,
        balance: computedBalance,
        notes: formNotes
      });
      alert('Salary details updated successfully!');
      setShowEditModal(false);
      loadSalaryData();
    } catch (err) {
      console.error(err);
      alert('Error saving updated parameters.');
    } finally {
      setUpdating(false);
    }
  };

  const metrics = useMemo(() => {
    let total = 0, disbursed = 0, pending = 0;
    records.forEach(r => {
      total += r.netPayable;
      disbursed += r.deposited;
      pending += r.balance;
    });
    return { total, disbursed, pending };
  }, [records]);

  const fmtK = (val) => val === 0 ? "Rs 0K" : `Rs ${Math.round(val / 1000)}K`;

  return (
    <div className="acc-page">
      <div className="acc-top-action-bar">
        <div className="acc-date-nav">
          <button onClick={() => setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1))}><LuChevronLeft /></button>
          <span className="acc-date-title">{monthName} {year}</span>
          <button onClick={() => setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1))}><LuChevronRight /></button>
        </div>
        <button 
          className="acc-generate-btn" 
          onClick={handleGenerateRecords}
          disabled={generating || loading}
          style={{ opacity: (generating || records.length > 0) ? 0.6 : 1 }}
        >
          <LuPlus /> {generating ? "Generating..." : `Generate ${monthName} Records`}
        </button>
      </div>

      <div className="acc-metrics-grid">
        <div className="acc-stat-card">
          <span className="stat-lbl">Total Payroll</span>
          <h2>{fmtK(metrics.total)}</h2>
          <span className="stat-sub">{records.length} active employees</span>
        </div>
        <div className="acc-stat-card disbursed">
          <span className="stat-lbl">Disbursed</span>
          <h2>{fmtK(metrics.disbursed)}</h2>
          <span className="stat-sub">{records.filter(r => r.status === 'Paid').length} paid</span>
        </div>
        <div className="acc-stat-card pending">
          <span className="stat-lbl">Pending</span>
          <h2>{fmtK(metrics.pending)}</h2>
          <span className="stat-sub">{records.filter(r => r.status !== 'Paid').length} remaining</span>
        </div>
      </div>

      <div className="acc-table-container">
        <h3 className="acc-table-title">{monthName} {year} — Salary Records</h3>
        
        {loading ? (
          <p className="acc-empty">Loading records summary...</p>
        ) : records.length === 0 ? (
          <p className="acc-empty">No salary generations configured for this month. Click the button above to initialize ledger options.</p>
        ) : (
          <table className="acc-table">
            <thead>
              <tr>
                <th>EMPLOYEE</th>
                <th>BASIC SALARY</th>
                <th>DEDUCTIONS</th>
                <th>NET PAYABLE</th>
                <th>DEPOSITED</th>
                <th>BALANCE</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {records.map(row => (
                <tr key={row.recordId}>
                  <td>
                    <div className="acc-user-cell">
                      <span className="acc-avatar">{initials(row.employeeName)}</span>
                      {row.employeeName.split(' - ')[0]}
                    </div>
                  </td>
                  <td>Rs {row.basicSalary.toLocaleString()}</td>
               <td className={row.deductions > 0 ? "acc-text-red" : ""}>
  {row.deductions > 0 ? `Rs ${row.deductions.toLocaleString()}` : '—'}
</td>
                  <td>Rs {row.netPayable.toLocaleString()}</td>
                  <td>Rs {row.deposited.toLocaleString()}</td>
                  <td className={row.balance > 0 ? "acc-text-gold" : ""}>Rs {row.balance.toLocaleString()}</td>
                  <td>
                    <span className={`acc-pill ${row.status.toLowerCase()}`}>{row.status}</span>
                  </td>
                  <td>
                    <button className="acc-edit-row-btn" onClick={() => openEditForm(row)}>
                       Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* DYNAMIC SALARY MASTER ENTRY MODAL FORM CONTAINER */}
      {showEditModal && (
        <div className="acc-modal-overlay">
          <div className="acc-modal-card">
            <h3 className="acc-modal-title">Update Statement — {selectedRecord?.employeeName.split(' - ')[0]}</h3>
            
            <form onSubmit={handleUpdateSubmit}>
              <div className="form-split-row">
                <div className="acc-form-group">
                  <label>Basic Salary (Rs)</label>
                  <input type="number" className="acc-input" value={formBasicSalary} onChange={(e) => setFormBasicSalary(e.target.value)} required />
                </div>
                <div className="acc-form-group">
                  <label>Deductions (Rs)</label>
                  <input type="number" className="acc-input" value={formDeductions} onChange={(e) => setFormDeductions(e.target.value)} required />
                </div>
              </div>

              <div className="form-split-row">
                <div className="acc-form-group">
                  <label>Net Payable (Calculated)</label>
                  <input type="text" className="acc-input readonly-input" value={`Rs ${computedNetPayable.toLocaleString()}`} readOnly />
                </div>
                <div className="acc-form-group">
                  <label>Deposited Amount (Admin Input)</label>
                  <input type="number" className="acc-input highlight-input" placeholder="Enter amount to pay" value={formDeposited} onChange={(e) => setFormDeposited(e.target.value)} required />
                </div>
              </div>

              <div className="acc-form-group">
                <label>Remaining Balance Outstanding</label>
                <input type="text" className="acc-input readonly-input text-gold" value={`Rs ${computedBalance.toLocaleString()}`} readOnly />
              </div>

              <div className="acc-form-group">
                <label>Transaction Logs Statement Memo</label>
                <input type="text" className="acc-input" placeholder="Add custom ledger notes..." value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
              </div>

              <div className="acc-modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={updating}>{updating ? 'Saving Changes...' : 'Save & Post Update'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAccounts;