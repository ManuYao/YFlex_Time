import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import Animated, {
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';

import GradientBackground from '../components/common/GradientBackground';
import AmbianceBackdrop from '../components/common/AmbianceBackdrop';
import HistoryPage from '../components/screens/HistoryPage';
import PlanningPage from '../components/screens/PlanningPage';
import { haptic } from '../hooks/useHaptic';
import { AMBIANCE_WIND_MAX, ambianceWind } from '../lib/ambianceMotion';

const PAGES = ['history', 'planning'];
const keyExtractor = (item) => item;

export default function History() {
  const listRef = useAnimatedRef();
  // Arrivée directe sur le planning (conseil de surcharge progressive depuis
  // l'accueil, lib/progression.js) : `page=planning`, plus l'étiquette à
  // ouvrir quand elle existe encore. Lus une seule fois au montage.
  const params = useLocalSearchParams();
  const [initialPage] = useState(() => (params.page === 'planning' ? 1 : 0));
  const [focus] = useState(() =>
    params.page === 'planning' && params.dayKey
      ? { dayKey: params.dayKey, blockId: params.blockId, tagId: params.tagId }
      : null
  );
  const [rootW, setRootW] = useState(0);
  const [rootH, setRootH] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Vent de l'ambiance de saison (lib/ambianceMotion.js), comme sur le carrousel de
  // l'accueil : le glissé entre Historique et Planning pousse les motifs du fond et
  // fait tourner les couronnes des boutons du haut. Écart par rapport à la page la
  // plus proche, en dp ; retombe tout seul à 0 quand le pager se pose. Allumé 800 ms
  // après le montage seulement (saut de `initialScrollIndex` à ignorer), à 0 en
  // quittant l'écran.
  const pageW = useSharedValue(1);
  const windOn = useSharedValue(0);
  useEffect(() => {
    pageW.value = rootW || 1;
  }, [rootW]);
  useEffect(() => {
    ambianceWind.value = 0;
    const timer = setTimeout(() => {
      windOn.value = 1;
    }, 800);
    return () => {
      clearTimeout(timer);
      windOn.value = 0;
      ambianceWind.value = 0;
    };
  }, []);
  useFocusEffect(
    useCallback(
      () => () => {
        ambianceWind.value = 0;
      },
      []
    )
  );
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      if (windOn.value !== 1) return;
      const x = e.contentOffset.x;
      const w = pageW.value;
      const dx = -(x - Math.round(x / w) * w);
      ambianceWind.value = Math.max(-AMBIANCE_WIND_MAX, Math.min(AMBIANCE_WIND_MAX, dx));
    },
  });

  // Mesure locale plutôt que Dimensions : la largeur d'une page doit suivre
  // le conteneur réel (barres système, découpes), sinon le pagingEnabled
  // s'aligne sur une largeur légèrement fausse et la page dérive.
  const handleLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    setRootW(width);
    setRootH(height);
  };

  // Identité stable : HistoryPage est mémoïsée, une fonction recréée à chaque
  // rendu lui ferait refaire tout son contenu pour rien.
  const goToPage = useCallback((index) => {
    listRef.current?.scrollToIndex({ index, animated: true });
  }, []);

  const handleMomentumEnd = (e) => {
    if (!rootW) return;
    const index = Math.round(e.nativeEvent.contentOffset.x / rootW);
    if (index !== page) {
      setPage(index);
      haptic.selection();
    }
  };

  const renderItem = useCallback(
    ({ item }) =>
      item === 'history' ? (
        <HistoryPage
          width={rootW}
          height={rootH}
          pageIndex={page}
          onSelectPage={goToPage}
        />
      ) : (
        <PlanningPage
          width={rootW}
          height={rootH}
          screenH={rootH}
          pageIndex={page}
          onSelectPage={goToPage}
          onSheetChange={setSheetOpen}
          focus={focus}
        />
      ),
    [rootW, rootH, page, focus]
  );

  return (
    <GradientBackground colors={['#1A1A1A', '#0A0A0A', '#000000']} ambient>
      {/* Décor de saison : derrière tout (lueur, motifs qui flottent, passage rare).
          Les deux pages sont transparentes, il se voit à travers. */}
      <AmbianceBackdrop tone="light" />
      {/* Pas de marge basse ici : les feuilles du planning sont rendues dans la
          page et doivent couvrir jusqu'au bas physique de l'écran. Chaque page
          ajoute l'inset bas elle-même sur sa barre d'action. */}
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.root} onLayout={handleLayout}>
          {rootW > 0 && (
            <Animated.FlatList
              ref={listRef}
              data={PAGES}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              horizontal
              pagingEnabled
              initialScrollIndex={initialPage}
              scrollEnabled={!sheetOpen}
              // Les feuilles du planning vivent DANS ce pager : en 'never', il
              // volerait le 1er appui sur leurs boutons pour fermer le clavier.
              // Hors feuille, 'never' reste voulu : cet appui ferme le clavier,
              // donc enregistre la note du jour avant de changer de jour.
              keyboardShouldPersistTaps={sheetOpen ? 'handled' : 'never'}
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              onMomentumScrollEnd={handleMomentumEnd}
              onScroll={scrollHandler}
              scrollEventThrottle={16}
              getItemLayout={(_, index) => ({
                length: rootW,
                offset: rootW * index,
                index,
              })}
            />
          )}
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  root: { flex: 1 },
});
