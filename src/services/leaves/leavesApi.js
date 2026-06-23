import { createSession, deleteSession, safeJson } from '../fileMakerService';

export const FM_BASE = '/fmapi/fmi/data/v1/databases/Practice';

function dateKeyToFMDate(dateKey) {
  if (!dateKey) return '';
  const [yyyy, mm, dd] = dateKey.split('-').map(Number);
  return `${mm}/${dd}/${yyyy}`;
}

function fmDateToDateKey(fmDate) {
  if (!fmDate) return '';
  const [mm, dd, yyyy] = fmDate.split('/').map(Number);
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

// Generates an array of "YYYY-MM-DD" strings between from and to inclusive
function getDatesInRange(startStr, endStr) {
  const dates = [];
  const current = new Date(startStr);
  const end = new Date(endStr || startStr);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// ── FETCH ALL LEAVES FOR EMPLOYEE ─────────────────────────────
export async function getEmployeeLeaves(employeeId) {
  const token = await createSession();
  try {
    const url = `${FM_BASE}/layouts/LeaveRequest/_find`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: [{ _fk_EmployeeID: `==${employeeId}` }],
        sort: [{ fieldName: 'LeaveDate', sortOrder: 'descend' }],
      }),
    });

    const data = await safeJson(res);
    if (!res.ok) {
      if (data?.messages?.[0]?.code === '401') return [];
      throw new Error(`Failed to fetch leaves: ${res.status}`);
    }

    const records = data?.response?.data || [];
    return records.map((r) => {
      const f = r.fieldData;
      const formattedDate = fmDateToDateKey(f.LeaveDate);
      return {
        id: r.recordId,
        type: f.LeaveType,
        fromDate: formattedDate,
        toDate: formattedDate, // Layout handles single days per row
        category: f.Category,
        reason: f.Description,
        status: f.Status || 'Pending',
      };
    });
  } finally {
    await deleteSession(token);
  }
}



// ── SUBMIT A NEW LEAVE REQUEST (SAVES PER DAY) ──────────────────
export async function saveLeaveRequestToFM(employeeId, leave) {
  const token = await createSession();
  try {
    const targetDates = getDatesInRange(leave.fromDate, leave.toDate);
    const url = `${FM_BASE}/layouts/LeaveRequest/records`;

    for (const dStr of targetDates) {
      const d = new Date(dStr);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fieldData: {
            _fk_EmployeeID: employeeId,
            LeaveType: leave.type,
            LeaveDate: dateKeyToFMDate(dStr),
            Month: d.getMonth() + 1,
            Year: d.getFullYear(),
            Category: leave.category,
            Description: leave.reason,
            Status: 'Pending',
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to create FileMaker leave record');
    }
    return true;
  } finally {
    await deleteSession(token);
  }
}

// ── UPDATE SHORT HOURS INSIDE LEAVE BALANCE TABLE ──────────────────
export async function syncShortHoursToFM(employeeId, year, shortMinutesTotal, shortDays) {
  const token = await createSession();
  try {
    // 1. Locate the correct Balance row record ID first
    const findUrl = `${FM_BASE}/layouts/LeaveBalance/_find`;
    const findRes = await fetch(findUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: [{ _fk_EmployeeID: `==${employeeId}`, BalanceYear: `==${year}` }],
      }),
    });

    const findData = await safeJson(findRes);
    if (!findRes.ok || !findData?.response?.data?.length) {
      console.warn("No LeaveBalance row record found to patch short hours into.");
      return false;
    }

    const recordId = findData.response.data[0].recordId;

    // 2. Patch the calculation updates into FileMaker fields
    const patchUrl = `${FM_BASE}/layouts/LeaveBalance/records/${recordId}`;
    await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fieldData: {
          ShortHrsTotal: Math.round((shortMinutesTotal / 60) * 100) / 100, // Convert minutes back to hours decimal
          ShortConvertedDay: Math.floor(shortDays * 100) / 100,
        },
      }),
    });

    return true;
  } catch (err) {
    console.error("Failed syncing short hours calculation to FileMaker:", err);
    return false;
  } finally {
    await deleteSession(token);
  }
}

// ── FETCH ALL LEAVES FOR ALL EMPLOYEES (ADMIN VIEW) ──────────────────
export async function getAllEmployeeLeaves() {
  const token = await createSession();
  try {
    // Reading all records by fetching from the layout without matching constraints
    const url = `${FM_BASE}/layouts/LeaveRequest/records?_limit=500`;
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
      throw new Error(`Failed to fetch leaves: ${res.status}`);
    }

    const records = data?.response?.data || [];
    return records.map((r) => {
      const f = r.fieldData;
      return {
        id: r.recordId, // FileMaker Record ID for accurate targeting
        employeeId: f._fk_EmployeeID,
        type: f.LeaveType,
        fromDate: fmDateToDateKey(f.LeaveDate),
        toDate: fmDateToDateKey(f.LeaveDate),
        category: f.Category,
        reason: f.Description,
        status: f.Status || 'Pending',
        year: f.Year,
        month: f.Month
      };
    });
  } finally {
    await deleteSession(token);
  }
}

// ── UPDATE LEAVE STATUS (APPROVE / REJECT) ───────────────────────────
export async function updateLeaveStatusInFM(recordId, newStatus) {
  const token = await createSession();
  try {
    const url = `${FM_BASE}/layouts/LeaveRequest/records/${recordId}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fieldData: {
          Status: newStatus
        }
      }),
    });

    if (!res.ok) throw new Error('Failed to update leave status in FileMaker');
    return true;
  } finally {
    await deleteSession(token);
  }
}

// Add or verify this function in your src/services/leaves/leavesApi.js file
export async function getLeaveBalanceSummary(employeeId, year) {
  const token = await createSession();
  try {
    const url = `${FM_BASE}/layouts/LeaveBalance/_find`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: [{ _fk_EmployeeID: `==${employeeId}`, BalanceYear: `==${year}` }],
      }),
    });

    const data = await safeJson(res);
    if (!res.ok || !data?.response?.data?.length) return null;

    const f = data.response.data[0].fieldData;
    
    // ── MAPS DIRECTLY TO YOUR FILEMAKER FIELDS ──
    return {
      totalDays: Number(f.YearlyAllowance) || 24,    // From 'YearlyAllowance' field
      usedDays: Number(f.TotalDaysTaken) || 0,       // From 'TotalDaysTaken' calculation field
      remaining: Number(f.RemainingPaid) || 0,       // From 'RemainingPaid' field
      paidTaken: Number(f.PaidDaysTaken) || 0,       // From 'PaidDaysTaken' field
      shortDays: Number(f.ShortConvertedDays) || 0,  // From 'ShortConvertedDays' field
      unpaidTaken: Number(f.UnpaidDaysTaken) || 0,   // From 'UnpaidDaysTaken' field
    };
  } finally {
    await deleteSession(token);
  }
}