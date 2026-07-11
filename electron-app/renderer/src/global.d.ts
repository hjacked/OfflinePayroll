import type {
  AttendanceCorrection,
  AttendanceCorrectionInput,
  AttendanceImportResult,
  AttendanceImportRow,
  AttendanceInput,
  AttendanceListFilters,
  AttendanceRecord,
  AttendanceSummary,
  ScheduleAssignment,
  ScheduleAssignmentInput,
  WorkSchedule,
  WorkScheduleInput,
} from './models/Attendance';
import type {
  LeaveBalance,
  LeaveBalanceAdjustmentInput,
  LeaveBalanceFilters,
  LeaveRequest,
  LeaveRequestFilters,
  LeaveRequestInput,
  LeaveSummary,
  LeaveType,
  LeaveTypeInput,
} from './models/Leave';
import type {
  DeductionAssignment,
  DeductionAssignmentFilters,
  DeductionAssignmentInput,
  DeductionSummary,
  DeductionTransaction,
  DeductionTransactionFilters,
  DeductionTransactionInput,
  DeductionTransactionStatus,
  DeductionType,
  DeductionTypeFilters,
  DeductionTypeInput,
  EmployeeLoan,
  EmployeeLoanFilters,
  EmployeeLoanInput,
  LoanStatus,
  LoanSummary,
} from './models/Deductions';
import type {
  EarningAssignment,
  EarningAssignmentFilters,
  EarningAssignmentInput,
  EarningSummary,
  EarningTransaction,
  EarningTransactionFilters,
  EarningTransactionInput,
  EarningTransactionStatus,
  EarningType,
  EarningTypeFilters,
  EarningTypeInput,
} from './models/Earnings';
import type {
  ContributionCalculationInput,
  ContributionCalculationResult,
  ContributionRecord,
  ContributionRecordFilters,
  ContributionRecordInput,
  ContributionRecordStatus,
  ContributionSummary,
  ContributionTableFilters,
  ContributionTableStatus,
  ContributionTableVersion,
  ContributionTableVersionInput,
  ContributionType,
  ContributionTypeFilters,
  ContributionTypeInput,
  ContributionBracket,
  ContributionBracketInput,
} from './models/Contributions';
import type {
  Employee,
  EmployeeInput,
  EmployeeListFilters,
} from './models/Employee';

import type {
  EmployeePayrollHistoryRecord,
  PayrollEmployeeResult,
  PayrollPeriod,
  PayrollPeriodDetails,
  PayrollPeriodInput,
  PayrollRegister,
  PayrollWorkflowStatus,
} from './models/PayrollPeriod';
import type {
  CompanyLogoSelection,
  CompanyProfile,
  Payslip,
  PayslipFilters,
  PayslipGenerationResult,
  PayslipOptions,
  PayslipPdfExportResult,
  PayslipSummary,
} from './models/Payslip';
import type {
  BankTransferReport,
  ContributionReport,
  LineItemReport,
  NetPayReport,
  PayrollRegisterReport,
  PayrollSummaryReport,
  PayrollVarianceInput,
  PayrollVarianceReport,
  PdfExportResult,
  ReportFilters,
  ReportOptions,
  ReportsDashboardData,
} from './models/Reports';

export interface PayrollApi {
  employee: {
    list: (
      filters?: EmployeeListFilters,
    ) => Promise<{ data: Employee[]; total: number }>;
    get: (id: string) => Promise<Employee | null>;
    create: (payload: EmployeeInput) => Promise<Employee>;
    update: (id: string, payload: EmployeeInput) => Promise<Employee>;
    setStatus: (id: string, active: boolean) => Promise<Employee>;
    delete: (id: string) => Promise<{ id: string }>;
  };
  attendance: {
    list: (
      filters?: AttendanceListFilters,
    ) => Promise<{ data: AttendanceRecord[]; total: number }>;
    get: (id: string) => Promise<AttendanceRecord | null>;
    summary: (filters?: AttendanceListFilters) => Promise<AttendanceSummary>;
    create: (payload: AttendanceInput) => Promise<AttendanceRecord>;
    update: (id: string, payload: AttendanceInput) => Promise<AttendanceRecord>;
    delete: (id: string) => Promise<{ id: string }>;
    importRows: (rows: AttendanceImportRow[]) => Promise<AttendanceImportResult>;
  };
  schedule: {
    list: (filters?: {
      include_inactive?: boolean;
    }) => Promise<{ data: WorkSchedule[]; total: number }>;
    create: (payload: WorkScheduleInput) => Promise<WorkSchedule>;
    update: (id: string, payload: WorkScheduleInput) => Promise<WorkSchedule>;
    delete: (id: string) => Promise<{ id: string }>;
    assignments: (filters?: {
      employee_id?: string;
    }) => Promise<{ data: ScheduleAssignment[]; total: number }>;
    assign: (payload: ScheduleAssignmentInput) => Promise<ScheduleAssignment>;
    unassign: (id: string) => Promise<{ id: string }>;
  };
  attendanceCorrection: {
    list: (filters?: {
      status?: 'all' | 'pending' | 'approved' | 'rejected';
      employee_id?: string;
    }) => Promise<{ data: AttendanceCorrection[]; total: number }>;
    create: (payload: AttendanceCorrectionInput) => Promise<AttendanceCorrection>;
    review: (
      id: string,
      payload: {
        decision: 'approved' | 'rejected';
        reviewer_notes: string;
      },
    ) => Promise<AttendanceCorrection>;
  };
  leaveType: {
    list: (filters?: {
      include_inactive?: boolean;
    }) => Promise<{ data: LeaveType[]; total: number }>;
    create: (payload: LeaveTypeInput) => Promise<LeaveType>;
    update: (id: string, payload: LeaveTypeInput) => Promise<LeaveType>;
    delete: (id: string) => Promise<{ id: string; deactivated: boolean }>;
  };
  leaveBalance: {
    list: (
      filters?: LeaveBalanceFilters,
    ) => Promise<{ data: LeaveBalance[]; total: number }>;
    adjust: (payload: LeaveBalanceAdjustmentInput) => Promise<LeaveBalance>;
  };
  leaveRequest: {
    list: (
      filters?: LeaveRequestFilters,
    ) => Promise<{ data: LeaveRequest[]; total: number }>;
    get: (id: string) => Promise<LeaveRequest | null>;
    summary: (filters?: LeaveRequestFilters) => Promise<LeaveSummary>;
    create: (payload: LeaveRequestInput) => Promise<LeaveRequest>;
    update: (id: string, payload: LeaveRequestInput) => Promise<LeaveRequest>;
    review: (
      id: string,
      payload: {
        decision: 'approved' | 'rejected';
        reviewer_notes: string;
      },
    ) => Promise<LeaveRequest>;
    cancel: (
      id: string,
      payload?: { reason: string },
    ) => Promise<LeaveRequest>;
  };
  earningType: {
    list: (filters?: EarningTypeFilters) => Promise<{ data: EarningType[]; total: number }>;
    get: (id: string) => Promise<EarningType | null>;
    create: (payload: EarningTypeInput) => Promise<EarningType>;
    update: (id: string, payload: EarningTypeInput) => Promise<EarningType>;
    setStatus: (id: string, active: boolean) => Promise<EarningType>;
    delete: (id: string) => Promise<{ id: string; deactivated: boolean }>;
  };
  earningAssignment: {
    list: (filters?: EarningAssignmentFilters) => Promise<{ data: EarningAssignment[]; total: number }>;
    get: (id: string) => Promise<EarningAssignment | null>;
    create: (payload: EarningAssignmentInput) => Promise<EarningAssignment>;
    update: (id: string, payload: EarningAssignmentInput) => Promise<EarningAssignment>;
    setStatus: (id: string, active: boolean) => Promise<EarningAssignment>;
    delete: (id: string) => Promise<{ id: string; deactivated: boolean }>;
  };
  earningTransaction: {
    list: (filters?: EarningTransactionFilters) => Promise<{ data: EarningTransaction[]; total: number }>;
    get: (id: string) => Promise<EarningTransaction | null>;
    summary: (filters?: EarningTransactionFilters) => Promise<EarningSummary>;
    create: (payload: EarningTransactionInput) => Promise<EarningTransaction>;
    update: (id: string, payload: EarningTransactionInput) => Promise<EarningTransaction>;
    setStatus: (id: string, status: EarningTransactionStatus) => Promise<EarningTransaction>;
    delete: (id: string) => Promise<{ id: string; cancelled: boolean }>;
  };
  deductionType: {
    list: (filters?: DeductionTypeFilters) => Promise<{ data: DeductionType[]; total: number }>;
    get: (id: string) => Promise<DeductionType | null>;
    create: (payload: DeductionTypeInput) => Promise<DeductionType>;
    update: (id: string, payload: DeductionTypeInput) => Promise<DeductionType>;
    setStatus: (id: string, active: boolean) => Promise<DeductionType>;
    delete: (id: string) => Promise<{ id: string; deactivated: boolean }>;
  };
  deductionAssignment: {
    list: (filters?: DeductionAssignmentFilters) => Promise<{ data: DeductionAssignment[]; total: number }>;
    get: (id: string) => Promise<DeductionAssignment | null>;
    create: (payload: DeductionAssignmentInput) => Promise<DeductionAssignment>;
    update: (id: string, payload: DeductionAssignmentInput) => Promise<DeductionAssignment>;
    setStatus: (id: string, active: boolean) => Promise<DeductionAssignment>;
    delete: (id: string) => Promise<{ id: string; deactivated: boolean }>;
  };
  loan: {
    list: (filters?: EmployeeLoanFilters) => Promise<{ data: EmployeeLoan[]; total: number }>;
    get: (id: string) => Promise<EmployeeLoan | null>;
    summary: (filters?: EmployeeLoanFilters) => Promise<LoanSummary>;
    create: (payload: EmployeeLoanInput) => Promise<EmployeeLoan>;
    update: (id: string, payload: EmployeeLoanInput) => Promise<EmployeeLoan>;
    setStatus: (id: string, status: LoanStatus) => Promise<EmployeeLoan>;
    recordPayment: (id: string, payload: {
      amount: number;
      transaction_date: string;
      payroll_period_id?: string;
      reference?: string;
      notes?: string;
    }) => Promise<{ loan: EmployeeLoan; transaction: DeductionTransaction }>;
    delete: (id: string) => Promise<{ id: string; cancelled: boolean }>;
  };
  deductionTransaction: {
    list: (filters?: DeductionTransactionFilters) => Promise<{ data: DeductionTransaction[]; total: number }>;
    get: (id: string) => Promise<DeductionTransaction | null>;
    summary: (filters?: DeductionTransactionFilters) => Promise<DeductionSummary>;
    create: (payload: DeductionTransactionInput) => Promise<DeductionTransaction>;
    update: (id: string, payload: DeductionTransactionInput) => Promise<DeductionTransaction>;
    setStatus: (id: string, status: DeductionTransactionStatus) => Promise<DeductionTransaction>;
    delete: (id: string) => Promise<{ id: string; cancelled: boolean }>;
  };

