import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import AppIcon from '../common/AppIcon';
import BadgeMedal from '../common/BadgeMedal';
import Button from '../common/Button';
import HeatmapGrid from '../common/HeatmapGrid';
import TickRing from '../common/TickRing';
import { fonts } from '../../lib/fonts';
import { getCategory } from '../../lib/exercises';
import { formatTimeLabel } from '../../lib/profileStats';

/* ─────────────────────────────────────────────────────────────────
   Bilan de saison — les cartes (app/season-recap.js les assemble).
   Même grammaire que le reste de l'app : fond à la couleur d'un mode ou de la
   saison, anneau à graduations, Anton pour les chiffres, icônes maison.
   Chaque carte reçoit `ink` (les tokens du mode de texte du fond).
   ────────────────────────────────────────────────────────────────*/

const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// Apparition en cascade, sur le fil d'interface (opacité + léger glissement).
// Pas de `entering` : il peut figer un nœud à opacity 0 quand ses enfants
// changent juste après une mesure (piège documenté sur MaintenanceScreen).
export function Reveal({ delay = 0, children, style }) {
  const reduced = useReducedMotion();
  const p = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    p.value = withDelay(delay, withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) }));
  }, [delay, reduced, p]);
  const anim = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: (1 - p.value) * 18 }],
  }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

