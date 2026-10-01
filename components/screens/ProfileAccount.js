import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import PressTap from '../common/PressTap';
import AppIcon from '../common/AppIcon';
import ShineSweep from '../common/ShineSweep';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Carte « Se connecter » du Hub Profil — toujours optionnelle, ouvre /login.
 *
 * Posée AVANT la section Disciplines (v16.3.0, retour des utilisateurs : la
 * ligne d'origine, sous tout le bloc identité, passait inaperçue) et mise en
 * avant : carte plus claire, texte plus grand, reflet qui la traverse
 * (ShineSweep, comme les boutons d'action). Elle reste facultative : le texte
 * dit ce que le compte apporte, jamais qu'il est requis.
 *
 * N'existe que quand PERSONNE n'est connecté : une fois connecté, l'état
 * bascule sur le petit point vert de ProfileHeader (voir CLAUDE.md, section
 * CONNEXION UTILISATEUR + BACKEND) — une ligne entière dans le menu pour
 * afficher « Déconnexion » prenait trop de place (retour utilisateur).
 */
export default function ProfileAccount() {
  const router = useRouter();
  const { user } = useAuth();
  const [box, setBox] = useState({ w: 0, h: 0 });

  if (user) return null;

  return (
    <PressTap
      onPress={() => {
        haptic.light();
        router.push('/login');
      }}
      tapScale={0.98}
      accessibilityLabel="Se connecter"
      containerStyle={styles.wrap}
      style={styles.card}
    >
      <View
        style={styles.row}
        onLayout={(e) => {
          const { width: w, height: h } = e.nativeEvent.layout;
          if (w !== box.w || h !== box.h) setBox({ w, h });
        }}
      >
        <View style={styles.iconWrap}>
          <AppIcon name="user" size={20} color="#0A0A0A" />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.label}>Se connecter</Text>
          <Text style={styles.sub}>
            Facultatif · retrouve ton historique sur un autre téléphone, publie et note des MIX
          </Text>
        </View>
        <AppIcon name="arrow" size={16} color="rgba(255,255,255,0.70)" />
        <ShineSweep width={box.w} height={box.h} />
      </View>
    </PressTap>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 20,
  },
  // overflow hidden : c'est lui qui découpe le reflet aux coins arrondis.
  card: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
    borderRadius: 18,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textWrap: {
    flex: 1,
    marginRight: 10,
  },
  label: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 17,
    letterSpacing: -0.3,
    color: '#FFFFFF',
  },
  sub: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.68)',
    marginTop: 3,
  },
});
