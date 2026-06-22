import '../styles/AnnualLeaveBalance.css';

function AnnualLeaveBalance({ summary, year }) {
  const percentUsed = Math.min((summary.usedDays / summary.totalDays) * 100, 100);

  return (
    <div className="leave-balance-card">
      <div className="leave-balance-header">
        <h3 className="leave-balance-title">Annual Leave Balance</h3>
        <span className="leave-balance-year">{year}</span>
      </div>

      <div className="leave-progress-track">
        <div className="leave-progress-fill" style={{ width: `${percentUsed}%` }} />
      </div>

      <div className="leave-progress-labels">
        <span> {summary.usedDays} days</span>
        <span className="leave-progress-used">
          {summary.usedDays} used of {summary.totalDays}
        </span>
        <span>{summary.totalDays} days</span>
      </div>

      <div className="leave-stats-grid">
        <div className="leave-stat leave-stat-remaining">
          <div className="leave-stat-value">{summary.remaining}</div>
          <div className="leave-stat-label">Days remaining</div>
        </div>
        <div className="leave-stat leave-stat-paid">
          <div className="leave-stat-value">{summary.paidTaken}</div>
          <div className="leave-stat-label">Paid taken</div>
        </div>
        <div className="leave-stat leave-stat-short">
          <div className="leave-stat-value">{summary.shortDays.toFixed(1)}d</div>
          <div className="leave-stat-label">Short converted</div>
        </div>
        <div className="leave-stat leave-stat-unpaid">
          <div className="leave-stat-value">{summary.unpaidTaken}</div>
          <div className="leave-stat-label">Unpaid taken</div>
        </div>
      </div>
    </div>
  );
}

export default AnnualLeaveBalance;