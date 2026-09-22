import { Breadcrumb, EmptyState } from "@/components/ui";

export default function AidePage() {
  return (
    <div className="nova-page">
      <Breadcrumb items={[{ label: "Aide & support" }]} />
      <header className="nova-page-header">
        <h1>Aide & support</h1>
      </header>
      <EmptyState title="Section à venir" description="Le centre d'aide NOVA sera bientôt disponible ici." />
    </div>
  );
}
