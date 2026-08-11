# NOVA — Brief permanent

À relire intégralement avant de toucher quoi que ce soit, à chaque session.

## Identité visuelle NOVA v7

- **Palette** : fond `#FAFAFA`, teal `#14594A`, amber `#C98A2B`, ink `#14181C`
- **Typographies** : Manrope (titres, chiffres, weight 700-800), Inter (corps,
  labels), IBM Plex Mono (badges, timestamps, codes)
- **Grille** : multiples de 8px uniquement pour padding/margin/gap
- **Ombres** : `box-shadow: 0 1px 3px rgba(0,0,0,0.06)` sur les cards, jamais
  plus lourd sauf modales
- **Transitions** : 150ms ease sur couleurs/fonds, 100ms sur transforms
- **Border-radius** : 8px sur les cards, 6px sur les boutons, 4px sur les
  badges

### Tokens CSS (`app/globals.css`)

- Espacement (8px grid) : `--nova-space-1: 8px`, `--nova-space-2: 16px`,
  `--nova-space-3: 24px`, `--nova-space-4: 32px`, `--nova-space-5: 40px` —
  toujours utiliser ces variables pour padding/margin/gap, jamais une valeur
  en dur
- Rayons : `--nova-radius-card: 8px`, `--nova-radius-btn: 6px`,
  `--nova-radius-badge: 4px`
- Ombre : `--nova-shadow-card: 0 1px 3px rgba(0,0,0,0.06)`
- Transitions : `--nova-transition-color: 150ms ease`,
  `--nova-transition-transform: 100ms ease`
- Couleurs : `--nova-bg`, `--nova-surface`, `--nova-border`, `--nova-ink`,
  `--nova-ink-soft`, `--nova-ink-faint`, `--nova-teal`, `--nova-teal-deep`,
  `--nova-teal-tint`, `--nova-amber`, `--nova-amber-tint`, `--nova-success`,
  `--nova-success-tint`, `--nova-danger`, `--nova-danger-tint`
- Polices : `--nova-font-sans` (Inter), `--nova-font-heading` (Manrope),
  `--nova-font-mono` (IBM Plex Mono)

## Composants — règles non négociables

- Toujours utiliser `components/ui.tsx`, jamais créer de styles inline ad hoc
  dans les pages
- Icônes : `lucide-react` uniquement, jamais d'emoji comme icône UI
- Skeleton loaders sur toutes les données chargées depuis l'API — jamais
  afficher 0 ou vide pendant le chargement
- États hover/focus sur tous les éléments interactifs sans exception
- Item actif sidebar : fond teal-wash + barre verticale 3px teal à gauche +
  texte teal

## Architecture — règles non négociables

- Toute route API passe par `lib/ownership.ts` avant toute opération sur des
  données (`requireSession` + `requireBusinessId` + `assertOwnedByBusiness`
  sur update/delete)
- Validation Zod sur tous les endpoints qui reçoivent des données
- Jamais de données simulées dans les pages — toujours les vraies routes API
- Jamais les mots "audit" ou "bilan" dans les textes générés par l'IA
- Recommandations IA toujours formulées en option, jamais en directive

## Scope produit — phase en cours

7 modules validés, à construire dans cet ordre exact, un à la fois, jamais
sans confirmation explicite entre deux :

1. **CRM (clients + chantiers)** — ✅ fait
2. **Devis avec génération IA** — ✅ fait
3. **Facturation (cycle devis → facture)** — ✅ fait
4. **Portail client (lien unique, lecture seule)** — ✅ fait
5. Rapports vocaux terrain (interface)
6. Planning / dispatch équipe
7. Copilote financier (interface)

Hors scope de cette phase, jamais construit mais affiché en grisé dans la
sidebar sous "Bientôt disponible" (badge "Prochainement", jamais cliquable,
jamais de route derrière) : facturation électronique conforme (PDP),
e-signature de devis (Yousign), système téléphonique intégré, WhatsApp
Business, GPS tracking équipe, synchronisation comptable
(Pennylane/QuickBooks).

## Process de travail

- Avant chaque session : relire ce fichier + `git pull`
- Après chaque module : `tsc --noEmit` doit passer, `npm run build` doit
  passer
- Jamais committer `node_modules`, `.env`, `.next`
- Un module à la fois — ne jamais commencer le suivant sans confirmation
  explicite
- Capturer une preview visuelle avant chaque commit de changement UI
