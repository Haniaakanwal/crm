import '../styles/ShortHoursTracker.css';
import { LuClock } from 'react-icons/lu';
import { calculateShortSummary, dailyShortBreakdown, SHORT_MINUTES_PER_DEDUCTED_DAY } from './shortHoursUtils';

function formatHoursLabel(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0 && m === 0) return '0h';
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatRowDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('default', { day: 'numeric', month: 'short' });
}

// attendanceRecords: array of { date, checkIn, checkOut, breakMinutes }
// drawn from real daily attendance — see shortHoursUtils.js for the
// assumed shape, adjust there if your actual records look different.
function ShortHoursTracker({ attendanceRecords, year }) {
  const { shortMinutesTotal, shortDays, shortDaysRounded, shortPercent } = calculateShortSummary(
    attendanceRecords,
    year
  );
  const breakdown = dailyShortBreakdown(attendanceRecords, year);
  const progressPct = Math.min(shortPercent, 100);

  return (
    <div className="sht-card">
      <h3 className="sht-title"><LuClock /> Short Hours Tracker</h3>

      <div className="sht-summary-row">
        <span className="sht-summary-label">Accumulated this year</span>
        <span className="sht-summary-value">{formatHoursLabel(shortMinutesTotal)} total</span>
      </div>

      <div className="sht-progress-track">
        <div className="sht-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="sht-progress-labels">
        <span className="sht-progress-formula">
          {formatHoursLabel(shortMinutesTotal)} ÷ 8h = {shortDaysRounded} day{shortDaysRounded === 1 ? '' : 's'} deducted
        </span>
      </div>



      <p className="sht-footnote">
        Every 8 accumulated short hours = 1 paid leave day deducted from your annual balance.
        You currently have <strong>{shortDaysRounded} day{shortDaysRounded === 1 ? '' : 's'}</strong> deducted this way.
      </p>
    </div>
  );
}

export default ShortHoursTracker;