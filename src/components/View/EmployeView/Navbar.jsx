import { useState, useEffect } from 'react';
import { LuCrown, LuUser, LuSearch, LuBell } from 'react-icons/lu';

function Navbar({ activeRole, onRoleSwitch }) {
  const [time, setTime] = useState('');

  // ── Read logged-in user from localStorage ──
  const user = JSON.parse(localStorage.getItem('crm_current_user') || '{}');
  const displayName = user.username?.toUpperCase() || 'USER';
  const initials = user.username?.slice(0, 2).toUpperCase() || 'U';
  const role = user.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : 'Employee';

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
        <div className="navbar-role-switcher">
          <button className={`role-btn ${activeRole === 'admin' ? 'active' : ''}`}
            onClick={() => onRoleSwitch('admin')}>
            <LuCrown size={13} /> Admin View
          </button>
          <button className={`role-btn ${activeRole === 'employee' ? 'active' : ''}`}
            onClick={() => onRoleSwitch('employee')}>
            <LuUser size={13} /> Employee View
          </button>
          <span className="navbar-role-hint">Click role to switch · All screens interactive</span>
        </div>
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