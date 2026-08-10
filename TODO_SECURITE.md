# TODO sécurité — dépendances Next.js

À corriger avant toute exposition publique (démo prospect ou lancement),
pas avant — upgrade Next.js 14 vers 15/16 nécessaire, à tester
intégralement avant de remplacer la version actuelle.

## CVE concernées

Version installée : Next.js 14.2.35. Ces trois CVE sont exploitables sans
configuration optionnelle particulière — l'App Router seul (utilisé partout
dans ce projet) suffit à exposer l'endpoint vulnérable. Impact : déni de
service (CPU/mémoire épuisés, crash serveur) via une requête HTTP forgée,
sans authentification requise. Pas d'atteinte à la confidentialité ni à
l'intégrité des données.

| CVE | GHSA | CVSS | Corrigé dans |
|---|---|---|---|
| CVE-2026-23864 | GHSA-h25m-26qc-wcjf | 7.5 High | 15.0.8+ |
| CVE-2026-23869 | GHSA-q4gf-8mx6-v5v3 | 7.5 High | 15.5.15+ |
| CVE-2026-23870 | GHSA-8h8q-6873-q5fj | 7.5 High | 15.5.16+ |

Aucun correctif n'a été rétroporté sur la branche 14.x — la seule
résolution est un saut de version majeure (14 → 15 ou 16).

## Pourquoi ce n'est pas fait maintenant

- Saut de version majeure = changement cassant potentiel sur l'App Router,
  les routes API et NextAuth — nécessite une passe de tests complète avant
  remplacement, hors scope d'une simple correction de dépendance.
- Aucune de ces CVE ne concerne la confidentialité des données (DoS
  uniquement) — acceptable tant que le produit n'est pas exposé à du trafic
  public non maîtrisé.

## Action avant lancement ou démo prospect

1. Upgrader vers Next.js 15.5.16+ (ou 16.x stable au moment du lancement).
2. Faire tourner `npx tsc --noEmit`, la suite de tests (à créer — voir
   README.md, section tests absents), et un test manuel complet de chaque
   page/route API après l'upgrade.
3. Relancer `npm audit` pour confirmer que les 3 CVE ci-dessus (et la
   vulnérabilité PostCSS associée, transitive à Next.js) ont disparu.
