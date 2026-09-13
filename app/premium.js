import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import GradientBackground from '../components/common/GradientBackground';
import PressTap from '../components/common/PressTap';
import { usePremium } from '../hooks/usePremium';
import { useHaptic } from '../hooks/useHaptic';
import { fonts } from '../lib/fonts';

const GOLD = '#F0C954';

const BENEFITS = [
  {
    emoji: '⚡',
    title: 'Lancements illimités',
    desc: 'Plus aucun verrou sur TABATA et MIX, même en usage intensif.',
  },
  {
    emoji: '🚫',
    title: 'Zéro pub, pour de bon',
    desc: "L'appli n'affichera jamais de publicité — Pro ou pas.",
  },
  {
    emoji: '🎨',
    title: 'Bientôt : thèmes & sons exclusifs',
    desc: 'Des déblocages cosmétiques réservés aux membres Pro, à venir.',
  },
];

export default function Premium() {
  const router = useRouter();
  const haptic = useHaptic();
  const { isPremium, setIsPremium } = usePremium();
  const [justUnlocked, setJustUnlocked] = useState(false);

  const handleBuy = () => {
    haptic.success();
    setIsPremium(true);
    setJustUnlocked(true);
  };

  const handleReset = () => {
    haptic.selection();
    setIsPremium(false);
    setJustUnlocked(false);
  };

  return (
    <GradientBackground colors={['#1A1032', '#0A0A0A', '#000000']} ambient>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
            <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
              <Path
                d="M9 2L3 7l6 5"
                stroke="#FFFFFF"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
          <Text style={styles.topTitle}>Premium</Text>
          <View style={styles.iconBtnGhost} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Text style={styles.crown}>👑</Text>
            <Text style={styles.heroTitle}>Flex Timer PRO</Text>
            <Text style={styles.heroSub}>
              {isPremium || justUnlocked
                ? 'Accès illimité débloqué. Merci !'
                : "Débloque l'accès illimité, à volonté."}
            </Text>
          </View>

          <View style={styles.benefits}>
            {BENEFITS.map((b) => (
              <View key={b.title} style={styles.benefitRow}>
                <Text style={styles.benefitEmoji}>{b.emoji}</Text>
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>{b.title}</Text>
                  <Text style={styles.benefitDesc}>{b.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {isPremium ? (
            <View style={styles.activeBox}>
              <Text style={styles.activeText}>Tu es Pro ✓</Text>
              <Pressable onPress={handleReset} hitSlop={8}>
                <Text style={styles.resetLink}>Désactiver (test)</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.priceBox}>
                <Text style={styles.priceAmount}>2,99 €</Text>
                <Text style={styles.priceNote}>Achat unique · le prix d'un café sportif</Text>
              </View>

              <View style={styles.buyShadowWrap}>
                <PressTap onPress={handleBuy} tapScale={0.97} style={styles.buyBtn}>
                  <Text style={styles.buyEmoji}>👑</Text>
                  <Text style={styles.buyText}>Devenir Pro</Text>
                </PressTap>
              </View>

              <Text style={styles.disclaimer}>
                Version de test : active Premium localement sur cet appareil. Le
                vrai paiement Google Play arrivera avant la publication.
              </Text>
            </>
          )}
        </ScrollView>
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
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnGhost: { width: 40, height: 40 },
  topTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },

  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },

  hero: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 32,
  },
  crown: {
    fontSize: 48,
    marginBottom: 12,
  },
  heroTitle: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: GOLD,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 8,
    textAlign: 'center',
  },

  benefits: {
    width: '100%',
    gap: 18,
    marginBottom: 32,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  benefitEmoji: {
    fontSize: 22,
    width: 30,
    textAlign: 'center',
  },
  benefitText: { flex: 1, minWidth: 0 },
  benefitTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  benefitDesc: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
    lineHeight: 17,
  },

  priceBox: {
    alignItems: 'center',
    marginBottom: 20,
  },
  priceAmount: {
    fontFamily: fonts.display,
    fontSize: 40,
    color: '#FFFFFF',
  },
  priceNote: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
    marginTop: 4,
    textTransform: 'uppercase',
  },

  buyShadowWrap: {
    width: '100%',
    borderRadius: 999,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 10,
  },
  buyBtn: {
    width: '100%',
    height: 58,
    borderRadius: 999,
    backgroundColor: GOLD,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buyEmoji: {
    fontSize: 18,
  },
  buyText: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 16,
    color: '#1A0D3D',
    letterSpacing: -0.15,
  },
  disclaimer: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 15,
  },

  activeBox: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  activeText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: GOLD,
  },
  resetLink: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    textDecorationLine: 'underline',
  },
});
