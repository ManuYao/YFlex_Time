import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView, BlurTargetView } from 'expo-blur';

import AppIcon from '../common/AppIcon';
import ProfileTrophies from './ProfileTrophies';
import { fonts } from '../../lib/fonts';
import { MOCK_CUSTOMIZATION } from '../../lib/profileMock';

/**
 * Bas du Profil : les trophées (résumé + accès à la page de tous les trophées,
 * components/screens/ProfileTrophies.js) puis la personnalisation (encore floutée « bientôt »).
 *
 * `evaluation` vient de lib/trophyLoader.js (null tant qu'elle n'est pas lue).
 */
export default function ProfileGamification({ evaluation, onOpenAllTrophies, onOpenTrophy }) {
  const customTargetRef = useRef(null);

  return (
    <View>
      {/* ─── TROPHÉES ─── */}
      <ProfileTrophies evaluation={evaluation} onOpenAll={onOpenAllTrophies} onOpenTrophy={onOpenTrophy} />

      {/* ─── PERSONNALISATION ─── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personnalisation</Text>
        <Text style={styles.sectionHint}>Des thèmes et des sons à débloquer avec tes trophées.</Text>
        {/* Contenu gardé mais flouté à fond (décision utilisateur) : on ne doit
            pas deviner ce qu'il y a dedans, mais le jour où on retire le flou,
            tout est déjà là. Le BlurView est frère de sa cible, jamais dedans. */}
        <View style={styles.blurZone}>
          <BlurTargetView ref={customTargetRef} style={styles.grid}>
            {MOCK_CUSTOMIZATION.map((item) => (
              <View key={item.id} style={[styles.card, styles.tile]}>
                <View style={styles.tileTop}>
                  <View style={styles.tileIcon}>
                    <AppIcon name={item.icon} size={18} opacity={0.75} />
                  </View>
                  <AppIcon name="lock" size={14} opacity={0.45} />
                </View>
                <Text style={styles.tileKind}>{item.kind}</Text>
                <Text style={styles.tileLabel} numberOfLines={1}>
                  {item.label}
                </Text>
                <View style={styles.tileBottom}>
                  <LinearGradient
                    colors={item.colors}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.swatch}
                  />
                  <View style={styles.soonChip}>
                    <Text style={styles.soonText}>BIENTÔT</Text>
                  </View>
                </View>
              </View>
            ))}
          </BlurTargetView>
          <BlurView
            blurTarget={customTargetRef}
            intensity={100}
            tint="dark"
            blurMethod="dimezisBlurView"
            blurReductionFactor={4}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {/* Voile en plus du flou : sous Android 12, expo-blur ne floute pas
              et retombe sur une simple teinte, le contenu resterait lisible. */}
          <View style={[StyleSheet.absoluteFill, styles.blurVeil]} pointerEvents="none" />
          <View style={[StyleSheet.absoluteFill, styles.blurCenter]} pointerEvents="none">
            <View style={styles.soonBadge}>
              <AppIcon name="lock" size={14} opacity={0.9} />
              <Text style={styles.soonBadgeText}>BIENTÔT</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.50)',
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionHint: {
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
  },

  blurZone: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  blurVeil: {
    backgroundColor: 'rgba(10,10,10,0.35)',
  },
  blurCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  soonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  soonBadgeText: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 2,
    color: '#FFFFFF',
  },
  // Largeur en pourcentage plutôt que flex : deux colonnes stables quelle que
  // soit la longueur des libellés.
  tile: {
    width: '48.5%',
    padding: 14,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  tileIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileKind: {
    fontFamily: fonts.monoBold,
    fontSize: 9.5,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 14,
  },
  tileLabel: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 2,
  },
  tileBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  swatch: {
    width: 36,
    height: 14,
    borderRadius: 7,
  },
  soonChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  soonText: {
    fontFamily: fonts.monoBold,
    fontSize: 8.5,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.75)',
  },
});
