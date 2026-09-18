# Maintenance et mise à jour obligatoire

Ce guide explique comment afficher un **message de maintenance** dans l'app,
ou **forcer** tout le monde à télécharger un nouvel APK — sans toucher au
code et sans repasser par Claude.

Tout se pilote depuis **un seul fichier hébergé sur GitHub** (un « Gist »),
que tu modifies à la main quand tu en as besoin. L'app le lit toute seule au
démarrage, une fois par jour maximum.

## Ce que ça fait

| Tu veux… | Ce que voit l'utilisateur |
|---|---|
| Prévenir d'un souci en cours | Un bandeau discret en haut + un message détaillé la première fois. L'app continue de marcher normalement. |
| Forcer une nouvelle version | Un écran rouge plein écran avec un bouton « Télécharger ». Impossible de passer outre. |

⚠️ À ne pas confondre avec `push-update.cmd` (voir `TUTO-MISE-A-JOUR.md`) :
celui-là envoie ton nouveau code aux téléphones automatiquement. Le blocage
décrit ici sert justement pour les rares cas où une mise à jour automatique
n'est **pas** possible et où il faut réinstaller l'app à la main.

---

## Étape 1 — Créer le Gist (une seule fois)

1. Va sur <https://gist.github.com/> (connecté à ton compte GitHub).
2. Dans **Filename**, écris exactement : `apk-version.json`
3. Colle ce contenu :

```json
{
  "min_apk_version": "10.6.0",
  "download_url": "https://exemple.com/flex-timer.apk",
  "is_maintenance": false,
  "maintenance_message": "Maintenance en cours, certaines fonctions peuvent être indisponibles.",
  "is_forced_update": false,
  "forced_update_message": "Mise à jour critique requise. Télécharge la nouvelle version pour continuer."
}
```

4. Clique **Create public gist**.
5. Sur la page du Gist, clique le bouton **Raw** : l'adresse qui s'ouvre
   ressemble à
   `https://gist.githubusercontent.com/ManuYao/a1b2c3d4e5f6.../raw/apk-version.json`
6. Copie cette adresse.

## Étape 2 — Coller l'adresse dans le projet (une seule fois)

Ouvre le fichier `lib/apkVersionCheck.js` dans VS Code, et remplace
`YOUR_GIST_ID` par l'identifiant de ton Gist (la suite de lettres et de
chiffres au milieu de l'adresse copiée) :

```js
export const GIST_URL =
  'https://gist.githubusercontent.com/ManuYao/YOUR_GIST_ID/raw/apk-version.json';
```

Enregistre (Ctrl+S), puis envoie une mise à jour avec `push-update.cmd`.

**Tant que `YOUR_GIST_ID` est là, rien ne se passe** : l'app ne fait aucune
requête et ne montre jamais ni bandeau ni blocage. C'est voulu — aucun
risque à laisser le code en place avant d'avoir créé le Gist.

---

## Afficher une maintenance

Sur la page de ton Gist, clique **Edit**, change ces deux lignes, puis
**Update public gist** :

```json
"is_maintenance": true,
"maintenance_message": "Ton texte ici.",
```

Ce que verront les gens :

- **la première fois** : une fenêtre au centre de l'écran avec ton texte,
  entourée d'un halo de couleurs qui tourne. Plus le texte est long, plus le
  halo est marqué et tourne vite ;
- **ensuite** : un simple bandeau en haut de l'écran, qu'ils peuvent fermer.
  Un tap dessus rouvre le message complet.

Le bandeau ne s'affiche jamais pendant un chrono ou un compte à rebours.

Si tu **changes le texte** plus tard, la fenêtre centrale réapparaît une
fois — c'est le texte qui sert de repère, pas une date.

Pour arrêter : remets `"is_maintenance": false`.

## Forcer une mise à jour

**Une seule chose suffit** : changer `min_apk_version`. Dès qu'un téléphone a
une version installée inférieure, il est bloqué automatiquement — pas besoin
de toucher à un deuxième réglage.

```json
"min_apk_version": "12.0.0",
"download_url": "https://lien-direct-vers-ton-apk.apk",
```

- `min_apk_version` = la version **minimale acceptable**. Tous les
  téléphones dont la version installée est inférieure sont bloqués
  automatiquement. Les autres (déjà à jour) ne voient rien.
