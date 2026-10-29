/**
 * Vent de l'ambiance — UNE valeur partagée entre le carrousel de l'accueil et les décors.
 *
 * L'accueil y écrit le décalage du carrousel par rapport à la page affichée, en dp
 * (positif : le contenu part vers la droite), borné à ±AMBIANCE_WIND_MAX. Au relâché le
 * carrousel se cale seul sur sa page : la valeur retombe à 0 d'elle-même.
 * Les décors la lisent sur le fil d'interface (useDerivedValue / useAnimatedStyle) :
 * couronnes de graduations qui tournent comme un cadran, glyphes qui suivent le doigt,
 * motifs du fond poussés avec de la parallaxe, point actif qui s'étire, reflet de Lancer.
 *
 * `makeMutable` : valeur partagée créée hors composant (pas besoin de la faire passer
 * par les props). Elle vaut 0 partout sauf pendant un glissé sur l'accueil.
 */
import { makeMutable } from 'react-native-reanimated';

export const AMBIANCE_WIND_MAX = 220;

export const ambianceWind = makeMutable(0);
