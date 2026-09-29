import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import PressTap from '../common/PressTap';
import AppIcon from '../common/AppIcon';
import { fonts } from '../../lib/fonts';
import { haptic } from '../../hooks/useHaptic';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Ligne « compte » du Hub Profil — toujours optionnelle, ouvre /login.
 * N'existe que quand PERSONNE n'est connecté : une fois connecté, l'état
 * bascule sur le petit point vert de ProfileHeader (voir CLAUDE.md, section
 * CONNEXION UTILISATEUR + BACKEND) — cette ligne prenait trop de place dans
 * le menu rien que pour afficher "Déconnexion" (retour utilisateur).
 */
export default function ProfileAccount() {
  const router = useRouter();
  const { user } = useAuth();

  if (user) return null;

  return (
    <PressTap
      onPress={() => {
        haptic.light();
        router.push('/login');
      }}
      containerStyle={styles.row}
    >
      <View style={styles.iconWrap}>
        <AppIcon name="user" size={16} color="rgba(255,255,255,0.85)" />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.label}>Se connecter</Text>
        <Text style={styles.sub}>Optionnel — retrouve tes données sur un autre téléphone</Text>
      </View>
      <AppIcon name="arrow" size={14} color="rgba(255,255,255,0.35)" />
    </PressTap>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  sub: {
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.50)',
    marginTop: 2,
  },
});
