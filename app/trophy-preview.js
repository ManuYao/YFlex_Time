import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import GradientBackground from '../components/common/GradientBackground';
import IconButton from '../components/common/IconButton';
import BadgeUnlockSheet from '../components/common/BadgeUnlockSheet';
import { goBackSafe } from '../lib/navigation';
import { fonts } from '../lib/fonts';
import { haptic } from '../hooks/useHaptic';
import { TIER_PALETTE } from '../components/common/BadgeMedal';
import { BADGE_TIERS } from '../lib/badges';
import { TROPHIES, TROPHY_FAMILIES, announceFormat } from '../lib/trophyCatalog';
import { clearTrophyNotices, holdTrophyNotices, pushTrophyNotices } from '../lib/trophyNotices';

const SHEET_COLOR = '#F0C954';

// Ce que dit la règle pour un trophée (annonceFormat) : une ligne lisible sous son nom.
const formatLine = (t) => {
  if (t.kind === 'tier' && !t.mode) return 'Notification · l’Or a la grande annonce';
  return announceFormat(t) === 'sheet' ? 'Grande annonce' : 'Notification';
};

/**
 * Paramètres › Aperçu des trophées : voir CHAQUE annonce possible sans attendre de gagner le
 * trophée. Rien n'est gagné ni enregistré : c'est un simple aperçu.
 *   - « Comme l'app » : chaque trophée s'affiche dans SON format (announceFormat), avec la même règle
 *     de non-conflit : la grande annonce d'abord, les notifications juste après ;
 *   - « Notification » / « Grande annonce » : force un format pour juger l'apparence.
 * Chaque trophée a ses boutons : Bronze / Argent / Or pour un trophée à paliers, « Voir » pour
 * un exploit ou un secret. Une pastille pleine = ce palier a la grande annonce.
 */
