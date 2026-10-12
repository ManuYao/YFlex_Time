import { createAudioPlayer } from 'expo-audio';

// Registre unique des sons de l'app. Les lecteurs vivent ici, pas dans un
// hook : le splash, la feuille de mise a jour, le countdown et l'ecran
// Running en ont tous besoin, et monter/demonter un lecteur par ecran
// reintroduirait la latence au premier play (le fichier est decode a la
// creation du lecteur, pas au play).
const SOURCES = {
  // Countdown 3-2-1-GO, dans l'ordre de lecture : bip1 sur "3", bip3 sur "1".
  countdown1: require('../assets/sounds/bip_1.mp3'),
  countdown2: require('../assets/sounds/bip_2.mp3'),
  countdown3: require('../assets/sounds/bip_3.mp3'),
  go: require('../assets/sounds/bip_go.mp3'),
  // Trois dernieres secondes avant un changement de phase, meme ordre.
  next1: require('../assets/sounds/sound_next_round_1.mp3'),
  next2: require('../assets/sounds/sound_next_round_2.mp3'),
  next3: require('../assets/sounds/sound_next_round_3.wav'),
  intro: require('../assets/sounds/intro.wav'),
  // Seconde partie de l'intro, jouee APRES `intro` quand l'app vient d'etre
  // mise a jour (OTA ou nouvel APK) : voir playSoundSequence et lib/splash.js.
  introNew: require('../assets/sounds/intro_new.mp3'),
  update: require('../assets/sounds/notification_new_maj_lv1.wav'),
  // Palier de badge franchi.
  achievement: require('../assets/sounds/achievement_unlock_1.wav'),
  // Pop-up qui PROPOSE le tutoriel (components/common/TutorialInviteSheet.js).
  // Pour l'instant un son déjà présent dans la base : le jour où un son dédié
  // existe, changer UNIQUEMENT ce fichier, rien d'autre ne bouge.
  tutorialInvite: require('../assets/sounds/notification_new_maj_lv1.wav'),
  // Bilan de saison (app/season-recap.js) : ouverture et dernière carte. Sons
  // déjà présents dans la base pour l'instant ; changer UNIQUEMENT ces deux
  // lignes le jour où des sons dédiés existent.
  seasonRecap: require('../assets/sounds/achievement_unlock_1.wav'),
  seasonRecapEnd: require('../assets/sounds/notification_new_maj_lv1.wav'),
  // Timer verrouille par le cooldown (TABATA / MIX) : son dedie, distinct du
  // refus generique ci-dessous.
  blockedTimer: require('../assets/sounds/blocked_timer.wav'),
  // Refus generique (bouton indisponible) : deux variantes tirees au hasard
  // pour qu'un utilisateur qui insiste n'entende pas le meme son en boucle.
  denied1: require('../assets/sounds/lock_1.wav'),
  denied2: require('../assets/sounds/lock_2.wav'),
};

const DENIED_KEYS = ['denied1', 'denied2'];

const players = {};
let enabled = true;
let volume = 0.75;

// Creation paresseuse : les neuf fichiers ne sont pas decodes au demarrage,
// seulement ceux qu'un ecran demande vraiment. Une fois cree, le lecteur est
// garde pour la suite de la session.
const getPlayer = (key) => {
  if (players[key]) return players[key];
  const src = SOURCES[key];
  if (!src) return null;
  try {
    const p = createAudioPlayer(src);
    p.volume = volume;
    players[key] = p;
    return p;
  } catch {
    return null;
  }
};

export const configureSounds = ({ enabled: nextEnabled, volume: nextVolume }) => {
  if (typeof nextEnabled === 'boolean') enabled = nextEnabled;
  if (typeof nextVolume === 'number') {
    volume = Math.max(0, Math.min(1, nextVolume));
    Object.values(players).forEach((p) => {
      try { p.volume = volume; } catch {}
    });
  }
};

export const playSound = (key) => {
  if (!enabled) return;
  const p = getPlayer(key);
  if (!p) return;
  try {
    p.seekTo(0);
    p.play();
  } catch {}
};

