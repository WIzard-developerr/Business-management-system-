import React, { useEffect, useState } from 'react';
import { 
  Contact, Users, Clock, Moon, CheckSquare, RefreshCw, 
  Trash2, UserPlus, FileSignature, DollarSign, CalendarCheck, CheckCircle 
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  salary: number;
  bankAccount: string;
  shiftHours: string;
  joiningDate: string;
}

interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  type: 'Annual' | 'Sick' | 'Unpaid' | 'Maternity';
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: 'Present' | 'Absent' | 'Late' | 'Leave';
}

interface HrTabProps {
  token: string;
  userRole: string;
  companyCurrency: string;
}

export function HrTab({ token, userRole, companyCurrency }: HrTabProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Form additions
  const [isAddingEmp, setIsAddingEmp] = useState(false);
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empDept, setEmpDept] = useState('Operations');
  const [empDesig, setEmpDesig] = useState('Consultant');
  const [empSalary, setEmpSalary] = useState(55000);
  const [empBank, setEmpBank] = useState('US8900018239123891');
  const [empShift, setEmpShift] = useState('09:00 - 17:00');
  
  const [isRequestingLeave, setIsRequestingLeave] = useState(false);
  const [leaveEmpId, setLeaveEmpId] = useState('');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveType, setLeaveType] = useState<'Annual' | 'Sick' | 'Unpaid' | 'Maternity'>('Annual');
  const [leaveReason, setLeaveReason] = useState('');

  // Payroll disburse state
  const [payStatus, setPayStatus] = useState<{ success?: boolean; staffCount?: number; total?: number } | null>(null);
  const [processingPay, setProcessingPay] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchHrData = async () => {
    try {
      const authHeader = { 'Authorization': `Bearer ${token}` };
      
      const empRes = await fetch('/api/hr/employees', { headers: authHeader });
      const empData = await empRes.json();
      setEmployees(empData);

      const leaveRes = await fetch('/api/hr/leaves', { headers: authHeader });
      const leaveData = await leaveRes.json();
      setLeaves(leaveData);

      const attRes = await fetch('/api/hr/attendance', { headers: authHeader });
      const attData = await attRes.json();
      setAttendance(attData);

      // Pre-set leave requester id
      if (empData.length > 0 && !leaveEmpId) {
        setLeaveEmpId(empData[0].id);
      }
    } catch (e) {
      console.error('Failed to coordinate HR dashboard indexes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHrData();
  }, [token]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!empName || !empEmail || !empSalary) return;

    try {
      const res = await fetch('/api/hr/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: empName,
          email: empEmail,
          department: empDept,
          designation: empDesig,
          salary: Number(empSalary),
          bankAccount: empBank,
          shiftHours: empShift
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to onboard employee.');

      setEmployees([...employees, data]);
      setIsAddingEmp(false);
      resetEmpForm();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!leaveEmpId || !leaveStart || !leaveEnd) {
      setErrorMsg('Leave duration boundaries are required.');
      return;
    }

    const empObj = employees.find(e => e.id === leaveEmpId);
    if (!empObj) return;

    try {
      const res = await fetch('/api/hr/leaves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          employeeId: leaveEmpId,
          employeeName: empObj.name,
          startDate: leaveStart,
          endDate: leaveEnd,
          type: leaveType,
          reason: leaveReason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit leave.');

      setLeaves([data, ...leaves]);
      setIsRequestingLeave(false);
      setLeaveReason('');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleUpdateLeaveStatus = async (id: string, decision: 'Approved' | 'Rejected') => {
    try {
      const res = await fetch(`/api/hr/leaves/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: decision })
      });
      const updated = await res.json();
      setLeaves(leaves.map(l => l.id === id ? updated : l));
    } catch (e) {
      console.error('Failed to change leave status:', e);
    }
  };

  const handleAttendanceClock = async (empId: string, empName: string, clocking: 'clock-in' | 'clock-out') => {
    try {
      const res = await fetch(`/api/hr/attendance/${clocking}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ employeeId: empId, employeeName: empName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (clocking === 'clock-in') {
        setAttendance([...attendance, data]);
      } else {
        setAttendance(attendance.map(a => a.employeeId === empId && a.date === data.date ? data : a));
      }
    } catch (err: any) {
      alert(err.message || 'Check attendance logic failure.');
    }
  };

  const handleRunPayroll = async () => {
    if (!confirm('Proceeding with payroll disbursement will execute individual net salary deposits to Ledger Expenses across all employees. Continue?')) return;
    setProcessingPay(true);
    setPayStatus(null);
    try {
      const res = await fetch('/api/hr/payroll/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payroll run terminated.');

      setPayStatus({ success: true, staffCount: data.processedStaffCount, total: data.totalDisbursed });
    } catch (err: any) {
      setPayStatus({ success: false });
      alert(err.message);
    } finally {
      setProcessingPay(false);
    }
  };

  const resetEmpForm = () => {
    setEmpName('');
    setEmpEmail('');
    setEmpSalary(55000);
    setEmpBank('US8900018239123891');
  };

  const fmt = (v: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: companyCurrency || 'USD' }).format(v);
  };

  const getLeaveBadgeStyle = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'Approved': return 'bg-emerald-100 text-emerald-800 border-emerald-250';
      case 'Rejected': return 'bg-rose-100 text-rose-800 border-rose-250';
      default: return 'bg-amber-100 text-amber-800 border-amber-250';
    }
  };

  const todayStr = new Date().toISOString().substring(0, 10);

  return (
    <div id="hr-viewport" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Workforce & Human Resource Ledger</h1>
          <p className="text-sm text-slate-500">Maintain employee profiles, verify log checkins, and trigger bulk payroll pay disbursements</p>
        </div>
        <div className="flex space-x-2">
          {(userRole === 'Admin' || userRole === 'Manager' || userRole === 'Super_Admin') && (
            <button
              id="run-payroll-btn"
              disabled={processingPay || employees.length === 0}
              onClick={handleRunPayroll}
              className="flex items-center space-x-1 border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold px-4 py-2 rounded-xl text-xs transition disabled:opacity-50 shadow-sm"
            >
              <DollarSign className="h-4 w-4" />
              <span>{processingPay ? 'Processing Salary Runs...' : 'Disburse Monthly Payroll'}</span>
            </button>
          )}

          <button
            id="toggle-add-emp"
            onClick={() => setIsAddingEmp(!isAddingEmp)}
            className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-md shadow-blue-100"
          >
            <UserPlus className="h-4 w-4" />
            <span>Onboard Employee</span>
          </button>
        </div>
      </div>

      {/* Slide Payroll outcome notifications */}
      {payStatus && payStatus.success && (
        <div id="payroll-notification" className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
          <div className="text-xs text-emerald-800 font-semibold space-y-1">
            <p className="text-sm text-emerald-950 font-bold flex items-center">
              <CheckCircle className="h-4 w-4 mr-1 text-emerald-600" />
              Payroll Ledger Run Completed Successfully
            </p>
            <p>Disbursed individual payslips to {payStatus.staffCount} staff records. Expense debit to general ledger amount: {fmt(payStatus.total || 0)}</p>
          </div>
          <button className="text-emerald-900 text-xs font-bold" onClick={() => setPayStatus(null)}>Dismiss</button>
        </div>
      )}

      {/* Onboard Employee Panel */}
      {isAddingEmp && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Onboard Employee Workforce Node</h3>
          {errorMsg && <p className="text-xs font-semibold text-rose-500 bg-rose-50 p-2 rounded">{errorMsg}</p>}
          <form onSubmit={handleCreateEmployee} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-medium">Employee Full Name (*)</label>
              <input
                id="hr-add-name"
                type="text"
                required
                value={empName}
                onChange={(e) => setEmpName(e.target.value)}
                placeholder="Pam Beesly"
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium">Corporate Email address (*)</label>
              <input
                id="hr-add-email"
                type="email"
                required
                value={empEmail}
                onChange={(e) => setEmpEmail(e.target.value)}
                placeholder="pam@acme.com"
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium">Corporate Department</label>
              <select
                id="hr-add-dept"
                value={empDept}
                onChange={(e) => setEmpDept(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 bg-white rounded-lg text-xs"
              >
                <option value="Executive Management">Executive Management</option>
                <option value="Accounting & Financials">Accounting & Financials</option>
                <option value="Sales & Customer Relations">Sales & Customer Relations</option>
                <option value="Technology & SaaS Engineering">Technology & SaaS Engineering</option>
                <option value="Operations">Operations Division</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-medium">Corporate Designation</label>
              <input
                id="hr-add-desig"
                type="text"
                value={empDesig}
                onChange={(e) => setEmpDesig(e.target.value)}
                placeholder="Senior Consultant"
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium">Annualised Standard Base (*)</label>
              <input
                id="hr-add-salary"
                type="number"
                required
                min="1000"
                value={empSalary}
                onChange={(e) => setEmpSalary(Number(e.target.value))}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium">Standard Shift Hours</label>
              <input
                id="hr-add-shift"
                type="text"
                value={empShift}
                onChange={(e) => setEmpShift(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-medium">Disbursal Bank Routing Account</label>
              <input
                id="hr-add-bank"
                type="text"
                value={empBank}
                onChange={(e) => setEmpBank(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div className="md:col-span-4 flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                id="hr-add-cancel"
                type="button"
                onClick={() => setIsAddingEmp(false)}
                className="px-4 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                id="hr-add-submit"
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
              >
                Onboard Staff
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Apply Leave Panel */}
      {isRequestingLeave && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Apply Workforce Leave Entitlement</h3>
          {errorMsg && <p className="text-xs font-semibold text-rose-500 bg-rose-50 p-2 rounded">{errorMsg}</p>}
          <form onSubmit={handleCreateLeave} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-medium">Employee Target</label>
              <select
                id="leave-add-empId"
                required
                value={leaveEmpId}
                onChange={(e) => setLeaveEmpId(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 bg-white rounded-lg text-xs"
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-medium">Leave Category</label>
              <select
                id="leave-add-type"
                value={leaveType}
                onChange={(e: any) => setLeaveType(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 bg-white rounded-lg text-xs"
              >
                <option value="Annual">Annual Vacation</option>
                <option value="Sick">Sick Leave</option>
                <option value="Unpaid">Unpaid Personal Leave</option>
                <option value="Maternity">Maternity/Paternity Leave</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-medium">Duration Start (*)</label>
              <input
                id="leave-add-start"
                type="date"
                required
                value={leaveStart}
                onChange={(e) => setLeaveStart(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium">Duration End (*)</label>
              <input
                id="leave-add-end"
                type="date"
                required
                value={leaveEnd}
                onChange={(e) => setLeaveEnd(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div className="md:col-span-4">
              <label className="block text-slate-700 font-medium">Formulated Reason Brief</label>
              <input
                id="leave-add-reason"
                type="text"
                required
                placeholder="Family obligations check, medical checks..."
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div className="md:col-span-4 flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                id="leave-add-cancel"
                type="button"
                onClick={() => setIsRequestingLeave(false)}
                className="px-4 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                id="leave-add-submit"
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
              >
                Submit Request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Multi Grid: Employees list checkins vs Leave approval panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employees block table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm lg:col-span-2 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h4 className="font-bold text-slate-900 text-sm">Staff Directory Logs</h4>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2.0 py-0.5 rounded-full">{employees.length} Members</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Employee Profile</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Department / Role</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Annual Base Rate</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase text-right">Work checkin (Today)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200" id="employees-table-body">
                {employees.map((emp) => {
                  const todayRecord = attendance.find(a => a.employeeId === emp.id && a.date === todayStr);

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition animate-fade-in">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs">
                            {emp.name[0]}
                          </div>
                          <div className="ml-3">
                            <p className="text-xs font-bold text-slate-950">{emp.name}</p>
                            <p className="text-[10px] text-slate-500">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-600 font-medium">
                        {emp.department} <span className="text-[10px] text-blue-600 font-bold">({emp.designation})</span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs font-bold text-slate-900 font-mono">
                        {fmt(emp.salary)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        {/* Interactive Widget */}
                        <div className="flex items-center justify-end space-x-1.5">
                          {!todayRecord ? (
                            <button
                              id={`employee-clockin-${emp.id}`}
                              onClick={() => handleAttendanceClock(emp.id, emp.name, 'clock-in')}
                              className="text-[9px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-0.5 rounded transition border border-blue-100 flex items-center"
                            >
                              <Clock className="h-2.5 w-2.5 mr-0.5 animate-pulse" />
                              <span>Entry Log</span>
                            </button>
                          ) : !todayRecord.checkOutTime ? (
                            <button
                              id={`employee-clockout-${emp.id}`}
                              onClick={() => handleAttendanceClock(emp.id, emp.name, 'clock-out')}
                              className="text-[9px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 px-2 py-0.5 rounded transition border border-amber-150 flex items-center"
                            >
                              <Moon className="h-2.5 w-2.5 mr-0.5" />
                              <span>Egress Log</span>
                            </button>
                          ) : (
                            <span className="text-[9px] bg-slate-50 border border-slate-100 inline-flex rounded px-1.5 py-0.5 font-bold font-mono text-slate-500">
                              Logged ({todayRecord.checkInTime} - {todayRecord.checkOutTime})
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leaves Request review dashboard */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 h-fit space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-1.5">
              <CalendarCheck className="h-4.5 w-4.5 text-blue-500" />
              <h4 className="font-bold text-slate-900 text-sm">Discretionary Leave Center</h4>
            </div>
            <button
              id="toggle-leave-btn"
              onClick={() => setIsRequestingLeave(!isRequestingLeave)}
              className="text-[10px] font-bold bg-slate-50 border border-slate-200 rounded p-1 hover:bg-slate-100"
            >
              Apply Leave
            </button>
          </div>

          <div className="space-y-4 h-fit max-h-[350px] overflow-y-auto pr-1" id="leaves-container">
            {leaves.map((l) => (
              <div key={l.id} className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/50 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">{l.employeeName}</span>
                  <span className={`px-2 py-0.5 text-[9px] rounded font-bold border ${getLeaveBadgeStyle(l.status)}`}>
                    {l.status}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Range: {l.startDate} to {l.endDate} ({l.type})
                </div>
                <p className="text-[11px] text-slate-600 italic">"{l.reason}"</p>

                {l.status === 'Pending' && (userRole === 'Admin' || userRole === 'Manager' || userRole === 'Super_Admin') && (
                  <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200/50">
                    <button
                      id={`leave-approve-${l.id}`}
                      onClick={() => handleUpdateLeaveStatus(l.id, 'Approved')}
                      className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[9px] transition"
                    >
                      Authorize
                    </button>
                    <button
                      id={`leave-reject-${l.id}`}
                      onClick={() => handleUpdateLeaveStatus(l.id, 'Rejected')}
                      className="px-2 py-0.5 bg-slate-300 hover:bg-slate-400 text-slate-700 font-bold rounded text-[9px] transition"
                    >
                      Deny
                    </button>
                  </div>
                )}
              </div>
            ))}
            {leaves.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-6">No workspace leaves requests processed.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
