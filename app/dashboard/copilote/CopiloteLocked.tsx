import Link from "next/link";
import { Bot } from "lucide-react";

export function CopiloteLocked() {
  return (
    <div className="nova-page">
      <div className="nova-locked-screen">
        <Bot size={32} strokeWidth={1.5} className="nova-locked-icon" />
        <h1>Copilote financier</h1>
        <p className="nova-locked-message">Le copilote Nova est disponible à partir du palier Pro.</p>
        <Link href="/dashboard/parametres" className="nova-btn nova-btn-primary">
          Voir les abonnements
        </Link>
      </div>
    </div>
  );
}