// Compteur qui monte. Mis à jour une vingtaine de fois seulement : un simple
// texte, pas de quoi charger le fil JavaScript.
export function CountUp({ to, delay = 250, duration = 900, style, suffix = '' }) {
  const reduced = useReducedMotion();
  const [v, setV] = useState(reduced ? to : 0);
  const raf = useRef(null);
  useEffect(() => {
    if (reduced) {
      setV(to);
      return undefined;
    }
    let start = null;
    const t = setTimeout(() => {
      const step = (ts) => {
        if (start === null) start = ts;
        const k = Math.min(1, (ts - start) / duration);
        setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(t);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [to, delay, duration, reduced]);
  return <Text style={style}>{`${v}${suffix}`}</Text>;
}

const Eyebrow = ({ children, ink }) => (
  <Text style={[styles.eyebrow, { color: ink.muted }]}>{children}</Text>
);

const plural = (n, one, many) => (n > 1 ? many : one);

/* ───────────── Cartes gratuites ───────────── */

export function IntroCard({ recap, ink, season }) {
  const [lit, setLit] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLit(true), 350);
    return () => clearTimeout(t);
  }, []);
  const progress = recap.totalDays > 0 ? recap.activeDays / recap.totalDays : 0;
  return (
    <View style={styles.center}>
      <Reveal>
        <Eyebrow ink={ink}>{`BILAN · ${recap.label.toUpperCase()} ${recap.yearLabel}`}</Eyebrow>
      </Reveal>
      <Reveal delay={120} style={styles.ringBox}>
        <TickRing
          size={248}
          progress={Math.max(0.04, progress)}
          colorActive={season.accent}
          colorInactive={ink.ringInactive}
          lit={lit}
        />
        <View style={styles.ringCenter} pointerEvents="none">
          <CountUp to={recap.activeDays} style={[styles.hugeNumber, { color: ink.primary }]} />
          <Text style={[styles.unit, { color: ink.tertiary }]}>
            {plural(recap.activeDays, 'JOUR ACTIF', 'JOURS ACTIFS')}
          </Text>
        </View>
      </Reveal>
      <Reveal delay={260}>
        <Text style={[styles.title, { color: ink.primary }]}>{recap.title.toUpperCase()}</Text>
      </Reveal>
      <Reveal delay={360}>
        <Text style={[styles.caption, { color: ink.tertiary }]}>
          {recap.inProgress
            ? 'Saison en cours : un aperçu de ce que tu as fait jusqu’ici.'
            : recap.partial
              ? `Tu as démarré le ${recap.startedLabel}. Voici ta saison.`
              : 'Voici ce que tu as accompli pendant ces trois mois.'}
        </Text>
      </Reveal>
    </View>
  );
}

export function NumbersCard({ recap, ink }) {
  return (
    <View style={styles.center}>
      <Reveal>
        <Eyebrow ink={ink}>EN CHIFFRES</Eyebrow>
      </Reveal>
      <Reveal delay={100} style={styles.statBlock}>
        <CountUp to={recap.sessionCount} style={[styles.bigNumber, { color: ink.primary }]} />
        <Text style={[styles.unit, { color: ink.tertiary }]}>
          {plural(recap.sessionCount, 'SÉANCE', 'SÉANCES')}
        </Text>
      </Reveal>
      <Reveal delay={260} style={styles.statBlock}>
        <Text style={[styles.bigNumber, { color: ink.primary }]}>{recap.timeLabel}</Text>
        <Text style={[styles.unit, { color: ink.tertiary }]}>DE CHRONO AU TOTAL</Text>
      </Reveal>
      <Reveal delay={420}>
        <Text style={[styles.caption, { color: ink.tertiary }]}>
          {`Sur ${recap.activeDays} ${plural(recap.activeDays, 'jour', 'jours')} différents. Chaque exercice d’un MIX compte pour une séance.`}
        </Text>
      </Reveal>
    </View>
  );
}

export function ModeCard({ recap, ink }) {
  const modes = recap.modes;
  const total = modes.reduce((n, m) => n + m.count, 0) || 1;
  const alphas = [1, 0.55, 0.34, 0.22, 0.15];
  return (
    <View style={styles.center}>
      <Reveal>
        <Eyebrow ink={ink}>TON MODE DE LA SAISON</Eyebrow>
      </Reveal>
      <Reveal delay={100} style={styles.modeIconWrap}>
        <AppIcon name={recap.topMode.id} size={64} color={ink.primary} />
      </Reveal>
      <Reveal delay={180}>
        <Text style={[styles.hugeWord, { color: ink.primary }]}>{recap.topMode.name}</Text>
      </Reveal>
      <Reveal delay={280}>
        <Text style={[styles.caption, { color: ink.secondary }]}>
          {`${Math.round((recap.topMode.count / total) * 100)} % de tes séances.`}
        </Text>
      </Reveal>
      <Reveal delay={380} style={styles.barWrap}>
        <View style={[styles.barTrack, { backgroundColor: ink.ringInactive }]}>
          {modes.map((m, i) => (
            <View
              key={m.id}
              style={{
                flex: m.count,
                backgroundColor: ink.primary,
                opacity: alphas[Math.min(i, alphas.length - 1)],
                marginLeft: i === 0 ? 0 : 2,
              }}
            />
          ))}
        </View>
        <View style={styles.legend}>
          {modes.map((m, i) => (
            <View key={m.id} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: ink.primary, opacity: alphas[Math.min(i, alphas.length - 1)] },
                ]}
              />
              <Text style={[styles.legendText, { color: ink.secondary }]}>{`${m.count} ${m.name}`}</Text>
            </View>
          ))}
        </View>
      </Reveal>
    </View>
  );
}

export function RegularityCard({ recap, ink, season }) {
  return (
    <View style={styles.center}>
      <Reveal>
        <Eyebrow ink={ink}>RÉGULARITÉ</Eyebrow>
      </Reveal>
      <Reveal delay={100} style={styles.gridWrap}>
        <HeatmapGrid
          weeks={recap.weeks}
          dayLabels={DAY_LETTERS}
          color={season.accent}
          gap={3}
          maxCellHeight={22}
          showLegend={false}
        />
      </Reveal>
      <Reveal delay={260} style={styles.streakRow}>
        <AppIcon name="flame" size={28} color={ink.primary} />
        <CountUp to={recap.bestStreak} style={[styles.midNumber, { color: ink.primary }]} />
        <Text style={[styles.unit, { color: ink.tertiary, marginTop: 0 }]}>
          {`${plural(recap.bestStreak, 'JOUR', 'JOURS')} D’AFFILÉE, TA MEILLEURE SÉRIE`}
        </Text>
      </Reveal>
    </View>
  );
}

