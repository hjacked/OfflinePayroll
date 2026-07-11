import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { PayrollPeriodInput } from '../../../models/PayrollPeriod';
import { periodName, today } from './payroll-utils';

const initialForm: PayrollPeriodInput = {
  name: '',
  start_date: '',
  end_date: '',
  payment_date: today(),
  frequency: 'semimonthly',
  notes: '',
  workdays_per_month: 22,
  hours_per_day: 8,
  overtime_multiplier: 1.25,
  night_differential_rate: 0.10,
  created_by: 'Payroll Officer',
};

export default function PayrollPeriodFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<PayrollPeriodInput>(initialForm);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [defaultPaymentDelayDays, setDefaultPaymentDelayDays] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        if (id) {
          const period = await window.api.payroll.get(id);
          if (!period) throw new Error('Payroll period was not found.');
          setForm({
            name: period.name,
            start_date: period.start_date,
            end_date: period.end_date,
            payment_date: period.payment_date,
            frequency: period.frequency,
            notes: period.notes,
            workdays_per_month: period.workdays_per_month,
            hours_per_day: period.hours_per_day,
            overtime_multiplier: period.overtime_multiplier,
            night_differential_rate: period.night_differential_rate,
            created_by: period.created_by,
          });
          return;
        }

        const defaults = await window.api.settings.payrollDefaults();
        setDefaultPaymentDelayDays(defaults.payment_delay_days);
        setForm((current) => ({
          ...current,
          frequency: defaults.default_frequency,
          workdays_per_month: defaults.workdays_per_month,
          hours_per_day: defaults.hours_per_day,
          overtime_multiplier: defaults.overtime_multiplier,
          night_differential_rate: defaults.night_differential_rate,
        }));
      } catch (caught) {
        if (id) {
          setError(caught instanceof Error ? caught.message : 'Unable to load payroll period.');
        }
        // New payroll periods retain safe built-in defaults when settings cannot be loaded.
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  function update<K extends keyof PayrollPeriodInput>(key: K, value: PayrollPeriodInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleDateChange(key: 'start_date' | 'end_date', value: string) {
    const next = { ...form, [key]: value };
    if (!id && next.start_date && next.end_date) next.name = periodName(next.start_date, next.end_date);
    if (key === 'end_date' && (!form.payment_date || form.payment_date < value)) {
      next.payment_date = addDays(value, defaultPaymentDelayDays);
    }
    setForm(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (id) {
        await window.api.payroll.updatePeriod(id, form);
        navigate(`/admin/payroll/${id}`);
      } else {
        const result = await window.api.payroll.createPeriod(form);
        navigate(`/admin/payroll/${result.period.id}`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save payroll period.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="payroll-empty">Loading payroll period…</div>;

  return (
    <section className="payroll-page">
      <div className="payroll-heading">
        <div><span>Payroll setup</span><h2>{id ? 'Edit Payroll Period' : 'New Payroll Period'}</h2><p>Define the cutoff, payment date, pay frequency, and calculation assumptions.</p></div>
        <Link className="payroll-button" to={id ? `/admin/payroll/${id}` : '/admin/payroll'}>Cancel</Link>
      </div>
      {error && <div className="payroll-alert payroll-alert--error">{error}</div>}
      <form className="payroll-panel payroll-form" onSubmit={submit}>
        <div className="payroll-form-grid">
          <label className="payroll-field--wide">Period name<input value={form.name} onChange={(event) => update('name', event.target.value)} required /></label>
          <label>Start date<input type="date" value={form.start_date} onChange={(event) => handleDateChange('start_date', event.target.value)} required /></label>
          <label>End date<input type="date" value={form.end_date} onChange={(event) => handleDateChange('end_date', event.target.value)} required /></label>
          <label>Payment date<input type="date" value={form.payment_date} onChange={(event) => update('payment_date', event.target.value)} required /></label>
          <label>Frequency<select value={form.frequency} onChange={(event) => update('frequency', event.target.value as PayrollPeriodInput['frequency'])}><option value="weekly">Weekly</option><option value="biweekly">Biweekly</option><option value="semimonthly">Semimonthly</option><option value="monthly">Monthly</option></select></label>
          <label>Workdays per month<input type="number" min="1" step="0.01" value={form.workdays_per_month} onChange={(event) => update('workdays_per_month', Number(event.target.value))} required /></label>
          <label>Hours per day<input type="number" min="1" step="0.01" value={form.hours_per_day} onChange={(event) => update('hours_per_day', Number(event.target.value))} required /></label>
          <label>Overtime multiplier<input type="number" min="0.01" step="0.01" value={form.overtime_multiplier} onChange={(event) => update('overtime_multiplier', Number(event.target.value))} required /></label>
          <label>Night differential rate<input type="number" min="0" step="0.01" value={form.night_differential_rate} onChange={(event) => update('night_differential_rate', Number(event.target.value))} required /><small>Enter 0.10 for 10%.</small></label>
          <label className="payroll-field--wide">Notes<textarea rows={4} value={form.notes} onChange={(event) => update('notes', event.target.value)} /></label>
        </div>
        <div className="payroll-actions"><button className="payroll-button payroll-button--primary" type="submit" disabled={saving}>{saving ? 'Saving…' : id ? 'Save changes' : 'Create payroll period'}</button></div>
      </form>
    </section>
  );
}


function addDays(value: string, days: number): string {
  if (!value) return value;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  date.setDate(date.getDate() + Math.max(0, Math.trunc(days)));
  return date.toISOString().slice(0, 10);
}
