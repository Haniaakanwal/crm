import { useState, useMemo } from 'react';
import '../styles/LeaveHistory.css';
import { computePaidStatus } from './leaveUtils';

const TABS = ['All', 'Approved', 'Pending'];

function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDuration(minutes) {
  if (!minutes) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatDateLabel(dateStr) {
  return parseLocalDate(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function formatMonthLabel(dateStr) {
  return parseLocalDate(dateStr).toLocaleDateString('en-US', { month: 'short' });
}

function leaveTitle(leave) {
  if (leave.type === 'Short Time') return `Short Time · ${formatDuration(leave.shortMinutes)}`;
  return leave.type;
}

function leaveDateLabel(leave) {
  if (leave.type === 'Full Day' && leave.toDate && leave.toDate !== leave.fromDate) {
    const fromDay = parseLocalDate(leave.fromDate).getDate();
    const toDay = parseLocalDate(leave.toDate).getDate();
    return `${fromDay}–${toDay} ${formatMonthLabel(leave.toDate)}`;
  }
  return formatDateLabel(leave.fromDate);
}

function LeaveHistory({ leaves, year }) {
  const [activeTab, setActiveTab] = useState('All');

  const yearLeaves = useMemo(
    () => leaves.filter((l) => l.fromDate.startsWith(String(year))),
    [leaves, year]
  );

  const paidMap = useMemo(() => computePaidStatus(yearLeaves), [yearLeaves]);

  const sorted = useMemo(
    () => [...yearLeaves].sort((a, b) => new Date(b.fromDate) - new Date(a.fromDate)),
    [yearLeaves]
  );

  const filtered = activeTab === 'All' ? sorted : sorted.filter((l) => l.status === activeTab);

  return (
    <div className="lh-card">
      <h3 className="lh-title">My Leave History — {year}</h3>

      <div className="lh-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`lh-tab ${activeTab === tab ? 'lh-tab-active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="lh-list">
        {filtered.length === 0 && <p className="lh-empty">No leave records here yet.</p>}

        {filtered.map((leave) => {
          const isUnpaid = paidMap[leave.id] === false;
          const isShort = leave.type === 'Short Time';
          const showDeductedNote = !isShort && leave.status === 'Approved' && isUnpaid;
          const showPendingNote = leave.status === 'Pending';

          return (
            <div key={leave.id} className="lh-row">
              <div className="lh-date">{leaveDateLabel(leave)}</div>

              <div className="lh-main">
                <div className="lh-leave-title">{leaveTitle(leave)}</div>

                {isShort ? (
                  <div className="lh-subtitle">Goes toward 8h short pool</div>
                ) : showDeductedNote ? (
                  <>
                    <div className="lh-subtitle">{leave.category}</div>
                    <div className="lh-deducted-note">
                      ✓ Deducted from {formatMonthLabel(leave.fromDate)} salary
                    </div>
                  </>
                ) : (
                  <div className="lh-subtitle">
                    {leave.category}{showPendingNote ? ' · pending approval' : ''}
                  </div>
                )}
              </div>

              <span className={`lh-badge lh-badge-${leave.status.toLowerCase()}`}>
                {leave.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LeaveHistory;