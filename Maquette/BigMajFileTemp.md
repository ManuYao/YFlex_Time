# 📌 Brief pour Claude Code – Forced Update & Maintenance TimeSport

**Objectif** : Mettre en place un système de vérification d'APK au démarrage pour forcer une mise à jour ou afficher une maintenance sans bloquer totalement l'app.

---

## 🎯 Contexte Rapide

- L'app fait des vérifications d'APK au démarrage (1x/jour max)
- Si une mise à jour est forcée → blocage fullscreen
- Si maintenance → banner info discret, app continue
- Source de vérité : GitHub Gist JSON distant (editable manuellement)

---

## 📋 Étapes à Faire (dans cet ordre)

### **Étape 1 : Créer 7 nouveaux fichiers TypeScript**

Crée ces fichiers avec le code fourni dans la doc complète :

1. **`src/utils/versionCompare.ts`**
   - Fonction pour comparer deux versions semver (1.2.0 vs 1.2.1)
   - Exporte : `compareVersions()` et `isVersionOutdated()`

2. **`src/utils/apkVersionCheck.ts`**
   - Fetch du Gist JSON distant
   - Gère le throttle 24h via AsyncStorage
   - Récupère la version actuelle depuis `app.json`
   - Exporte : `checkAPKVersion()` + `getCurrentVersion()`

3. **`src/types/apkCheck.ts`**
   - Interfaces TypeScript pour réponse Gist et état global
   - Interfaces : `APKCheckResponse` + `APKCheckState`

4. **`src/hooks/useAPKCheck.ts`**
   - Hook React qui déclenche le check au démarrage
   - Retourne l'état (isBlocked, isMaintenance, messages, etc.)

5. **`src/components/APKBlockedScreen.tsx`**
   - Écran fullscreen si forced update
   - Affiche message + bouton "Télécharger" (lien direct)
   - Pas de back button, pas d'échappatoire

6. **`src/components/MaintenanceBanner.tsx`**
   - Banner/toast qui glisse du haut si maintenance active
   - Message discret, utilisateur peut continuer l'app

7. **`src/components/MaintenancePopup.tsx`** (NOUVEAU — à créer)
   - Pop-up modal pour afficher la maintenance (UI soignée)
   - **Design spécifique requis** :
     - Fond avec bordure/halo multicolore tournant
     - L'intensité du halo **varie selon la longueur du message** :
       - Peu de texte → halo simple, rotation légère
       - Beaucoup de texte → halo plus visible/intense, rotation plus marquée
     - Animation fluide du halo (keyframes/Animated API)
   - Affiche : titre + message + bouton "Fermer"
   - S'utilise si maintenance avec besoin d'une modale (vs le banner discret)

---

### **Étape 2 : Modifier `AppStateHandler.tsx`**

**Ajoute au début du composant** :

1. Importe le hook : `import { useAPKCheck } from './hooks/useAPKCheck';`
2. Appelle le hook : `const apkCheckState = useAPKCheck();`
3. Ajoute la logique de rendu :
   - Si `apkCheckState.isBlockedByForcedUpdate === true` → rendre `<APKBlockedScreen />`
   - Sinon → rendre l'app normalement + `<MaintenanceBanner />` si `isMaintenance === true`

*Note* : N'oublie pas d'importer les deux composants.

---

### **Étape 3 : Vérifier `app.json`**

Assure-toi que le champ `version` existe et est au format X.X.X (ex: `"1.2.0"`)

```json
{
  "expo": {
    "version": "1.2.0",
    ...
  }
}
```

---

### **Étape 4 : Créer un Gist GitHub**

(Toi-même, pas Claude Code)

1. Va sur https://gist.github.com/
2. Crée un nouveau Gist
3. Nom du fichier : `apk-version.json`
4. Contenu initial :

```json
{
  "min_apk_version": "1.2.0",
  "download_url": "https://lien-vers-ton-apk.apk",
  "is_maintenance": false,
  "maintenance_message": "Maintenance en cours, certaines features peuvent être indisponibles.",
  "is_forced_update": false,
  "forced_update_message": "Mise à jour critique requise. Télécharge maintenant pour continuer."
}
```

5. Copie l'URL brute (bouton "Raw")

---

### **Étape 5 : Configurer l'URL du Gist**

**Dans `src/utils/apkVersionCheck.ts`** :

Remplace `YOUR_GIST_ID` dans cette ligne :
```typescript
const GIST_URL = 'https://gist.githubusercontent.com/ManuYao/YOUR_GIST_ID/raw/apk-version.json';
```

---

## 🎨 **Spécifications Design – Halo Multicolore Dynamique**

**IMPORTANT** : L'effet de halo n'existe pas encore, c'est à créer dans `MaintenancePopup.tsx`.

### Halo Tournant Multicolore
- Animation de bordure/glow qui tourne autour de la modale
- Couleurs : progression fluide (rouge → orange → jaune → vert → bleu → violet → rouge)
- Rotation continue (boucle infinie)

### Intensité Dynamique (selon longueur du message)
- **Message court** (< 50 caractères) → halo simple, opacité ~50%, rotation lente (3-4s)
- **Message moyen** (50-150 caractères) → halo visible, opacité ~70%, rotation normale (2-3s)
- **Message long** (> 150 caractères) → halo intense, opacité ~90%, rotation rapide (1-2s)

### Implémentation
- Utiliser `Animated` API React Native (ou CSS si besoin)
- Calculer automatiquement `messageLength` pour adapter les propriétés
- Transitions fluides entre les états
- Garder l'aspect lisse et moderne

---

## ✅ Checklist Finale

- [ ] 7 fichiers TypeScript créés (utils, types, hooks, components)
- [ ] `AppStateHandler.tsx` modifié (import du hook et des composants, logique de rendu)
- [ ] `app.json` a un champ `version: "X.X.X"`
- [ ] Gist GitHub créé avec le JSON template
- [ ] URL du Gist configurée dans `apkVersionCheck.ts`
- [ ] `MaintenancePopup.tsx` crée avec halo multicolore dynamique
- [ ] Compiler/build local pour vérifier (pas d'erreurs TypeScript)

---

## 📌 Notes Importantes

- **TRÈS IMPORTANT : Ne pas toucher à l'OTA existant** — le système d'update Over-The-Air fonctionne bien, ajoute juste du nouveau code dessus
- **Pas de console admin dans le code pour l'instant** — édition manuelle du Gist (future feature)
- **Pas de retry auto si réseau ko** — app continue normalement
- **AsyncStorage throttle 24h** — peut être modifié si needed
- **Erreurs fetch** → logs en console, app continue (pas de crash)
- **MaintenancePopup.tsx** : c'est un composant nouveau, pas de réutilisation d'update existant (à créer de zéro avec halo)

---