export default function TrophyPreview() {
  const router = useRouter();
  const { height: screenH } = useWindowDimensions();
  const [mode, setMode] = useState('auto'); // 'auto' | 'notice' | 'sheet'
  const [sheet, setSheet] = useState(null); // { queue: [{ id, tier }], index }

  const show = (items) => {
    haptic.light();
    clearTrophyNotices();
    const sheets =
      mode === 'sheet' ? items : mode === 'notice' ? [] : items.filter((i) => announceFormat(i.id, i.tier) === 'sheet');
    const notices = mode === 'auto' ? items.filter((i) => !sheets.includes(i)) : mode === 'notice' ? items : [];
    // Comme dans l'app : les cartes attendent la fermeture de la grande annonce.
    if (sheets.length) holdTrophyNotices('pending', 8000);
    pushTrophyNotices(notices);
    setSheet(sheets.length ? { queue: sheets, index: 0 } : null);
  };

  const closeSheet = () => {
    setSheet((s) => (s && s.index + 1 < s.queue.length ? { ...s, index: s.index + 1 } : null));
  };

  const sample = (pairs) => pairs.map(([id, tier]) => ({ id, tier }));

  return (
    <GradientBackground colors={['#1A1A1A', '#0A0A0A', '#000000']}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          <IconButton icon="back" haptic={haptic.light} onPress={() => goBackSafe(router)} accessibilityLabel="Retour" />
          <Text style={styles.title}>Aperçu des trophées</Text>
          <View style={styles.spacer} />
        </View>

        <View style={styles.modes}>
          {[
            ['auto', 'Comme l’app'],
            ['notice', 'Notification'],
            ['sheet', 'Grande annonce'],
          ].map(([id, label]) => (
            <Pressable
              key={id}
              onPress={() => {
                haptic.light();
                setMode(id);
              }}
              style={[styles.modeBtn, mode === id && styles.modeBtnOn]}
              accessibilityRole="button"
            >
              <Text style={[styles.modeText, mode === id && styles.modeTextOn]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.hint}>
            {mode === 'auto'
              ? 'Chaque trophée s’affiche comme dans l’app : grande annonce (pastille pleine) ou notification. S’il y a les deux, la grande annonce passe d’abord, les cartes arrivent juste après.'
              : mode === 'notice'
                ? 'Touche un trophée : la carte arrive en haut. Balaye-la ou touche la croix.'
                : 'Touche un trophée : la grande annonce s’ouvre, comme à la fin d’une séance.'}
          </Text>

          <Text style={styles.sectionTitle}>Plusieurs d’un coup</Text>
          <View style={styles.card}>
            <Pressable
              style={styles.row}
              onPress={() => show(sample([['tabata', 'or'], ['finishTabata', 'done'], ['sweat', 'bronze']]))}
              accessibilityRole="button"
            >
              <View style={styles.rowText}>
                <Text style={styles.rowName}>1 grande annonce + 2 notifications</Text>
                <Text style={styles.rowSub}>TABATA Or, Jusqu’au bout, Heures de sueur Bronze</Text>
              </View>
              <Text style={styles.go}>Voir</Text>
            </Pressable>
            <Pressable
              style={[styles.row, styles.rowDivider]}
              onPress={() => show(sample([['emom', 'bronze'], ['flame', 'or'], ['earlyBird', 'done']]))}
              accessibilityRole="button"
            >
              <View style={styles.rowText}>
                <Text style={styles.rowName}>3 grandes annonces à la suite</Text>
                <Text style={styles.rowSub}>EMOM Bronze, Flamme Or, Lève-tôt</Text>
              </View>
              <Text style={styles.go}>Voir</Text>
            </Pressable>
            <Pressable
              style={[styles.row, styles.rowDivider]}
              onPress={() => show(sample([['sweat', 'argent'], ['triple', 'done'], ['record', 'done']]))}
              accessibilityRole="button"
            >
              <View style={styles.rowText}>
                <Text style={styles.rowName}>3 notifications à la suite</Text>
                <Text style={styles.rowSub}>Heures de sueur Argent, Triple, Record battu</Text>
              </View>
              <Text style={styles.go}>Voir</Text>
            </Pressable>
          </View>

          {TROPHY_FAMILIES.map((family) => {
            const list = TROPHIES.filter((t) => t.family === family.id);
            if (!list.length) return null;
            return (
              <View key={family.id}>
                <Text style={styles.sectionTitle}>{family.title}</Text>
                <View style={styles.card}>
                  {list.map((t, i) => (
                    <View key={t.id} style={[styles.row, i > 0 && styles.rowDivider]}>
                      <View style={styles.rowText}>
                        <Text style={styles.rowName} numberOfLines={1}>
                          {t.name}
                        </Text>
                        {t.sub || t.desc ? (
                          <Text style={styles.rowSub} numberOfLines={1}>
                            {t.sub ? `${t.sub} · ` : ''}
                            {t.desc}
                          </Text>
                        ) : null}
                        <Text
                          style={[styles.formatTag, announceFormat(t) === 'sheet' && { color: SHEET_COLOR }]}
                          numberOfLines={1}
                        >
                          {formatLine(t)}
                        </Text>
                      </View>
                      {t.kind === 'tier' ? (
                        <View style={styles.tiers}>
                          {BADGE_TIERS.map((tier) => (
                            <Pressable
                              key={tier.key}
                              onPress={() => show([{ id: t.id, tier: tier.key }])}
                              style={[
                                styles.tierBtn,
                                { borderColor: TIER_PALETTE[tier.key].hi },
                                announceFormat(t, tier.key) === 'sheet' && { backgroundColor: `${TIER_PALETTE[tier.key].hi}40` },
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel={`${t.name} ${tier.label}`}
                            >
                              <Text style={[styles.tierText, { color: TIER_PALETTE[tier.key].hi }]}>
                                {tier.label.charAt(0)}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      ) : (
                        <Pressable onPress={() => show([{ id: t.id, tier: 'done' }])} accessibilityRole="button">
                          <Text style={styles.go}>Voir</Text>
                        </Pressable>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {sheet && (
        <BadgeUnlockSheet
          key={`${sheet.queue[sheet.index].id}-${sheet.index}`}
          screenH={screenH}
          trophyId={sheet.queue[sheet.index].id}
          tier={sheet.queue[sheet.index].tier}
          position={sheet.index + 1}
          total={sheet.queue.length}
          onClose={closeSheet}
        />
      )}
    </GradientBackground>
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
    paddingBottom: 12,
  },
  title: { fontFamily: fonts.sansExtraBold, fontSize: 18, color: '#FFFFFF', letterSpacing: -0.3 },
  spacer: { width: 44 },
  modes: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 6,
    padding: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  modeBtn: { flex: 1, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modeBtnOn: { backgroundColor: 'rgba(255,255,255,0.16)' },
  modeText: { fontFamily: fonts.sansBold, fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  modeTextOn: { color: '#FFFFFF' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  hint: {
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.55)',
    marginVertical: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, gap: 10 },
  rowDivider: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { fontFamily: fonts.sansExtraBold, fontSize: 14, color: '#FFFFFF', flexShrink: 1 },
  rowSub: { fontFamily: fonts.sansMedium, fontSize: 11.5, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
  formatTag: { fontFamily: fonts.sansBold, fontSize: 10.5, letterSpacing: 0.3, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  go: { fontFamily: fonts.sansBold, fontSize: 13, color: '#FFFFFF', paddingHorizontal: 6, paddingVertical: 6 },
  tiers: { flexDirection: 'row', gap: 6 },
  tierBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierText: { fontFamily: fonts.monoBold, fontSize: 13 },
});
