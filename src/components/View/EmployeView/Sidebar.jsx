import { NavLink } from 'react-router';
import { LuHouse, LuClock, LuCalendarDays, LuMonitor, LuCalendarOff } from 'react-icons/lu';
import { deriveDisplayName, getInitials } from '../../utils/userDisplay';

const NAV_ITEMS = [
  { label: 'My Home',      path: '/employeView/home',      icon: LuHouse },
  { label: 'My Timesheet', path: '/employeView/timesheet', icon: LuClock, badge: 'Live' },
  { label: 'My Leaves',    path: '/employeView/leaves',    icon: LuCalendarOff },
  { label: 'My Assets',    path: '/employeView/assets',    icon: LuMonitor },
  { label: 'Holidays',     path: '/employeView/holidays',  icon: LuCalendarDays },
];

function Sidebar() {
  // ── Read logged-in user from localStorage ──
  const user = JSON.parse(localStorage.getItem('crm_current_user') || '{}');
  const rawName = deriveDisplayName(user);
  const displayName = rawName.toUpperCase();
  const initials = getInitials(user, rawName);
  const role = user.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : 'Employee';

  return (
    <aside className="sidebar">
      <div>
        <p className="sidebar-section-label">My Portal</p>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ label, path, icon: Icon, badge }) => (
            <NavLink key={path} to={path}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              <Icon size={15} />
              {label}
              {badge && <span className="sidebar-badge">{badge}</span>}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* ── Live user footer ── */}
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