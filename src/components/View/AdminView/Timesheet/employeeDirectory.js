const DIRECTORY_KEY = 'ams_employee_directory';

export function getStoredEmployees() {
  try {
    const raw = localStorage.getItem(DIRECTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Could not read employee directory from localStorage:', err);
    return [];
  }
}

/**
 * Adds (or updates) a user in the local employee directory. Called from
 * Login.jsx on successful login, so the directory grows automatically as
 * real people log in — no separate registration step needed here.
 */
export function addToEmployeeDirectory(user) {
  if (!user?.id) return;

  const existing = getStoredEmployees();
  const withoutThisUser = existing.filter((e) => e.id !== user.id);

  const updated = [
    ...withoutThisUser,
    {
      id: user.id,
      name: user.username || user.email || `User ${user.id}`,
      email: user.email,
      role: user.role,
    },
  ];

  try {
    localStorage.setItem(DIRECTORY_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('employeeDirectoryUpdated'));
  } catch (err) {
    console.error('Could not save employee directory to localStorage:', err);
  }

  return updated;
}