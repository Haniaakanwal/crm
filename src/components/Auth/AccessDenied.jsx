import { useNavigate } from 'react-router';
import { LuShieldAlert } from 'react-icons/lu';

function AccessDenied() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('crm_current_user') || '{}');
  const role = (user.role || '').toLowerCase();
  const homePath = role === 'admin' ? '/adminView/AdminDashboard' : '/employeView/home';

  return (
    <div className="access-denied-page">
      <div className="access-denied-card">
        <div className="access-denied-icon">
          <LuShieldAlert size={32} />
        </div>
        <h2>Access Denied</h2>
        <p>You don't have permission to view this page.</p>
        <button className="access-denied-btn" onClick={() => navigate(homePath)}>
          Go to my dashboard
        </button>
      </div>
    </div>
  );
}

export default AccessDenied;
