import { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import '../EmployeView/styles/EmpolyeDashboard.css';

const BREADCRUMBS = {
  '/employeView/home':       'My Home',
  '/employeView/timesheet':  'My Timesheet',
  '/employeView/leaves':     'My Leaves',
  '/employeView/assets':     'My Assets',
  '/employeView/holidays':   'Holidays',
};

const currentUser = {
  name: 'AQEEL',
  initials: 'AQ',
  role: 'Employee',
};

function EmpolyeDashboard() {
  const [activeRole, setActiveRole] = useState('employee');
  const location = useLocation();
  const pageLabel = BREADCRUMBS[location.pathname] || 'Dashboard';

  return (
    <div className="dashboard-root">
      <Navbar
        activeRole={activeRole}
        onRoleSwitch={setActiveRole}
        user={currentUser}
      />
      <div className="dashboard-body">
        <Sidebar user={currentUser} />
        <main className="dashboard-content">
          <div className="page-header">
            <span className="breadcrumb-parent">Employee</span>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">{pageLabel}</span>
          </div>
          <div className="page-body">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default EmpolyeDashboard;