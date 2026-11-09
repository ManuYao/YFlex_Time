import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import GradientBackground from '../components/common/GradientBackground';
import Button from '../components/common/Button';
import IconButton from '../components/common/IconButton';
import { goBackSafe } from '../lib/navigation';
import { fonts } from '../lib/fonts';
import { ROUND_SIZE } from '../lib/buttonTokens';
import { useHaptic } from '../hooks/useHaptic';
import { formatMb, formatDelta } from '../lib/memoryProbeShape';
import {
  isMemoryReadable,
  subscribeMemory,
  resetMemoryBaseline,
  loadMemoryBadge,
  subscribeMemoryBadge,
  setMemoryBadge,
} from '../lib/memoryProbe';

/**
 * Paramètres › Mémoire : mesure en direct de la mémoire du CODE de l'app, pour
 * remplacer les impressions (« ça rame après un long MIX ») par des chiffres.
 * Lecture et explications : lib/memoryProbeShape.js.
 */
export default function Diagnostic() {
  const router = useRouter();
  const haptic = useHaptic();
  const [stats, setStats] = useState(null);
  const [badgeOn, setBadgeOn] = useState(false);
  const readable = isMemoryReadable();

  useEffect(() => subscribeMemory(setStats), []);
  useEffect(() => {
    loadMemoryBadge();
    return subscribeMemoryBadge(setBadgeOn);
  }, []);

  return (
    <GradientBackground colors={['#1A1A1A', '#0A0A0A', '#000000']} ambient>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <IconButton
            icon="back"
            haptic={haptic.light}
            onPress={() => goBackSafe(router)}
            accessibilityLabel="Retour"
          />
          <Text style={styles.topTitle}>Mémoire</Text>
          <View style={styles.ghost} />
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.intro}>
            Un outil pour mesurer si l'app garde des choses en mémoire sans en avoir besoin.
            Fais ton parcours habituel (régler des modes, lancer une séance, revenir au menu),
            puis regarde les chiffres.
          </Text>

          {!readable ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Mesure indisponible</Text>
              <Text style={styles.cardBody}>
                Ce téléphone ne donne pas cette information à l'app (elle n'existe pas en mode
                développement, seulement dans l'app installée).
              </Text>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardKicker}>MÉMOIRE DU CODE</Text>
              <Text style={styles.big}>{formatMb(stats?.now)}</Text>
              <Text style={styles.delta}>
                {stats ? `${formatDelta(stats.now, stats.base)} depuis le départ` : ''}
              </Text>

              <View style={styles.row}>
                <Metric label="Départ" value={formatMb(stats?.base)} />
                <Metric label="Plancher" value={formatMb(stats?.min)} />
                <Metric label="Pic" value={formatMb(stats?.max)} />
              </View>

              <Button
                variant="glass"
                size="md"
                label="Repartir de zéro"
                onPress={() => {
                  haptic.light();
                  resetMemoryBaseline();
                }}
                style={styles.cta}
              />
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Compteur sur tous les écrans</Text>
            <Text style={styles.cardBody}>
              Affiche un petit chiffre en haut à droite de chaque écran (mémoire actuelle et plus
              bas atteint), pour le suivre pendant que tu utilises l'app. Aucun coût quand il est
              coupé.
            </Text>
            <Button
              variant={badgeOn ? 'solid' : 'glass'}
              size="md"
              label={badgeOn ? 'Masquer le compteur' : 'Afficher le compteur'}
              onPress={() => {
                haptic.light();
                setMemoryBadge(!badgeOn);
              }}
              style={styles.cta}
            />
          </View>

          <Text style={styles.footnote}>
            Comment lire : la mémoire monte et descend en dents de scie (l'app fait le ménage de
            temps en temps). Le chiffre qui compte est le PLANCHER : s'il monte écran après écran
            sans jamais redescendre, quelque chose s'accumule. Ce compteur mesure la mémoire du
            code ; la mémoire totale de l'app (images, sons, animations) viendra avec une
            prochaine version de l'application.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  ghost: { width: ROUND_SIZE.nav, height: ROUND_SIZE.nav },
  topTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 24, paddingBottom: 40 },
  intro: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.60)',
    marginBottom: 22,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 18,
    marginBottom: 14,
  },
  cardKicker: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.5)',
  },
  cardTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  cardBody: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.60)',
    marginBottom: 14,
  },
  big: {
    fontFamily: fonts.monoExtraBold,
    fontSize: 40,
    color: '#FFFFFF',
    marginTop: 6,
  },
  delta: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: '#7CF0B4',
    marginTop: 2,
    marginBottom: 16,
  },
  row: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  metric: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  metricLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontFamily: fonts.monoBold,
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 4,
  },
  cta: { alignSelf: 'flex-start' },
  footnote: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 8,
  },
});
