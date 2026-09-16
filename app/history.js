import { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  scrollTo,
  useAnimatedRef,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import GradientBackground from '../components/common/GradientBackground';
import HistoryPage from '../components/screens/HistoryPage';
import PlanningPage from '../components/screens/PlanningPage';
import { haptic } from '../hooks/useHaptic';
import { easeImpact, springSheet } from '../lib/animations';

const PAGES = ['history', 'planning'];
const keyExtractor = (item) => item;

// Largeur de la bande de Planning dévoilée par l'aperçu automatique (mission
// "hint de bascule") : assez pour voir le bouton retour et le début du
// carrousel des jours, jamais assez pour changer de page.
const PEEK_PX = 56;

export default function History() {
  const listRef = useAnimatedRef();
  const [rootW, setRootW] = useState(0);
  const [rootH, setRootH] = useState(0);
  const [page, setPage] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Décalage programmatique du pager, piloté uniquement par l'aperçu. Il
  // n'est PAS resynchronisé sur le scroll de l'utilisateur (sinon boucle
  // scrollTo → onScroll → scrollTo) : il ne sert que depuis la page 0.
  const peekX = useSharedValue(0);
  useDerivedValue(() => {
    scrollTo(listRef, peekX.value, 0, false);
  });

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

  const peek = useCallback(() => {
    // Rythme aligné sur la carte "pressée" côté HistoryPage (glissement lent,
    // maintien net, retour posé) plutôt qu'un flash — demande explicite après
    // test de l'utilisateur.
    peekX.value = withSequence(
      withTiming(PEEK_PX, { duration: 420, easing: easeImpact }),
      withDelay(680, withSpring(0, springSheet))
    );
  }, []);

  // Remise à zéro instantanée : l'utilisateur vient de poser le doigt, un
  // retour animé se battrait avec son propre geste de scroll.
  const cancelPeek = useCallback(() => {
    cancelAnimation(peekX);
    peekX.value = 0;
  }, []);

  const renderItem = useCallback(
    ({ item }) =>
      item === 'history' ? (
        <HistoryPage
          width={rootW}
          height={rootH}
          pageIndex={page}
          onSelectPage={goToPage}
          onPeek={peek}
          onPeekCancel={cancelPeek}
        />
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
            <Animated.FlatList
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
