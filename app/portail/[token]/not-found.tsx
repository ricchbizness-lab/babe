export default function PortalNotFound() {
  return (
    <div className="nova-portal">
      <div className="nova-portal-card nova-portal-card-center">
        <h1 className="nova-portal-project">Ce lien n'est plus valide</h1>
        <p className="nova-portal-empty">
          Le lien que vous avez suivi n'existe pas ou n'est plus actif. Contactez votre artisan pour en obtenir un
          nouveau.
        </p>
      </div>
      <footer className="nova-portal-footer">Suivi de chantier par Nova</footer>
    </div>
  );
}
