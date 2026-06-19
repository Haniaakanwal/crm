const STORAGE_KEY = 'crm_company_holidays';

// Seed data so the page has something to show before any admin edits exist.
const DEFAULT_HOLIDAYS = [
  { id: 'hol_1', name: 'Eid-ul-Fitr', dateLabel: '1, 2, 3 Shawal', date: '2026-03-20', days: 3, icon: 'moon' },
  { id: 'hol_2', name: 'Labour Day', dateLabel: '1st May 2026', date: '2026-05-01', days: 1, icon: 'briefcase' },
  { id: 'hol_3', name: 'Eid-ul-Azha', dateLabel: '10th Zil Haj', date: '2026-05-27', days: 3, icon: 'moon' },
  { id: 'hol_4', name: 'Ashura', dateLabel: '10th Muharram', date: '2026-06-26', days: 1, icon: 'moon' },
  { id: 'hol_5', name: 'Independence Day', dateLabel: '14 August 2026', date: '2026-08-14', days: 1, icon: 'flag' },
  { id: 'hol_6', name: 'Eid Milad-un-Nabi', dateLabel: '12 Rabi ul Awal', date: '2026-09-04', days: 1, icon: 'moon' },
  { id: 'hol_7', name: 'Quaid-e-Azam Day', dateLabel: '25 December 2026', date: '2026-12-25', days: 1, icon: 'star' },
];

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Could not read holidays from localStorage:', err);
    return null;
  }
}

function writeRaw(holidays) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holidays));
  } catch (err) {
    console.error('Could not save holidays to localStorage:', err);
  }
  return holidays;
}

// Deliberately NOT per-user — every role reads/writes this one key, so an
// admin edit is visible to every employee the moment they load this page.
export function getHolidays() {
  const existing = readRaw();
  if (existing) return existing;
  return writeRaw(DEFAULT_HOLIDAYS);
}

export function saveHolidays(holidays) {
  return writeRaw(holidays);
}

// ── Ready for the future Admin Holidays editor — build the admin UI
// against these, no changes needed here when that day comes ─────────────
export function addHoliday(holiday) {
  const holidays = getHolidays();
  const newHoliday = { id: `hol_${Date.now()}`, ...holiday };
  return writeRaw([...holidays, newHoliday]);
}

export function updateHoliday(id, updates) {
  const holidays = getHolidays();
  const updated = holidays.map((h) => (h.id === id ? { ...h, ...updates } : h));
  return writeRaw(updated);
}

export function deleteHoliday(id) {
  const holidays = getHolidays();
  const updated = holidays.filter((h) => h.id !== id);
  return writeRaw(updated);
}