import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import PayslipDocument from '../../../components/payslips/PayslipDocument';
import type { Payslip } from '../../../models/Payslip';
import { safeFileName } from '../../admin/payslips/payslip-utils';

export default function EmployeePayslipDetailsPage() {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const employeeId = searchParams.get('employee') || '';
  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!id || !employeeId) {
      setError('A valid employee session is required to view this payslip.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await window.api.payslip.employeeGet(id, employeeId);
      if (!result) throw new Error('This published payslip is not available for the selected employee.');
      setPayslip(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load the payslip.');
    } finally {
      setLoading(false);
    }
  }, [employeeId, id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function downloadPdf() {
    if (!payslip) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await window.api.payslip.exportPdf(
        payslip.id,
        safeFileName(`${payslip.reference_number}-${payslip.employee_name}`),
        payslip.employee_name,
      );
      if (result.saved) setMessage('Payslip PDF saved successfully.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to download the payslip PDF.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <section className="payslip-page"><div className="payslip-empty">Loading payslip…</div></section>;
  }

  if (!payslip) {
    return (
      <section className="payslip-page">
        <div className="payslip-alert payslip-alert--error">{error || 'Payslip is unavailable.'}</div>
        <Link to="/employee/payslips">Back to My Payslips</Link>
      </section>
    );
  }

  return (
    <section className="payslip-page payslip-detail-page">
      <div className="payslip-heading payslip-no-print">
        <div>
          <span>Employee self-service</span>
          <h1>{payslip.period_name}</h1>
          <p>Reference {payslip.reference_number}</p>
        </div>
        <div className="payslip-heading__actions">
          <Link className="payslip-button payslip-button--secondary" to="/employee/payslips">Back</Link>
          <button type="button" className="payslip-button payslip-button--secondary" onClick={() => window.print()}>
            Print
          </button>
          <button type="button" className="payslip-button" disabled={busy} onClick={() => void downloadPdf()}>
            {busy ? 'Saving…' : 'Download PDF'}
          </button>
        </div>
      </div>

      {error && <div className="payslip-alert payslip-alert--error payslip-no-print">{error}</div>}
      {message && <div className="payslip-alert payslip-alert--success payslip-no-print">{message}</div>}

      <PayslipDocument payslip={payslip} />
    </section>
  );
}
