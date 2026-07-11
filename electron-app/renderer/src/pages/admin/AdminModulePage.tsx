import {
  getAdminModule,
  type AdminModuleKey,
} from '../../config/adminModules';

interface AdminModulePageProps {
  moduleKey: AdminModuleKey;
}

export default function AdminModulePage({
  moduleKey,
}: AdminModulePageProps) {
  const moduleDefinition = getAdminModule(moduleKey);

  return (
    <section className="admin-page" aria-labelledby={`${moduleKey}-title`}>
      <div className="admin-page-heading">
        <div>
          <span className="admin-page-heading__eyebrow">Admin module</span>
          <h2 id={`${moduleKey}-title`}>{moduleDefinition.label}</h2>
          <p>{moduleDefinition.description}</p>
        </div>
        <span className="admin-status-pill">Route ready</span>
      </div>

      <div className="admin-route-banner">
        <div>
          <strong>Module route is active</strong>
          <span>{moduleDefinition.path}</span>
        </div>
        <p>
          This phase provides the navigation and page structure only. Forms,
          approvals, calculations, and database actions can now be added safely.
        </p>
      </div>

      <div className="admin-section-heading">
        <div>
          <h3>Planned sections</h3>
          <p>These sections will become working screens in the next phase.</p>
        </div>
      </div>

      <div className="admin-feature-grid">
        {moduleDefinition.features.map((feature, index) => (
          <article className="admin-feature-card" key={feature}>
            <span className="admin-feature-card__number">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h3>{feature}</h3>
            <p>Page shell prepared. Business rules and local data wiring are pending.</p>
          </article>
        ))}
      </div>
    </section>
  );
}
