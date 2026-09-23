import { useWindowDimensions } from 'react-native';

// Facteur d'echelle pour les quelques tailles en dur qui debordent quand la
// fenetre devient petite : l'anneau a ticks et les chiffres geants Anton.
//
// Cas vise : le mode multi-fenetres / fenetre flottante d'Android (la "pop-up
// view" de Samsung), ou l'utilisateur redimensionne la fenetre a la main
// pendant que l'app tourne. Ce n'est pas une rotation : l'orientation reste
// portrait, c'est la fenetre qui rapetisse.
//
// Premiere ligne de defense : plugins/withMinWindowSize.js empeche Android de
// descendre sous une taille plancher. Ce facteur n'est que le filet de
// securite pour les surcouches constructeur qui ignoreraient ce minimum.

// Reference = le plus petit telephone considere comme "normal". Choisi bas
// exprès : au-dessus, le facteur vaut 1 et RIEN ne change par rapport au
// design d'origine. La reduction ne s'enclenche que dans le cas anormal.
const BASE_W = 340;
const BASE_H = 620;

// Plancher : en dessous on arrete de reduire, sinon le texte devient illisible
// et mieux vaut une troncature qu'un chiffre de 3 px.
const MIN_SCALE = 0.55;

export function uiScale(width, height) {
  if (!width || !height) return 1;
  // Les deux axes comptent : une fenetre courte casse l'empilement vertical
  // (barre du haut + anneau + commandes) autant qu'une fenetre etroite.
  const raw = Math.min(width / BASE_W, height / BASE_H);
  return Math.min(1, Math.max(MIN_SCALE, raw));
}

export function useUiScale() {
  const { width, height } = useWindowDimensions();
  return uiScale(width, height);
}

// Arrondi a l'entier : evite des tailles de police fractionnaires, qu'Android
// rend de facon instable d'un rendu a l'autre.
export function scaled(value, scale) {
  return Math.round(value * scale);
}

/* ─────────────────────────────────────────────────────────────────
   Niveau de mise en page — reduire les tailles ne suffit pas
   ────────────────────────────────────────────────────────────────

   uiScale() ci-dessus retrecit ce qui est deja affiche. En fenetre courte
   ca ne sauve rien : l'empilement complet (description + anneau + reglages
   + deroule + barre du bas) reclame ~740 px de haut, donc sous cette barre
   le bas de la carte sort de l'ecran quelle que soit l'echelle — l'anneau
   et les reglages disparaissent, la description se coupe en plein mot.

   D'ou un vrai changement de mise en page, pas un facteur :

     full    : le design d'origine, rien ne change.
     compact : anneau reduit, deroule masque, reglages en liste.
     mini    : plus d'anneau du tout — nom, valeur, bouton. Rien d'autre.

   Cas vise : l'utilisateur reduit la fenetre pour garder son programme
   d'entrainement visible a cote pendant la seance. Le chrono doit rester
   lisible et pilotable dans une bande de quelques centimetres.

   Seuils en hauteur *disponible*, pas en taille d'ecran : c'est la fenetre
   qui compte en multi-fenetres. La largeur n'entre en jeu que pour le
   palier mini, ou une fenetre tres etroite casse aussi l'empilement.

   Les valeurs viennent du budget vertical mesure sur l'accueil, pas d'un
   chiffre rond :

     full    ~800 dp  (24 inset + 76 barre + 16 + 40 description
                       + 344 anneau + 82 reglages + 44 deroule
                       + 124 barre du bas + 24 inset)
     compact ~660 dp  (anneau 260, deroule masque, marges resserrees)
     mini    ~400 dp  (sans anneau)

   D'ou COMPACT_MAX_H a 780 et non 700 : a 700 on laissait en mise en page
   complete des telephones de 640-740 dp ou l'empilement deborde deja en
   plein ecran — c'est exactement le bug d'origine, les reglages pousses
   sous le bord de l'ecran. */
const COMPACT_MAX_H = 800;
const MINI_MAX_H = 500;

// La largeur compte aussi : l'anneau fait 320 dp de large, donc sous ~340 dp
// de fenetre il deborde meme si la hauteur est confortable. Le plancher est
// volontairement sous les 360 dp de la plupart des telephones Android, pour
// ne jamais degrader un appareil normal en plein ecran.
const COMPACT_MAX_W = 340;
const MINI_MAX_W = 300;

export function layoutLevel(width, height) {
  if (!width || !height) return 'full';
  if (height < MINI_MAX_H || width < MINI_MAX_W) return 'mini';
  if (height < COMPACT_MAX_H || width < COMPACT_MAX_W) return 'compact';
  return 'full';
}

export function useLayoutLevel() {
  const { width, height } = useWindowDimensions();
  return layoutLevel(width, height);
}
