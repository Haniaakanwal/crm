import { Routes, Route, Navigate } from 'react-router';
import Login    from '../components/Auth/Login';
import Register from '../components/Auth/Register';

// Layout
import EmpolyeDashboard   from '../components/View/EmployeView/EmpolyeDashboard';

// Portal pages
import EmployeHome    from '../components/View/EmployeView/EmployeeHome';
import EmployeTimesheet   from '../components/View/EmployeView/TimeSheet/EmployeTimesheet';
import EmployeLeaves      from '../components/View/EmployeView/Leaves/EmployeLeaves';
import EmployeAssets      from '../components/View/EmployeView/EmployeAssets';
import Holidays           from '../components/View/EmployeView/Holidays/EmployeeHolidays';

function AppRoutes() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/"         element={<Login />} />
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Employee portal — EmpolyeDashboard wraps all child pages */}
      <Route path="/employeView" element={<EmpolyeDashboard />}>
        {/* /employeView → redirect to home */}
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home"      element={<EmployeHome />} />
        <Route path="timesheet" element={<EmployeTimesheet />} />
        <Route path="leaves"    element={<EmployeLeaves />} />
        <Route path="assets"    element={<EmployeAssets />} />
        <Route path="holidays"  element={<Holidays />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;