import { useEffect, useState } from 'react';
import '../styles/EmployeeHolidays.css';
import { LuMoon, LuBriefcase, LuFlag, LuStar, LuPartyPopper } from 'react-icons/lu';
import { getHolidays } from './holidayStorage';

const ICON_MAP = { moon: LuMoon, briefcase: LuBriefcase, flag: LuFlag, star: LuStar };

function HolidayIcon({ iconKey }) {
  const Icon = ICON_MAP[iconKey] || LuPartyPopper;
  return <Icon size={18} />;
}

function EmployeeHolidays() {
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    setHolidays(getHolidays());

    // If an admin edits holidays in another tab/window, this picks it up
    // live without the employee needing to refresh.
    const handleStorageChange = (e) => {
      if (!e.key || e.key === 'crm_company_holidays') setHolidays(getHolidays());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const sorted = [...holidays].sort((a, b) => new Date(a.date) - new Date(b.date));
  const year = sorted[0] ? new Date(sorted[0].date).getFullYear() : new Date().getFullYear();

  return (
    <div className="eh-page">
      <div className="eh-page-header">
        <h2 className="eh-page-title">Company Holidays</h2>
        <p className="eh-page-subtitle">
          {year} official calendar — these days are excluded from your leave balance
        </p>
      </div>

      <div className="eh-grid">
        {sorted.map((h) => (
          <div key={h.id} className="eh-card">
            <div className="eh-icon"><HolidayIcon iconKey={h.icon} /></div>
            <div className="eh-info">
              <div className="eh-name">{h.name}</div>
              <div className="eh-date">{h.dateLabel}</div>
              <span className="eh-days-badge">{h.days} day{h.days === 1 ? '' : 's'}</span>
            </div>
          </div>
        ))}
        {sorted.length === 0 && <p className="eh-empty">No holidays have been published yet.</p>}
      </div>
    </div>
  );
}

export default EmployeeHolidays;