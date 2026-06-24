import { Routes, Route, Navigate } from 'react-router';
import Login    from '../components/Auth/Login';
import Register from '../components/Auth/Register';

import Dashboard from '../components/View/Dashboard';
import RequireRole from '../components/Auth/RequireRole';
import AccessDenied from '../components/Auth/AccessDenied';

// Portal pages
import EmployeHome    from '../components/View/EmployeView/EmployeeHome';
import EmployeTimesheet   from '../components/View/EmployeView/TimeSheet/EmployeTimesheet';
import EmployeLeaves      from '../components/View/EmployeView/Leaves/EmployeLeaves';
import EmployeAssets      from '../components/View/EmployeView/Assets/EmployeAssets';
import Holidays           from '../components/View/EmployeView/Holidays/EmployeeHolidays';

import AdminDashboard from '../components/View/AdminView/AdminDashboard';
import AdminTimesheet from '../components/View/AdminView/Timesheet/AdminTimesheet';
import AdminLeaves from '../components/View/AdminView/Leaves/AdminLeaves';
import AdminEmployees from '../components/View/AdminView/Employees/AdminEmployees';
import AdminAccounts from '../components/View/AdminView/Accounts/AdminAccounts';
import AdminTransactions from '../components/View/AdminView/Transactions/AdminTransactions';
import AdminAssets from '../components/View/AdminView/Assets/AdminAssets';
import AdminHolidays from '../components/View/AdminView/Holidays/AdminHolidays';
import AdminSettings from '../components/View/AdminView/Settings/AdminSettings';


function AppRoutes() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/"         element={<Login />} />
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Shown when a logged-in user hits a portal their role doesn't allow */}
      <Route path="/access-denied" element={<AccessDenied />} />

      {/* Employee portal — only role === 'employee' may enter */}
      <Route element={<RequireRole allow={['employee']} />}>
        <Route path="/employeView" element={<Dashboard />}>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home"      element={<EmployeHome />} />
          <Route path="timesheet" element={<EmployeTimesheet />} />
          <Route path="leaves"    element={<EmployeLeaves />} />
          <Route path="assets"    element={<EmployeAssets />} />
          <Route path="holidays"  element={<Holidays />} />
        </Route>
      </Route>

      {/* Admin portal — only role === 'admin' may enter */}
      <Route element={<RequireRole allow={['admin']} />}>
        <Route path="/adminView" element={<Dashboard />}>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="AdminDashboard"         element={<AdminDashboard/>} />
          <Route path="timesheet"    element={<AdminTimesheet />} />
          <Route path="leaves"       element={<AdminLeaves />} />
          <Route path="employees"    element={<AdminEmployees />} />
          <Route path="accounts"     element={<AdminAccounts />} />
          <Route path="transactions" element={<AdminTransactions />} />
          <Route path="assets"       element={<AdminAssets />} />
          <Route path="holidays"     element={<AdminHolidays />} />
          <Route path="settings"     element={<AdminSettings />} />
        </Route>
      </Route>

    </Routes>
  );
}

export default AppRoutes;