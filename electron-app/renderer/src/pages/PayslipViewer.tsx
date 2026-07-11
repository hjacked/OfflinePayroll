import type { Payslip } from '../models/Payslip';

export default function PayslipViewer({ payslip }: { payslip?: Payslip }) {
  if (!payslip) {
    return <p>Select a payslip to view.</p>;
  }

  return (
    <section>
      <h3>{payslip.period_name || 'Payslip'}</h3>
      <pre>{JSON.stringify(payslip.snapshot || payslip, null, 2)}</pre>
    </section>
  );
}
