import React, { createContext, useCallback, useContext, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';

/* ─────────────────────────────────────────────────────────────────
   Taille RÉELLE de la fenetre
   ────────────────────────────────────────────────────────────────

   useWindowDimensions() donne la taille que React Native croit avoir. En
   fenetre flottante Samsung ("pop-up view") elle n'est pas toujours remise a
   jour : l'ecran garde alors la mise en page d'un telephone plein ecran dans
   une fenetre qui n'a plus la hauteur — c'est ainsi que le bouton Lancer
   sortait par le bas. L'onLayout de la racine, lui, mesure ce que l'app
   occupe vraiment, a chaque redimensionnement : c'est la source de verite.
   WindowSizeProvider la mesure une fois pour toute l'app.

   Deux lectures, pour deux besoins :
     useWindowSize() : la mesure reelle, seule. Pour ce qui doit etre EXACT
                       (message "agrandis la fenetre", commandes du chrono).
     useLayoutSize() : le MINIMUM de la mesure reelle et de Dimensions. Pour
                       le niveau de mise en page et l'echelle. Sur un
                       telephone normal la racine mesuree est un peu plus
                       haute que Dimensions (barres systeme) : prendre le
                       minimum garde exactement le comportement d'avant, donc
                       aucun telephone ne change de mise en page. Le cas
                       corrige est l'inverse (fenetre flottante : Dimensions
                       reste trop grande, la mesure est plus petite).
   Tant que la mesure n'est pas arrivee, on retombe sur useWindowDimensions. */
const WindowSizeContext = createContext(null);

export function WindowSizeProvider({ style, children }) {
  const [size, setSize] = useState(null);
  const onLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);
  return (
    <View style={style} onLayout={onLayout}>
      <WindowSizeContext.Provider value={size}>{children}</WindowSizeContext.Provider>
    </View>
  );
}

export function useWindowSize() {
  const win = useWindowDimensions();
  const measured = useContext(WindowSizeContext);
  if (measured && measured.width > 0 && measured.height > 0) return measured;
  return { width: win.width, height: win.height };
}

export function useLayoutSize() {
  const win = useWindowDimensions();
  const measured = useContext(WindowSizeContext);
  if (measured && measured.width > 0 && measured.height > 0) {
    return {
      width: Math.min(win.width, measured.width),
      height: Math.min(win.height, measured.height),
    };
  }
  return { width: win.width, height: win.height };
}

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
  const { width, height } = useLayoutSize();
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
  const { width, height } = useLayoutSize();
  return layoutLevel(width, height);
}

/* ─────────────────────────────────────────────────────────────────
   Fenetre trop petite pour un ecran
   ────────────────────────────────────────────────────────────────

   Seuls l'accueil et le chrono (running, countdown) ont une mise en page
   "mini" : ce sont les deux ecrans qu'on garde ouverts dans une petite
   fenetre. Tous les autres (historique, planning, constructeur MIX, profil,
   parametres...) sont des listes et des feuilles pensees pour un telephone :
   sous ce plancher on prefere dire "agrandis la fenetre" que montrer un ecran
   inutilisable.

   Le plancher est volontairement BIEN sous le plus petit telephone reel
   (~320 x 470 dp) : ce message ne doit jamais s'afficher en plein ecran, ou
   l'utilisateur n'aurait aucun moyen d'agrandir quoi que ce soit. */
const NOTICE_MAX_H = 430;
const NOTICE_MAX_W = 270;

// Plancher des ecrans qui s'adaptent (accueil, chrono) : en dessous, meme eux
// ne peuvent plus rien montrer d'utile.
const ADAPTIVE_NOTICE_MAX_H = 190;
const ADAPTIVE_NOTICE_MAX_W = 190;

export function isWindowTooSmall(width, height, adaptive = false) {
  if (!width || !height) return false;
  if (adaptive) return height < ADAPTIVE_NOTICE_MAX_H || width < ADAPTIVE_NOTICE_MAX_W;
  return height < NOTICE_MAX_H || width < NOTICE_MAX_W;
}
