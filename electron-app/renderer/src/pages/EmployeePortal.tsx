export default function EmployeePortal() {
  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>Employee Portal</h1>
          <p>View attendance, leave balances, deductions, and downloadable payslips.</p>
        </div>
      </div>

      <div className="card-grid">
        <article className="card">
          <h2>Timekeeping</h2>
          <p>Daily logs and attendance corrections will appear here.</p>
        </article>
        <article className="card">
          <h2>Leave Management</h2>
          <p>Leave credits, applications, and approval status will appear here.</p>
        </article>
        <article className="card">
          <h2>Payslips</h2>
          <p>Published payroll records and PDF downloads will appear here.</p>
        </article>
      </div>
    </section>
  );
}
