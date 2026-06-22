import { createSession, deleteSession, safeJson } from '../fileMakerService';

export const FM_BASE = '/fmapi/fmi/data/v1/databases/Practice';

const REQUIRED_SECONDS = 8 * 3600;

// ── Format converters ─────────────────────────────
function dateKeyToFMDate(dateKey) {
  const [yyyy, mm, dd] = dateKey.split('-').map(Number);
  return `${mm}/${dd}/${yyyy}`;
}

// FileMaker EntryDate ("M/D/YYYY") -> "YYYY-MM-DD" dateKey
function fmDateToDateKey(fmDate) {
  const [mm, dd, yyyy] = fmDate.split('/').map(Number);
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

function msToFMTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0'))
    .join(':');
}

// Converts "HH:MM:SS" FileMaker time back to a ms timestamp using a
// given date string "YYYY-MM-DD". Returns null if time is empty.
function fmTimeToMs(fmTime, dateKey) {
  if (!fmTime) return null;
  const [h, m, s] = fmTime.split(':').map(Number);
  const d = new Date(dateKey);
  d.setHours(h, m, s || 0, 0);
  return d.getTime();
}

// ── UUID ─────────────────────────────
function generateEntryId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ── FIND TIMESHEET (single day) ─────────────────────────────
async function findTimesheetRecord(token, employeeId, fmDate) {
  const url = `${FM_BASE}/layouts/TimeSheetDaily/_find`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: [
        {
          _fk_EmployeeID: `==${employeeId}`,
          EntryDate: `==${fmDate}`,
        },
      ],
    }),
  });

  const data = await safeJson(res);
  console.log('[Single-day find] status:', res.status, 'employeeId:', employeeId, 'fmDate:', fmDate, 'body:', data);
  if (!res.ok) return null;

  return data?.response?.data?.[0] || null;
}

// ── FIND TIMESHEET (date range) ─────────────────────────────
async function findTimesheetRecordsInRange(token, employeeId, fmStartDate, fmEndDate) {
  const url = `${FM_BASE}/layouts/TimeSheetDaily/_find`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: [
        {
          _fk_EmployeeID: `==${employeeId}`,
          EntryDate: `${fmStartDate}...${fmEndDate}`,
        },
      ],
      sort: [{ fieldName: 'EntryDate', sortOrder: 'ascend' }],
    }),
  });

  const data = await safeJson(res);
  console.log('[Range find] status:', res.status, 'query:', `${fmStartDate}...${fmEndDate}`, 'body:', data);

  if (!res.ok) {
    const fmCode = data?.messages?.[0]?.code;
    if (fmCode === '401') return []; // no records found in range
    throw new Error(`Range find failed: ${res.status} ${JSON.stringify(data)}`);
  }

  return data?.response?.data || [];
}

// ── CREATE TIMESHEET ─────────────────────────────
async function createTimesheetRecord(token, employeeId, fmDate, fields) {
  const entryId = generateEntryId();

  const res = await fetch(`${FM_BASE}/layouts/TimeSheetDaily/records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      fieldData: {
        _fk_EmployeeID: employeeId,
        EntryDate: fmDate,
        EntryID: entryId,
        IsOff: 0,
        ...fields,
      },
    }),
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error('Create timesheet failed');

  return {
    fmRecordId: data?.response?.recordId,
    entryId,
  };
}

// ── UPDATE TIMESHEET ─────────────────────────────
async function updateTimesheetRecord(token, fmRecordId, fields) {
  const res = await fetch(`${FM_BASE}/layouts/TimeSheetDaily/records/${fmRecordId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fieldData: fields }),
  });

  if (!res.ok) throw new Error('Update failed');
  return fmRecordId;
}

// ── BREAKS FIND ─────────────────────────────
async function findBreakRecords(token, entryId) {
  const res = await fetch(`${FM_BASE}/layouts/Breaks/_find`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: [{ _fk_EntryID: `==${entryId}` }],
    }),
  });

  const data = await safeJson(res);
  if (!res.ok) return [];

  return data?.response?.data || [];
}

