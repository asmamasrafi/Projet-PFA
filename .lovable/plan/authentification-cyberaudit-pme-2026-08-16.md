# Authentification CyberAudit PME

## Objectif
Bouton « Se connecter » en vert émeraude (cohérent avec le reste du site) et un vrai parcours d'inscription / connexion sur une page dédiée `/auth`, avec deux profils : PME et Auditeur.

## 1. Barre de navigation
- Le bouton « Se connecter » passe en vert émeraude plein (fond `primary`, texte clair), avec ombre douce et léger soulèvement au survol.
- Le menu déroulant garde ses deux options, mais elles mènent désormais à la page d'authentification :
  - Espace PME → `/auth?role=pme`
  - Espace Auditeur → `/auth?role=auditeur`

## 2. Page `/auth` (dédiée, plein écran)
Mise en page en deux colonnes : visuel + bénéfices à gauche (fond vert profond `surface-ink`), formulaire à droite sur fond clair. Responsive : une seule colonne sur mobile.

- Onglets « Connexion » / « Inscription ».
- Sélecteur de profil : PME ou Auditeur.
- Connexion : email + mot de passe, lien « Mot de passe oublié » (+ page `/reset-password`).
- Google sign-in disponible en complément de l'email/mot de passe.

### Inscription PME — assistant en 2 étapes
Étape 1 — Votre compte
- Prénom, Nom
- Email professionnel (avertissement doux si gmail/yahoo)
- Mot de passe + confirmation, avec indicateur de force
- Fonction / Poste

Étape 2 — Votre entreprise
- Nom de l'entreprise
- Secteur d'activité (liste : Industrie, Santé, Finance, Commerce, Services, Transport/Logistique, Éducation, Tourisme, Agroalimentaire, Autre)
- Taille (1-10, 11-50, 51-200, 200+)
- Région / Ville (optionnel, régions du Maroc)

Barre de progression, bouton Retour, validation champ par champ.

### Inscription Auditeur
- Prénom, Nom
- Email institutionnel
- Entité d'appartenance (boutons radio : CMRPI, AUSIM, ADD, Autre cabinet)
- Code d'agrément (vérifié côté serveur ; sans code valide, pas de compte auditeur)
- Mot de passe + confirmation

## 3. Backend (Lovable Cloud)
Activation de Lovable Cloud pour gérer réellement les comptes.

- `profiles` : identité + poste, lié au compte utilisateur.
- `companies` (ou colonnes entreprise sur le profil PME) : nom, secteur, taille, région.
- `auditor_profiles` : entité d'appartenance, statut de validation.
- `user_roles` (table séparée, énumération `pme` / `auditor` / `admin`) : les rôles ne sont jamais stockés sur le profil, pour éviter toute élévation de privilèges.
- Le code d'agrément auditeur est un secret serveur : la vérification et l'attribution du rôle auditeur se font côté serveur, jamais dans le navigateur.
- Row Level Security activée partout : chacun ne lit et modifie que ses propres données.

## 4. Après connexion
- Le bouton de la navbar reflète l'état de session : quand l'utilisateur est connecté, il affiche son compte avec un menu (Mon espace, Se déconnecter).
- Espace protégé `/espace` : page d'accueil simple confirmant le profil, prête à recevoir l'évaluation plus tard.

## Détails techniques
- Route publique `src/routes/auth.tsx` + `src/routes/reset-password.tsx`, espace protégé sous `src/routes/_authenticated/`.
- Validation Zod côté client et côté serveur.
- Création du profil / entreprise via server functions (`createServerFn`), pas depuis le navigateur.
- Confirmation d'email : par défaut, l'utilisateur reçoit un email de confirmation avant d'être connecté (je peux activer la connexion immédiate si vous préférez).
- Métadonnées SEO propres sur `/auth`, aucune couleur bleue, palette émeraude/stone conservée.
