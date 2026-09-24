/**
 * Système de boutons de Flex Timer — source unique : tailles, placement,
 * recettes visuelles. Les ressorts et durées viennent de lib/animations.js.
 *
 * Principe (demande utilisateur du 24/09/2026 : boutons « trop classiques,
 * juste un bouton posé » dans une app par ailleurs premium) : un bouton n'est
 * plus un aplat, c'est une SURFACE éclairée par le haut —
 *   - un remplissage en dégradé (ou du verre translucide),
 *   - un reflet en haut et un liseré lumineux (ombre intérieure),
 *   - une lueur ou une ombre portée en dessous (boxShadow),
 *   - un enfoncement au toucher et, pour les actions principales, un reflet
 *     qui traverse le bouton de temps en temps (même langage que la
 *     « brillance » des cartes de l'Historique).
 *
 * Aucune couleur n'est inventée : `accent` dérive la couleur du mode (même
 * teinte, luminosité décalée), `danger` reprend le rouge d'AMRAP, `premium`
 * l'or de l'écran Premium, `spectrum` les quatre couleurs de modes déjà
 * utilisées par la feuille « Quoi de neuf ».
 *
 * Ombres : `boxShadow` UNIQUEMENT, jamais `elevation`. Sur Android, l'ombre
 * `elevation` d'une vue transparente se voit à travers elle (piège n°22), alors
 * que l'ombre extérieure de `boxShadow` est découpée hors de la forme
 * (clipOutPath) — le verre reste propre. Android 9+ pour l'ombre extérieure,
 * 10+ pour l'intérieure ; en dessous elles disparaissent sans rien casser.
 *
 * Pas de vrai flou (BlurView) : derrière un bouton il n'y a qu'un dégradé
 * lisse, un flou n'y changerait rien à l'œil et ferait apparaître des bandes
 * (GrainOverlay est désactivé). Le verre vient de la transparence, du reflet
 * et du liseré.
 */
import { relativeLuminance, shiftLightness, withAlpha } from './phase-colors';

/* ───────────── Tailles ───────────── */

// Boutons texte : une capsule (rayon = moitié de la hauteur), partout.
// `nav` : capsule posée dans une barre du haut, à la hauteur des boutons
// ronds de navigation (ROUND_SIZE.nav) pour que la barre reste alignée.
export const BUTTON_HEIGHT = { lg: 56, md: 48, nav: 44, sm: 36 };
export const BUTTON_FONT = { lg: 16, md: 15, nav: 13, sm: 12.5 };
export const BUTTON_ICON = { lg: 18, md: 16, nav: 15, sm: 14 };
export const BUTTON_PAD_X = { lg: 22, md: 18, nav: 14, sm: 14 };

// Boutons ronds : navigation d'écran (retour, réglages, fermer), en-tête de
// feuille (plus discret), commandes de séance.
export const ROUND_SIZE = { nav: 44, sheet: 36, control: 64, primary: 92 };

// Enfoncement au toucher, par gabarit : plus le bouton est petit, plus il
// doit s'enfoncer pour que le geste se sente sous le doigt.
export const TAP_SCALE = { lg: 0.965, md: 0.96, nav: 0.94, sm: 0.94, round: 0.9 };

/* ───────────── Placement ───────────── */

// Bouton principal épinglé en bas d'écran ou de feuille : son bord bas se
// trouve à BOTTOM_GAP au-dessus de la zone sûre (barre de geste Android).
export const BOTTOM_GAP = 16;
// Marges latérales d'un bouton pleine largeur.
export const SIDE_GAP = 20;
// Écart entre deux boutons côte à côte (Annuler / Confirmer).
export const PAIR_GAP = 10;

/* ───────────── Recettes ───────────── */

const WHITE = '#FFFFFF';
const INK = '#0A0A0A';
export const DANGER = '#FF5454'; // rouge d'AMRAP
export const GOLD = '#F0C954'; // or de l'écran Premium
export const SPECTRUM = ['#FF5454', '#FFC933', '#1FC777', '#9575FF'];

const lift = (hex, d) => shiftLightness(hex, d);

/**
 * Texte lisible sur une couleur de mode. Blanc tant qu'il garde un contraste
 * d'au moins 3:1 (seuil WCAG des gros textes et composants), noir sinon :
 * le blanc sur le vert d'EMOM tombait à 2,2:1 et sur le gris de BASIC à
 * 2,8:1 (audit du 24/09/2026). TABATA (tone 'dark') est toujours en noir.
 * Sert aussi à LaunchMorph (app/home.js), qui reprend le texte du bouton.
 */
export const INK_TEXT = INK;
export function accentTextOn(hex, tone = 'light') {
  if (tone === 'dark') return INK;
  const L = relativeLuminance(hex);
  if (L == null) return WHITE;
  return 1.05 / (L + 0.05) >= 3 ? WHITE : INK;
}

