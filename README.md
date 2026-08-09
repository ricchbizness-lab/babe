# Nova — socle opérationnel + rapports vocaux + copilote financier

Reconstruction propre du starter initial. Ce dépôt couvre les **Phase 0, 1,
2 et 3** de `NOVA_Brief_Technique_v3.md` — y compris les rapports vocaux
terrain et le copilote financier, construits directement plutôt qu'après
validation terrain (choix produit assumé, voir échange avec le porteur du
projet).

## ⚠️ Ce qui est réellement prêt vs ce qui nécessite une action avant vente

**Prêt pour un usage réel :**
- Socle CRM/devis/facturation/tâches (Phase 0 + 1)
- Rapports vocaux terrain — **mode démo (texte) et mode production (audio
  réel via Groq Whisper)** fonctionnels, il suffit d'ajouter `GROQ_API_KEY`
- Registre d'activité (faits réels, jamais une auto-évaluation)
- Copilote conversationnel (tool-calling réel sur les données de l'entreprise)
- **Envoi du rapport stratégique par email** (via Resend), techniquement
  impossible sans renseigner qui l'a relu — voir `app/api/strategic-reports/[id]/route.ts`

**Nécessite une action humaine avant d'être vendu comme fonctionnel :**
- **Conformité facturation électronique** : contrairement aux deux points
  ci-dessus, ceci ne se débloque pas avec une simple clé API — voir
  `README_EINVOICING.md` pour la démarche réelle (candidature partenaire
  auprès d'une Plateforme Agréée, délai non instantané)
- **Rapport stratégique — la relecture humaine reste une réalité à
  organiser**, pas juste un champ technique : le code empêche l'envoi sans
  `reviewedBy`, mais trouver et payer un comptable partenaire réel pour
  cette relecture reste une démarche business, non résolue par le code
- **Cadre légal des rapports vocaux terrain** : le code respecte les
  garde-fous produit (pas de scoring individuel) mais l'information des
  salariés et la validation juridique complète restent à faire avant un
  vrai déploiement

## Ce qui est corrigé par rapport au premier prototype

- **Faille IDOR corrigée par construction** (`lib/ownership.ts`)
- Route NextAuth au bon emplacement, pages login/register/onboarding
- Rate limiting sur register, agent, copilot, voice-reports, diagnostic
- Validation Zod systématique
- Pagination sur les listes
- Entrées utilisateur jamais interpolées dans le system prompt de l'IA
- Adapter Prisma retiré de NextAuth (inutile et risqué avec Credentials + JWT)
- **Garde-fous de langage codés en dur**, pas seulement documentés : le
  copilote et le rapport stratégique ont pour instruction système explicite
  de ne jamais utiliser "audit"/"bilan", de toujours formuler une
  recommandation comme une option, jamais une directive

## Nouveaux modules (Phase 2 et 3)

| Route | Rôle |
|---|---|
| `POST /api/diagnostic` | Diagnostic gratuit public, sans authentification |
| `GET /api/registre` | Registre d'activité réel de l'entreprise connectée |
| `POST /api/copilot` | Copilote conversationnel, tool-calling sur données réelles |
| `POST /api/voice-reports` | Rapport vocal terrain (mode démo texte ou audio) |
| `POST /api/strategic-reports` | Génère un brouillon de rapport stratégique |
| `PATCH /api/strategic-reports/[id]` | Passe un rapport en relecture (jamais en envoyé sans reviewedBy) |

## Ce qui reste à faire avant une mise en production réelle

- Pooling de connexions Prisma pour serverless
- Remplacer le rate limiting mémoire par Upstash Redis
- Brancher un vrai fournisseur de transcription audio
- Tests automatisés, CI/CD
- Conformité facturation électronique
- RGPD, CGU/CGV, mentions légales, validation juridique des rapports vocaux

## Installation

```bash
npm install
cp .env.example .env   # puis remplir les variables

npx prisma migrate dev --name init
npm run dev
```

## Structure

```
app/
  api/            Routes API (chaque route protégée passe par lib/ownership.ts)
  login/ register/ onboarding/ dashboard/   Pages
lib/
  ownership.ts       Couche d'autorisation centralisée — lire en premier
  auth.ts            Configuration NextAuth
  rateLimit.ts        Rate limiting (implémentation mémoire, à faire évoluer)
  validation.ts        Schémas Zod
  anthropic.ts         Appel Claude, construction du system prompt
  stripe.ts            Configuration Stripe
  registre.ts          Registre d'activité — calculs sur données réelles uniquement
  diagnostic.ts        Estimation qualitative pré-inscription
  transcription.ts      Interface de transcription audio — à brancher
  copilotTools.ts        Outils du copilote + garde-fous de langage
prisma/
  schema.prisma   Modèle de données complet (socle + rapports vocaux + rapports stratégiques)
```
