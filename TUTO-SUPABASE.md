# Comment activer la connexion (Supabase)

Ce guide explique comment brancher la connexion utilisateur (compte
optionnel, par email ou avec Google) qui vient d'être ajoutée dans l'app.
Sans ces étapes, l'écran de connexion s'affiche mais dit juste
« La connexion arrive bientôt » — rien ne casse, l'app continue de marcher
normalement.

Deux parties : la première (compte + email/mot de passe) prend 5 minutes et
suffit pour tester tout de suite. La deuxième (bouton Google) peut attendre.

## Partie 1 — Créer le projet (5 minutes)

### 1. Crée un compte Supabase

Va sur **supabase.com**, clique sur "Start your project", connecte-toi avec
ton compte GitHub ou Google. C'est gratuit pour commencer.

### 2. Crée un nouveau projet

- Clique sur "New project"
- Nom : `flex-timer` (ou ce que tu veux)
- Mot de passe de la base de données : choisis-en un et **garde-le de côté**
  (pas besoin de le redonner à Claude, mais utile si tu dois un jour accéder
  directement à la base)
- Région : choisis la plus proche de toi (Europe si tu es en France)
- Clique sur "Create new project" et attends 1-2 minutes que ça se prépare

### 3. Récupère les deux clés

Une fois le projet prêt :

- Va dans **Project Settings** (icône engrenage, en bas à gauche) → **API**
- Tu vois deux informations à copier :
  - **Project URL** (ressemble à `https://xxxxx.supabase.co`)
  - **anon public** (une longue clé qui commence par `eyJ...`)

⚠️ Ne copie PAS la clé "service_role" (celle-là est secrète, ne la partage
jamais).

### 4. Donne ces deux valeurs à Claude

Colle-les dans le chat, Claude les mettra dans `app.json` à ta place (les
champs `supabaseUrl` et `supabaseAnonKey`). Une fois fait, la connexion par
email + mot de passe fonctionne — Claude pourra l'envoyer par mise à jour
normale (`push-update.cmd`), pas besoin d'un nouvel APK pour ça.

## Partie 2 — Activer le bouton Google (plus tard, quand tu veux)

Cette partie est plus longue (Google demande plus de paperasse). Le bouton
Google est déjà dans l'app, il affichera juste une erreur tant que cette
partie n'est pas faite.

### 1. Crée un identifiant Google

- Va sur **console.cloud.google.com**
- Crée un projet (ou utilise un projet existant)
- Menu **APIs & Services → Credentials**
- Clique sur **Create Credentials → OAuth client ID**
- Type d'application : **Web application**
- Dans "Authorized redirect URIs", ajoute l'URL que Supabase te donne à
  l'étape suivante (elle ressemble à
  `https://xxxxx.supabase.co/auth/v1/callback`) — tu la trouveras dans
  Supabase, Authentication → Providers → Google
- Une fois créé, Google te donne un **Client ID** et un **Client Secret**

### 2. Branche-les dans Supabase

- Dans Supabase : **Authentication → Providers → Google**
- Active le interrupteur
- Colle le Client ID et le Client Secret de Google
- Sauvegarde

### 3. Préviens Claude

Le bouton Google fonctionnera alors dans l'app — mais seulement sur un
**nouvel APK** (pas une mise à jour normale), parce qu'il utilise une
brique qui doit être intégrée au moment de la construction de l'app. Dis à
Claude que c'est fait, il te dira si un nouvel APK est nécessaire tout de
suite ou si ça peut attendre le prochain groupé avec d'autres changements.

## Bon à savoir

- Rien de tout ça n'est obligatoire pour utiliser Flex Timer. La connexion
  est et restera optionnelle.
- Le plan gratuit de Supabase est largement suffisant pour le moment
  (50 000 utilisateurs actifs par mois, 500 Mo de base de données).
- Si tu veux revenir en arrière, laisse simplement `supabaseUrl` et
  `supabaseAnonKey` vides dans `app.json` : l'écran de connexion repasse en
  « bientôt disponible ».
