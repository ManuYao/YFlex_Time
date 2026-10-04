import { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

import GradientBackground from '../components/common/GradientBackground';
import Button from '../components/common/Button';
import IconButton from '../components/common/IconButton';
import AppIcon from '../components/common/AppIcon';
import { getBlockType, getMixTotalDuration, formatBlockSubtitle, hasEstimatedDuration } from '../lib/mix-blocks';
import { deserializeMix, sanitizeImportedPayload } from '../lib/mixShare';
import { findLibraryMatch } from '../lib/mixIdentity';
import { formatMixClock } from '../lib/formatters';
import { fonts } from '../lib/fonts';
import { BOTTOM_GAP, PAIR_GAP, ROUND_SIZE, SIDE_GAP } from '../lib/buttonTokens';
import { useTimers } from '../contexts/TimersContext';
import { haptic } from '../hooks/useHaptic';

const ACCENT = '#9575FF'; // couleur MIX, cf. lib/timers-config.js

/**
 * Écran d'arrivée d'un lien de partage flextimer://import-mix?m=... (construit
 * par app/mix-builder.js, voir CLAUDE.md — section MIX PARTAGE). Le mix
 * n'est JAMAIS ajouté à la bibliothèque sans que la personne l'ait vu au
 * préalable : décodage + assainissement au montage, prévisualisation en
 * lecture seule (pas le BlockRow interactif du builder — pas de drag ici),
 * puis un geste explicite pour l'enregistrer.
 */
export default function ImportMix() {
  const router = useRouter();
  const { m } = useLocalSearchParams();
  const { receiveMix, saveCurrentMix, library } = useTimers();
  const [saving, setSaving] = useState(false);

  // Décodé une seule fois : re-décoder à chaque rendu referait tourner
  // l'assainissement (régénération d'ids) pour rien.
  const mix = useMemo(() => {
    const { ok, payload } = deserializeMix(m);
    if (!ok) return null;
    return sanitizeImportedPayload(payload);
  }, [m]);

  // Anti-doublon (clé unique du mix, lib/mixIdentity.js) : ouvrir deux fois le
  // même lien ne crée pas deux mix. Déjà là, même version → rien à ajouter ;
  // déjà là, version différente → UNIQUEMENT une mise à jour.
  const match = useMemo(() => (mix ? findLibraryMatch(library, mix) : null), [mix, library]);

  const handleAdd = async () => {
    if (!mix || saving) return;
    if (match?.status === 'same') {
      // Rien à écrire : on ouvre simplement celui qu'on a déjà.
      setSaving(true);
      haptic.light();
      await saveCurrentMix(match.entry);
      router.replace('/mix-builder');
      return;
    }
    setSaving(true);
    haptic.success();
    const res = await receiveMix(mix, { update: true });
    await saveCurrentMix(res.entry);
    router.replace('/mix-builder');
  };

  const handleIgnore = () => {
    haptic.light();
    router.replace('/home');
  };

  if (!mix) {
    return (
      <GradientBackground colors={[ACCENT, '#0A0A0A', '#000000']} ambient textMode="light">
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.topBar}>
            <IconButton icon="close" onPress={handleIgnore} accessibilityLabel="Fermer" />
          </View>
          <View style={styles.errorBody}>
            <Text style={styles.errorTitle}>Lien invalide</Text>
            <Text style={styles.errorText}>
              Ce lien de mix est corrompu ou incomplet — demande à la personne de te le renvoyer.
            </Text>
          </View>
          <View style={styles.actions}>
            <Button
              variant="glass"
              fullWidth
              label="Retour à l'accueil"
              onPress={handleIgnore}
              style={styles.actionMain}
            />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const total = getMixTotalDuration(mix.blocks);

  return (
    <GradientBackground colors={[ACCENT, '#0A0A0A', '#000000']} ambient textMode="light">
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <IconButton icon="close" onPress={handleIgnore} accessibilityLabel="Fermer" />
          <Text style={styles.topTitle}>Mix reçu</Text>
          <View style={{ width: ROUND_SIZE.nav }} />
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <Text style={styles.name} numberOfLines={2}>{mix.name}</Text>
          <Text style={styles.meta}>
            {mix.blocks.length} bloc{mix.blocks.length > 1 ? 's' : ''} · {hasEstimatedDuration(mix.blocks) ? '~' : ''}{formatMixClock(total)}
          </Text>

          {match?.status === 'same' && (
            <Text style={styles.matchNote}>
              Ce mix est déjà dans ta bibliothèque (« {match.entry.name} »).
            </Text>
          )}
          {match?.status === 'update' && (
            <Text style={styles.matchNote}>
              Tu as déjà ce mix (« {match.entry.name} »), mais cette version est différente. Tu peux mettre ta
              copie à jour : elle sera remplacée.
            </Text>
          )}

          <View style={styles.list}>
            {mix.blocks.map((block, i) => {
              const type = getBlockType(block.type);
              return (
                <View key={block.id} style={styles.row}>
                  <View style={styles.rowIconBox}>
                    <AppIcon
                      name={type?.icon || 'mix'}
                      size={16}
                      color={type?.color || '#FFFFFF'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel} numberOfLines={1}>{block.label}</Text>
                    <Text style={styles.rowSub}>{formatBlockSubtitle(block)}</Text>
                  </View>
                  <Text style={styles.rowIndex}>{i + 1}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <Button
            variant="ghost"
            label="Ignorer"
            haptic={haptic.light}
            onPress={handleIgnore}
          />
          <Button
            variant="accent"
            color={ACCENT}
            label={
              match?.status === 'same'
                ? 'Ouvrir mon mix'
                : match?.status === 'update'
                  ? 'Mettre à jour ma version'
                  : 'Ajouter à ma bibliothèque'
            }
            disabled={saving}
            onPress={handleAdd}
            style={styles.actionMain}
          />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  topTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.50)',
    textTransform: 'uppercase',
  },

  body: {
    paddingHorizontal: SIDE_GAP,
    paddingTop: 16,
    paddingBottom: 24,
  },
  name: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: '#FFFFFF',
  },
  meta: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 6,
    marginBottom: 22,
  },

  matchNote: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 16,
  },

  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    padding: 12,
  },
  rowIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontFamily: fonts.sansSemibold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  rowSub: {
    fontFamily: fonts.monoRegular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.50)',
    marginTop: 2,
  },
  rowIndex: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.30)',
  },

  errorBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  errorText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },

  actions: {
    flexDirection: 'row',
    gap: PAIR_GAP,
    paddingHorizontal: SIDE_GAP,
    paddingBottom: BOTTOM_GAP,
  },
  actionMain: {
    flex: 1,
  },
});
