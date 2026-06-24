import { useEffect, useState } from 'react';
import { getEmployeeAssignedAssets } from '../../../../services/assets/assetsApi';
import '../styles/EmployeeAssets.css';

// ── Category → icon ───────────────────────────────────────────────────────────
const ICONS = {
  Laptop:      { icon: '💻', bg: '#1a2744' },
  PC:          { icon: '🖥️', bg: '#1a2744' },
  LCD:         { icon: '🖥️',  bg: '#1a2744' },
  Monitor:     { icon: '🖥️',  bg: '#1a2744' },
  Accessories: { icon: '⌨️', bg: '#1a2744' },
  Accessory:   { icon: '⌨️', bg: '#1a2744' },
  Mobile:      { icon: '📱', bg: '#1a2744' },
  Tablet:      { icon: '📱', bg: '#1a2744' },
  Printer:     { icon: '🖨️', bg: '#1a2744' },
};
const getIcon = (cat = '') => {
  const key = Object.keys(ICONS).find(k =>
    cat.toLowerCase().includes(k.toLowerCase())
  );
  return ICONS[key] || { icon: '📦', bg: '#1a2744' };
};

// ── Condition badge class ─────────────────────────────────────────────────────
const condClass = (c = '') => {
  const v = c.toLowerCase();
  if (v === 'good' || v === 'excellent') return 'badge--good';
  if (v === 'fair')                      return 'badge--fair';
  return 'badge--repair';
};

// ── FM date MM/DD/YYYY → "Feb 2022" ──────────────────────────────────────────
const fmDate = (raw = '') => {
  if (!raw) return '—';
  const parts = raw.split('/');
  if (parts.length < 3) return raw;
  const [m, , y] = parts;
  const month = new Date(Number(y), Number(m) - 1)
    .toLocaleString('en-US', { month: 'short' });
  return `${month} ${y}`;
};

// ── Single asset card — matches screenshot layout ─────────────────────────────
function AssetCard({ asset }) {
  const { icon } = getIcon(asset.category);

  return (
    <div className="ea-card">
      {/* Icon + title row */}
      <div className="ea-card__header">
        <div className="ea-card__icon-wrap">
          <span className="ea-card__icon">{icon}</span>
        </div>
        <div className="ea-card__title-meta">
          <p className="ea-card__name">{asset.brandModel}</p>
          <p className="ea-card__meta-sub">
            {asset.code}
            {asset.category ? ` · ${asset.category}` : ''}
          </p>
        </div>
      </div>

      {/* 2×2 detail grid */}
      <div className="ea-card__grid">
        <div className="ea-card__cell">
          <span className="ea-card__cell-label">Assigned</span>
          <span className="ea-card__cell-value">{fmDate(asset.assignedDate)}</span>
        </div>
        <div className="ea-card__cell">
          <span className="ea-card__cell-label">Condition</span>
          <span className={`badge ${condClass(asset.condition)}`}>
            {asset.condition || 'Good'}
          </span>
        </div>
        <div className="ea-card__cell">
          <span className="ea-card__cell-label">Brand</span>
          <span className="ea-card__cell-value">
            {asset.brandModel ? asset.brandModel.split(' ')[0] : '—'}
          </span>
        </div>
        <div className="ea-card__cell">
          <span className="ea-card__cell-label">Status</span>
          <span className="badge badge--assigned">Assigned</span>
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="ea-empty">
      <span className="ea-empty__icon" style={{ fontSize: '2rem', marginBottom: '12px', display: 'block' }}>🛡️</span>
      <p className="ea-empty__title">No assets assigned</p>
   
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EmployeeAssets({ currentUser }) {
  const [assets, setAssets]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    (async () => {
      try {
        // Fallback checks system storage directly if state variables are initializing
        const activeUser = currentUser || JSON.parse(localStorage.getItem('crm_current_user'));
        const empId = activeUser?.id;

        if (!empId) {
          setLoading(true);
          return;
        }

        setLoading(true);
        const result = await getEmployeeAssignedAssets(empId);
        
        if (isMounted) {
          setAssets(result);
          setError(null);
        }
      } catch (err) {
        console.error('EmployeeAssets Component Catch Log:', err);
        if (isMounted) setError('Failed to load your assets. Please try again.');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  return (
    <div className="ea-page">
      {/* Page heading */}
      <div className="ea-page__header">
        <p className="ea-page__breadcrumb">
          Employee <span>›</span> My Assets
        </p>
        <h1 className="ea-page__title">My Assets</h1>
        <p className="ea-page__sub">Equipment  assigned to you</p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="ea-loading">
          <span className="ea-loading__dot" />
          <span className="ea-loading__dot" />
          <span className="ea-loading__dot" />
          <span>Assests Loading...</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="ea-error">⚠ {error}</div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {assets.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* Responsive 2-col card grid */}
              <div className="ea-grid">
                {assets.map(asset => (
                  <AssetCard key={asset.id} asset={asset} />
                ))}
              </div>

              {/* Info banner */}
              <div className="ea-banner">
                <span className="ea-banner__icon">🛈</span>
                <p className="ea-banner__text">
                  These assets are your responsibility. Report any damage immediately
                  to your manager. Handover required when leaving the company.
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}