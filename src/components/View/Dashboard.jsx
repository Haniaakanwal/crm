import { Outlet, useLocation } from 'react-router';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import '../styles/Dashboard.css';

const BREADCRUMBS = {
  '/employeView/home':       { parent: 'Employee', label: 'My Home' },
  '/employeView/timesheet':  { parent: 'Employee', label: 'My Timesheet' },
  '/employeView/leaves':     { parent: 'Employee', label: 'My Leaves' },
  '/employeView/assets':     { parent: 'Employee', label: 'My Assets' },
  '/employeView/holidays':   { parent: 'Employee', label: 'Holidays' },

  '/adminView/AdminDashboard':         { parent: 'Admin', label: 'Dashboard' },
  '/adminView/timesheet':    { parent: 'Admin', label: 'Timesheet' },
  '/adminView/leaves':       { parent: 'Admin', label: 'Leaves' },
  '/adminView/employees':    { parent: 'Admin', label: 'Employees' },
  '/adminView/accounts':     { parent: 'Admin', label: 'Accounts' },
  '/adminView/transactions': { parent: 'Admin', label: 'Transactions' },
  '/adminView/assets':       { parent: 'Admin', label: 'Assets' },
  '/adminView/holidays':     { parent: 'Admin', label: 'Holidays' },
  '/adminView/settings':     { parent: 'Admin', label: 'Settings' },
};

function Dashboard() {
  const location = useLocation();

  // Determine active role purely from the URL — works correctly on
  // refresh / direct links, not just after a click inside the app.
  const activeRole = location.pathname.startsWith('/adminView') ? 'admin' : 'employee';

  const crumb = BREADCRUMBS[location.pathname] || {
    parent: activeRole === 'admin' ? 'Admin' : 'Employee',
    label: 'Dashboard',
  };

  return (
    <div className="dashboard-root">
      <Navbar activeRole={activeRole} />
      <div className="dashboard-body">
        <Sidebar activeRole={activeRole} />
        <main className="dashboard-content">
          <div className="page-header">
            <span className="breadcrumb-parent">{crumb.parent}</span>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">{crumb.label}</span>
          </div>
          <div className="page-body">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;