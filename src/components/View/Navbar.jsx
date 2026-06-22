import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { LuCrown, LuUser, LuSearch, LuBell } from 'react-icons/lu';
import { deriveDisplayName, getInitials } from '../utils/userDisplay';

function Navbar({ activeRole }) {
  const [time, setTime] = useState('');
  const navigate = useNavigate();

  // ── Read logged-in user from localStorage ──
  const user = JSON.parse(localStorage.getItem('crm_current_user') || '{}');
  const rawName = deriveDisplayName(user);
  const displayName = rawName.toUpperCase();
  const initials = getInitials(user, rawName);
  const role = user.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : 'Employee';

  // Only an actual Admin account is allowed to see/use the switcher.
  const isAdminAccount = user.role === 'admin';

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      let h = now.getHours();
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      setTime(`${String(h).padStart(2, '0')}:${m}:${s} ${ampm}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleRoleSwitch = (role) => {
    if (role === activeRole) return;
    navigate(role === 'admin' ? '/adminView/home' : '/employeView/home');
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <div className="navbar-logo-block">
          <div className="navbar-logo-icon">A</div>
          <div className="navbar-logo-text">
            <span>AGENCY<em>CRM</em></span>
            <span className="logo-version">V1.0</span>
          </div>
        </div>

        {isAdminAccount && (
          <div className="navbar-role-switcher">
            <button
              className={`role-btn ${activeRole === 'admin' ? 'active' : ''}`}
              onClick={() => handleRoleSwitch('admin')}
            >
              <LuCrown size={13} /> Admin View
            </button>
            <button
              className={`role-btn ${activeRole === 'employee' ? 'active' : ''}`}
              onClick={() => handleRoleSwitch('employee')}
            >
              <LuUser size={13} /> Employee View
            </button>
            <span className="navbar-role-hint">Click role to switch · All screens interactive</span>
          </div>
        )}
      </div>

      <div className="navbar-right">
        <div className="navbar-search">
          <LuSearch size={13} />
          <input type="text" placeholder="Search..." />
        </div>
        <span className="navbar-clock">{time}</span>
        <button className="navbar-notif-btn">
          <LuBell size={15} />
          <span className="notif-dot" />
        </button>

        {/* ── Live user ── */}
        <div className="navbar-user">
          <div className="navbar-avatar">{initials}</div>
          <div className="navbar-user-info">
            <span className="u-name">{displayName}</span>
            <span className="u-role">{role}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;