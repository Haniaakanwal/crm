import React, { useEffect, useState } from 'react';
import { fetchPublicHolidaysFromFM, createHolidayInFM } from '../../../../services/holidays/holidaysApi';
import '../../EmployeView/styles/EmployeeHolidays.css';

function AdminHolidays() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Modal Payload State
  const [form, setForm] = useState({
    name: '',
    date: '2026-06-24',
    days: 1,
    type: 'Religious',
    description: ''
  });

  const loadAdminCalendar = () => {
    setLoading(true);
    fetchPublicHolidaysFromFM()
      .then(records => {
        // Sorts chronologically based on target date keys
        const sorted = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
        setHolidays(sorted);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed loading layout grid records:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadAdminCalendar();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      await createHolidayInFM(form);
      setShowModal(false);
      setForm({ name: '', date: '2026-06-24', days: 1, type: 'Religious', description: '' });
      loadAdminCalendar(); // Instantly refreshes list records view seamlessly
    } catch (err) {
      alert('Error creating holiday entry: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="emp-as-page">
        <p className="emp-as-loading">Loading...</p>
      </div>
    );
  }

  return (
    <div className="emp-as-page" style={{ padding: '32px' }}>
      {/* HEADER MATRIX PANEL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 className="emp-as-title" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Public Holidays</h2>
          <p className="emp-as-subtitle" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            2026 company holiday calendar
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          style={{
            backgroundColor: 'var(--accent-amber-gold, #f5b84e)',
            color: '#000',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            fontWeight: '600',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          + Add Holiday
        </button>
      </div>

      {/* COMPACT REGISTRY CONTAINER BOARD */}
      <div style={{ background: 'var(--bg-card, #111827)', border: '1px solid var(--border-color, #1e2d45)', borderRadius: '10px', padding: '24px' }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--text-primary)' }}>Holidays — 2026</h4>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-secondary)', opacity: 0.7 }}>
              <th style={{ padding: '12px 8px', width: '40px' }}>#</th>
              <th style={{ padding: '12px 8px' }}>HOLIDAY</th>
              <th style={{ padding: '12px 8px' }}>DATE</th>
              <th style={{ padding: '12px 8px' }}>DAYS</th>
              <th style={{ padding: '12px 8px' }}>TYPE</th>
            </tr>
          </thead>
          <tbody>
            {holidays.map((h, index) => (
              <tr key={h.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: 'var(--text-primary)' }}>
                <td style={{ padding: '14px 8px', color: 'var(--text-muted)' }}>{index + 1}</td>
                <td style={{ padding: '14px 8px', fontWeight: '600' }}>{h.name}</td>
                <td style={{ padding: '14px 8px', color: 'var(--text-secondary)' }}>{h.dateLabel}</td>
                <td style={{ padding: '14px 8px' }}>
                  <span className="badge" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', borderRadius: '20px', padding: '2px 10px', fontSize: '0.72rem' }}>
                    {h.days} day{h.days === 1 ? '' : 's'}
                  </span>
                </td>
                <td style={{ padding: '14px 8px' }}>
                  <span className="badge" style={{ 
                    backgroundColor: h.icon === 'moon' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(59, 130, 246, 0.1)', 
                    color: h.icon === 'moon' ? '#c084fc' : '#60a5fa', 
                    borderRadius: '20px', padding: '2px 10px', fontSize: '0.72rem' 
                  }}>
                    {h.icon === 'moon' ? 'Religious' : 'National'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ADD HOLIDAY CREATION MODAL OVERLAY */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContents: 'center', zIndex: 1000, justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--bg-deep, #0b0f19)', border: '1px solid var(--border-color, #1e2d45)', padding: '28px', borderRadius: '12px', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)' }}>Add New Holiday</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Write new calendar specifications directly into FileMaker.</p>
            
            <form onSubmit={handleFormSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Holiday Name</label>
                <input required type="text" name="name" value={form.name} onChange={handleInputChange} style={{ width: '100%', padding: '10px', background: 'var(--bg-card, #111827)', border: '1px solid var(--border-color, #1e2d45)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }} placeholder="e.g. Labour Day" />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Calendar Start Date</label>
                <input required type="date" name="date" value={form.date} onChange={handleInputChange} style={{ width: '100%', padding: '10px', background: 'var(--bg-card, #111827)', border: '1px solid var(--border-color, #1e2d45)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Total Duration (Days)</label>
                <input required type="number" name="days" min="1" value={form.days} onChange={handleInputChange} style={{ width: '100%', padding: '10px', background: 'var(--bg-card, #111827)', border: '1px solid var(--border-color, #1e2d45)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Holiday Category Classification</label>
                <select name="type" value={form.type} onChange={handleInputChange} style={{ width: '100%', padding: '10px', background: 'var(--bg-card, #111827)', border: '1px solid var(--border-color, #1e2d45)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }}>
                  <option value="Religious">Religious</option>
                  <option value="National">National</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Date Label Text Representation</label>
                <input required type="text" name="description" value={form.description} onChange={handleInputChange} style={{ width: '100%', padding: '10px', background: 'var(--bg-card, #111827)', border: '1px solid var(--border-color, #1e2d45)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }} placeholder="e.g. 1 May 2026 or 10th Zil Haj" />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem' }}>Cancel</button>
                <button type="submit" style={{ background: 'var(--accent-amber-gold)', border: 'none', color: '#000', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '0.82rem' }}>Save Holiday</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminHolidays;