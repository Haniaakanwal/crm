import { NavLink } from 'react-router';
import {
  LuHouse, LuClock, LuCalendarDays, LuMonitor, LuCalendarOff,
  LuUsers, LuWallet, LuReceipt, LuSettings,
} from 'react-icons/lu';
import { deriveDisplayName, getInitials } from '../utils/userDisplay';

const EMPLOYEE_NAV_ITEMS = [
  { label: 'My Home',      path: '/employeView/AdminDashboard',      icon: LuHouse },
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
  const user = JSON.parse(localStorage.getItem('crm_current_user') || '{}');
  const rawName = deriveDisplayName(user);
  const displayName = rawName.toUpperCase();
  const initials = getInitials(user, rawName);
  const role = user.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : 'Employee';

  const navItems = activeRole === 'admin' ? ADMIN_NAV_ITEMS : EMPLOYEE_NAV_ITEMS;
  const sectionLabel = activeRole === 'admin' ? 'Admin Portal' : 'My Portal';

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

      <div className="sidebar-footer">
        <div className="sidebar-footer-avatar">{initials}</div>
        <div className="sidebar-footer-info">
          <span className="sf-name">{displayName}</span>
          <span className="sf-role">{role}</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;