// Surveille la fin d'un lecteur : appelle `cb` UNE fois, quand le son est fini (evenement
// `didJustFinish`) ou, a defaut, quand une minuterie calee sur la duree du fichier expire.
// `duration` n'est connue qu'une fois le fichier charge : 0 sinon, on prend alors
// `fallbackMs`. Rend une fonction pour declencher la fin a la main.
const watchEnd = (p, cb, fallbackMs) => {
  let ended = false;
  let sub = null;
  let timer = null;
  const end = () => {
    if (ended) return;
    ended = true;
    clearTimeout(timer);
    try { sub?.remove(); } catch {}
    cb?.();
  };
  try {
    sub = p.addListener('playbackStatusUpdate', (status) => {
      if (status?.didJustFinish) end();
    });
  } catch {}
  let seconds = 0;
  try { seconds = Number(p.duration) || 0; } catch {}
  timer = setTimeout(end, seconds > 0 ? seconds * 1000 + 400 : fallbackMs);
  return end;
};

// Joue plusieurs sons l'un APRES l'autre : le suivant part quand le precedent
// est fini. Tous les lecteurs sont crees d'avance : decoder un mp3 de plusieurs
// secondes au moment de l'enchainement ferait un trou audible entre les deux.
// `onDone` (facultatif) est appele quand le DERNIER son est fini — ou tout de suite si
// les sons sont coupes ou si rien ne peut etre joue. Il suit donc la duree reelle des
// fichiers : raccourcir un son ne demande aucun reglage ailleurs (intro de demarrage).
export const playSoundSequence = (keys, onDone) => {
  if (!enabled || !Array.isArray(keys) || keys.length === 0) {
    onDone?.();
    return;
  }
  keys.forEach((k) => getPlayer(k));
  const [first, ...rest] = keys;
  const p = getPlayer(first);
  if (!p) {
    playSoundSequence(rest, onDone);
    return;
  }
  playSound(first);
  if (rest.length === 0) {
    // Dernier son : filet de securite large, il ne doit jamais bloquer ce qui l'attend.
    watchEnd(p, onDone, 8000);
    return;
  }
  watchEnd(p, () => playSoundSequence(rest, onDone), 2000);
};

// Les sons sont-ils actives dans les Parametres ? (module-level, tenu a jour par
// configureSounds.)
export const isSoundEnabled = () => enabled;

// Prévisualisation : joue un son à un volume EXPLICITE, indépendant du
// volume réglé persisté (`settings.volume`), pour que l'utilisateur entende
// le niveau qu'il est en train de choisir avant même d'avoir validé quoi que
// ce soit — sans ce détour, ajuster le curseur se faisait à l'aveugle.
// Le volume "réel" du lecteur est restauré juste après : ce même lecteur sert
// aussi aux sons normaux de l'app, il ne doit pas rester bloqué sur la valeur
// de prévisualisation.
export const previewSound = (key, volumeRatio) => {
  if (!enabled) return;
  const p = getPlayer(key);
  if (!p) return;
  try {
    p.volume = Math.max(0, Math.min(1, volumeRatio));
    p.seekTo(0);
    p.play();
  } catch {}
  // Restaure le volume RÉGLÉ courant (variable de module `volume`), pas un
  // instantané capturé avant l'appel : plusieurs previews rapprochées (taps
  // successifs sur le curseur) auraient sinon leurs callbacks qui se
  // doublent, et le dernier à se résoudre peut réécrire une valeur déjà
  // obsolète au lieu du volume réellement configuré.
  setTimeout(() => {
    try {
      p.volume = volume;
    } catch {}
  }, 400);
};

export const playDenied = () =>
  playSound(DENIED_KEYS[Math.floor(Math.random() * DENIED_KEYS.length)]);

// Pour le fun : plutôt que de rejouer le même bip à chaque tap sur le
// curseur Volume, on avance dans la séquence d'une vraie séance — 3, 2, 1,
// GO, fin — pour entendre les différents sons en réglant le volume, sans
// lancer un vrai timer. "GO" et "fin" partagent le même fichier (bip_go
// sert déjà aux deux dans l'app réelle, voir SOURCES.go), donc la boucle de
// 5 répète volontairement la dernière entrée. Compteur de module, pas
// persisté : reparti à zéro à chaque lancement de l'app.
const VOLUME_PREVIEW_SEQUENCE = ['countdown1', 'countdown2', 'countdown3', 'go', 'go'];
let volumePreviewTap = 0;

export const previewVolumeTap = (volumeRatio) => {
  const key = VOLUME_PREVIEW_SEQUENCE[volumePreviewTap % VOLUME_PREVIEW_SEQUENCE.length];
  volumePreviewTap += 1;
  previewSound(key, volumeRatio);
};

// Prechargement explicite : evite la latence de decodage au premier play
// quand on sait a l'avance qu'un son va partir (bips du countdown).
export const preloadSound = (key) => { getPlayer(key); };
