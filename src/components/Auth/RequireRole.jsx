import { Navigate } from 'react-router';

/**
 * Wrap a <Route> tree with this to restrict it to specific roles.
 *
 * Usage:
 *   <Route element={<RequireRole allow={['admin']} />}>
 *     <Route path="/adminView" element={<Dashboard />}>...</Route>
 *   </Route>
 *
 * - Not logged in at all  → send to /login
 * - Logged in, wrong role → send to /access-denied
 * - Logged in, right role → render the nested routes via <Outlet />
 */
import { Outlet } from 'react-router';

function RequireRole({ allow }) {
  const user = JSON.parse(localStorage.getItem('crm_current_user') || '{}');
  const role = (user.role || '').toLowerCase();

  if (!user.email && !user.id) {
    // No session at all — not logged in.
    return <Navigate to="/login" replace />;
  }

  // Admin can access every portal — admin is never blocked.
  if (role === 'admin') {
    return <Outlet />;
  }

  if (!allow.includes(role)) {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
}

export default RequireRole;
