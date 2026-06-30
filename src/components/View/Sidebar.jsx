import { NavLink, useNavigate } from 'react-router';
import {
  LuHouse, LuClock, LuCalendarDays, LuMonitor, LuCalendarOff,
  LuUsers, LuWallet, LuReceipt, LuSettings, LuLogOut,
} from 'react-icons/lu';
import { deriveDisplayName, getInitials } from '../utils/userDisplay';

const EMPLOYEE_NAV_ITEMS = [
  { label: 'My Home',      path: '/employeView/home',      icon: LuHouse },
  { label: 'My Timesheet', path: '/employeView/timesheet', icon: LuClock, badge: 'Live' },
  { label: 'My Leaves',    path: '/employeView/leaves',    icon: LuCalendarOff },
  { label: 'My Assets',    path: '/employeView/assets',    icon: LuMonitor },
  { label: 'Holidays',     path: '/employeView/holidays',  icon: LuCalendarDays },
];

const ADMIN_NAV_ITEMS = [
  { label: 'Dashboard',    path: '/adminView/AdminDashboard',         icon: LuHouse },
  { label: 'Timesheet',    path: '/adminView/timesheet',    icon: LuClock, badge: 'Live' },
  { label: 'Leaves',       path: '/adminView/leaves',       icon: LuCalendarOff },
  { label: 'Employees',    path: '/adminView/employees',    icon: LuUsers },
  { label: 'Accounts',     path: '/adminView/accounts',     icon: LuWallet },
  { label: 'Transactions', path: '/adminView/transactions', icon: LuReceipt },
  { label: 'Assets',       path: '/adminView/assets',       icon: LuMonitor },
  { label: 'Holidays',     path: '/adminView/holidays',     icon: LuCalendarDays },
  { label: 'Settings',     path: '/adminView/settings',     icon: LuSettings },
];

function Sidebar({ activeRole }) {
  const navigate = useNavigate(); // 🟢 Used for routing action redirecting

  const user = JSON.parse(localStorage.getItem('crm_current_user') || '{}');
  const rawName = deriveDisplayName(user);
  const displayName = rawName.toUpperCase();
  const initials = getInitials(user, rawName);
  const role = user.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : 'Employee';

  const navItems = activeRole === 'admin' ? ADMIN_NAV_ITEMS : EMPLOYEE_NAV_ITEMS;
  const sectionLabel = activeRole === 'admin' ? 'Admin Portal' : 'My Portal';

  // 🟢 Handles wiping session information completely on exit click
  const handleLogout = () => {
    localStorage.removeItem('crm_current_user');
    localStorage.removeItem('userToken'); // Clean fallback tags if also used elsewhere
    sessionStorage.clear();
    
    // Kick out directly to login
    navigate('/login', { replace: true });
  };

  return (
    <aside className="sidebar">
      <div>
        <p className="sidebar-section-label">{sectionLabel}</p>
        <nav className="sidebar-nav">
          {navItems.map(({ label, path, icon: Icon, badge }) => (
            <NavLink key={path} to={path}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              <Icon size={15} />
              {label}
              {badge && <span className="sidebar-badge">{badge}</span>}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* 🟢 Modified Footer Section Layout containing the action action button trigger */}
      <div className="sidebar-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="sidebar-footer-avatar">{initials}</div>
          <div className="sidebar-footer-info">
            <span className="sf-name">{displayName}</span>
            <span className="sf-role">{role}</span>
          </div>
        </div>
        
        {/* Logout Trigger Option */}
        <button 
          onClick={handleLogout}
          title="Sign Out"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.4)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease-in-out'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ef4444';
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <LuLogOut size={16} />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
