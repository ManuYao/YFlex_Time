import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

import GradientBackground from '../components/common/GradientBackground';
import AppIcon from '../components/common/AppIcon';
import IconButton from '../components/common/IconButton';
import { TIMERS, getModeGuide } from '../lib/timers-config';
import { fonts } from '../lib/fonts';
import { getTokens } from '../lib/tokens';
import { useHaptic } from '../hooks/useHaptic';

/**
 * "Voir plus" depuis HowToSheet — une vraie page (pas une feuille) pour aller
 * plus loin que le mécanisme (déjà couvert par getHowToItems) : d'où vient le
 * format, dans quels sports on le retrouve. Volontairement pas prescriptif :
 * des pistes, jamais des règles fermées — c'est le sportif qui choisit ses
 * exercices, l'app ne fait que tenir le temps (demande utilisateur, v14.15.0).
 */
export default function ModeGuide() {
  const router = useRouter();
  const haptic = useHaptic();
  const { id } = useLocalSearchParams();
  const timer = TIMERS.find((t) => t.id === id) ?? TIMERS[0];
  const tokens = getTokens(timer.textMode);
  const sections = getModeGuide(timer);

  return (
    <GradientBackground colors={timer.bgColors} ambient textMode={timer.textMode}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <IconButton
            icon="back"
            tone={timer.textMode}
            haptic={haptic.light}
            onPress={() => router.back()}
            accessibilityLabel="Retour"
          />
          <View style={styles.topBarGhost} />
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.iconBox, { backgroundColor: `${tokens.primary}1A` }]}>
            <AppIcon name={timer.id} size={26} color={tokens.primary} />
          </View>
          <Text style={[styles.kicker, { color: tokens.tertiary }]}>{timer.tag}</Text>
          <Text style={[styles.title, { color: tokens.primary }]}>{timer.name}</Text>
          <Text style={[styles.subtitle, { color: tokens.secondary }]}>{timer.full}</Text>

          {sections.map((section, i) => (
            <View key={i} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: tokens.primary }]}>{section.title}</Text>
              <Text style={[styles.sectionText, { color: tokens.secondary }]}>{section.text}</Text>
            </View>
          ))}

          <Text style={[styles.footnote, { color: tokens.muted }]}>
            Ce ne sont que des pistes — à toi de choisir les exercices qui te correspondent.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  topBarGhost: {
    width: 44,
    height: 44,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  kicker: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 3,
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 40,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 28,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    letterSpacing: -0.2,
    marginBottom: 7,
  },
  sectionText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    lineHeight: 21,
  },
  footnote: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
});
