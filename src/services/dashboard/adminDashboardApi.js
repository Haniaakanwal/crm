import { createSession, deleteSession, safeJson } from '../fileMakerService';

export const FM_BASE = '/fmapi/fmi/data/v1/databases/Practice';

export async function getCompleteAdminDashboardMetrics(year, month) {
  const token = await createSession();
  try {
    const activeYear = year || 2026;

    // 1. Fetch Live Employee Roster
    const empRes = await fetch(`${FM_BASE}/layouts/Employees/records?_limit=100`, {
      method: 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    });
    const empData = await safeJson(empRes);
    const employees = empData?.response?.data || [];

    // 2. Fetch Daily Timesheet Attendance Logs
    const tsRes = await fetch(`${FM_BASE}/layouts/TimeSheetDaily/records?_limit=100`, {
      method: 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    });
    const tsData = await safeJson(tsRes);
    const dailyTimesheets = tsData?.response?.data || [];

    // 3. Fetch Leave Request Submissions
    const leaveRes = await fetch(`${FM_BASE}/layouts/LeaveRequest/records?_limit=100`, {
      method: 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    });
    const leaveData = await safeJson(leaveRes);
    const leaveRequests = leaveData?.response?.data || [];

    // 4. Fetch Financial Salary Records for active Month context
    const salaryFindUrl = `${FM_BASE}/layouts/MonthlySalary/_find`;
    const salaryRes = await fetch(salaryFindUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        query: [{ SalaryYear: `==${activeYear}`, SalaryMonth: `==${month}` }]
      })
    });
    const salaryData = await safeJson(salaryRes);
    const salaryRecords = salaryData?.response?.data || [];

    // ── 📅 5. FETCH DYNAMIC LEAVE BALANCE SUMMARIES PER PROFILE ──
    const leaveBalancesList = await Promise.all(
      employees.slice(0, 6).map(async (emp) => {
        const empId = emp.fieldData.EmployeeID;
        try {
          const findUrl = `${FM_BASE}/layouts/LeaveBalance/_find`;
          const balanceRes = await fetch(findUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              query: [{ _fk_EmployeeID: `==${empId}`, BalanceYear: `==${activeYear}` }]
            })
          });
          const balanceData = await safeJson(balanceRes);
          
          if (balanceRes.ok && balanceData?.response?.data?.length > 0) {
            const f = balanceData.response.data[0].fieldData;
            return {
              employeeId: empId,
              totalDays: Number(f.YearlyAllowance) || 24,
              usedDays: Number(f.TotalDaysTaken) || 0,
              remaining: Number(f.RemainingPaid) || 24
            };
          }
        } catch (e) {
          console.error(`Could not grab leave balance row record for employee ${empId}`);
        }
        
        // Secure baseline fallback parameters if no row match exists on the server layout yet
        return {
          employeeId: empId,
          totalDays: 24,
          usedDays: 0,
          remaining: 24
        };
      })
    );

    // Construct current date string to match FileMaker layout formatting (MM/DD/YYYY)
    const today = new Date();
    const currentM = String(today.getMonth() + 1).padStart(2, '0');
    const currentD = String(today.getDate()).padStart(2, '0');
    const currentY = today.getFullYear();
    const todayFmFormat = `${currentM}/${currentD}/${currentY}`;

    return {
      activeEmployeesCount: employees.length,
      presentTodayCount: dailyTimesheets.filter(t => 
        t.fieldData.CheckIn && t.fieldData.EntryDate === todayFmFormat
      ).length,
      pendingLeavesCount: leaveRequests.filter(l => l.fieldData.Status === 'Pending').length,
      unprocessedUnpaidCount: leaveRequests.filter(l => l.fieldData.LeaveType === 'Unpaid' && !l.fieldData.Processed).length,

      attendanceList: dailyTimesheets.filter(t => t.fieldData.EntryDate === todayFmFormat).slice(0, 5).map(r => ({
        id: r.recordId,
        employeeId: r.fieldData._fk_EmployeeID,
        checkIn: r.fieldData.CheckIn || '—',
        checkOut: r.fieldData.CheckOut || '—',
        status: r.fieldData.CheckOut ? 'Completed' : 'Active Row'
      })),

      leaveRequestsList: leaveRequests.filter(l => l.fieldData.Status === 'Pending').map(r => ({
        id: r.recordId,
        employeeId: r.fieldData._fk_EmployeeID,
        type: r.fieldData.LeaveType || 'Full Day',
        category: r.fieldData.Category || 'Casual',
        reason: r.fieldData.Description || ''
      })),

      employeeProfiles: employees.map(r => ({
        id: r.fieldData.EmployeeID,
        name: r.fieldData.FullName,
        department: r.fieldData.Department || 'Operations',
        baseSalary: Number(r.fieldData.BaseSalary) || 0
      })),

      salariesList: salaryRecords.map(r => ({
        id: r.recordId,
        name: r.fieldData.MonthLabel ? r.fieldData.MonthLabel.split(' - ')[0] : 'Employee',
        payable: Number(r.fieldData.NetPayable) || 0,
        deposited: Number(r.fieldData.Deposited) || 0,
        balance: Number(r.fieldData.Balance) || 0,
        status: Number(r.fieldData.IsPaid) === 1 ? 'Paid' : 'Pending'
      })),

      // 🟢 ATTACH THE DYNAMICALLY RECONCILED BALANCES TO THE RETURN OBJECT
      leaveBalances: leaveBalancesList
    };
  } finally {
    await deleteSession(token);
  }
}