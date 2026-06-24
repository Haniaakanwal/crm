import { createSession, deleteSession, safeJson } from '../fileMakerService';

export const FM_BASE = '/fmapi/fmi/data/v1/databases/Practice';

// ── GET APP SETTINGS CONTEXT ─────────────────────────────────
export async function getAppSettingsFromFM() {
  const token = await createSession();
  try {
    const url = `${FM_BASE}/layouts/Settings/records?_limit=1`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    });

    const data = await safeJson(res);
    if (!res.ok || !data?.response?.data?.length) {
      return null;
    }

const record = data.response.data[0];
    const f = record.fieldData;

    return {
      recordId: record.recordId,
      normalCheckIn: f.NormalCheckIn || '9:00 AM',
      normalCheckOut: f.NormalCheckOut || '6:00 PM',
      ramzanIn: f.RamzanIn || '9:00 AM',
      ramzanOut: f.RamzanOut || '5:00 PM',
      requiredDailyHoursNormal: f.RequiredDailyHours || '9 hours', // 🟢 Match
      requiredDailyHoursRamzan: f.RequiredDailyHoursRamzan || '8 hours', // 🟢 Match
      annualLeaveAllowance: f.AnnualLeaveAllowance || '24 days/year',
      paidLeavePerMonth: f.PaidLeavePerMonth || '2 (1 Casual + 1 Medical)',
      shortHours: f.ShortHours || '8 accumulated hours',
      mobileBreakPolicy: f.MobileBreakPolicy || 'Max 60 min/day', // 🟢 Match
      recordLock: f.RecordLock || '3 days from entry date'
    };
  } finally {
    await deleteSession(token);
  }
}

// ── UPDATE OR CREATE SETTINGS BLOCK (FIELD NAME SCHEMA CORRECTION) ──
export async function updateAppSettingsInFM(recordId, updatePayload) {
  const token = await createSession();
  try {
    const url = recordId 
      ? `${FM_BASE}/layouts/Settings/records/${recordId}`
      : `${FM_BASE}/layouts/Settings/records`;
      
    const res = await fetch(url, {
      method: recordId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        fieldData: {
          NormalCheckIn: updatePayload.normalCheckIn,
          NormalCheckOut: updatePayload.normalCheckOut,
          RamzanIn: updatePayload.ramzanIn,
          RamzanOut: updatePayload.ramzanOut,
          
          // 🟢 Corrected to match your layout labels from image_89e68e.png
          RequiredDailyHours: updatePayload.requiredDailyHoursNormal, 
          RequiredDailyHoursRamzan: updatePayload.requiredDailyHoursRamzan, 
          
          AnnualLeaveAllowance: updatePayload.annualLeaveAllowance,
          PaidLeavePerMonth: updatePayload.paidLeavePerMonth,
          ShortHours: updatePayload.shortHours,
          
          // 🟢 Notice the spelling "Policy" vs "Policy" in FileMaker layout schema
          MobileBreakPolicy: updatePayload.mobileBreakPolicy, 
          RecordLock: updatePayload.recordLock
        }
      })
    });

    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data?.messages?.[0]?.message || 'Failed updating parameters');
    }
    return true;
  } catch (err) {
    console.error('API execution error:', err);
    throw err;
  } finally {
    await deleteSession(token);
  }
}