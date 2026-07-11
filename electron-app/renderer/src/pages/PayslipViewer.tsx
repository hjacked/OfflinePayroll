import type { Payslip } from '../models/Payslip';

export default function PayslipViewer({ payslip }: { payslip?: Payslip }) {
  if (!payslip) {
    return <p>Select a payslip to view.</p>;
  }

  return (
    <section className="card">
      <h2>Payslip</h2>
      <dl className="details-list">
        <div><dt>Gross income</dt><dd>{payslip.gross_income ?? 0}</dd></div>
        <div><dt>Total deductions</dt><dd>{payslip.total_deductions ?? 0}</dd></div>
        <div><dt>Net pay</dt><dd>{payslip.net_pay ?? 0}</dd></div>
      </dl>
      {payslip.breakdown && (
        <pre>{JSON.stringify(payslip.breakdown, null, 2)}</pre>
      )}
    </section>
  );
}