// ── CREATE BREAK ─────────────────────────────
// Creates a break record. If `end` is omitted, it's written as an open
// (in-progress) break — BreakEnd left blank — so it survives a refresh
// and can be picked up later by loadTimesheetFromFM as `activeBreak`.
async function createBreakRecord(token, entryId, b) {
  const durationMin = b.end ? Math.round((b.end - b.start) / 60000) : 0;

  const res = await fetch(`${FM_BASE}/layouts/Breaks/records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      fieldData: {
        _fk_EntryID: entryId,
        BreakStart: msToFMTime(b.start),
        BreakEnd: b.end ? msToFMTime(b.end) : '',
        DurationMin: durationMin,
        BreakType: 'Break',
      },
    }),
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error('Break create failed');

  return data?.response?.recordId;
}

// ── UPDATE BREAK (close out an open break) ─────────────────────────────
async function updateBreakRecord(token, fmRecordId, b) {
  const durationMin = b.end ? Math.round((b.end - b.start) / 60000) : 0;

  const res = await fetch(`${FM_BASE}/layouts/Breaks/records/${fmRecordId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      fieldData: {
        BreakEnd: msToFMTime(b.end),
        DurationMin: durationMin,
      },
    }),
  });

  if (!res.ok) throw new Error('Break update failed');
}

// ── SYNC BREAKS ─────────────────────────────
// Reconciles the in-memory `breaks` (completed) + `activeBreak` (open, if
// any) against what's in FileMaker for this entryId:
//   - a completed break whose BreakStart matches an existing OPEN record
//     -> update that record's BreakEnd (closes it out)
//   - a completed break with no matching existing record -> create it
//     already closed
//   - an active (open) break with no matching existing OPEN record ->
//     create it open, so it persists across a refresh
async function syncBreaks(token, entryId, breaks, activeBreak) {
  const existing = await findBreakRecords(token, entryId);

  const existingByStart = new Map(
    existing.map(r => [r.fieldData?.BreakStart, r])
  );

  for (const b of breaks) {
    if (!b.end) continue;
    const key = msToFMTime(b.start);
    const match = existingByStart.get(key);

    if (!match) {
      await createBreakRecord(token, entryId, b);
    } else if (!match.fieldData?.BreakEnd) {
      // Was open in FM, now completed locally -> close it out
      await updateBreakRecord(token, match.recordId, b);
    }
    // else: already closed in FM with matching start, nothing to do
  }

  if (activeBreak) {
    const key = msToFMTime(activeBreak.start);
    if (!existingByStart.has(key)) {
      await createBreakRecord(token, entryId, { start: activeBreak.start, end: null });
    }
  }
}

// ── Convert a raw TimeSheetDaily record + its break rows into the
//    canonical ms-timestamp shape used throughout the app ────────────
function recordToEntry(record, dateKey, breakRecords) {
  const f = record.fieldData;

  const checkIn  = fmTimeToMs(f.CheckIn,  dateKey);
  const checkOut = fmTimeToMs(f.CheckOut, dateKey);

  const breaks = (breakRecords || [])
    .map(b => ({
      start: fmTimeToMs(b.fieldData?.BreakStart, dateKey),
      end:   fmTimeToMs(b.fieldData?.BreakEnd,   dateKey) || null,
    }))
    .filter(b => b.start !== null)
    .sort((a, b) => a.start - b.start);

  const activeBreakRaw = breaks.find(b => !b.end);
  const completedBreaks = breaks.filter(b => !!b.end);

  return {
    checkIn,
    checkOut,
    breaks: completedBreaks,
    activeBreak: activeBreakRaw ? { start: activeBreakRaw.start } : null,
    _fmRecordId: record.recordId,
    _entryId: f.EntryID,
  };
}

// ── LOAD TIMESHEET (single day, reads into TodaysEntry's shape) ──
export async function loadTimesheetFromFM(userId, dateKey) {
  const fmDate = dateKeyToFMDate(dateKey);
  const token = await createSession();

  try {
    const record = await findTimesheetRecord(token, userId, fmDate);
    if (!record) return null;

    const entryId = record.fieldData.EntryID;
    const breakRecords = entryId ? await findBreakRecords(token, entryId) : [];

    return recordToEntry(record, dateKey, breakRecords);
  } finally {
    await deleteSession(token);
  }
}

