import { useState, useMemo } from 'react';
import '../styles/LeaveHistory.css';

const TABS = ['All', 'Approved', 'Pending'];

function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateLabel(dateStr) {
  return parseLocalDate(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function formatMonthLabel(dateStr) {
  return parseLocalDate(dateStr).toLocaleDateString('en-US', { month: 'short' });
}

/**
 * Groups flat single-day consecutive leave records from FileMaker into readable ranges.
 */
function groupConsecutiveLeaves(flatLeaves) {
  if (!flatLeaves.length) return [];

  // Sort oldest to newest to find consecutive days easily
  const sorted = [...flatLeaves].sort((a, b) => new Date(a.fromDate) - new Date(b.fromDate));
  const groups = [];
  
  let currentGroup = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const nextLeave = sorted[i];
    const currentEnd = parseLocalDate(currentGroup.toDate);
    const nextStart = parseLocalDate(nextLeave.fromDate);
    
    // Calculate difference in days
    const diffTime = Math.abs(nextStart - currentEnd);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // If same type, category, status, and it's the sequential next calendar day
    if (
      nextLeave.type === currentGroup.type &&
      nextLeave.category === currentGroup.category &&
      nextLeave.status === currentGroup.status &&
      diffDays === 1
    ) {
      currentGroup.toDate = nextLeave.toDate; // Expand the range
    } else {
      groups.push(currentGroup);
      currentGroup = { ...nextLeave };
    }
  }
  groups.push(currentGroup);

  // Return newest first for history presentation
  return groups.sort((a, b) => new Date(b.fromDate) - new Date(a.fromDate));
}

function leaveDateLabel(leave) {
  if (leave.fromDate !== leave.toDate) {
    const fromDay = parseLocalDate(leave.fromDate).getDate();
    const toDay = parseLocalDate(leave.toDate).getDate();
    return `${fromDay}–${toDay} ${formatMonthLabel(leave.toDate)}`;
  }
  return formatDateLabel(leave.fromDate);
}

function LeaveHistory({ leaves, year }) {
  const [activeTab, setActiveTab] = useState('All');

  // Filter current year's leaves
  const yearLeaves = useMemo(
    () => leaves.filter((l) => l.fromDate.startsWith(String(year))),
    [leaves, year]
  );

  // Group the continuous records together dynamically
  const groupedAndSorted = useMemo(() => groupConsecutiveLeaves(yearLeaves), [yearLeaves]);

  // Filter by active tab status
  const filtered = activeTab === 'All' 
    ? groupedAndSorted 
    : groupedAndSorted.filter((l) => l.status === activeTab);

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

        {filtered.map((leave, index) => {
          const isUnpaid = leave.category === 'Unpaid';
          const showDeductedNote = leave.status === 'Approved' && isUnpaid;
          const showPendingNote = leave.status === 'Pending';

          return (
            <div key={`${leave.id}-${index}`} className="lh-row">
              <div className="lh-date">{leaveDateLabel(leave)}</div>

              <div className="lh-main">
                <div className="lh-leave-title">{leave.type}</div>
                {showDeductedNote ? (
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