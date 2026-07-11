import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PayslipDocument from '../../../components/payslips/PayslipDocument';
import type { Payslip } from '../../../models/Payslip';
import { formatDateTime, safeFileName } from './payslip-utils';

export default function PayslipDetailsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [actor, setActor] = useState('Payroll Administrator');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const result = await window.api.payslip.get(id);
      if (!result) throw new Error('Payslip was not found.');
      setPayslip(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load the payslip.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function togglePublication() {
    if (!payslip) return;
    const publish = payslip.status !== 'published';
    if (!window.confirm(`${publish ? 'Publish' : 'Unpublish'} this payslip?`)) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const updated = publish
        ? await window.api.payslip.publish(payslip.id, actor)
        : await window.api.payslip.unpublish(payslip.id, actor);
      setPayslip(updated);
      setMessage(`Payslip ${publish ? 'published' : 'unpublished'} successfully.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to change publication status.');
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf() {
    if (!payslip) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await window.api.payslip.exportPdf(
        payslip.id,
        safeFileName(`${payslip.reference_number}-${payslip.employee_name}`),
        actor,
      );
      if (result.saved) {
        setMessage(`PDF saved${result.filePath ? ` to ${result.filePath}` : ''}.`);
        await load();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save the PDF.');
    } finally {
      setBusy(false);
    }
  }

  async function removePayslip() {
    if (!payslip || payslip.status === 'published') return;
    if (!window.confirm('Delete this draft payslip? This cannot be undone.')) return;
    setBusy(true);
    try {
      await window.api.payslip.delete(payslip.id);
      navigate('/admin/payslips');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to delete the payslip.');
      setBusy(false);
    }
  }

  if (loading) {
    return <section className="payslip-page"><div className="payslip-empty">Loading payslip…</div></section>;
  }

  if (!payslip) {
    return (
      <section className="payslip-page">
        <div className="payslip-alert payslip-alert--error">{error || 'Payslip was not found.'}</div>
        <Link to="/admin/payslips">Back to payslips</Link>
      </section>
    );
  }

  return (
    <section className="payslip-page payslip-detail-page">
      <div className="payslip-heading payslip-no-print">
        <div>
          <span>Reference {payslip.reference_number}</span>
          <h1>{payslip.employee_name}</h1>
          <p>{payslip.period_name} · payment date {payslip.payment_date}</p>
        </div>
        <div className="payslip-heading__actions">
          <Link className="payslip-button payslip-button--secondary" to="/admin/payslips">Back</Link>
          <button type="button" className="payslip-button payslip-button--secondary" onClick={() => window.print()}>
            Print
          </button>
          <button type="button" className="payslip-button payslip-button--secondary" disabled={busy} onClick={() => void downloadPdf()}>
            Download PDF
          </button>
          <button type="button" className="payslip-button" disabled={busy} onClick={() => void togglePublication()}>
            {payslip.status === 'published' ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </div>

      <div className="payslip-no-print payslip-admin-toolbar">
        <label className="payslip-field">
          <span>Action performed by</span>
          <input value={actor} onChange={(event) => setActor(event.target.value)} />
        </label>
        {payslip.status === 'draft' && (
          <button type="button" className="payslip-link-button payslip-link-button--danger" disabled={busy} onClick={() => void removePayslip()}>
            Delete draft
          </button>
        )}
      </div>

      {error && <div className="payslip-alert payslip-alert--error payslip-no-print">{error}</div>}
      {message && <div className="payslip-alert payslip-alert--success payslip-no-print">{message}</div>}

      <PayslipDocument payslip={payslip} />

      <div className="payslip-audit-grid payslip-no-print">
        <div className="payslip-panel">
          <div className="payslip-panel__header"><div><h2>Action history</h2><p>Generation and publication audit trail.</p></div></div>
          {!payslip.actions?.length ? (
            <div className="payslip-empty">No action history.</div>
          ) : (
            <ul className="payslip-timeline">
              {payslip.actions.map((action) => (
                <li key={action.id}>
                  <strong>{action.action.replace(/-/g, ' ')}</strong>
                  <span>{action.actor || 'System'} · {formatDateTime(action.created_at)}</span>
                  {action.notes && <small>{action.notes}</small>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="payslip-panel">
          <div className="payslip-panel__header"><div><h2>Download history</h2><p>Saved PDF audit records.</p></div></div>
          {!payslip.downloads?.length ? (
            <div className="payslip-empty">This payslip has not been downloaded.</div>
          ) : (
            <ul className="payslip-timeline">
              {payslip.downloads.map((download) => (
                <li key={download.id}>
                  <strong>{download.downloaded_by || 'Payroll User'}</strong>
                  <span>{formatDateTime(download.downloaded_at)}</span>
                  {download.file_path && <small title={download.file_path}>{download.file_path}</small>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
