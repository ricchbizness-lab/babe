"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui";

export type OnboardingData = {
  completed: boolean;
  clientsCount: number;
  devisCount: number;
  projectsCount: number;
  teamMembersCount: number;
};

export function OnboardingWizardBanner({
  onboarding,
  onHide,
  hiding,
}: {
  onboarding: OnboardingData;
  onHide: () => void;
  hiding: boolean;
}) {
  const steps = [
    { id: 1, label: "Profil créé", done: true, href: null as string | null, cta: null as string | null },
    {
      id: 2,
      label: "Ajouter votre premier client",
      done: onboarding.clientsCount > 0,
      href: "/dashboard/clients/nouveau",
      cta: "Ajouter un client",
    },
    {
      id: 3,
      label: "Créer votre premier devis",
      done: onboarding.devisCount > 0,
      href: "/dashboard/devis/nouveau",
      cta: "Créer un devis",
    },
    {
      id: 4,
      label: "Créer votre premier chantier",
      done: onboarding.projectsCount > 0,
      href: "/dashboard/chantiers/nouveau",
      cta: "Créer un chantier",
    },
    {
      id: 5,
      label: "Inviter un collaborateur",
      done: onboarding.teamMembersCount > 0,
      href: "/dashboard/equipe",
      cta: "Inviter",
    },
  ];

  return (
    <div className="nova-onboarding-banner">
      <div className="nova-onboarding-banner-header">
        <div>
          <h2 className="nova-onboarding-banner-title">Bienvenue sur Nova</h2>
          <p className="nova-page-subtitle">Quelques étapes pour démarrer votre activité sur la plateforme.</p>
        </div>
        <Button variant="ghost" onClick={onHide} disabled={hiding}>
          {hiding ? "..." : "Masquer ce guide"}
        </Button>
      </div>
      <div className="nova-onboarding-steps">
        {steps.map((step) => (
          <div key={step.id} className={`nova-onboarding-step ${step.done ? "nova-onboarding-step-done" : ""}`}>
            <span className="nova-onboarding-step-top">
              <span className="nova-onboarding-step-marker">
                {step.done ? <CheckCircle2 size={20} strokeWidth={1.75} /> : step.id}
              </span>
              <span className="nova-onboarding-step-label">{step.label}</span>
            </span>
            {!step.done && step.href && (
              <Link href={step.href} className="nova-btn nova-btn-secondary nova-onboarding-step-cta">
                {step.cta}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
