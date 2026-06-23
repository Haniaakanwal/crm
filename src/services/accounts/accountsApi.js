import { createSession, deleteSession, safeJson } from '../fileMakerService';

export const FM_BASE = '/fmapi/fmi/data/v1/databases/Practice';

// ── 1. ACCOUNTS SCREEN: FETCH SALARY RECORDS BY MONTH ──────────────────
export async function getMonthlySalaryRecords(year, month) {
  const token = await createSession();
  try {
    const url = `${FM_BASE}/layouts/MonthlySalary/_find`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: [{ SalaryYear: `==${year}`, SalaryMonth: `==${month}` }],
      }),
    });

    const data = await safeJson(res);
    if (!res.ok) {
      if (data?.messages?.[0]?.code === '401') return []; 
      throw new Error('Failed to fetch salary records');
    }

    return (data?.response?.data || []).map((r) => {
      const f = r.fieldData;
      return {
        recordId: r.recordId,
        employeeId: f._fk_EmployeeID,
        employeeName: f.MonthLabel || 'Unknown Employee', 
        basicSalary: Number(f.BasicSalary) || 0,
        deductions: Number(f.UnpaidDeduction) || 0, 
        netPayable: Number(f.NetPayable) || 0,
        deposited: Number(f.Deposited) || 0,
        balance: Number(f.Balance) || 0,
        status: Number(f.IsPaid) === 1 ? 'Paid' : 'Pending',
      };
    });
  } finally {
    await deleteSession(token);
  }
}

// ── 2. ACCOUNTS SCREEN: BATCH GENERATE SALARY ENTRIES FOR A MONTH ──────
export async function generateMonthlySalaryRecordsInFM(year, month, monthLabel, employeesList) {
  const token = await createSession();
  try {
    const url = `${FM_BASE}/layouts/MonthlySalary/records`;

    const promises = employeesList.map(emp => {
      return fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fieldData: {
            _fk_EmployeeID: Number(emp.employeeId || emp.id),
            SalaryMonth: Number(month),
            SalaryYear: Number(year),
            MonthLabel: `${emp.fullName || emp.name} - ${monthLabel}`,
            BasicSalary: Number(emp.salary || emp.BaseSalary || 0),
            UnpaidDeduction: 0,
            NetPayable: Number(emp.salary || emp.BaseSalary || 0),
            Deposited: 0,
            Balance: Number(emp.salary || emp.BaseSalary || 0),
            IsPaid: 0,
            Notes: `Salary statement initialized for ${monthLabel}`
          }
        })
      });
    });

    await Promise.all(promises);
    return true;
  } finally {
    await deleteSession(token);
  }
}

// ── 3. TRANSACTIONS SCREEN: FETCH ALL SYSTEM LEDGER TRANSACTIONS ───────
export async function getAllSystemTransactions() {
  const token = await createSession();
  try {
    const url = `${FM_BASE}/layouts/Transactions/records?_limit=500`;
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
      throw new Error('Failed to fetch transaction records');
    }

    const records = data?.response?.data || [];
    return records.map((r) => {
      const f = r.fieldData;
      return {
        id: r.recordId,
        txId: f.TxID || `TX-${r.recordId}`,
        employeeId: f._fk_EmployeeID,
        employeeName: f.CreatedBy || 'Employee', 
        txDate: f.TxDate || '', 
        type: f.Type || 'Advance', 
        amount: Number(f.Amount) || 0,
        notes: f.Notes || '',
        balance: f.OutstandingBalance !== "" ? Number(f.OutstandingBalance) : null
      };
    });
  } finally {
    await deleteSession(token);
  }
}

export async function createNewTransactionInFM(payload) {
  const token = await createSession();
  try {
    const txUrl = `${FM_BASE}/layouts/Transactions/records`;
    
    // 🗓️ FIX: Format date strictly as Month-First "MM/DD/YYYY" to clear validation constraints
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    const formattedToday = `${mm}/${dd}/${yyyy}`; // Result: "05/13/2026" (or current date)

    console.log("✈️ Sending formatted TxDate string to FileMaker:", formattedToday);

    const txRes = await fetch(txUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fieldData: {
          _fk_EmployeeID: String(payload.employeeId), 
          TxDate: formattedToday, // 👈 Month-first date string
          Type: String(payload.type),
          Amount: Number(payload.amount),
          Notes: String(payload.notes),
          OutstandingBalance: Number(payload.outstandingBalance || 0),
          PaidBack: 0,
          IsFutureBonus: payload.type === 'Bonus' ? 1 : 0
        }
      }),
    });

    const data = await safeJson(txRes);

    if (!txRes.ok) {
      console.error("❌ FileMaker Transaction Error Detail:", data);
      throw new Error(data?.messages?.[0]?.message || 'Failed to initialize ledger transaction record.');
    }

    // ── SIDE EFFECT: Update corresponding MonthlySalary record if Advance/Loan ──
    if (payload.type === 'Advance' || payload.type === 'Loan') {
      const salaryMonth = d.getMonth() + 1;
      const salaryYear = d.getFullYear();

      const findUrl = `${FM_BASE}/layouts/MonthlySalary/_find`;
      const findRes = await fetch(findUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: [{ _fk_EmployeeID: `==${payload.employeeId}`, SalaryMonth: `==${salaryMonth}`, SalaryYear: `==${salaryYear}` }]
        })
      });

      const findData = await safeJson(findRes);
      
      if (findRes.ok && findData?.response?.data?.length > 0) {
        const salaryRecord = findData.response.data[0];
        const currentDeductions = Number(salaryRecord.fieldData.UnpaidDeduction) || 0;
        const newDeductions = currentDeductions + Number(payload.amount);
        const basicSalary = Number(salaryRecord.fieldData.BasicSalary) || 0;
        const newNetPayable = basicSalary - newDeductions;

        const patchUrl = `${FM_BASE}/layouts/MonthlySalary/records/${salaryRecord.recordId}`;
        await fetch(patchUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fieldData: {
              UnpaidDeduction: newDeductions,
              NetPayable: newNetPayable,
              Balance: newNetPayable 
            }
          })
        });
      }
    }

    return true;
  } finally {
    await deleteSession(token);
  }
}

// ── UPDATE AN INDIVIDUAL EMPLOYEE'S MONTHLY SALARY STATEMENT ──────────
export async function updateEmployeeMonthlySalaryInFM(recordId, payload) {
  const token = await createSession();
  try {
    const url = `${FM_BASE}/layouts/MonthlySalary/records/${recordId}`;

    // Determine the status string/value based on whether a balance remains
    const isPaid = Number(payload.balance) === 0 ? 1 : 0;

    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fieldData: {
          BasicSalary: Number(payload.basicSalary),
          UnpaidDeduction: Number(payload.deductions),
          NetPayable: Number(payload.netPayable),
          Deposited: Number(payload.deposited),
          Balance: Number(payload.balance),
          IsPaid: isPaid,
          Notes: String(payload.notes || "Updated by Administrator")
        }
      }),
    });

    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data?.messages?.[0]?.message || 'Failed to update salary configuration record.');
    }
    return true;
  } finally {
    await deleteSession(token);
  }
}