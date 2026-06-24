import React, { useState, useEffect, useMemo } from 'react';
import { LuPlus, LuUserCheck } from 'react-icons/lu';
import { getAllUsers } from '../../../../services/fileMakerService';
import { getAllAssetsRegistry, createNewAssetInFM, assignAssetToEmployeeInFM, returnAssetFromEmployeeInFM } from '../../../../services/assets/assetsApi';
import '../styles/AdminAssets.css';

function initials(name) {
  return (name || '?').slice(0, 2).toUpperCase();
}

function AdminAssets() {
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state management
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [activeAsset, setActiveAsset] = useState(null);

  // Form states
  const [newCode, setNewCode] = useState('');
  const [newCategory, setNewCategory] = useState('PC');
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newCondition, setNewCondition] = useState('Good');
  const [selectedEmpId, setSelectedEmpId] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([getAllAssetsRegistry(), getAllUsers()])
      .then(([a, e]) => { setAssets(a); setEmployees(e); })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const stats = useMemo(() => {
    let total = assets.length;
    let assigned = assets.filter(a => a.status === 'Assigned').length;
    let available = assets.filter(a => a.status === 'Available').length;
    let repair = assets.filter(a => a.status === 'Under Repair' || a.condition === 'Repair' || a.status === 'Repair').length;
    return { total, assigned, available, repair };
  }, [assets]);

  const handleAddAsset = async (e) => {
    e.preventDefault();
    const success = await createNewAssetInFM({ assetCode: newCode, category: newCategory, brand: newBrand, model: newModel, condition: newCondition });
    if (success) {
      alert('Asset registered successfully!');
      setShowAddModal(false);
      setNewCode(''); setNewBrand(''); setNewModel('');
      loadData();
    }
  };

  const handleAssignAsset = async (e) => {
    e.preventDefault();
    const emp = employees.find(e => String(e.id) === String(selectedEmpId));
    if (!emp) return;

    const success = await assignAssetToEmployeeInFM(activeAsset.recordId, emp.id, emp.name);
    if (success) {
      alert(`Asset successfully signed over to ${emp.name}`);
      setShowAssignModal(false);
      setSelectedEmpId('');
      loadData();
    }
  };

  // ── NEW PROCESSING HOOK FOR RETURNING MATERIAL EQUIPMENT ──
  const handleReturnAsset = async (assetRecordId) => {
    if (!window.confirm("Are you sure you want to mark this item as returned?")) return;
    
    const success = await returnAssetFromEmployeeInFM(assetRecordId);
    if (success) {
      alert('Equipment logged back into available inventory registry.');
      loadData();
    }
  };

  return (
    <div className="as-page">
      <div className="as-header-bar">
        <div>
          <h2 className="as-title">Assets</h2>
          <p className="as-subtitle">Company inventory · assignments · condition tracking</p>
        </div>
        <button className="as-action-btn" onClick={() => setShowAddModal(true)}><LuPlus /> Add Asset</button>
      </div>

      {/* Simplified metric cards text headers matching image_79fdec.png */}
      <div className="as-metrics-row">
        <div className="as-metric-card">
          <span className="as-met-lbl">Total</span>
          <h2>{stats.total}</h2>
        </div>
        <div className="as-metric-card">
          <span className="as-met-lbl">Assigned</span>
          <h2 className="as-blue-txt">{stats.assigned}</h2>
        </div>
        <div className="as-metric-card">
          <span className="as-met-lbl">Available</span>
          <h2 className="as-green-txt">{stats.available}</h2>
        </div>
        <div className="as-metric-card">
          <span className="as-met-lbl">Repair</span>
          <h2 className="as-red-txt">{stats.repair}</h2>
        </div>
      </div>

      <div className="as-card-table">
        <h3 className="as-card-heading">Asset Registry</h3>
        {loading ? <p className="as-msg">Fetching asset tracking matrix...</p> : (
          <table className="as-table">
            <thead>
              <tr>
                <th>CODE</th>
                <th>CATEGORY</th>
                <th>DESCRIPTION</th>
                <th>CONDITION</th>
                <th>ASSIGNED TO</th>
                <th>SINCE</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {assets.map(a => (
                <tr key={a.recordId}>
                  <td className="as-code-txt">{a.assetCode}</td>
                  <td>{a.category}</td>
                  <td>{a.brand} {a.model}</td>
                  <td>
                    <span className={`as-cond-tag ${a.condition.toLowerCase()}`}>
                      {a.condition}
                    </span>
                  </td>
                  <td>
                    {a.status === 'Assigned' ? (
                      <div className="as-user-cell"><span className="as-av">{initials(a.currentHolder)}</span>{a.currentHolder}</div>
                    ) : <span className="as-muted-dash">—</span>}
                  </td>
                  {/* Displays placeholder timeline values if checked out, or dash if free */}
                  <td className="as-time-txt">{a.status === 'Assigned' ? 'Jun 2026' : '—'}</td>
                  <td><span className={`as-stat-pill ${a.status.toLowerCase().replace(' ', '-')}`}>{a.status}</span></td>
                  <td>
                    {a.status === 'Assigned' ? (
                      <button className="as-row-return-btn" onClick={() => handleReturnAsset(a.recordId)}>
                        Return
                      </button>
                    ) : (
                      <button className="as-row-assign-btn" onClick={() => { setActiveAsset(a); setShowAssignModal(true); }}>
                        Assign
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL 1: ADD ASSET */}
      {showAddModal && (
        <div className="as-modal-overlay">
          <div className="as-modal-card">
            <h3>Add New Inventory Asset</h3>
            <form onSubmit={handleAddAsset}>
              <div className="as-form-row">
                <div className="as-group"><label>Asset Code</label><input type="text" className="as-input" placeholder="e.g. PC-005" value={newCode} onChange={e=>setNewCode(e.target.value)} required /></div>
                <div className="as-group"><label>Category</label>
                  <select className="as-select" value={newCategory} onChange={e=>setNewCategory(e.target.value)}>
                    <option value="PC">PC</option><option value="Laptop">Laptop</option><option value="LCD">LCD</option><option value="Accessories">Accessories</option>
                  </select>
                </div>
              </div>
              <div className="as-form-row">
                <div className="as-group"><label>Brand</label><input type="text" className="as-input" placeholder="e.g. Apple" value={newBrand} onChange={e=>setNewBrand(e.target.value)} required /></div>
                <div className="as-group"><label>Model</label><input type="text" className="as-input" placeholder="e.g. MacBook Pro M3" value={newModel} onChange={e=>setNewModel(e.target.value)} required /></div>
              </div>
              <div className="as-group"><label>Initial Condition</label>
                <select className="as-select" value={newCondition} onChange={e=>setNewCondition(e.target.value)}>
                  <option value="Good">Good</option><option value="Fair">Fair</option><option value="Repair">Requires Repair</option>
                </select>
              </div>
              <div className="as-modal-actions">
                <button type="button" className="as-cancel" onClick={()=>setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="as-submit">Register Asset</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ASSIGN ASSET */}
      {showAssignModal && (
        <div className="as-modal-overlay">
          <div className="as-modal-card">
            <h3>Assign Asset ({activeAsset?.assetCode})</h3>
            <form onSubmit={handleAssignAsset}>
              <div className="as-group">
                <label>Select Recipient Employee</label>
                <select className="as-select" value={selectedEmpId} onChange={e=>setSelectedEmpId(e.target.value)} required>
                  <option value="">Choose an active employee...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.email})</option>)}
                </select>
              </div>
              <div className="as-modal-actions">
                <button type="button" className="as-cancel" onClick={()=>setShowAssignModal(false)}>Cancel</button>
                <button type="submit" className="as-submit">Confirm Handover</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAssets;