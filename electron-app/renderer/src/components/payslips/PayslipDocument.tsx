import type { Payslip, PayslipLineItem } from '../../models/Payslip';
import {
  formatCurrency,
  formatDate,
  maskAccount,
} from '../../pages/admin/payslips/payslip-utils';

interface PayslipDocumentProps {
  payslip: Payslip;
}

function LineItems({
  items,
  emptyText,
}: {
  items: PayslipLineItem[];
  emptyText: string;
}) {
  if (items.length === 0) {
    return <div className="payslip-document__empty">{emptyText}</div>;
  }

  return (
    <table className="payslip-document__table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Code</th>
          <th className="payslip-document__amount">Amount</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td>{item.name}</td>
            <td>{item.code || '—'}</td>
            <td className="payslip-document__amount">
              {formatCurrency(item.amount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function PayslipDocument({ payslip }: PayslipDocumentProps) {
  const snapshot = payslip.snapshot;

  if (!snapshot) {
    return (
      <div className="payslip-document payslip-print-root">
        <div className="payslip-document__empty">
          The payslip snapshot is not available.
        </div>
      </div>
    );
  }

  const { company, period, employee, totals, attendance } = snapshot;

  return (
    <article className="payslip-document payslip-print-root">
      <header className="payslip-document__header">
        <div className="payslip-document__brand">
          {company.logo_data_url ? (
            <img
              src={company.logo_data_url}
              alt={`${company.company_name} logo`}
              className="payslip-document__logo"
            />
          ) : (
            <div className="payslip-document__logo-placeholder">PP</div>
          )}
          <div>
            <h1>{company.company_name}</h1>
            <p>{company.address || 'Company address not configured'}</p>
            {(company.contact_email || company.contact_phone) && (
              <p>
                {[company.contact_email, company.contact_phone]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
            {company.tax_id && <p>Tax ID: {company.tax_id}</p>}
          </div>
        </div>
        <div className="payslip-document__title">
          <span>Official payroll document</span>
          <h2>PAYSLIP</h2>
          <strong>{payslip.reference_number}</strong>
          <small className={`payslip-document__status payslip-document__status--${payslip.status}`}>
            {payslip.status === 'published' ? 'Published' : 'Draft'}
          </small>
        </div>
      </header>

      <section className="payslip-document__meta-grid">
        <div>
          <span>Employee</span>
          <strong>{employee.name}</strong>
          <small>{employee.employee_number}</small>
        </div>
        <div>
          <span>Department / Position</span>
          <strong>{employee.department || 'Not assigned'}</strong>
          <small>{employee.role_title || 'Not assigned'}</small>
        </div>
        <div>
          <span>Payroll period</span>
          <strong>{period.name}</strong>
          <small>
            {formatDate(period.start_date)} – {formatDate(period.end_date)}
          </small>
        </div>
        <div>
          <span>Payment date</span>
          <strong>{formatDate(period.payment_date)}</strong>
          <small>{period.frequency}</small>
        </div>
        <div>
          <span>Bank account</span>
          <strong>{employee.bank_name || 'Not provided'}</strong>
          <small>{maskAccount(employee.bank_account)}</small>
        </div>
        <div>
          <span>Government IDs</span>
          <strong>SSS: {employee.sss_number || '—'}</strong>
          <small>
            PHIC: {employee.philhealth_number || '—'} · HDMF:{' '}
            {employee.pagibig_number || '—'}
          </small>
        </div>
      </section>

      <section className="payslip-document__summary">
        <div>
          <span>Gross income</span>
          <strong>{formatCurrency(totals.gross_income)}</strong>
        </div>
        <div>
          <span>Total deductions</span>
          <strong>{formatCurrency(totals.total_deductions)}</strong>
        </div>
        <div className="payslip-document__net">
          <span>NET PAY</span>
          <strong>{formatCurrency(totals.net_pay)}</strong>
        </div>
      </section>

      <section className="payslip-document__columns">
        <div className="payslip-document__section">
          <div className="payslip-document__section-title">
            <h3>Earnings</h3>
            <strong>{formatCurrency(totals.gross_income)}</strong>
          </div>
          <LineItems
            items={snapshot.earnings}
            emptyText="No earning line items were recorded."
          />
        </div>

        <div className="payslip-document__section">
          <div className="payslip-document__section-title">
            <h3>Deductions</h3>
            <strong>{formatCurrency(totals.total_deductions)}</strong>
          </div>
          <LineItems
            items={[...snapshot.deductions, ...snapshot.contributions]}
            emptyText="No deduction line items were recorded."
          />
        </div>
      </section>

      <section className="payslip-document__attendance">
        <h3>Attendance summary</h3>
        <div>
          <span>Paid days<strong>{attendance.paid_days}</strong></span>
          <span>Absent days<strong>{attendance.absent_days}</strong></span>
          <span>Paid leave<strong>{attendance.paid_leave_days}</strong></span>
          <span>Unpaid leave<strong>{attendance.unpaid_leave_days}</strong></span>
          <span>Regular hours<strong>{attendance.regular_hours}</strong></span>
          <span>Overtime hours<strong>{attendance.overtime_hours}</strong></span>
          <span>Late minutes<strong>{attendance.late_minutes}</strong></span>
          <span>Undertime<strong>{attendance.undertime_minutes}</strong></span>
        </div>
      </section>

      {(snapshot.employer_contributions.length > 0 || snapshot.loan_balances.length > 0) && (
        <section className="payslip-document__columns payslip-document__columns--secondary">
          <div className="payslip-document__section">
            <div className="payslip-document__section-title">
              <h3>Employer contributions</h3>
              <strong>{formatCurrency(totals.employer_contributions)}</strong>
            </div>
            <LineItems
              items={snapshot.employer_contributions.map((item) => ({
                ...item,
                amount: item.employer_amount || item.amount,
              }))}
              emptyText="No employer contribution records."
            />
          </div>
          <div className="payslip-document__section">
            <div className="payslip-document__section-title">
              <h3>Remaining loan balances</h3>
            </div>
            {snapshot.loan_balances.length === 0 ? (
              <div className="payslip-document__empty">No active payroll loan balances.</div>
            ) : (
              <table className="payslip-document__table">
                <thead>
                  <tr>
                    <th>Loan</th>
                    <th>Reference</th>
                    <th className="payslip-document__amount">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.loan_balances.map((loan) => (
                    <tr key={loan.loan_id}>
                      <td>{loan.deduction_name}</td>
                      <td>{loan.loan_number}</td>
                      <td className="payslip-document__amount">
                        {formatCurrency(loan.outstanding_balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      <footer className="payslip-document__footer">
        <p>
          {company.payslip_footer ||
            'This is a system-generated payslip. Contact Payroll for questions.'}
        </p>
        <p>
          Reference: <strong>{payslip.reference_number}</strong> · Generated:{' '}
          {formatDate(snapshot.generated_at)}
        </p>
      </footer>
    </article>
  );
}
