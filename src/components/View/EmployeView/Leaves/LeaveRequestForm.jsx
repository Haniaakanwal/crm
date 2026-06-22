import { useState, useMemo } from 'react';
import '../styles/LeaveRequestForm.css';
import { FaPaperPlane, FaExclamationTriangle } from 'react-icons/fa';
import { previewLeaveOutcome } from './leaveUtils';
import { saveLeaveRequestToFM } from '../../../../services/leaves/leavesApi';

const LEAVE_TYPES = ['Full Day', 'Half Day', 'Short Time'];
const CATEGORIES = ['Casual', 'Medical', 'Unpaid'];

function ordinalSuffix(n) {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

function LeaveRequestForm({ userId, leaves, onSubmitted }) {
  const [type, setType] = useState('Full Day');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [category, setCategory] = useState('Casual');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleFromDateChange = (e) => {
    setFromDate(e.target.value);
    setErrors((prev) => ({ ...prev, fromDate: '' }));
    setSubmitted(false);
  };

  const handleToDateChange = (e) => {
    setToDate(e.target.value);
    setErrors((prev) => ({ ...prev, toDate: '' }));
    setSubmitted(false);
  };

  const preview = useMemo(() => {
    if (!fromDate) return null;
    return previewLeaveOutcome(leaves, fromDate, category);
  }, [leaves, fromDate, category]);

  const validate = () => {
    const e = {};
    if (!fromDate) e.fromDate = 'Start date is required';
    if (!toDate) e.toDate = 'End date is required';
    else if (toDate < fromDate) e.toDate = 'End date cannot be before start date';
    if (category === 'Medical' && !reason.trim()) {
      e.reason = 'Reason is required for Medical leave';
    }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(false);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    const newLeave = {
      type,
      fromDate,
      toDate,
      category,
      reason: reason.trim()
    };

    try {
      await saveLeaveRequestToFM(userId, newLeave);
      setSubmitted(true);
      setFromDate('');
      setToDate('');
      setReason('');
      setType('Full Day');
      setCategory('Casual');
      setErrors({});

      if (onSubmitted) onSubmitted();
    } catch (err) {
      console.error(err);
      setErrors({ server: 'Could not connect to database layout.' });
    }
  };

  return (
    <div className="leave-request-card">
      <h3 className="leave-request-title">
        <FaPaperPlane /> Submit Leave Request
      </h3>

      {submitted && (
        <div className="leave-success-banner">Request submitted — pending HR review.</div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {errors.server && <div className="lr-field-error" style={{marginBottom: '10px'}}>{errors.server}</div>}
        
        <div className="lr-field-group">
          <label className="lr-label" htmlFor="leaveType">Leave Type</label>
          <select id="leaveType" className="lr-select" value={type} onChange={(e) => setType(e.target.value)}>
            {LEAVE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="lr-date-row">
          <div className="lr-field-group lr-date-col">
            <label className="lr-label" htmlFor="fromDate">From date</label>
            <input
              id="fromDate"
              type="date"
              className={`lr-input ${errors.fromDate ? 'lr-input-error' : ''}`}
              value={fromDate}
              onChange={handleFromDateChange}
            />
            {errors.fromDate && <p className="lr-field-error">{errors.fromDate}</p>}
          </div>

          <div className="lr-field-group lr-date-col">
            <label className="lr-label" htmlFor="toDate">To date</label>
            <input
              id="toDate"
              type="date"
              className={`lr-input ${errors.toDate ? 'lr-input-error' : ''}`}
              value={toDate}
              min={fromDate || undefined}
              onChange={handleToDateChange}
            />
            {errors.toDate && <p className="lr-field-error">{errors.toDate}</p>}
          </div>
        </div>

        <div className="lr-field-group">
          <label className="lr-label" htmlFor="category">Category</label>
          <select
            id="category"
            className="lr-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {preview && !preview.willBePaid && (
          <div className="lr-warning">
            <span className="lr-warning-icon"><FaExclamationTriangle /></span>
            <p className="lr-warning-text">
              This will be your <strong>{ordinalSuffix(preview.ordinal)} leave in {preview.monthName}</strong>
              {' '}— it will automatically be marked as <strong>Unpaid</strong>.
            </p>
          </div>
        )}

        <div className="lr-field-group">
          <label className="lr-label" htmlFor="reason">
            Reason {category === 'Medical' ? '(required for Medical)' : '(optional)'}
          </label>
          <textarea
            id="reason"
            className={`lr-textarea ${errors.reason ? 'lr-input-error' : ''}`}
            placeholder="Briefly describe the reason..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {errors.reason && <p className="lr-field-error">{errors.reason}</p>}
        </div>

        <button type="submit" className="lr-submit-btn">
          <FaPaperPlane /> Submit Request
        </button>
      </form>

      <p className="lr-footnote">HR will review within 24 hours</p>
    </div>
  );
}

export default LeaveRequestForm;