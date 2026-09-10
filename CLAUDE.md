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
  `--nova-success-tint`, `--nova-danger`, `--nova-danger-tint`,
  `--nova-linen-deep` (fond des bulles Nova du copilote)
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

## RÈGLES UX/UI OBLIGATOIRES

Ces règles s'appliquent à CHAQUE ligne de code écrite, pas seulement quand
elles sont rappelées.

### Principe fondamental

Avant de livrer n'importe quelle page ou composant, se poser cette
question : "Un artisan qui ouvre cette page pour la première fois sur son
téléphone peut-il comprendre et utiliser ce qu'il voit en moins de
10 secondes ?" Si la réponse est non, corriger avant de committer.

### Texte et contenu généré par IA

- Jamais de texte en bloc continu — toujours `white-space: pre-wrap` sur les
  zones de contenu IA
- Le prompt IA doit toujours demander des bullet points avec tirets pour les
  listes de prestations
- Jamais de `[À COMPLÉTER]` visible dans l'interface

### Formulaires et saisie

- Tous les champs de date doivent accepter la saisie manuelle (jj/mm/aaaa)
  EN PLUS du calendrier visuel
- Le calendrier visuel s'ouvre toujours vers le haut si l'espace en bas est
  insuffisant (vérifier avec `getBoundingClientRect`)
- Chaque formulaire doit être utilisable sur mobile sans scroll horizontal
- Les champs obligatoires sont marqués d'un astérisque
- Les messages d'erreur apparaissent sous le champ concerné, jamais en haut
  de page uniquement

### Navigation et liens

- Chaque élément dans une liste doit être cliquable vers sa fiche détail —
  jamais une liste sans lien
- Les boutons d'action (Modifier, Supprimer, Voir) sont toujours visibles ou
  accessibles au hover, jamais cachés sans raison
- Toujours un bouton de retour ou un breadcrumb sur les pages de détail
- Les actions destructives (Supprimer) toujours avec ConfirmModal — jamais
  directes

### États et feedback

- Toujours un skeleton loader pendant le chargement
- Toujours un état vide soigné (icône + titre + description + bouton
  d'action) quand une liste est vide
- Toujours un toast de confirmation après une action
- Les boutons se désactivent pendant une requête en cours (protection
  double-clic)
- Si une fonctionnalité n'est pas encore développée : placeholder soigné
  avec badge "Prochainement" et description de ce que ça fera — jamais une
  page blanche ou un message vague

### Responsive et mobile

- Tester mentalement chaque page sur 375px de large avant de committer
- Les tableaux sur mobile : scroll horizontal dans leur container, jamais
  sur toute la page
- Les modales : padding adapté sur mobile, jamais plus larges que l'écran
- Les calendriers et dropdowns : toujours dans le viewport, jamais coupés

### Cohérence visuelle

- Utiliser systématiquement les composants existants dans
  `components/ui.tsx` — jamais de styles ad hoc dans les pages
- Les badges de statut : toujours les mêmes couleurs pour les mêmes statuts
  sur toutes les pages
- Les icônes : toujours Lucide, jamais d'emoji comme icône d'interface
- La typographie : Manrope pour les chiffres et titres importants, Inter
  pour le corps, IBM Plex Mono pour les références et timestamps

### Données et contenu

- Jamais afficher "0" ou vide pendant le chargement — skeleton loader à la
  place
- Les montants : toujours formatés avec séparateurs (1 000 € pas 1000€)
- Les dates : toujours en français (09/09/2026 ou "il y a 3 jours" selon le
  contexte)
- Les listes paginées : toujours indiquer le total ("Affichage de 1 à 10
  sur 32 éléments")

### Ce qu'il faut faire après chaque feature

Avant de committer n'importe quelle page :
1. Vérifier que tous les liens fonctionnent
2. Vérifier l'état vide (que se passe-t-il si il n'y a pas de données ?)
3. Vérifier le comportement sur mobile (375px)
4. Vérifier que les formulaires fonctionnent du début à la fin
5. Vérifier que les toasts s'affichent correctement

## Scope produit — phase en cours

7 modules validés, à construire dans cet ordre exact, un à la fois, jamais
sans confirmation explicite entre deux :

1. **CRM (clients + chantiers)** — ✅ fait
2. **Devis avec génération IA** — ✅ fait
3. **Facturation (cycle devis → facture)** — ✅ fait
4. **Portail client (lien unique, lecture seule)** — ✅ fait
5. **Rapports vocaux terrain (interface)** — ✅ fait
6. **Planning / dispatch équipe** — ✅ fait
7. **Copilote financier (interface)** — ✅ fait

Les 7 modules du scope produit sont désormais tous construits.

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
