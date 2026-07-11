import { Link } from 'react-router-dom';

type PortalModule = {
  title: string;
  description: string;
  status: string;
  path?: string;
};

const portalModules: PortalModule[] = [
  {
    title: 'Timekeeping',
    description:
      'View daily attendance logs, late records, overtime, undertime, and attendance corrections.',
    status: 'Available soon',
  },
  {
    title: 'Leave Management',
    description:
      'View leave balances, submit leave applications, and monitor approval status.',
    status: 'Available',
    path: '/employee/leave',
  },
  {
    title: 'Allowances and Other Income',
    description:
      'Review assigned allowances, incentives, bonuses, commissions, and other earnings.',
    status: 'Available soon',
  },
  {
    title: 'Loans and Deductions',
    description:
      'View active loans, installment deductions, outstanding balances, and other deductions.',
    status: 'Available soon',
  },
  {
    title: 'Government Contributions',
    description:
      'Review employee contributions, employer shares, and statutory deduction history.',
    status: 'Available soon',
  },
  {
    title: 'Payroll History',
    description:
      'View previous payroll periods, gross income, deductions, and net pay.',
    status: 'Available soon',
  },
  {
    title: 'Payslips',
    description:
      'View, print, and download published payslips in PDF format.',
    status: 'Available soon',
  },
  {
    title: 'My Profile',
    description:
      'Review personal, employment, bank, and government membership information.',
    status: 'Available soon',
  },
];

export default function EmployeePortal() {
  return (
    <section aria-labelledby="employee-portal-title">
      <div className="page-heading">
        <div>
          <h1 id="employee-portal-title">Employee Portal</h1>

          <p>
            View attendance, leave balances, earnings, deductions,
            contributions, payroll history, and downloadable payslips.
          </p>
        </div>
      </div>

      <div className="card-grid">
        {portalModules.map((module) => (
          <article className="card" key={module.title}>
            <div className="card-header">
              <h2>{module.title}</h2>

              <span className="status-badge">
                {module.status}
              </span>
            </div>

            <p>{module.description}</p>

            {module.path && (
              <Link className="module-link" to={module.path}>
                Open module
              </Link>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}