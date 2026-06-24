import React, { useEffect, useState } from 'react';
import { LuClock, LuCalendarRange } from 'react-icons/lu';
import { getAppSettingsFromFM, updateAppSettingsInFM } from '../../../../services/settings/settingsApi';
import '../styles/AdminSettings.css';

function AdminSettings() {
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [settings, setSettings] = useState({
    normalCheckIn: '',
    normalCheckOut: '',
    ramzanIn: '',
    ramzanOut: '',
    requiredDailyHoursNormal: '',
    requiredDailyHoursRamzan: '',
    annualLeaveAllowance: '',
    paidLeavePerMonth: '',
    shortHours: '',
    mobileBreakPolicy: '',
    recordLock: ''
  });

  useEffect(() => {
    getAppSettingsFromFM()
      .then(data => {
        if (data) {
          setRecordId(data.recordId);
          setSettings(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading registry preferences:", err);
        setLoading(false);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };
const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');

    try {
      // 🟢 The API now accepts recordId as null/undefined and auto-creates the row!
      const result = await updateAppSettingsInFM(recordId, settings);
      
      setSuccessMsg('Configurations persisted seamlessly inside FileMaker.');
      
      // 🟢 Re-fetch the settings from FileMaker immediately after saving.
      // This retrieves the newly generated recordId so subsequent clicks act as updates!
      const freshSettings = await getAppSettingsFromFM();
      if (freshSettings) {
        setRecordId(freshSettings.recordId);
        setSettings(freshSettings);
      }

      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error("Error saving settings layout:", err);
      alert('Failed saving configurations: ' + err.message);
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return (
      <div className="as-page">
        <p className="as-loading">Loading...</p>
      </div>
    );
  }

  return (
    <div className="as-page">
      {/* HEADER SECTION */}
      <div className="as-header">
        <p className="as-breadcrumb">Admin <span>›</span> Settings</p>
        <h2 className="as-title">Settings</h2>
        <p className="as-subtitle">Office hours · leave policy · HR rules configuration</p>
      </div>

      {successMsg && <div className="as-success-toast">{successMsg}</div>}

      <form onSubmit={handleSave} className="as-grid-layout">
        
        {/* OFFICE HOURS CARD */}
        <div className="as-card">
          <div className="as-card-title">
            <LuClock className="as-card-icon text-orange" size={16} />
            <span>Office Hours</span>
          </div>

          <div className="as-form-row">
            <div className="as-form-group">
              <label>Normal Check-in</label>
              <input type="text" name="normalCheckIn" value={settings.normalCheckIn} onChange={handleChange} />
            </div>
            <div className="as-form-group">
              <label>Normal Check-out</label>
              <input type="text" name="normalCheckOut" value={settings.normalCheckOut} onChange={handleChange} />
            </div>
          </div>

          <div className="as-form-row">
            <div className="as-form-group">
              <label>Ramadan In</label>
              <input type="text" name="ramzanIn" value={settings.ramzanIn} onChange={handleChange} />
            </div>
            <div className="as-form-group">
              <label>Ramadan Out</label>
              <input type="text" name="ramzanOut" value={settings.ramzanOut} onChange={handleChange} />
            </div>
          </div>

          <div className="as-form-group full-width">
            <label>Required daily hours (normal)</label>
            <input type="text" name="requiredDailyHoursNormal" value={settings.requiredDailyHoursNormal} onChange={handleChange} />
          </div>

          <div className="as-form-group full-width">
            <label>Required daily hours (Ramadan)</label>
            <input type="text" name="requiredDailyHoursRamzan" value={settings.requiredDailyHoursRamzan} onChange={handleChange} />
          </div>

          <button type="submit" className="as-save-btn" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* LEAVE POLICY CARD */}
        <div className="as-card">
          <div className="as-card-title">
            <LuCalendarRange className="as-card-icon text-gold" size={16} />
            <span>Leave Policy</span>
          </div>

          <div className="as-form-row">
            <div className="as-form-group">
              <label>Annual leave allowance</label>
              <input type="text" name="annualLeaveAllowance" value={settings.annualLeaveAllowance} onChange={handleChange} />
            </div>
            <div className="as-form-group">
              <label>Paid leaves per month</label>
              <input type="text" name="paidLeavePerMonth" value={settings.paidLeavePerMonth} onChange={handleChange} />
            </div>
          </div>

          <div className="as-form-group full-width">
            <label>Short hours = 1 paid leave day</label>
            <input type="text" name="shortHours" value={settings.shortHours} onChange={handleChange} />
          </div>

          <div className="as-form-group full-width">
            <label>Mobile break policy</label>
            <input type="text" name="mobileBreakPolicy" value={settings.mobileBreakPolicy} onChange={handleChange} />
          </div>

          <div className="as-form-group full-width">
            <label>Record lock (employee edit window)</label>
            <input type="text" name="recordLock" value={settings.recordLock} onChange={handleChange} />
          </div>

          <button type="submit" className="as-save-btn" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </form>
    </div>
  );
}

export default AdminSettings;