# Conformité facturation électronique — pourquoi le code seul ne suffit pas

Contrairement à la transcription audio (compte Groq + clé API, 10 minutes)
ou à l'envoi d'email (compte Resend + clé API, 10 minutes), la conformité
facturation électronique ne se débloque pas avec une simple inscription en
ligne. Voici pourquoi, et la démarche réelle à suivre.

## Pourquoi c'est différent

Émettre une facture électroniquement conforme à la réforme française
suppose de passer par une **Plateforme de Dématérialisation Partenaire**
(PDP), agréée par l'administration fiscale. Deux options :

1. **Devenir soi-même PDP** — immatriculation DGFiP, audits de sécurité,
   interconnexion technique avec le Portail Public de Facturation, garantie
   financière. Hors de portée pour un produit qui démarre — écarté depuis
   le début de ce projet.
2. **Se brancher sur une PDP existante déjà agréée** — c'est l'option
   retenue. Mais l'accès à leur API de masse (pas juste un compte
   utilisateur individuel) passe presque toujours par une **candidature
   partenaire**, pas une simple clé API en self-service.

## La démarche concrète, dans l'ordre

1. **Choisir une PDP à approcher.** Options à comparer : Pennylane (déjà
   étudié dans ce projet — candidature partenaire via leur formulaire
   développeur), ou d'autres PDP généralistes (Chorus Pro pour le secteur
   public n'est pas pertinent ici, c'est le B2B qui compte — regarder
   Tiime, Cegid, ou des PDP pure players spécialisées facturation
   électronique).
2. **Déposer une candidature partenaire/développeur** auprès du fournisseur
   choisi — décrire NOVA, le volume attendu, l'usage prévu.
3. **Attendre la validation et l'obtention d'identifiants OAuth** — délai
   variable selon le fournisseur, à anticiper (ce n'est pas instantané,
   contrairement à Groq/Resend).
4. **Une fois les identifiants obtenus**, implémenter `EInvoicingConnector`
   (voir `lib/einvoicing/types.ts`) pour ce fournisseur spécifique — la
   structure est prête, il ne manque que l'implémentation liée à leurs
   identifiants réels.

## Ce que je ne peux pas faire à ta place

Je ne peux pas créer de compte partenaire, signer un accord commercial, ni
obtenir des identifiants d'API en ton nom — ce sont des démarches qui
engagent l'entreprise de ton ami, pas des lignes de code. Ce que le code
peut faire : être prêt à recevoir ces identifiants dès qu'ils existent,
sans qu'aucune autre partie du produit n'ait à changer.

## En attendant

Ne présente jamais la conformité facturation électronique comme active dans
une démo commerciale. `getEInvoicingConnector()` lève volontairement une
erreur explicite plutôt que de simuler un succès — c'est voulu, pour qu'il
soit techniquement impossible d'afficher par erreur "facture envoyée en
conformité" alors que rien n'est réellement connecté.
