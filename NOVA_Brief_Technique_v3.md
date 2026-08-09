# Brief technique — NOVA plateforme tout-en-un (v3)

Remplace les briefs précédents. À donner intégralement à Claude Code, avec
`NOVA_Concept_v4_Plateforme.md` en pièce jointe pour le contexte produit.

## Phase 0 — Socle technique et sécurité (préalable non négociable)

Le code de départ (starter Next.js/Prisma/NextAuth/Stripe/Claude) contient
une faille de sécurité critique et des briques manquantes. Avant toute
nouvelle fonctionnalité :
- Corriger la faille d'autorisation (IDOR) sur les endpoints tasks/documents
  — vérifier l'appartenance à l'entreprise avant modification/suppression
- Corriger le placement de la route NextAuth
  (`app/api/auth/[...nextauth]/route.ts`)
- Construire les pages login/register manquantes
- Ajouter un rate limiting sur register, login, et tout endpoint IA
- Pooling de connexions Prisma pour l'environnement serverless

## Phase 1 — Socle opérationnel (priorité de développement, pas de MVP concierge)

Ce socle est directement inspiré d'un modèle déjà validé par le marché
(BrainO, 2000+ clients payants aux US) — l'enjeu est l'exécution et la
localisation française, pas la validation du concept.

- **CRM** : fiches client, fiches chantier, historique des échanges
- **Devis et facturation conformes** : génération de devis, transformation
  en facture, **conformité native à la réforme facturation électronique**
  (réception obligatoire dès septembre 2026, émission dès septembre 2027)
  - Architecture obligatoire : connexion à une Plateforme Agréée existante
    via API, jamais développement d'un statut de Plateforme Agréée en propre
  - Couche d'abstraction entre le produit et le fournisseur de facturation
    électronique choisi — remplacer un connecteur ne doit jamais nécessiter
    de refaire le produit
- **Planning et dispatch** : calendrier drag-and-drop, affectation d'équipe
  aux chantiers
- **Portail client** : le client final consulte l'avancement de son chantier
  (lecture seule, lien unique ou compte léger)
- **Facturation Stripe à plat par entreprise**, pas par utilisateur — voir
  grille tarifaire dans le document concept, avec un nombre de collaborateurs
  inclus par palier et un coût marginal au-delà

## Phase 2 — Rapports terrain vocaux

- Upload ou enregistrement direct d'un message vocal depuis mobile
- Transcription + traduction si besoin + résumé structuré (via l'API
  Anthropic, appel serveur uniquement comme le reste du produit)
- Rapport routé vers le dirigeant ou le chef de chantier assigné à ce
  chantier — vérifier l'appartenance chantier/entreprise avant tout accès
  (même discipline d'autorisation que la Phase 0)
- Ne jamais construire de fonctionnalité de notation ou de scoring de la
  performance individuelle à partir de ces rapports — uniquement un résumé
  d'activité, jamais un outil d'évaluation RH

## Phase 3 — Copilote financier NOVA (MVP concierge avant automatisation)

**Ne pas coder cette phase avant que 5-10 clients de la Phase 1 aient
confirmé vouloir payer pour une version faite à la main du diagnostic et du
suivi.** Une fois la demande validée :

- Diagnostic gratuit (questionnaire, sans connexion de données)
- Connecteur en lecture seule vers l'outil comptable du client (architecture
  multi-fournisseur dès le départ : Pennylane, Tiime, import CSV en secours)
- Registre d'activité (ex-VCN) : uniquement des faits traçables stockés en
  base NOVA, jamais recalculés uniquement via un appel API en temps réel —
  l'historique doit survivre à une coupure d'accès fournisseur
- Refactorer l'agent IA en tool-calling avant de construire le module
  conversationnel (élimine aussi le risque d'injection de prompt identifié
  dans l'audit initial) — outils exposés : lecture du registre d'activité,
  lecture des indicateurs du diagnostic, jamais d'action d'écriture externe
  sans validation explicite de l'utilisateur
- Rapport stratégique annuel : généré par NOVA, jamais envoyé sans relecture
  humaine par un comptable partenaire payé à la mission (pas de workflow
  automatique d'envoi direct au client sur ce livrable spécifique)

## Points de vigilance transverses, valables sur toutes les phases

- Aucun texte produit (interface, emails, rapports) n'utilise les mots
  "audit" ou "bilan" pour un livrable NOVA — toujours "diagnostic" ou
  "rapport de synthèse"
- Aucune recommandation IA formulée comme une directive isolée — toujours
  accompagnée de la donnée sous-jacente et formulée en option
- Toute nouvelle intégration externe passe par une couche d'abstraction —
  jamais d'appel direct à une API tierce dans la logique métier

## Ce qui doit être validé par un humain, hors code

- Conditions réelles d'accès à une Plateforme Agréée pour la Phase 1
- Cadre légal des rapports vocaux terrain (droit du travail, RGPD) avant la
  Phase 2
- Formulation du rapport stratégique annuel validée par un professionnel du
  droit ou de la comptabilité avant la Phase 3
- Test de demande réelle (Phase 3) avant tout développement de cette couche
