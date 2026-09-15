import { useCallback, useRef, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GradientBackground from '../components/common/GradientBackground';
import HistoryPage from '../components/screens/HistoryPage';
import PlanningPage from '../components/screens/PlanningPage';
import { haptic } from '../hooks/useHaptic';

const PAGES = ['history', 'planning'];
const keyExtractor = (item) => item;

export default function History() {
  const listRef = useRef(null);
  const [rootW, setRootW] = useState(0);
  const [rootH, setRootH] = useState(0);
  const [page, setPage] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Mesure locale plutôt que Dimensions : la largeur d'une page doit suivre
  // le conteneur réel (barres système, découpes), sinon le pagingEnabled
  // s'aligne sur une largeur légèrement fausse et la page dérive.
  const handleLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    setRootW(width);
    setRootH(height);
  };

  const goToPage = (index) => {
    listRef.current?.scrollToIndex({ index, animated: true });
  };

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
        <HistoryPage width={rootW} height={rootH} pageIndex={page} onSelectPage={goToPage} />
      ) : (
        <PlanningPage
          width={rootW}
          height={rootH}
          screenH={rootH}
          pageIndex={page}
          onSelectPage={goToPage}
          onSheetChange={setSheetOpen}
        />
      ),
    [rootW, rootH, page]
  );

  return (
    <GradientBackground colors={['#1A1A1A', '#0A0A0A', '#000000']} ambient>
      {/* Pas de marge basse ici : les feuilles du planning sont rendues dans la
          page et doivent couvrir jusqu'au bas physique de l'écran. Chaque page
          ajoute l'inset bas elle-même sur sa barre d'action. */}
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.root} onLayout={handleLayout}>
          {rootW > 0 && (
            <FlatList
              ref={listRef}
              data={PAGES}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              horizontal
              pagingEnabled
              scrollEnabled={!sheetOpen}
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              onMomentumScrollEnd={handleMomentumEnd}
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
