export type AdminModuleKey =
  | 'timekeeping'
  | 'leave-management'
  | 'earnings'
  | 'deductions'
  | 'government-contributions'
  | 'reports'
  | 'payslips'
  | 'settings';

export interface AdminModuleDefinition {
  key: AdminModuleKey;
  label: string;
  shortCode: string;
  path: string;
  description: string;
  features: string[];
}

export const adminModules: AdminModuleDefinition[] = [
  {
    key: 'timekeeping',
    label: 'Timekeeping',
    shortCode: 'TK',
    path: '/admin/timekeeping',
    description:
      'Review attendance, shifts, overtime, lateness, undertime, and correction requests.',
    features: [
      'Daily attendance',
      'Shift schedules',
      'Overtime requests',
      'Attendance corrections',
    ],
  },
  {
    key: 'leave-management',
    label: 'Leave Management',
    shortCode: 'LV',
    path: '/admin/leave-management',
    description:
      'Manage leave types, balances, applications, approvals, and leave history.',
    features: [
      'Leave applications',
      'Approval queue',
      'Leave balances',
      'Leave-type settings',
    ],
  },
  {
    key: 'earnings',
    label: 'Allowance & Income',
    shortCode: 'ER',
    path: '/admin/earnings',
    description:
      'Prepare recurring allowances, bonuses, commissions, reimbursements, and adjustments.',
    features: [
      'Allowances',
      'Bonuses and incentives',
      'Commissions',
      'Salary adjustments',
    ],
  },
  {
    key: 'deductions',
    label: 'Loans & Deductions',
    shortCode: 'DD',
    path: '/admin/deductions',
    description:
      'Track employee loans, installments, balances, and authorized deductions.',
    features: [
      'Employee loans',
      'Installment schedules',
      'Other deductions',
      'Outstanding balances',
    ],
  },
  {
    key: 'government-contributions',
    label: 'Gov. Contributions',
    shortCode: 'GC',
    path: '/admin/government-contributions',
    description:
      'Configure and review statutory employee and employer contribution records.',
    features: [
      'Contribution tables',
      'Employee shares',
      'Employer shares',
      'Remittance summaries',
    ],
  },
  {
    key: 'reports',
    label: 'Payroll Reports',
    shortCode: 'RP',
    path: '/admin/reports',
    description:
      'Open payroll registers, summaries, statutory reports, and export-ready views.',
    features: [
      'Payroll register',
      'Department summaries',
      'Contribution reports',
      'Bank and export reports',
    ],
  },
  {
    key: 'payslips',
    label: 'Payslips',
    shortCode: 'PS',
    path: '/admin/payslips',
    description:
      'Generate, review, publish, print, and download employee payslips.',
    features: [
      'Payslip generation',
      'Publication status',
      'PDF downloads',
      'Download history',
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    shortCode: 'ST',
    path: '/admin/settings',
    description:
      'Manage company, payroll, security, approval, and application preferences.',
    features: [
      'Company settings',
      'Payroll configuration',
      'Roles and permissions',
      'Audit and backup settings',
    ],
  },
];

export function getAdminModule(
  moduleKey: AdminModuleKey,
): AdminModuleDefinition {
  const moduleDefinition = adminModules.find(
    (item) => item.key === moduleKey,
  );

  if (!moduleDefinition) {
    throw new Error(`Unknown admin module: ${moduleKey}`);
  }

  return moduleDefinition;
}
