import { Link } from 'react-router-dom';

type PortalModule = {
  title: string;
  description: string;
  status: 'Available' | 'Available soon';
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
      'Review active allowances, approved bonuses, incentives, commissions, reimbursements, and salary adjustments.',
    status: 'Available',
    path: '/employee/earnings',
  },
  {
    title: 'Loans and Deductions',
    description:
      'Review active loans, installment schedules, outstanding balances, recurring deductions, and deduction history.',
    status: 'Available',
    path: '/employee/deductions',
  },
  {
    title: 'Government Contributions',
    description:
      'Review employee deductions, employer shares, government membership numbers, and contribution history.',
    status: 'Available',
    path: '/employee/contributions',
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
        {portalModules.map((module) => {
          const isAvailable =
            module.status === 'Available' && Boolean(module.path);

          return (
            <article className="card" key={module.title}>
              <div className="card-header">
                <h2>{module.title}</h2>

                <span
                  className={
                    isAvailable
                      ? 'status-badge status-badge--available'
                      : 'status-badge'
                  }
                >
                  {module.status}
                </span>
              </div>

              <p>{module.description}</p>

              {isAvailable && module.path && (
                <Link className="module-link" to={module.path}>
                  Open module
                </Link>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}