export function TrophiesCard({ recap, ink }) {
  const list = recap.trophies.slice(0, 6);
  return (
    <View style={styles.center}>
      <Reveal>
        <Eyebrow ink={ink}>TROPHÉES GAGNÉS</Eyebrow>
      </Reveal>
      <View style={styles.medals}>
        {list.map((t, i) => (
          <Reveal key={`${t.timerId}-${t.tier}`} delay={120 + i * 110} style={styles.medalItem}>
            <BadgeMedal tier={t.tier} size={86} value={t.threshold} timerId={t.timerId} glow />
            <Text style={[styles.medalName, { color: ink.primary }]}>{t.name}</Text>
            <Text style={[styles.medalTier, { color: ink.tertiary }]}>{t.tierLabel}</Text>
          </Reveal>
        ))}
      </View>
      <Reveal delay={200 + list.length * 110}>
        <Text style={[styles.caption, { color: ink.tertiary }]}>
          {`${recap.trophies.length} ${plural(recap.trophies.length, 'palier franchi', 'paliers franchis')} cette saison.`}
        </Text>
      </Reveal>
    </View>
  );
}

/* ───────────── Cartes Premium ───────────── */

export function TensionCard({ recap, ink }) {
  const d = recap.tension.deltaPct;
  const sd = recap.sessionsDeltaPct;
  const arrow = (v) => (v > 0 ? '+' : '');
  return (
    <View style={styles.center}>
      <Reveal>
        <Eyebrow ink={ink}>TEMPS SOUS TENSION</Eyebrow>
      </Reveal>
      <Reveal delay={120} style={styles.statBlock}>
        <Text style={[styles.bigNumber, { color: ink.primary }]}>{recap.tension.label}</Text>
        <Text style={[styles.unit, { color: ink.tertiary }]}>D’EFFORT RÉEL, REPOS EXCLU</Text>
      </Reveal>
      <Reveal delay={280} style={styles.compareBox}>
        {d !== null ? (
          <Text style={[styles.compareText, { color: ink.primary }]}>
            {`${arrow(d)}${d} % d’effort`}
            <Text style={{ color: ink.tertiary }}>{` face à ${recap.prevSeasonLabel}`}</Text>
          </Text>
        ) : (
          <Text style={[styles.compareText, { color: ink.tertiary }]}>
            {`Pas de ${recap.prevSeasonLabel} à comparer, c’est ta première référence.`}
          </Text>
        )}
        {sd !== null ? (
          <Text style={[styles.compareText, { color: ink.primary }]}>
            {`${arrow(sd)}${sd} % de séances`}
            <Text style={{ color: ink.tertiary }}>{` face à ${recap.prevSeasonLabel}`}</Text>
          </Text>
        ) : null}
      </Reveal>
    </View>
  );
}

export function ExercisesCard({ recap, ink }) {
  const top = recap.topExercises;
  const max = top[0]?.count || 1;
  return (
    <View style={styles.center}>
      <Reveal>
        <Eyebrow ink={ink}>TES EXERCICES</Eyebrow>
      </Reveal>
      <View style={styles.exList}>
        {top.map((e, i) => {
          const cat = getCategory(e.category);
          return (
            <Reveal key={`${e.category}-${e.label}`} delay={100 + i * 90}>
              <View style={styles.exRow}>
                <Text style={[styles.exName, { color: ink.primary }]} numberOfLines={1}>
                  {e.label}
                </Text>
                <Text style={[styles.exCount, { color: ink.secondary }]}>{`${e.count}×`}</Text>
              </View>
              <View style={[styles.exTrack, { backgroundColor: ink.ringInactive }]}>
                <View style={[styles.exFill, { width: `${Math.max(8, (e.count / max) * 100)}%`, backgroundColor: cat.color }]} />
              </View>
            </Reveal>
          );
        })}
      </View>
    </View>
  );
}

