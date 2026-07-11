import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SelfServiceDashboard } from '../models/SelfService';

const modules = [
  { title: 'Timekeeping', description: 'Review attendance records, your current schedule, and correction requests.', path: '/employee/timekeeping' },
  { title: 'Leave Management', description: 'View leave balances, submit leave applications, and monitor approvals.', path: '/employee/leave' },
  { title: 'Allowances and Other Income', description: 'Review active allowances and approved additional earnings.', path: '/employee/earnings' },
  { title: 'Loans and Deductions', description: 'Review active loans, recurring deductions, and deduction history.', path: '/employee/deductions' },
  { title: 'Government Contributions', description: 'Review employee deductions, employer shares, and contribution history.', path: '/employee/contributions' },
  { title: 'Payroll History', description: 'Review finalized payroll periods, gross income, deductions, and net pay.', path: '/employee/payroll-history' },
  { title: 'Payslips', description: 'View, print, and download published payroll documents.', path: '/employee/payslips' },
  { title: 'My Profile', description: 'Review employment, bank, government, and contact information.', path: '/employee/profile' },
];

export default function EmployeePortal() {
  const [dashboard, setDashboard] = useState<SelfServiceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void window.api.selfService.dashboard().then(setDashboard).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Unable to load the employee dashboard.');
    }).finally(() => setLoading(false));
  }, []);

  return <section className="self-page"><div className="self-heading"><div><span>Employee self-service</span><h1>{dashboard ? `Welcome, ${dashboard.profile.employee.first_name || dashboard.profile.employee.name}` : 'Employee Portal'}</h1><p>Access your attendance, leave, earnings, deductions, payroll history, and payslips.</p></div></div>{error && <div className="self-alert self-alert--error">{error}</div>}{loading ? <div className="self-empty">Loading employee dashboard…</div> : dashboard && <><div className="self-dashboard-grid"><DashboardCard label="Attendance this month" value={`${dashboard.attendance.present_records}/${dashboard.attendance.total_records}`} detail="present / recorded days" /><DashboardCard label="Available leave" value={dashboard.available_leave_days.toFixed(2)} detail="tracked leave days" /><DashboardCard label="Active loan balance" value={money(dashboard.active_loan_balance)} detail="remaining balance" /><DashboardCard label="Pending requests" value={dashboard.pending_leave_requests + dashboard.pending_attendance_corrections} detail="leave and attendance" /><DashboardCard label="Latest net pay" value={dashboard.latest_payroll ? money(dashboard.latest_payroll.net_pay) : '—'} detail={dashboard.latest_payroll?.period_name || 'No finalized payroll'} /><DashboardCard label="Latest payslip" value={dashboard.latest_payslip?.period_name || '—'} detail={dashboard.latest_payslip ? `Published ${date(dashboard.latest_payslip.published_at)}` : 'No published payslip'} /></div><div className="self-module-grid">{modules.map((module) => <article className="self-module-card" key={module.title}><span className="self-module-badge">Available</span><h2>{module.title}</h2><p>{module.description}</p><Link to={module.path}>Open module</Link></article>)}</div></>}</section>;
}

function DashboardCard({ label, value, detail }: { label: string; value: string | number; detail: string }) { return <article className="self-dashboard-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>; }
function money(value: number) { return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value || 0)); }
function date(value: string) { if (!value) return '—'; return new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value)); }