- `download_url` = le lien direct vers le nouvel APK (celui que te donne EAS
  à la fin d'un `eas build`). Sans lien, l'écran s'affiche quand même mais
  sans bouton.

La version installée sur un téléphone est celle affichée dans
**Paramètres → À propos** de l'app (elle vient de `app.json`).

⚠️ Vérifie toujours ton lien **avant** de changer `min_apk_version` : une
fois bloqués, les gens n'ont plus que ce bouton.

### Le champ `is_forced_update` — coupe-circuit, pas interrupteur principal

Tu n'as **pas besoin** d'y toucher pour bloquer — c'est déjà fait par
`min_apk_version` seul. Il ne sert que dans un cas précis : tu veux préparer
un futur `min_apk_version` (par exemple pour tester) **sans bloquer
personne tout de suite**. Ajoute alors :

```json
"is_forced_update": false,
```

Tant que cette ligne est à `false`, **personne n'est bloqué**, même avec un
`min_apk_version` plus récent que ce qu'ils ont installé. Retire la ligne
(ou remets `true`) quand tu veux vraiment déclencher le blocage.

Pour débloquer tout le monde après un blocage déjà actif : remets
`min_apk_version` à une version que tout le monde a déjà (ou ajoute
`"is_forced_update": false`) — à leur prochaine vérification (voir plus
bas), ils sont débloqués.

---

## Quand est-ce que ça arrive sur les téléphones ?

L'app vérifie le Gist **au démarrage, une fois par 24h maximum** (pour ne pas
consommer de données pour rien). Entre deux vérifications, elle réutilise la
dernière réponse connue — donc un blocage déjà reçu reste actif même hors
ligne, et ne saute pas simplement en coupant le wifi.

En pratique : compte jusqu'à 24h pour qu'un changement touche tout le monde.

Pour tester tout de suite sans attendre, sur ton téléphone : **Paramètres →
Diagnostic maintenance (test) → Vérifier maintenant**. Ce bouton force une
lecture immédiate du Gist, sans passer par le délai de 24h. Il est limité à
**5 vérifications par heure** (pour ne pas marteler le Gist si le doigt
glisse) — le bouton se grise une fois la limite atteinte, avec l'heure à
laquelle il redevient disponible. Ce bloc est temporaire (retiré avant
publication).

## En cas de problème

- **Rien ne s'affiche** → vérifie que l'adresse dans `lib/apkVersionCheck.js`
  ne contient plus `YOUR_GIST_ID`, et qu'elle s'ouvre bien dans un navigateur
  en affichant le JSON brut (pas la page GitHub).
- **Le JSON est mal écrit** (virgule oubliée, guillemet manquant) → l'app
  ignore le fichier et continue normalement. Rien ne casse, mais rien ne
  s'affiche non plus. Colle ton texte dans <https://jsonlint.com/> pour
  vérifier.
- **Quelqu'un est bloqué à tort** → remets `"is_forced_update": false` dans
  le Gist. Il sera débloqué à sa prochaine vérification.

---

## Faire passer les testeurs sur une nouvelle APK (procédure complète)

Cas typique : une mise à jour **native** (nouvelle lib, comme la notification
de chrono en 12.0.0) ne peut pas arriver toute seule par `push-update.cmd`.
Il faut que chaque testeur réinstalle l'app à la main, et le Gist sert à le
leur dire — avec un bouton qui télécharge directement.

### Ce qu'il faut bien comprendre (pour ne pas s'embrouiller)

Un téléphone est bloqué dès qu'**une seule chose** est vraie : sa version
installée est **plus petite** que `min_apk_version`. Pas de deuxième réglage
à changer en même temps.

Conséquence : tu **n'as jamais besoin de « remettre en mode normal »** après
coup. Un testeur qui vient d'installer la 12.0.0 a une version égale à
`min_apk_version`, donc pas plus petite → il n'est pas bloqué. Tu peux
laisser le Gist tel quel jusqu'à la prochaine APK, où tu changeras juste le
numéro et le lien.

### Les 4 étapes