export function RhythmCard({ recap, ink }) {
  const r = recap.rhythm;
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  return (
    <View style={styles.center}>
      <Reveal>
        <Eyebrow ink={ink}>TON RYTHME</Eyebrow>
      </Reveal>
      {r.bestWeek ? (
        <Reveal delay={100} style={styles.rhythmBlock}>
          <Text style={[styles.rhythmValue, { color: ink.primary }]}>{r.bestWeek.range}</Text>
          <Text style={[styles.unit, { color: ink.tertiary }]}>
            {`TA MEILLEURE SEMAINE · ${r.bestWeek.units} ${plural(r.bestWeek.units, 'SÉANCE', 'SÉANCES')}`}
          </Text>
        </Reveal>
      ) : null}
      {r.bestWeekday ? (
        <Reveal delay={240} style={styles.rhythmBlock}>
          <Text style={[styles.rhythmValue, { color: ink.primary }]}>{cap(r.bestWeekday.name)}</Text>
          <Text style={[styles.unit, { color: ink.tertiary }]}>TON JOUR FAVORI</Text>
        </Reveal>
      ) : null}
      {r.slot ? (
        <Reveal delay={380} style={styles.rhythmBlock}>
          <Text style={[styles.rhythmValue, { color: ink.primary }]}>{cap(r.slot.label)}</Text>
          <Text style={[styles.unit, { color: ink.tertiary }]}>QUAND TU T’ENTRAÎNES LE PLUS</Text>
        </Reveal>
      ) : null}
    </View>
  );
}

export function LoadsCard({ recap, ink }) {
  return (
    <View style={styles.center}>
      <Reveal>
        <Eyebrow ink={ink}>TES CHARGES</Eyebrow>
      </Reveal>
      <View style={styles.exList}>
        {recap.loads.map((l, i) => (
          <Reveal key={`${l.category}-${l.label}`} delay={100 + i * 120} style={styles.loadRow}>
            <Text style={[styles.exName, { color: ink.primary }]} numberOfLines={1}>
              {l.label}
            </Text>
            <Text style={[styles.loadValue, { color: ink.primary }]}>
              {`${formatKg(l.from)} → ${formatKg(l.to)}`}
              <Text style={{ color: ink.tertiary }}>{`  +${formatKg(l.delta)}`}</Text>
            </Text>
          </Reveal>
        ))}
      </View>
      <Reveal delay={500}>
        <Text style={[styles.caption, { color: ink.tertiary }]}>Tu as pris de la force, et ça se voit.</Text>
      </Reveal>
    </View>
  );
}

const formatKg = (n) => `${Math.round(n * 10) / 10} kg`;

/* ───────────── Carte verrouillée (Premium) ───────────── */

// Pas de vraie donnée derrière : des barres factices, floutées par leur
// faible opacité, avec le cadenas. Elle donne envie sans rien révéler.
export function LockedCard({ title, teaser, ink, onPremium }) {
  return (
    <View style={styles.center}>
      <Reveal>
        <Eyebrow ink={ink}>{title}</Eyebrow>
      </Reveal>
      <Reveal delay={100} style={styles.lockedGhost}>
        {[0.9, 0.62, 0.78, 0.44].map((w, i) => (
          <View key={i} style={[styles.ghostBar, { width: `${w * 100}%`, backgroundColor: ink.primary }]} />
        ))}
        <View style={styles.lockBadge}>
          <AppIcon name="lock" size={30} color="#FFFFFF" />
        </View>
      </Reveal>
      <Reveal delay={240} style={styles.lockedText}>
        <View style={styles.crownRow}>
          <AppIcon name="crown" size={16} color="#F0C954" />
          <Text style={styles.crownLabel}>PREMIUM</Text>
        </View>
        <Text style={[styles.caption, { color: ink.secondary }]}>{teaser}</Text>
      </Reveal>
      <Reveal delay={360}>
        <Button variant="premium" size="md" icon="crown" label="Voir Premium" onPress={onPremium} />
      </Reveal>
    </View>
  );
}

/* ───────────── Dernière carte ───────────── */

