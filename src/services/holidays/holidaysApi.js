import { createSession, deleteSession, safeJson } from '../fileMakerService';

export const FM_BASE = '/fmapi/fmi/data/v1/databases/Practice';

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

// ── CREATE NEW HOLIDAY RECORD IN FILEMAKER ──────────────────
export async function createHolidayInFM(holidayPayload) {
  const token = await createSession();
  try {
    const url = `${FM_BASE}/layouts/PublicHolidays/records`;
    
    // Converts UI date picker structure (YYYY-MM-DD) back into FileMaker's standard M/D/YYYY layout expectation
    const [yyyy, mm, dd] = holidayPayload.date.split('-');
    const formattedFmDate = `${Number(mm)}/${Number(dd)}/${yyyy}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fieldData: {
          HolidayName: holidayPayload.name,
          StartDate: formattedFmDate,
          TotalDays: Number(holidayPayload.days),
          HolidayType: holidayPayload.type, // Stores 'Religious' or 'National'
          Description: holidayPayload.description, // Stores text layout (e.g., "10th Muharram" or "14 August")
          Year: Number(yyyy)
        }
      }),
    });

    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data?.messages?.[0]?.message || 'Failed creating record');
    }
    return true;
  } catch (err) {
    console.error('Error executing createHolidayInFM:', err);
    throw err;
  } finally {
    await deleteSession(token);
  }
}