1. **Attends la fin du build** (`eas build`, ~15 min). À la fin, EAS affiche
   un lien qui se termine par `.apk` (ou ouvre <https://expo.dev>, projet
   Flex Timer, onglet Builds, dernier build → bouton Download → copier le
   lien). Vérifie-le : ouvert dans un navigateur, il doit lancer un
   téléchargement, pas afficher une page d'erreur.

2. **Installe-la toi-même d'abord** sur ton téléphone. Ouvre Paramètres → À
   propos : la version affichée doit être la nouvelle (ex. `12.0.0`). Si tu
   ne fais pas ça, tu risques de bloquer tout le monde sur un lien qui ne
   marche pas.

3. **Modifie le Gist** (page du Gist → Edit → Update public gist). Seulement
   ces trois lignes changent :

   ```json
   "min_apk_version": "12.0.0",
   "download_url": "https://expo.dev/artifacts/eas/XXXXXXXX.apk",
   "forced_update_message": "Nouvelle version avec le chrono en arrière-plan. Installe-la pour continuer (30 secondes)."
   ```

   (si le Gist contient encore une ligne `"is_forced_update": false` d'un
   test précédent, supprime-la ou passe-la à `true` — sinon elle empêche le
   blocage de se déclencher, voir la section juste en dessous.)

   (le message est libre, ce qui précède est un exemple ; garde-le court,
   c'est un écran plein.)

4. **Préviens les testeurs** en une phrase, par message : « ouvre Flex
   Timer, suis l'écran rouge ». Ce qu'ils verront : un écran rouge, bouton
   « Installer la mise à jour » → téléchargement dans l'app → Android
   demande « autoriser cette source » la première fois, puis « installer ».
   Un lien « Télécharger dans le navigateur » reste dessous en secours.

### Qui reçoit quoi, selon la version installée

| Version installée | Ce que la personne verra |
|---|---|
| **11.0.0** | L'écran rouge complet, avec le bouton « Installer la mise à jour » (installation directe) + lien navigateur. |
| **10.1.2 / 10.2.0** | Une fenêtre « Nouvelle version disponible » avec ton message, un bouton « Télécharger la nouvelle version » (ouvre le lien dans le navigateur) et « Plus tard ». Elle revient à chaque ouverture de l'app tant que la personne n'a pas installé la nouvelle version. Ces APK n'avaient pas le système Gist : une mise à jour automatique de secours leur a été envoyée le 18/09/2026 pour l'ajouter. |
| **8.0.5** (les tout premiers APK partagés, 14–15 sept.) | **Rien, jamais.** Ces APK n'avaient aucun système de mise à jour. Il faut leur envoyer le lien par message, il n'y a pas d'autre moyen. |

### Délais à prévoir

- L'app relit le Gist **au plus une fois par 24 h**. Un testeur qui a ouvert
  l'app ce matin ne verra l'écran rouge que demain, sauf s'il force la
  lecture (Paramètres → Diagnostic maintenance → Vérifier maintenant).
- Le blocage arrive **au lancement**, pas au milieu d'une séance.

### Astuce : prévenir en douceur avant de forcer

Si tu veux laisser un jour ou deux aux gens avant de bloquer, active d'abord
la maintenance simple (fermable) avec le lien dans le texte :

```json
"is_maintenance": true,
"maintenance_message": "Nouvelle version 12.0.0 disponible : le chrono continue en arrière-plan. Réinstalle depuis le lien envoyé par message quand tu as 30 secondes.",
"is_forced_update": false
```

Remarque : mettre `min_apk_version` à `12.0.0` dès maintenant **bloquerait
déjà tout le monde** sous cette version — le `"is_forced_update": false`
ci-dessus est justement ce qui retient le blocage le temps que les gens
lisent le message. Quand tu veux vraiment couper les anciennes versions,
retire cette ligne (ou passe-la à `true`) et mets `"is_maintenance": false`,
en une seule édition.
La page de maintenance simple **n'a pas de bouton de téléchargement**
(décision : ce bouton n'existe que sur l'écran bloquant), d'où l'idée
d'envoyer le lien par message dans ce cas.

### Après la migration

Rien à faire dans le Gist. La prochaine fois qu'une APK native sera
nécessaire, tu répètes les 4 étapes avec le nouveau numéro et le nouveau
lien — les versions intermédiaires (12.1.0, 12.2.0…) passeront toutes
seules par `push-update.cmd`, sans toucher au Gist.
