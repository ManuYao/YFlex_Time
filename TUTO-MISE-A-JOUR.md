# Comment envoyer une mise à jour toi-même

Ce guide explique comment envoyer une nouvelle version de Flex Timer à ton
téléphone (et à tes testeurs) **sans repasser par Claude**, en quelques
minutes.

## Ce que ça fait (et ce que ça ne fait pas)

- ✅ Envoie le nouveau code JS/design à tous les téléphones qui ont déjà
  l'app installée. Ils la reçoivent automatiquement, sans réinstaller.
- ❌ Ne touche PAS à Git (pas de commit, pas de push GitHub).
- ❌ Ne fonctionne PAS pour un changement "natif" (nouvelle librairie avec du
  code natif, changement dans `app.json` côté Android, mise à jour du SDK
  Expo). Dans ce cas-là, il faut redemander un APK — dis-le à Claude.

Si tu ne sais pas si ton changement est "natif" : **99% du temps, ce n'est
pas le cas**. Modifier un écran, une couleur, un texte, ajouter une
fonctionnalité en JS → toujours OK pour une mise à jour normale.

## Étape par étape

### 1. Ouvre un terminal à la racine du projet

Dans VS Code : menu **Terminal → Nouveau terminal**. Il s'ouvre déjà au bon
endroit (`d:\DEV\ReactNative\YFlex_Time`).

### 2. Lance le script

Tape :

```
push-update.cmd
```

(Tu peux aussi double-cliquer sur le fichier `push-update.cmd` dans
l'explorateur Windows — mais depuis VS Code, taper la commande est plus
pratique parce que tu vois tout se passer dans le même terminal.)

### 3. Réponds aux questions

Le script te demande dans l'ordre :

**a) Quel type de changement ?**

| Tu choisis | Quand |
|---|---|
| **1 — Majeur** | Presque jamais toi-même. Refonte complète d'un écran, très gros changement. |
| **2 — Correctif** | Nouvel écran, nouvelle fonctionnalité visible, ou bug important corrigé. |
| **3 — Ajustement** | Le cas le plus fréquent : une couleur, un texte, un petit réglage, un micro-bug. |

Dans le doute, choisis **3**. Le numéro de version (ex: `10.4.0` →
`10.4.1`) n'a aucune conséquence technique — c'est juste pour s'y
retrouver.

**b) Confirmer le nouveau numéro**

Appuie sur **Entrée** pour valider, ou tape `n` pour tout annuler sans rien
changer.

**c) Mettre à jour le "quoi de neuf"**

Le script s'arrête et te demande d'ouvrir un fichier :
`lib/changelog.js`

Ouvre-le dans VS Code. Tu verras `CHANGELOG_HISTORY`, une liste où chaque
entrée est une version (la plus récente en premier). **Ajoute une nouvelle
entrée tout en haut de la liste** pour décrire ce qui change VRAIMENT dans
cette version :

```js
export const CHANGELOG_HISTORY = [
  {
    version: '10.5.0',
    date: '20 sept. 2026',
    summary: "Le bouton Lancer est plus visible sur fond jaune.",
    items: [
      {
        icon: '🎨',
        text: "Le bouton Lancer est maintenant plus visible sur fond jaune.",
      },
    ],
  },
  {
    version: '10.4.0',   // ← l'ancienne entrée la plus récente, gardée
    date: '18 sept. 2026',
    summary: "...",
    items: [ /* ... */ ],
  },
];
```

- `summary` : une phrase, affichée en petit dans Paramètres > Version pour
  rappeler ce qu'il y avait dans l'avant-dernière mise à jour.
- `items` : la liste détaillée (icône + texte), affichée en grand pour la
  dernière version — c'est elle que les gens voient dans le popup
  "Nouvelle version".

**Ne garde jamais plus de 2 entrées** : rien au-delà de l'avant-dernière ne
s'affiche nulle part dans l'app, donc si la liste en compte 3 après ton
ajout, supprime la plus ancienne (celle du bas).

Une fois le fichier sauvegardé (Ctrl+S), reviens dans le terminal et
appuie sur **Entrée** pour continuer.

**d) Décrire la mise à jour en une phrase**

C'est juste pour toi (ça sert de repère technique dans le tableau de bord
Expo) — une courte phrase suffit, ex : `Couleur du bouton Lancer`.

### 4. Laisse le script travailler

Il va :
1. Mettre à jour le numéro de version dans les fichiers du projet
2. Envoyer le nouveau code sur les serveurs Expo (`eas update`)

Ça prend 1 à 3 minutes. À la fin, tu verras :
```
✓ Mise à jour v10.4.1 envoyée.
```

### 5. Teste sur ton téléphone

Ferme complètement l'app Flex Timer sur ton téléphone (balaie-la hors des
apps récentes), puis rouvre-la. Elle télécharge la mise à jour toute seule.
Le popup "Nouvelle version" doit apparaître.

### 6. Committe sur Git

Le script t'aura prévenu : **rien n'a été commité**. Une fois que tu as
vérifié que tout marche bien sur ton téléphone, demande à Claude de
committer (ou fais-le toi-même si tu es à l'aise) — c'est important pour
ne pas perdre l'historique des changements.

## En cas de problème

- **"eas : commande introuvable"** → ferme et rouvre le terminal, ou
  redemande à Claude de vérifier l'installation.
- **Le script affiche une erreur en rouge à la fin** → recopie le message
  et montre-le à Claude, rien n'est cassé, tu peux relancer le script.
- **Le popup n'apparaît pas sur le téléphone** → va dans
  **Paramètres → Diagnostic mise à jour → Vérifier maintenant**, ça force
  la vérification. Si ça ne marche toujours pas, montre à Claude ce
  qu'affiche ce bloc diagnostic.
