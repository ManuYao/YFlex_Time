import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';

import GradientBackground from '../components/common/GradientBackground';
import Toggle from '../components/common/Toggle';
import { useSettings } from '../contexts/SettingsContext';
import { fonts } from '../lib/fonts';

export default function Settings() {
  const router = useRouter();
  const { settings, update, reset } = useSettings();

  const handleResetAll = () => {
    Alert.alert(
      'Réinitialiser l\'application',
      'Tous tes réglages, timers personnalisés et l\'historique seront supprimés. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'flexTimer_settings',
                'flexTimer_timerOverrides',
                'flexTimer_history',
              ]);
            } catch {}
            reset();
            router.replace('/home');
          },
        },
      ]
    );
  };

  return (
    <GradientBackground colors={['#1A1A1A', '#0A0A0A', '#000000']} ambient>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>PARAMÈTRES</Text>
        </View>

        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={styles.iconBtn}
            hitSlop={8}
          >
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
          <Text style={styles.topTitle}>Paramètres</Text>
          <View style={styles.iconBtnGhost} />
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          <Section title="Audio et haptique">
            <Row
              label="Sons"
              sub="Bips de phases et d'alertes"
              control={<Toggle value={settings.sound} onChange={(v) => update('sound', v)} />}
            />
            <Row
              label="Vibrations"
              sub="Retour haptique sur les actions"
              control={<Toggle value={settings.vibrate} onChange={(v) => update('vibrate', v)} />}
            />
            <Row
              label="Volume"
              sub="Niveau sonore des alertes"
              control={
                <Slider
                  value={settings.volume}
                  onChange={(v) => update('volume', v)}
                  color="#1FC777"
                />
              }
              isLast
            />
          </Section>

          <Section title="Timers">
            <Row
              label="Démarrage auto après config"
              sub="Lance la séance dès validation"
              control={
                <Toggle
                  value={settings.autoStart}
                  onChange={(v) => update('autoStart', v)}
                  color="#FF5454"
                />
              }
            />
            <Row
              label="Écran toujours allumé"
              sub="Garde ton téléphone éveillé pendant la séance"
              control={
                <Toggle
                  value={settings.keepScreenOn}
                  onChange={(v) => update('keepScreenOn', v)}
                  color="#FFC933"
                />
              }
              isLast
            />
          </Section>

          <Section title="Notifications">
            <Row
              label="Rappels quotidiens"
              sub="Pour garder ta streak"
              control={
                <Toggle
                  value={settings.notifications}
                  onChange={(v) => update('notifications', v)}
                />
              }
            />
            <Row
              label="Bilan hebdomadaire"
              sub="Tous les dimanches soirs"
              control={
                <Toggle
                  value={settings.weeklyReport}
                  onChange={(v) => update('weeklyReport', v)}
                />
              }
              isLast
            />
          </Section>

          <Section title="À propos">
            <Row label="Version" sub="Flex Timer 1.0.0" control={<Text style={styles.metaText}>build 42</Text>} />
            <Row label="Conditions d'utilisation" control={<Soon />} />
            <Row label="Politique de confidentialité" control={<Soon />} />
            <Row label="Contact" sub="yaomanuit@gmail.com" control={<Soon />} isLast />
          </Section>

          <Pressable
            onPress={handleResetAll}
            style={({ pressed }) => [
              styles.resetBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.resetText}>Réinitialiser l'application</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ label, sub, control, isLast }) {
  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      <View>{control}</View>
    </View>
  );
}

function Soon() {
  return <Text style={styles.soon}>À venir</Text>;
}

function Slider({ value, onChange, color = '#FFFFFF', min = 0, max = 100 }) {
  const [width, setWidth] = useState(0);

  const handlePress = (e) => {
    if (!width) return;
    const x = e.nativeEvent.locationX;
    const ratio = Math.max(0, Math.min(1, x / width));
    const newValue = Math.round(min + ratio * (max - min));
    onChange(newValue);
  };

  const percent = ((value - min) / (max - min)) * 100;

  return (
    <View style={styles.sliderWrap}>
      <Pressable
        onPress={handlePress}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={styles.sliderTrack}
        hitSlop={8}
      >
        <View
          style={[
            styles.sliderFill,
            { width: `${percent}%`, backgroundColor: color },
          ]}
        />
      </Pressable>
      <Text style={styles.sliderValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  statusBar: {
    paddingHorizontal: 24,
    paddingTop: 4,
    alignItems: 'center',
  },
  statusText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 4,
    color: 'rgba(255,255,255,0.55)',
  },

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

  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

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
  sectionBody: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    fontFamily: fonts.sansSemibold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  rowSub: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.50)',
    marginTop: 2,
  },
  metaText: {
    fontFamily: fonts.monoRegular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.40)',
  },
  soon: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1.8,
    color: 'rgba(255,255,255,0.30)',
    textTransform: 'uppercase',
  },

  sliderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: 130,
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 2,
  },
  sliderValue: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    color: '#FFFFFF',
    minWidth: 26,
    textAlign: 'right',
  },

  resetBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  resetText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.40)',
    textTransform: 'uppercase',
  },
});