  contributionType: {
    list: (filters?: ContributionTypeFilters) => Promise<{ data: ContributionType[]; total: number }>;
    get: (id: string) => Promise<ContributionType | null>;
    create: (payload: ContributionTypeInput) => Promise<ContributionType>;
    update: (id: string, payload: ContributionTypeInput) => Promise<ContributionType>;
    setStatus: (id: string, active: boolean) => Promise<ContributionType>;
    delete: (id: string) => Promise<{ id: string; deactivated: boolean }>;
  };
  contributionTable: {
    list: (filters?: ContributionTableFilters) => Promise<{ data: ContributionTableVersion[]; total: number }>;
    get: (id: string) => Promise<{ table: ContributionTableVersion; brackets: ContributionBracket[] } | null>;
    create: (payload: ContributionTableVersionInput) => Promise<ContributionTableVersion>;
    update: (id: string, payload: ContributionTableVersionInput) => Promise<ContributionTableVersion>;
    setStatus: (id: string, status: ContributionTableStatus) => Promise<ContributionTableVersion>;
    replaceBrackets: (id: string, brackets: ContributionBracketInput[]) => Promise<ContributionBracket[]>;
    delete: (id: string) => Promise<{ id: string; archived: boolean }>;
  };
  contribution: {
    calculate: (payload: ContributionCalculationInput) => Promise<ContributionCalculationResult>;
  };
  contributionRecord: {
    list: (filters?: ContributionRecordFilters) => Promise<{ data: ContributionRecord[]; total: number }>;
    get: (id: string) => Promise<ContributionRecord | null>;
    summary: (filters?: ContributionRecordFilters) => Promise<ContributionSummary>;
    create: (payload: ContributionRecordInput) => Promise<ContributionRecord>;
    setStatus: (id: string, status: ContributionRecordStatus) => Promise<ContributionRecord>;
    delete: (id: string) => Promise<{ id: string; cancelled: boolean }>;
  };
  companyProfile: {
    get: () => Promise<CompanyProfile>;
    update: (payload: Partial<CompanyProfile> & { company_name: string }) => Promise<CompanyProfile>;
    chooseLogo: () => Promise<CompanyLogoSelection>;
  };
  payslip: {
    options: () => Promise<PayslipOptions>;
    list: (filters?: PayslipFilters) => Promise<{ data: Payslip[]; total: number }>;
    summary: (filters?: PayslipFilters) => Promise<PayslipSummary>;
    get: (id: string) => Promise<Payslip | null>;
    employeeList: (employeeId: string) => Promise<{ data: Payslip[]; total: number }>;
    employeeGet: (id: string, employeeId: string) => Promise<Payslip | null>;
    generate: (payload: {
      period_id: string;
      actor?: string;
      force?: boolean;
    }) => Promise<PayslipGenerationResult>;
    publish: (id: string, actor?: string) => Promise<Payslip>;
    unpublish: (id: string, actor?: string) => Promise<Payslip>;
    publishPeriod: (
      periodId: string,
      actor?: string,
    ) => Promise<{ updated: number; data: Payslip[] }>;
    delete: (id: string) => Promise<{ id: string }>;
    exportPdf: (
      id: string,
      suggestedName: string,
      actor?: string,
    ) => Promise<PayslipPdfExportResult>;
  };
  report: {
    options: () => Promise<ReportOptions>;
    dashboard: (filters?: ReportFilters) => Promise<ReportsDashboardData>;
    payrollRegister: (filters?: ReportFilters) => Promise<PayrollRegisterReport>;
    payrollSummary: (filters?: ReportFilters) => Promise<PayrollSummaryReport>;
    earnings: (filters?: ReportFilters) => Promise<LineItemReport>;
    deductions: (filters?: ReportFilters) => Promise<LineItemReport>;
    contributions: (filters?: ReportFilters) => Promise<ContributionReport>;
    netPay: (filters?: ReportFilters) => Promise<NetPayReport>;
    variance: (payload: PayrollVarianceInput) => Promise<PayrollVarianceReport>;
    bankTransfer: (filters: ReportFilters) => Promise<BankTransferReport>;
    exportPdf: (suggestedName: string) => Promise<PdfExportResult>;
  };
  payroll: {
    list: (filters?: {
      query?: string;
      status?: PayrollWorkflowStatus | 'all';
      date_from?: string;
      date_to?: string;
    }) => Promise<{ data: PayrollPeriod[]; total: number }>;
    get: (id: string) => Promise<PayrollPeriod | null>;
    details: (id: string) => Promise<PayrollPeriodDetails | null>;
    employeeResult: (
      periodId: string,
      employeeId: string,
    ) => Promise<PayrollEmployeeResult | null>;
    createPeriod: (payload: PayrollPeriodInput) => Promise<{ period: PayrollPeriod }>;
    updatePeriod: (id: string, payload: PayrollPeriodInput) => Promise<PayrollPeriod>;
    deletePeriod: (id: string) => Promise<{ id: string }>;
    calculate: (id: string, actor?: string) => Promise<PayrollPeriodDetails>;
    approve: (id: string, actor?: string) => Promise<PayrollPeriod>;
    finalize: (id: string, actor?: string) => Promise<PayrollPeriod>;
    lock: (id: string, actor?: string) => Promise<PayrollPeriod>;
    cancel: (id: string, actor?: string) => Promise<PayrollPeriod>;
    register: (id: string) => Promise<PayrollRegister>;
    employeeHistory: (filters?: {
      employee_id?: string;
      date_from?: string;
      date_to?: string;
    }) => Promise<{ data: EmployeePayrollHistoryRecord[]; total: number }>;
    run: (periodId: string) => Promise<{ periodId: string; status: string }>;
  };
}

declare global {
  interface Window {
    api: PayrollApi;
  }
}
