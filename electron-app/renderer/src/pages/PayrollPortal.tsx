import { FormEvent, useState } from 'react';
import type { PayrollPeriod } from '../models/PayrollPeriod';

const initialForm = {
  name: '',
  start_date: '',
  end_date: '',
  frequency: 'semimonthly',
};

export default function PayrollPortal() {
  const [form, setForm] = useState(initialForm);
  const [createdPeriod, setCreatedPeriod] = useState<PayrollPeriod | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const result = await window.api.payroll.createPeriod(form);
      setCreatedPeriod(result.period);
      setForm(initialForm);
      setMessage('Payroll period created successfully.');
    } catch (reason: unknown) {
      setMessage(reason instanceof Error ? reason.message : 'Unable to create payroll period.');
    } finally {
      setSubmitting(false);
    }
  }

  async function startPayroll() {
    if (!createdPeriod) return;

    setSubmitting(true);
    setMessage(null);
    try {
      const result = await window.api.payroll.run(createdPeriod.id);
      setCreatedPeriod({ ...createdPeriod, status: result.status });
      setMessage('Payroll processing has started.');
    } catch (reason: unknown) {
      setMessage(reason instanceof Error ? reason.message : 'Unable to start payroll.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>Payroll Portal</h1>
          <p>Create, validate, and process payroll periods.</p>
        </div>
      </div>

      <div className="card-grid two-column">
        <form className="card form-grid" onSubmit={handleSubmit}>
          <h2>Create Payroll Period</h2>

          <label>
            Period name
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </label>

          <label>
            Start date
            <input
              type="date"
              value={form.start_date}
              onChange={(event) => setForm({ ...form, start_date: event.target.value })}
              required
            />
          </label>

          <label>
            End date
            <input
              type="date"
              value={form.end_date}
              onChange={(event) => setForm({ ...form, end_date: event.target.value })}
              required
            />
          </label>

          <label>
            Frequency
            <select
              value={form.frequency}
              onChange={(event) => setForm({ ...form, frequency: event.target.value })}
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="semimonthly">Semimonthly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>

          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Create period'}
          </button>
        </form>

        <aside className="card">
          <h2>Current Period</h2>
          {!createdPeriod && <p>Create a payroll period to begin.</p>}
          {createdPeriod && (
            <dl className="details-list">
              <div><dt>Name</dt><dd>{createdPeriod.name}</dd></div>
              <div><dt>Dates</dt><dd>{createdPeriod.start_date} to {createdPeriod.end_date}</dd></div>
              <div><dt>Frequency</dt><dd>{createdPeriod.frequency}</dd></div>
              <div><dt>Status</dt><dd>{createdPeriod.status}</dd></div>
            </dl>
          )}
          {createdPeriod?.status === 'open' && (
            <button type="button" onClick={startPayroll} disabled={submitting}>
              Start payroll
            </button>
          )}
          {message && <p className="status-message" role="status">{message}</p>}
        </aside>
      </div>
    </section>
  );
}
