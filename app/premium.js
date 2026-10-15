import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import GradientBackground from '../components/common/GradientBackground';
import AppIcon from '../components/common/AppIcon';
import Button from '../components/common/Button';
import IconButton from '../components/common/IconButton';
import { usePremium } from '../hooks/usePremium';
import { useHaptic } from '../hooks/useHaptic';
import { goBackSafe } from '../lib/navigation';
import { fonts } from '../lib/fonts';
import { ROUND_SIZE } from '../lib/buttonTokens';

const GOLD = '#F0C954';

const BENEFITS = [
  {
    icon: 'calendar',
    title: 'Lancer depuis ton planning',
    desc: 'Le planning est gratuit. En Pro, tu lances un bloc en MIX d\'un maintien ou un mix enregistré directement depuis ta semaine, avec le conseil de charge.',
  },
  {
    icon: 'infinity',
    title: 'Une bibliothèque de mix sans limite',
    desc: 'En gratuit : 3 mix créés par toi et 5 mix téléchargés depuis la communauté. En Pro : autant que tu veux.',
  },
  {
    icon: 'globe',
    title: 'Publie plus de mix',
    desc: 'En gratuit : 3 mix publiés en même temps dans le fil public. En Pro : jusqu\'à 30.',
  },
  {
    icon: 'pulse',
    title: 'Statistiques avancées',
    desc: 'Temps sous tension, graphiques et régularité : vois précisément où tu progresses.',
  },
  {
    icon: 'palette',
    title: 'Bientôt : synchronisation, thèmes et sons',
    desc: 'Retrouve tes données sur tous tes appareils, et personnalise l\'appli avec des thèmes et des sons exclusifs. Pas encore disponible.',
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
          <IconButton
            icon="back"
            haptic={haptic.light}
            onPress={() => goBackSafe(router)}
            accessibilityLabel="Retour"
          />
          <Text style={styles.topTitle}>Premium</Text>
          <View style={styles.iconBtnGhost} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <AppIcon name="crown" size={52} color={GOLD} style={styles.crown} />
            <Text style={styles.heroTitle}>Flex Timer PRO</Text>
            <Text style={styles.heroSub}>
              {isPremium || justUnlocked
                ? 'Pro débloqué : le planning, plus de mix, plus de statistiques. Merci !'
                : 'Le planning, plus de mix, plus de statistiques, pour aller plus loin.'}
            </Text>
          </View>

          <View style={styles.benefits}>
            {BENEFITS.map((b) => (
              <View key={b.title} style={styles.benefitRow}>
                <View style={styles.benefitIcon}>
                  <AppIcon name={b.icon} size={22} color={GOLD} />
                </View>
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>{b.title}</Text>
                  <Text style={styles.benefitDesc}>{b.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.freeNote}>
            Tous les modes (AMRAP, BASIC, EMOM, TABATA, MIX) restent gratuits et
            illimités, sans aucune pub.
          </Text>

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

              {/* Variante « premium » (or) du système de boutons : la lueur
                  vient de son boxShadow — plus de wrapper d'ombre en
                  elevation sans fond. La vibration vient de handleBuy. */}
              <Button
                variant="premium"
                size="lg"
                fullWidth
                icon="crown"
                label="Devenir Pro"
                onPress={handleBuy}
              />

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
  // Même largeur que le bouton retour (ROUND_SIZE.nav) : garde le titre centré.
  iconBtnGhost: { width: ROUND_SIZE.nav, height: ROUND_SIZE.nav },
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
    marginBottom: 22,
  },
  freeNote: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 30,
    paddingHorizontal: 8,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  benefitIcon: {
    width: 30,
    alignItems: 'center',
    paddingTop: 1,
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
