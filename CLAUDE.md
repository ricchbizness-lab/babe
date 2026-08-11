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

## Process de travail

- Avant chaque session : relire ce fichier + `git pull`
- Après chaque module : `tsc --noEmit` doit passer, `npm run build` doit
  passer
- Jamais committer `node_modules`, `.env`, `.next`
- Un module à la fois — ne jamais commencer le suivant sans confirmation
  explicite
- Capturer une preview visuelle avant chaque commit de changement UI