// ── MAIN SYNC ─────────────────────────────
// Writes the entry to FileMaker, then returns the resulting canonical
// entry shape (re-derived from what was actually persisted) so callers
// can update local state directly from the response instead of relying
// on a local cache.
export async function syncTimesheetEntry(userId, dateKey, entry) {
  const fmDate = dateKeyToFMDate(dateKey);
  const token = await createSession();

  try {
    let fmRecordId;
    let entryId;

    const existing = await findTimesheetRecord(token, userId, fmDate);

    const fields = {};
    if (entry.checkIn)  fields.CheckIn  = msToFMTime(entry.checkIn);
    if (entry.checkOut) fields.CheckOut = msToFMTime(entry.checkOut);

    if (existing) {
      fmRecordId = existing.recordId;
      entryId = existing.fieldData?.EntryID;

      if (!entryId) {
        entryId = generateEntryId();
        fields.EntryID = entryId;
      }

      await updateTimesheetRecord(token, fmRecordId, fields);
    } else {
      const created = await createTimesheetRecord(token, userId, fmDate, fields);
      fmRecordId = created.fmRecordId;
      entryId = created.entryId;
    }

    if (entryId) {
      await syncBreaks(token, entryId, entry.breaks || [], entry.activeBreak || null);
    }

    // Re-fetch the record fresh (rather than reconstructing fieldData by
    // hand) so the returned shape always reflects everything actually
    // persisted in FM, including fields set on earlier calls this entry.
    const refreshedRecord = await findTimesheetRecord(token, userId, fmDate);
    const breakRecords = entryId ? await findBreakRecords(token, entryId) : [];

    return recordToEntry(refreshedRecord, dateKey, breakRecords);
  } finally {
    await deleteSession(token);
  }
}

// ── RANGE FETCH (used by RecentHistory) ─────────────────────────────
// Returns one canonical-shape entry per day that has a TimeSheetDaily
// record in [startDateKey, endDateKey], newest first. Days with no
// record at all are simply absent from the result — callers decide how
// to treat missing days (e.g. "absent" vs "not yet due").
export async function getTimesheetRange(userId, startDateKey, endDateKey) {
  const fmStart = dateKeyToFMDate(startDateKey);
  const fmEnd = dateKeyToFMDate(endDateKey);
  const token = await createSession();

  try {
    const records = await findTimesheetRecordsInRange(token, userId, fmStart, fmEnd);
    if (records.length === 0) return [];

    // Fetch each day's breaks. Sequential to keep one FM session/token
    // in play; fine for typical history windows (tens of days).
    const results = [];
    for (const record of records) {
      const dateKey = fmDateToDateKey(record.fieldData.EntryDate);
      const entryId = record.fieldData.EntryID;
      const breakRecords = entryId ? await findBreakRecords(token, entryId) : [];
      results.push({
        dateStr: dateKey,
        ...recordToEntry(record, dateKey, breakRecords),
      });
    }

    // Newest first
    results.sort((a, b) => (a.dateStr < b.dateStr ? 1 : -1));
    return results;
  } finally {
    await deleteSession(token);
  }
}

// ── Derive short minutes for a single canonical-shape entry ──────────
// netMs = (checkOut - checkIn) - totalBreakMs, only for completed days
// (checkOut present). Returns 0 for days with no checkout yet — short
// time is only counted once a day is actually finished.
export function computeShortMinutesForEntry(entry) {
  if (!entry.checkIn || !entry.checkOut) return 0;

  const totalBreakMs = (entry.breaks || []).reduce(
    (acc, b) => acc + ((b.end || b.start) - b.start),
    0
  );

  const netMs = Math.max(0, (entry.checkOut - entry.checkIn) - totalBreakMs);
  const shortMs = Math.max(0, REQUIRED_SECONDS * 1000 - netMs);

  return Math.round(shortMs / 60000);
}

// ── Attach breaks to a list of raw TimeSheetDaily fieldData rows ─────
// Used by getMonthlyTimesheet so each entry carries `entry.breaks` in
// the shape MonthlySummary's getMonthlyStats already expects.
async function attachBreaksToFieldRows(token, rows) {
  const out = [];
  for (const row of rows) {
    const entryId = row.EntryID;
    const breakRecords = entryId ? await findBreakRecords(token, entryId) : [];
    out.push({
      ...row,
      breaks: breakRecords.map(b => ({
        DurationMin: b.fieldData?.DurationMin ?? 0,
      })),
    });
  }
  return out;
}

// ── MONTHLY FETCH ─────────────────────────────
export async function getMonthlyTimesheet(userId, year, month) {
  const token = await createSession();

  try {
    const res = await fetch(`${FM_BASE}/layouts/TimeSheetDaily/_find`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: [{ _fk_EmployeeID: `==${userId}` }],
        sort: [{ fieldName: 'EntryDate', sortOrder: 'ascend' }],
      }),
    });

    const data = await safeJson(res);
    if (!res.ok) return [];

    const all = data?.response?.data || [];

    const rows = all
      .map(r => ({ fmRecordId: r.recordId, ...r.fieldData }))
      .filter(r => {
        const d = new Date(r.EntryDate);
        return (
          d.getFullYear() === year &&
          d.getMonth() + 1 === month
        );
      });

    return await attachBreaksToFieldRows(token, rows);
  } finally {
    await deleteSession(token);
  }
}