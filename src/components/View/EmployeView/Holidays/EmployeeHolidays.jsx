import { useEffect, useState } from 'react';
import '../styles/EmployeeHolidays.css';
import { LuMoon, LuBriefcase, LuFlag, LuStar, LuPartyPopper } from 'react-icons/lu';
// Import the seeding process along with your fetch function
import { fetchPublicHolidaysFromFM, seedHolidaysToFileMaker } from '../../../../services/holidays/holidaysApi';

const ICON_MAP = { moon: LuMoon, briefcase: LuBriefcase, flag: LuFlag, star: LuStar };

function HolidayIcon({ iconKey }) {
  const Icon = ICON_MAP[iconKey] || LuPartyPopper;
  return <Icon size={18} />;
}

function EmployeeHolidays() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadHolidays = () => {
    fetchPublicHolidaysFromFM()
      .then(async (records) => {
        // If FileMaker returns empty, run seed once to write data automatically
        if (records.length === 0) {
          console.log("Database layout table is empty. Running seeding routine...");
          await seedHolidaysToFileMaker();
          // Re-fetch now that records have been written to FileMaker
          const freshRecords = await fetchPublicHolidaysFromFM();
          setHolidays(freshRecords);
        } else {
          setHolidays(records);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed loading holiday data:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadHolidays();
  }, []);

  const sorted = [...holidays].sort((a, b) => new Date(a.date) - new Date(b.date));
  const year = sorted[0] ? new Date(sorted[0].date).getFullYear() : new Date().getFullYear();

  if (loading) {
    return <div className="loading-spinner" style={{ padding: '40px', color: '#fff' }}>Loading Company Calendar...</div>;
  }

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
      </div>
    </div>
  );
}

export default EmployeeHolidays;