/**
 * Recette visuelle d'un bouton.
 * - variant : 'solid' | 'accent' | 'glass' | 'danger' | 'premium' | 'spectrum' | 'ghost'
 * - tone    : 'light' (texte clair, cas général) | 'dark' (texte noir : TABATA)
 * - color   : couleur du mode, pour 'accent'
 *
 * Retourne { fill, fillDirection, backgroundColor, borderColor, borderWidth,
 *            inner, outer, sheen, textColor, overlay, shine }
 *   fill    : arrêts de dégradé (LinearGradient) ou null
 *   inner   : boxShadow intérieur (liseré lumineux, épaisseur)
 *   outer   : boxShadow extérieur (lueur + ombre portée)
 *   sheen   : reflet du haut [haut, bas] ou null
 *   overlay : couleur du voile d'enfoncement au toucher
 *   shine   : reflet qui traverse le bouton, activé par défaut ou non
 */
export function buttonRecipe({ variant = 'solid', tone = 'light', color } = {}) {
  const dark = tone === 'dark';

  switch (variant) {
    case 'accent':
    case 'danger':
    case 'premium': {
      const base = variant === 'danger' ? DANGER : variant === 'premium' ? GOLD : color || WHITE;
      const text = variant === 'premium' ? INK : accentTextOn(base, variant === 'accent' ? tone : 'light');
      return {
        fill: [lift(base, 0.07), base, lift(base, -0.08)],
        fillDirection: 'vertical',
        backgroundColor: base,
        borderColor: 'rgba(255,255,255,0.22)',
        borderWidth: 1,
        inner: 'inset 0 1px 0 rgba(255,255,255,0.38), inset 0 -2px 0 rgba(0,0,0,0.14)',
        outer: `0 12px 28px -10px ${withAlpha(base, 0.75)}, 0 3px 8px rgba(0,0,0,0.28)`,
        sheen: ['rgba(255,255,255,0.20)', 'rgba(255,255,255,0)'],
        textColor: text,
        overlay: 'rgba(0,0,0,0.10)',
        shine: true,
      };
    }

    case 'spectrum':
      return {
        fill: SPECTRUM,
        fillDirection: 'horizontal',
        backgroundColor: SPECTRUM[2],
        borderColor: 'rgba(255,255,255,0.28)',
        borderWidth: 1,
        inner: 'inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -2px 0 rgba(0,0,0,0.12)',
        outer: '0 12px 30px -12px rgba(255,255,255,0.35), 0 3px 8px rgba(0,0,0,0.30)',
        sheen: ['rgba(255,255,255,0.26)', 'rgba(255,255,255,0)'],
        // Texte noir : le blanc ne se lit pas sur la partie jaune du dégradé,
        // et l'ombre de texte qui compensait faisait « bon marché ».
        textColor: INK,
        overlay: 'rgba(0,0,0,0.10)',
        shine: true,
      };

    case 'glass':
      return dark
        ? {
            fill: null,
            backgroundColor: 'rgba(10,10,10,0.10)',
            borderColor: 'rgba(10,10,10,0.18)',
            borderWidth: 1,
            inner: 'inset 0 1px 0 rgba(255,255,255,0.40)',
            outer: '0 8px 18px -10px rgba(0,0,0,0.35)',
            sheen: ['rgba(255,255,255,0.24)', 'rgba(255,255,255,0)'],
            textColor: INK,
            overlay: 'rgba(10,10,10,0.10)',
            shine: false,
          }
        : {
            fill: null,
            backgroundColor: 'rgba(255,255,255,0.10)',
            borderColor: 'rgba(255,255,255,0.18)',
            borderWidth: 1,
            inner: 'inset 0 1px 0 rgba(255,255,255,0.24)',
            outer: '0 8px 20px -10px rgba(0,0,0,0.55)',
            sheen: ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)'],
            textColor: WHITE,
            overlay: 'rgba(255,255,255,0.12)',
            shine: false,
          };

    case 'ghost':
      return {
        fill: null,
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        borderWidth: 0,
        inner: null,
        outer: null,
        sheen: null,
        textColor: dark ? 'rgba(10,10,10,0.72)' : 'rgba(255,255,255,0.72)',
        overlay: dark ? 'rgba(10,10,10,0.08)' : 'rgba(255,255,255,0.10)',
        shine: false,
      };

    case 'solid':
    default:
      // « Porcelaine » : le blanc n'est plus un aplat, il a un relief (dégradé,
      // liseré du bas plus sombre) et diffuse une lueur claire.
      return dark
        ? {
            fill: ['#2C2C31', '#151518', INK],
            fillDirection: 'vertical',
            backgroundColor: INK,
            borderColor: 'rgba(255,255,255,0.10)',
            borderWidth: 1,
            inner: 'inset 0 1px 0 rgba(255,255,255,0.20)',
            outer: '0 12px 26px -10px rgba(0,0,0,0.60), 0 3px 8px rgba(0,0,0,0.30)',
            sheen: ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)'],
            textColor: WHITE,
            overlay: 'rgba(255,255,255,0.10)',
            shine: false,
          }
        : {
            fill: [WHITE, '#F3F3F5', '#E2E2E7'],
            fillDirection: 'vertical',
            backgroundColor: WHITE,
            borderColor: 'rgba(255,255,255,0.60)',
            borderWidth: 1,
            inner: 'inset 0 -2px 0 rgba(0,0,0,0.10)',
            outer: '0 12px 30px -12px rgba(255,255,255,0.40), 0 4px 10px rgba(0,0,0,0.32)',
            sheen: null,
            textColor: INK,
            overlay: 'rgba(0,0,0,0.08)',
            shine: false,
          };
  }
}
