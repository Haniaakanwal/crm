import { FaExclamationTriangle } from 'react-icons/fa';
import { getMonthlyPaidLeaveWarning } from './leaveUtils';
import '../styles/MonthlyLeaveWarning.css';

function MonthlyLeaveWarning({ leaves, year, month }) {
  const warning = getMonthlyPaidLeaveWarning(leaves, year, month);
  if (!warning) return null;

  return (
    <div className="monthly-leave-warning">
      <span className="warning-icon"><FaExclamationTriangle /></span>
      <p className="warning-text">
        <strong>
          {warning.monthName} {warning.year}:
        </strong>{' '}
        You have used both your paid leaves this month ({warning.breakdown}). Any additional
        leave in {warning.monthName} will be automatically marked as{' '}
        <strong>Unpaid</strong>.
      </p>
    </div>
  );
}

export default MonthlyLeaveWarning;
