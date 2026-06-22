import { createSession, deleteSession, safeJson } from '../fileMakerService';

export const FM_BASE = '/fmapi/fmi/data/v1/databases/Practice';
// Initial calendar data matching your design specifications
const INITIAL_HOLIDAYS = [
  { name: 'Eid-ul-Fitr', startDate: '3/20/2026', endDate: '3/22/2026', totalDays: 3, type: 'moon', description: '1, 2, 3 Shawal' },
  { name: 'Labour Day', startDate: '5/1/2026', endDate: '5/1/2026', totalDays: 1, type: 'briefcase', description: '1st May 2026' },
  { name: 'Eid-ul-Azha', startDate: '5/27/2026', endDate: '5/29/2026', totalDays: 3, type: 'moon', description: '10th Zil Haj' },
  { name: 'Ashura', startDate: '6/26/2026', endDate: '6/26/2026', totalDays: 1, type: 'moon', description: '10th Muharram' },
  { name: 'Independence Day', startDate: '8/14/2026', endDate: '8/14/2026', totalDays: 1, type: 'flag', description: '14 August 2026' },
  { name: 'Eid Milad-un-Nabi', startDate: '9/4/2026', endDate: '9/4/2026', totalDays: 1, type: 'moon', description: '12 Rabi ul Awal' },
  { name: 'Quaid-e-Azam Day', startDate: '12/25/2026', endDate: '12/25/2026', totalDays: 1, type: 'star', description: '25 December 2026' }
];

// ── SEED UTILITY: POPULATES PUBLIC HOLIDAYS LAYOUT ONCE ──────────────────
export async function seedHolidaysToFileMaker() {
  const token = await createSession();
  try {
    const url = `${FM_BASE}/layouts/PublicHolidays/records`;

    for (const holiday of INITIAL_HOLIDAYS) {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fieldData: {
            HolidayName: holiday.name,
            StartDate: holiday.startDate,
            EndDate: holiday.endDate,
            TotalDays: holiday.totalDays,
            HolidayType: holiday.type,
            Description: holiday.description, // Stores the custom textual day markers
            Year: 2026
          }
        }),
      });

      if (!res.ok) {
        console.error(`Failed seeding holiday: ${holiday.name}`);
      } else {
        console.log(`Successfully seeded: ${holiday.name}`);
      }
    }
    return true;
  } catch (err) {
    console.error('Error executing seed processing:', err);
    return false;
  } finally {
    await deleteSession(token);
  }
}
// FileMaker Date ("M/D/YYYY") -> "YYYY-MM-DD"
function fmDateToDateKey(fmDate) {
  if (!fmDate) return '';
  const [mm, dd, yyyy] = fmDate.split('/').map(Number);
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

// Map database HolidayType keywords back to matching vector icon classes
function determineIconKey(type) {
  const normalized = (type || '').toLowerCase();
  if (normalized.includes('eid') || normalized.includes('moon') || normalized.includes('religious')) {
    return 'moon';
  }
  if (normalized.includes('labor') || normalized.includes('work')) {
    return 'briefcase';
  }
  if (normalized.includes('national') || normalized.includes('independence')) {
    return 'flag';
  }
  if (normalized.includes('quaid') || normalized.includes('star')) {
    return 'star';
  }
  return 'partyPopper';
}

// Generate dynamic local descriptive strings for display matching UI expectations
function createDisplayDateLabel(fmStartDate, fmEndDate, totalDays) {
  if (!fmStartDate) return '';
  const [m, d, y] = fmStartDate.split('/').map(Number);
  const startObj = new Date(y, m - 1, d);
  
  if (totalDays > 1 && fmEndDate) {
    const [em, ed, ey] = fmEndDate.split('/').map(Number);
    const endObj = new Date(ey, em - 1, ed);
    // Handles multi-day religious alignments (e.g. "1, 2, 3 Shawal")
    if (isNaN(startObj.getDate())) {
      return `${fmStartDate} to ${fmEndDate}`;
    }
  }

  return startObj.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── FETCH PUBLIC HOLIDAYS ─────────────────────────────────────
export async function fetchPublicHolidaysFromFM() {
  const token = await createSession();
  try {
    // Look up layouts table with an open limit matching layout records
    const url = `${FM_BASE}/layouts/PublicHolidays/records?_limit=100`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await safeJson(res);
    if (!res.ok) {
      if (data?.messages?.[0]?.code === '401') return [];
      throw new Error(`Failed to fetch records: ${res.status}`);
    }

    const records = data?.response?.data || [];
    return records.map((r) => {
      const f = r.fieldData;
      return {
        id: r.recordId,
        name: f.HolidayName,
        date: f.StartDate ? fmDateToDateKey(f.StartDate) : '2026-01-01',
        dateLabel: f.Description || createDisplayDateLabel(f.StartDate, f.EndDate, Number(f.TotalDays)),
        days: Number(f.TotalDays) || 1,
        icon: determineIconKey(f.HolidayType || f.HolidayName),
      };
    });
  } finally {
    await deleteSession(token);
  }
}