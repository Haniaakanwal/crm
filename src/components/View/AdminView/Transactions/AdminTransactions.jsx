import React, { useState, useEffect, useMemo } from 'react';
import { LuSearch, LuPlus, LuDollarSign } from 'react-icons/lu';
import { getAllUsers } from '../../../../services/fileMakerService';
import { getAllSystemTransactions, createNewTransactionInFM } from '../../../../services/accounts/accountsApi';
import '../styles/AdminTransactions.css';

const TABS = ['All', 'Advance', 'Loan', 'Bonus', 'Increment'];

function initials(name) {
  return (name || '?').slice(0, 2).toUpperCase();
}

function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal State for creation form
  const [showModal, setShowModal] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [txType, setTxType] = useState('Advance');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const employeeMap = useMemo(() => {
    return new Map(employees.map(e => [String(e.id), e.name]));
  }, [employees]);

  const loadData = () => {
    setLoading(true);
    Promise.all([getAllUsers(), getAllSystemTransactions()])
      .then(([userList, txList]) => {
        setEmployees(userList);
        setTransactions(txList);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter logic matching active tabs and lookup variables
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const empName = employeeMap.get(String(tx.employeeId)) || tx.employeeName || '';
      const matchesSearch = empName.toLowerCase().includes(searchTerm.toLowerCase()) || tx.txId.toString().includes(searchTerm);
      const matchesTab = activeTab === 'All' || tx.type.toLowerCase() === activeTab.toLowerCase();
      return matchesSearch && matchesTab;
    });
  }, [transactions, activeTab, searchTerm, employeeMap]);

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    if (!selectedEmpId || !amount) return;

    setSubmitting(true);
    try {
      await createNewTransactionInFM({
        employeeId: selectedEmpId,
        type: txType,
        amount: Number(amount),
        notes: notes,
        outstandingBalance: txType === 'Loan' || txType === 'Advance' ? Number(amount) : 0
      });

      alert('Ledger entry added successfully! Monthly accounts values updated.');
      setShowModal(false);
      setAmount('');
      setNotes('');
      loadData(); // Re-fetch all data to display updates
    } catch (err) {
      console.error(err);
      alert('Error recording financial adjustment transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="tx-page">
      <div className="tx-header-row">
        <div>
          <h2 className="tx-title">Transactions</h2>
          <p className="tx-subtitle">Advances · Loans · Bonuses · Increments</p>
        </div>
        <button className="tx-new-btn" onClick={() => setShowModal(true)}>
          <LuPlus /> New Transaction
        </button>
      </div>

      {/* Filter and Search Bar row layout */}
      <div className="tx-action-bar">
        <div className="tx-search-container">
          <LuSearch className="tx-search-ico" />
          <input 
            type="text" 
            placeholder="Search by employee name or reference..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="tx-tabs-container">
          {TABS.map(tab => (
            <button 
              key={tab} 
              className={`tx-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Ledger Table Card layout container matching design mock */}
      <div className="tx-ledger-container">
        <h3 className="tx-table-headline">{activeTab === 'All' ? 'All Transactions' : `${activeTab} Records`} — 2026</h3>
        
        {loading ? (
          <p className="tx-status-msg">Refreshing records matrix from FileMaker engine...</p>
        ) : filteredTransactions.length === 0 ? (
          <p className="tx-status-msg">No historical transaction entries found.</p>
        ) : (
          <table className="tx-table-element">
            <thead>
              <tr>
                <th>DATE</th>
                <th>EMPLOYEE</th>
                <th>TYPE</th>
                <th>AMOUNT</th>
                <th>NOTES</th>
                <th>BALANCE</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(row => {
                const resolvedName = employeeMap.get(String(row.employeeId)) || row.employeeName;
                const isPositive = row.type === 'Bonus' || row.type === 'Increment';
                
                return (
                  <tr key={row.id}>
                    <td className="tx-date-cell">13 May</td> {/* Static placeholder display for demo sync formatting */}
                    <td>
                      <div className="tx-user-cell">
                        <span className="tx-avatar">{initials(resolvedName)}</span>
                        <span>{resolvedName}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`tx-type-pill ${row.type.toLowerCase()}`}>{row.type}</span>
                    </td>
                    <td className={`tx-amount-cell ${isPositive ? 'positive' : 'negative'}`}>
                      {isPositive ? `+Rs ${row.amount.toLocaleString()}` : `-Rs ${row.amount.toLocaleString()}`}
                    </td>
                    <td className="tx-notes-cell">{row.notes}</td>
                    <td className="tx-balance-cell">
                      {row.balance !== null ? `Rs ${row.balance}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Creation Modal Overlay Form window popup */}
      {showModal && (
        <div className="tx-modal-overlay">
          <div className="tx-modal-card">
            <h3 className="tx-modal-title">Record New Payment Ledger Entry</h3>
            <form onSubmit={handleCreateTransaction}>
              <div className="tx-form-group">
                <label>Target Employee Profile</label>
                <select className="tx-select" value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)} required>
                  <option value="">Select account...</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>

              <div className="tx-form-row">
                <div className="tx-form-group">
                  <label>Adjustment Type</label>
                  <select className="tx-select" value={txType} onChange={(e) => setTxType(e.target.value)}>
                    <option value="Advance">Advance</option>
                    <option value="Loan">Loan</option>
                    <option value="Bonus">Bonus</option>
                    <option value="Increment">Increment</option>
                  </select>
                </div>
                <div className="tx-form-group">
                  <label>Transaction Amount (Rs)</label>
                  <input type="number" className="tx-input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50000" required />
                </div>
              </div>

              <div className="tx-form-group">
                <label>Statement Notes / Reference Memo</label>
                <input type="text" className="tx-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Advance paid on 6 May" required />
              </div>

              <div className="tx-modal-actions">
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-commit" disabled={submitting}>{submitting ? 'Posting...' : 'Post Transaction'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminTransactions;