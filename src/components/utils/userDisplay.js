// Shared logic for turning a stored user record into a friendly display
// name + initials, with a fallback that derives something readable from
// the email whenever `username` hasn't been captured at signup yet.

export function deriveDisplayName(user) {
  if (user.username) return user.username;
  if (user.email) {
    const localPart = user.email.split('@')[0];
    return localPart
      .replace(/[._-]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return 'there';
}

export function getInitials(user, displayName) {
  if (user.initials) return user.initials;
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}