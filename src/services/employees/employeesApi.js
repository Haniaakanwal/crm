import { createSession, deleteSession, safeJson } from '../fileMakerService';

export const FM_BASE = '/fmapi/fmi/data/v1/databases/Practice';

export async function getDetailedEmployeesList() {
  const token = await createSession();
  try {
    const url = `${FM_BASE}/layouts/Employees/records?_limit=500`;
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
      throw new Error(`Failed to fetch employees: ${res.status}`);
    }

    const records = data?.response?.data || [];
    return records.map((r) => {
      const f = r.fieldData;
      return {
        recordId: r.recordId,
        employeeId: f.EmployeeID,
        fullName: f.FullName,
        department: f.Department,
        designation: f.Designation,
        joiningDate: f.JoiningDate,
        status: f.Status || 'Present',
        salary: Number(f.BaseSalary) || 0,
        leaveBalance: Number(f.YearlyLeaveLimit) || 24,
        tenure: f.Tensure || '', 
        email: f.Email || '',
      };
    });
  } finally {
    await deleteSession(token);
  }
}

export async function createDetailedEmployeeInFM(payload) {
  const token = await createSession();
  try {
    const url = `${FM_BASE}/layouts/Employees/records`;

    let fmFormattedDate = "";
    const rawDate = payload.joiningDate || "";

    // 🗓️ Step 1: Detect and parse pieces accurately based on symbol dividers
    if (rawDate.includes("-")) {
      // Handles HTML input picker format: "YYYY-MM-DD" -> "2026-06-23"
      const [yyyy, mm, dd] = rawDate.split('-');
      fmFormattedDate = `${mm}/${dd}/${yyyy}`; // Result: "06/23/2026"
    } else if (rawDate.includes("/")) {
      // Handles native string input formats
      const pieces = rawDate.split('/');
      
      if (pieces[0].length === 4) {
        // Fallback for "YYYY/MM/DD" -> "2026/06/23"
        const [yyyy, mm, dd] = pieces;
        fmFormattedDate = `${mm}/${dd}/${yyyy}`;
      } else {
        // Fallback for standard "MM/DD/YYYY" layout
        const [mm, dd, yyyy] = pieces;
        fmFormattedDate = `${mm}/${dd}/${yyyy}`;
      }
    } else {
      fmFormattedDate = rawDate;
    }


    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fieldData: {
          EmployeeID: String(payload.employeeId),
          FullName: String(payload.fullName),
          Email: String(payload.email),
          Department: String(payload.department),
          Designation: String(payload.designation),
          BaseSalary: Number(payload.salary),
          YearlyLeaveLimit: Number(payload.leaveBalance),
          JoiningDate: fmFormattedDate, 
          Status: String(payload.status),
          Tensure: String(payload.tenure || '0m'),
          Notes: ''
        },
      }),
    });

    const data = await safeJson(res);
    
    if (!res.ok) {
      const fmErrorMsg = data?.messages?.[0]?.message;
      const fmErrorCode = data?.messages?.[0]?.code;
      console.error("❌ FileMaker Engine Rejection Detail:", data);
      throw new Error(`FileMaker Error [${fmErrorCode}]: ${fmErrorMsg}`);
    }
    
    return data?.response?.recordId;
  } finally {
    await deleteSession(token);
  }
}