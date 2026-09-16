#!/usr/bin/env node
'use strict';

// Script interactif pour pousser une mise à jour OTA (EAS Update) sans avoir
// à retenir les commandes. Lancé via push-update.cmd (double-clic ou
// `push-update.cmd` dans un terminal, à la racine du projet).
//
// Ce script gère : bump de version (X.C.A, voir CLAUDE.md), resynchronisation
// de package-lock.json, rappel d'éditer lib/changelog.js, puis `eas update`.
// Il ne touche PAS à Git — aucun commit, aucun push GitHub.

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const readline = require('readline/promises');
const { stdin, stdout } = require('process');

const ROOT = path.join(__dirname, '..');
const PKG_PATH = path.join(ROOT, 'package.json');
const APP_JSON_PATH = path.join(ROOT, 'app.json');
const CHANGELOG_PATH = path.join(ROOT, 'lib', 'changelog.js');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJsonPreservingEOL(p, obj) {
  // Le repo est en CRLF (Windows) : on le garde pour ne pas polluer le diff git.
  const original = fs.readFileSync(p, 'utf8');
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  const json = JSON.stringify(obj, null, 2) + '\n';
  fs.writeFileSync(p, json.replace(/\n/g, eol));
}

function bumpVersion(version, level) {
  const [x, c, a] = version.split('.').map(Number);
  if (level === 'X') return `${x + 1}.0.0`;
  if (level === 'C') return `${x}.${c + 1}.0`;
  return `${x}.${c}.${a + 1}`;
}

async function ask(rl, question) {
  const answer = await rl.question(question);
  return answer.trim();
}

async function main() {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  console.log('');
  console.log('=== Flex Timer — envoyer une mise à jour OTA ===');
  console.log('');
  console.log('Rappel : ceci pousse la mise à jour aux téléphones qui ont déjà');
  console.log('l\'app installée. Ça ne touche PAS Git, pas de commit ni de push.');
  console.log('');

  const pkg = readJson(PKG_PATH);
  const appJson = readJson(APP_JSON_PATH);
  const currentVersion = pkg.version;
  console.log(`Version actuelle : ${currentVersion}`);
  console.log('');
  console.log('Quel type de changement veux-tu envoyer ?');
  console.log('  1) Majeur     — refonte, gros changement (rare)');
  console.log('  2) Correctif  — nouvel écran, nouveau comportement visible, bug important corrigé');
  console.log('  3) Ajustement — petite retouche : texte, couleur, micro-fix');
  console.log('');

  let choice = '';
  while (!['1', '2', '3'].includes(choice)) {
    choice = await ask(rl, 'Ton choix (1, 2 ou 3) : ');
  }
  const level = choice === '1' ? 'X' : choice === '2' ? 'C' : 'A';
  const newVersion = bumpVersion(currentVersion, level);

  console.log('');
  console.log(`→ Nouvelle version : ${newVersion}`);
  const confirmVersion = await ask(rl, 'On continue avec ce numéro ? (Entrée = oui, "n" = annuler) : ');
  if (confirmVersion.toLowerCase() === 'n') {
    console.log('Annulé, rien n\'a été modifié.');
    rl.close();
    return;
  }

  pkg.version = newVersion;
  appJson.expo.version = newVersion;
  writeJsonPreservingEOL(PKG_PATH, pkg);
  writeJsonPreservingEOL(APP_JSON_PATH, appJson);
  console.log('✓ package.json et app.json mis à jour.');

  console.log('');
  console.log('Resynchronisation de package-lock.json...');
  execSync('npm install --package-lock-only', { cwd: ROOT, stdio: 'inherit' });
  console.log('✓ package-lock.json à jour.');

  console.log('');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`Ouvre maintenant lib/changelog.js dans VS Code et mets à`);
  console.log(`jour la liste CHANGELOG_CURRENT avec ce qui change vraiment`);
  console.log(`dans cette version — c'est ce texte que verront les gens`);
  console.log(`dans le popup "Nouvelle version".`);
  console.log('─────────────────────────────────────────────────────────');
  await ask(rl, 'Appuie sur Entrée une fois lib/changelog.js à jour (et sauvegardé)... ');

  const message = await ask(rl, 'Décris en une phrase ce que contient cette mise à jour : ');

  console.log('');
  console.log('Envoi de la mise à jour (eas update)...');
  console.log('');

  const result = spawnSync(
    'npx',
    [
      'eas',
      'update',
      '--channel', 'preview',
      '--environment', 'preview',
      '--message', message || `v${newVersion}`,
      '--non-interactive',
    ],
    { cwd: ROOT, stdio: 'inherit', shell: true }
  );

  console.log('');
  if (result.status === 0) {
    console.log(`✓ Mise à jour v${newVersion} envoyée.`);
    console.log('Ferme complètement l\'app sur ton téléphone puis rouvre-la :');
    console.log('le popup "Nouvelle version" doit apparaître.');
    console.log('');
    console.log('⚠️ Rien n\'a été commité sur Git. Pense à le faire toi-même');
    console.log('   (ou à demander à Claude) une fois que tu as vérifié que ça marche.');
  } else {
    console.log('✗ L\'envoi a échoué (voir le message d\'erreur ci-dessus).');
    console.log(`  Le numéro de version est resté sur ${newVersion} — relance simplement`);
    console.log('  ce script pour réessayer, ou corrige le problème puis relance.');
  }

  rl.close();
}

main().catch((err) => {
  console.error('Erreur inattendue :', err);
  process.exitCode = 1;
});