export function EndCard({ recap, ink, isPremium, onPremium }) {
  return (
    <View style={styles.center}>
      <Reveal>
        <Eyebrow ink={ink}>À LA SAISON PROCHAINE</Eyebrow>
      </Reveal>
      <Reveal delay={120}>
        <Text style={[styles.title, { color: ink.primary }]}>
          {recap.inProgress ? 'ET CE N’EST PAS FINI' : 'BRAVO'}
        </Text>
      </Reveal>
      <Reveal delay={260}>
        <Text style={[styles.caption, { color: ink.secondary }]}>
          {`${recap.sessionCount} ${plural(recap.sessionCount, 'séance', 'séances')} · ${formatTimeLabel(recap.totalSeconds)} · ${recap.activeDays} ${plural(recap.activeDays, 'jour actif', 'jours actifs')}`}
        </Text>
      </Reveal>
      {!isPremium ? (
        <Reveal delay={400}>
          <Button variant="ghost" size="md" tone="light" icon="crown" label="Voir plus avec Premium" onPress={onPremium} />
        </Reveal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  eyebrow: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 2.8,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 18,
  },
  ringBox: { width: 248, height: 248, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  hugeNumber: { fontFamily: fonts.display, fontSize: 84, lineHeight: 100 },
  bigNumber: { fontFamily: fonts.display, fontSize: 76, lineHeight: 92, textAlign: 'center' },
  midNumber: { fontFamily: fonts.display, fontSize: 40, lineHeight: 48 },
  hugeWord: { fontFamily: fonts.display, fontSize: 64, lineHeight: 76, textAlign: 'center' },
  title: { fontFamily: fonts.display, fontSize: 38, lineHeight: 46, textAlign: 'center', marginTop: 22 },
  unit: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 2.2,
    textAlign: 'center',
    marginTop: 2,
  },
  caption: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 8,
  },
  statBlock: { alignItems: 'center', marginBottom: 16 },
  modeIconWrap: { marginBottom: 6 },
  barWrap: { alignSelf: 'stretch', marginTop: 26, paddingHorizontal: 8 },
  barTrack: { height: 12, borderRadius: 6, overflow: 'hidden', flexDirection: 'row' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 0.6 },
  gridWrap: { alignSelf: 'stretch', paddingHorizontal: 4 },
  streakRow: { alignItems: 'center', marginTop: 26 },
  medals: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginTop: 4 },
  medalItem: { alignItems: 'center', width: 96 },
  medalName: { fontFamily: fonts.display, fontSize: 15, lineHeight: 20, marginTop: 6 },
  medalTier: { fontFamily: fonts.sansBold, fontSize: 9.5, letterSpacing: 1.8 },
  compareBox: { alignItems: 'center', gap: 6, marginTop: 8 },
  compareText: { fontFamily: fonts.sansBold, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  exList: { alignSelf: 'stretch', gap: 14, marginTop: 4, paddingHorizontal: 8 },
  exRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  exName: { flex: 1, fontFamily: fonts.sansBold, fontSize: 17, marginRight: 10 },
  exCount: { fontFamily: fonts.monoBold, fontSize: 14 },
  exTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  exFill: { height: 7, borderRadius: 4 },
  rhythmBlock: { alignItems: 'center', marginBottom: 20 },
  rhythmValue: { fontFamily: fonts.display, fontSize: 40, lineHeight: 50, textAlign: 'center' },
  loadRow: { gap: 4 },
  loadValue: { fontFamily: fonts.monoBold, fontSize: 18, lineHeight: 26 },
  lockedGhost: {
    alignSelf: 'stretch',
    gap: 12,
    paddingVertical: 26,
    paddingHorizontal: 22,
    marginHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    alignItems: 'flex-start',
  },
  ghostBar: { height: 14, borderRadius: 7, opacity: 0.16 },
  lockBadge: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    left: '50%',
    marginLeft: -28,
  },
  lockedText: { alignItems: 'center', marginTop: 20, marginBottom: 18 },
  crownRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  crownLabel: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 2.4, color: '#F0C954' },
});
