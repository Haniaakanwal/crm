import TodaysEntry from './TodaysEntry';
import RecentHistory from './RecentHistory';
import MonthlySummary from './MonthlySummary';
import '../styles/timeSheet.css';

function EmployeTimesheet() {
  const user = JSON.parse(localStorage.getItem('crm_current_user') || '{}');
  const userId = user.id || user.email || 'guest';

  return (
    <div>
      <h2 className="ts-page-title">My Timesheet</h2>
      <p className="ts-page-sub">Your personal attendance — only you can see and edit this</p>

      <div className="ts-layout">
        <TodaysEntry userId={userId} />

        <div className="ts-right-col">
          <RecentHistory userId={userId} />
          <MonthlySummary userId={userId} />
        </div>
      </div>
    </div>
  );
}

export default EmployeTimesheet;