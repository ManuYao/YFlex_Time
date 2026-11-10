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
import { formatMb, formatDelta, formatMs, formatClock } from '../lib/memoryProbeShape';
import {
  isNativeMemoryAvailable,
  subscribeNativeMemory,
  resetNativeBaseline,
} from '../lib/nativeMemory';
import { describeNative, diagnoseNative } from '../lib/nativeMemoryShape';
import { getEcoDebug, subscribeEcoDebug, setEcoSimulation } from '../lib/batteryEco';
import { getLightDebug, subscribeLightDebug, setHeatSimulation } from '../lib/lightMode';

const LIGHT_LABELS = ['Normaux', 'Ralentis', 'Coupés'];
import {
  isMemoryReadable,
  subscribeMemory,
  subscribePerf,
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
  const [perf, setPerf] = useState(null);
  const [track, setTrack] = useState(null);
  const [eco, setEco] = useState(getEcoDebug());
  const [light, setLight] = useState(getLightDebug());
  const readable = isMemoryReadable();
  // Mémoire NATIVE, chauffe, processeur par fil : seulement avec le module natif
  // de l'APK récent (sinon rien n'est affiché ni mesuré).
  const nativeOn = isNativeMemoryAvailable();

  useEffect(() => subscribeMemory(setStats), []);
  useEffect(() => (nativeOn ? subscribeNativeMemory(setTrack) : undefined), [nativeOn]);
  useEffect(() => subscribePerf(setPerf), []);
  useEffect(() => {
    setEco(getEcoDebug());
    return subscribeEcoDebug(() => setEco(getEcoDebug()));
  }, []);
  useEffect(() => {
    setLight(getLightDebug());
    return subscribeLightDebug(() => setLight(getLightDebug()));
  }, []);
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
                  resetNativeBaseline();
                }}
                style={styles.cta}
              />
            </View>
          )}

          {nativeOn && track && track.now ? (
            <View style={styles.card}>
              <Text style={styles.cardKicker}>MÉMOIRE TOTALE, CHAUFFE ET PROCESSEUR</Text>
              {diagnoseNative(track).map((d, i) => (
                <Text
                  key={`diag-${i}`}
                  style={[
                    styles.diagRow,
                    { color: d.level === 'bad' ? '#FF5454' : d.level === 'warn' ? '#FFC933' : '#7CF0B4' },
                  ]}
                >
                  {d.text}
                </Text>
              ))}
              {describeNative(track).map((r) => (
                <View key={r.key} style={styles.nativeRow}>
                  <Text style={styles.nativeLabel}>{r.label}</Text>
                  <Text style={styles.nativeValue}>
                    {r.value}
                    {r.delta ? `  ${r.delta}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardKicker}>MODE ALLÉGÉ · BATTERIE ET CHAUFFE</Text>
            {!eco.available ? (
              <Text style={[styles.cardBody, styles.perfHint]}>
                Disponible avec l'APK 18.6.0 ou plus récent (lecture de la batterie).
              </Text>
            ) : (
              <>
                <View style={styles.nativeRow}>
                  <Text style={styles.nativeLabel}>Batterie</Text>
                  <Text style={styles.nativeValue}>
                    {eco.pct == null ? '—' : `${Math.round(eco.pct)} %`}
                    {eco.simulating ? '  (simulée)' : ''}
                  </Text>
                </View>
                <View style={styles.nativeRow}>
                  <Text style={styles.nativeLabel}>Chauffe</Text>
                  <Text style={styles.nativeValue}>
                    {light.thermalStatus == null ? 'statut —' : `statut ${light.thermalStatus}`}
                    {light.batteryTempC == null ? '' : `  ${light.batteryTempC.toFixed(1)} °C`}
                    {light.simulating ? '  (simulée)' : ''}
                  </Text>
                </View>
                <View style={styles.nativeRow}>
                  <Text style={styles.nativeLabel}>Effets de décor</Text>
                  <Text style={styles.nativeValue}>{LIGHT_LABELS[light.applied] || '—'}</Text>
                </View>
                {light.target !== light.applied ? (
                  <Text style={[styles.diagRow, { color: '#FFC933' }]}>
                    {`Changement prévu au prochain changement d’écran : ${(LIGHT_LABELS[light.target] || '').toLowerCase()}.`}
                  </Text>
                ) : null}
                {eco.target && eco.minutesLeft != null ? (
                  <Text style={[styles.cardBody, styles.perfHint]}>
                    {`Retour des décors dans environ ${eco.minutesLeft} min (batterie à 25 % ou plus).`}
                  </Text>
                ) : null}
                <Text style={[styles.cardBody, styles.perfHint]}>
                  Téléphone chaud : effets ralentis (niveau 1), puis coupés s'il chauffe vraiment ou
                  si la batterie est à 20 % ou moins (niveau 2). On monte vite ; on redescend après
                  10 minutes au frais (batterie : 3 minutes à 25 % ou plus). Les flammes restent.
                  Ce n'est pas un réglage : on ne peut pas le forcer dans l'autre sens.
                </Text>
                <Button
                  variant="glass"
                  size="md"
                  label={eco.simulating ? 'Fin de la simulation batterie' : 'Simuler 19 % de batterie'}
                  onPress={() => {
                    haptic.light();
                    setEcoSimulation(eco.simulating ? null : 19);
                  }}
                  style={[styles.cta, { marginTop: 12 }]}
                />
                <Button
                  variant="glass"
                  size="md"
                  label="Simuler : téléphone chaud (ralenti)"
                  onPress={() => {
                    haptic.light();
                    setHeatSimulation(1);
                  }}
                  style={[styles.cta, { marginTop: 8 }]}
                />
                <Button
                  variant="glass"
                  size="md"
                  label="Simuler : téléphone très chaud (coupé)"
                  onPress={() => {
                    haptic.light();
                    setHeatSimulation(2);
                  }}
                  style={[styles.cta, { marginTop: 8 }]}
                />
                {light.simulating ? (
                  <Button
                    variant="glass"
                    size="md"
                    label="Fin de la simulation chaleur"
                    onPress={() => {
                      haptic.light();
                      setHeatSimulation(null);
                    }}
                    style={[styles.cta, { marginTop: 8 }]}
                  />
                ) : null}
              </>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardKicker}>FLUIDITÉ</Text>
            {!badgeOn ? (
              <Text style={[styles.cardBody, styles.perfHint]}>
                Affiche le compteur ci-dessous pour mesurer la fluidité (images par seconde et
                moments où l'app se fige).
              </Text>
            ) : !perf || perf.seconds === 0 ? (
              <Text style={[styles.cardBody, styles.perfHint]}>Mesure en cours…</Text>
            ) : (
              <>
                <View style={styles.row}>
                  <Metric label="Images / s" value={perf.fps == null ? '—' : String(perf.fps)} />
                  <Metric label="Pire image" value={formatMs(perf.worstFrameAll?.ms)} />
                  <Metric label="Pire gel" value={formatMs(perf.worstStallAll?.ms)} />
                </View>
                <Text style={styles.cardBody}>
                  {`${perf.slowAll} images lentes sur ${perf.seconds} s mesurées.`}
                </Text>
                <Text style={styles.cardKicker}>GROS MOMENTS (image {'>'} 100 ms ou gel {'>'} 300 ms)</Text>
                {perf.events.length === 0 ? (
                  <Text style={[styles.cardBody, styles.eventEmpty]}>Aucun pour l'instant.</Text>
                ) : (
                  perf.events
                    .slice()
                    .reverse()
                    .map((e, i) => (
                      <Text key={`${e.at}-${i}`} style={styles.eventRow}>
                        {`${formatClock(e.at)}  ${e.path || '/'}  image ${formatMs(e.frame)}  gel ${formatMs(e.stall)}`}
                      </Text>
                    ))
                )}
              </>
            )}
          </View>

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
  diagRow: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  nativeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
    marginTop: 8,
  },
  nativeLabel: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  nativeValue: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  perfHint: { marginTop: 8, marginBottom: 0 },
  eventEmpty: { marginTop: 6, marginBottom: 0 },
  eventRow: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },
  footnote: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 8,
  },
});
