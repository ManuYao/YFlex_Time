// Configuration de l'empreinte native (runtimeVersion: { policy: "fingerprint" }).
//
// Sans ceci, `expo.version` d'app.json entre dans le calcul : un simple bump
// 10.2.0 → 10.2.1 changeait l'empreinte, et `eas update` publiait alors vers
// une version que personne n'avait installée (vérifié : 10.2.0 → 39effb33…,
// 10.2.1 → f7da5cbc…). On exclut donc les champs de version — le numéro
// reste purement informationnel, l'empreinte ne bouge que sur un vrai
// changement natif (nouvelle lib, plugin, SDK).
//
// ⚠️ `sourceSkips` REMPLACE la valeur par défaut, il ne s'y ajoute pas. Le
// défaut (`PackageJsonAndroidAndIosScriptsIfNotContainRun`) doit donc être
// répété ici : EAS réécrit les scripts `android`/`ios` de package.json en
// `expo run:*` pendant le prebuild, et sans ce skip l'empreinte calculée sur
// le serveur diffère de la locale → build refusé ("Runtime version
// calculated on local machine not equal…", build 67b1cd89 du 16/09/2026).
/** @type {import('@expo/fingerprint').Config} */
const config = {
  sourceSkips: ['ExpoConfigVersions', 'PackageJsonAndroidAndIosScriptsIfNotContainRun'],
};

module.exports = config;
