// OTA de secours pour les APK publiées AVANT le système de maintenance
// (10.1.2 / 10.2.0) : elles savent se mettre à jour par OTA mais ne lisent
// pas le Gist. Cette page, volontairement minimale et fermable, leur donne
// le lien vers la nouvelle APK dès que le Gist le demande. Aucun module
// natif absent de ces builds n'est utilisé (fetch, Linking, AsyncStorage,
// Modal uniquement).
import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { usePathname } from 'expo-router';

import { fonts } from '../../lib/fonts';

const GIST_URL =
  'https://gist.githubusercontent.com/ManuYao/89e9d1e109074c02232e3a962fbaae75/raw/apk-version.json';
const SEEN_KEY = 'flexTimer_legacyMaintenanceSeen';
const HIDDEN_ROUTES = ['/running', '/countdown', '/onboarding'];
const SHOW_DELAY_MS = 3200;
const RED = '#FF5454';

const parseVersion = (v) =>
  String(v || '')
    .split('.')
    .map((n) => parseInt(n, 10))
    .map((n) => (Number.isFinite(n) ? n : 0));

// < 0 si a < b, 0 si égal ou illisible, > 0 si a > b.
const compareVersions = (a, b) => {
  if (!a || !b) return 0;
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
};

export default function LegacyUpdateGate() {
  const pathname = usePathname();
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${GIST_URL}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data || typeof data !== 'object') return;

        const installed = Constants.expoConfig?.version || '0.0.0';
        const forced =
          data.is_forced_update === true &&
          compareVersions(installed, data.min_apk_version) < 0;
        if (forced) {
          setPayload({
            kind: 'forced',
            title: 'Nouvelle version disponible',
            body:
              typeof data.forced_update_message === 'string' && data.forced_update_message.trim()
                ? data.forced_update_message.trim()
                : "Une nouvelle version de Flex Timer est disponible. Télécharge-la pour continuer à recevoir les nouveautés.",
            url: typeof data.download_url === 'string' ? data.download_url : '',
            installed,
            latest: String(data.min_apk_version || ''),
          });
          return;
        }

        const message =
          data.is_maintenance === true && typeof data.maintenance_message === 'string'
            ? data.maintenance_message.trim()
            : '';
        if (!message) return;
        let seen = null;
        try {
          seen = await AsyncStorage.getItem(SEEN_KEY);
        } catch {}
        if (seen === message) return;
        setPayload({ kind: 'maintenance', title: 'Information', body: message, url: '' });
      } catch {}
    }, SHOW_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const hidden = HIDDEN_ROUTES.some((r) => pathname === r || pathname?.startsWith(`${r}/`));
  const visible = !!payload && !hidden;

  const close = () => {
    if (payload?.kind === 'maintenance') {
      AsyncStorage.setItem(SEEN_KEY, payload.body).catch(() => {});
    }
    setPayload(null);
  };

  useEffect(() => {
    if (!visible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [visible, payload]);

  if (!visible) return null;

  const isForced = payload.kind === 'forced';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={styles.veil}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>{isForced ? 'MISE À JOUR' : 'MAINTENANCE'}</Text>
          <Text style={styles.title}>{payload.title}</Text>
          <Text style={styles.body}>{payload.body}</Text>
          {isForced && !!payload.latest && (
            <Text style={styles.versions}>
              Ta version : {payload.installed} · Nouvelle : {payload.latest}
            </Text>
          )}

          {isForced && !!payload.url && (
            <Pressable
              onPress={() => Linking.openURL(payload.url).catch(() => {})}
              style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.ctaText}>Télécharger la nouvelle version</Text>
            </Pressable>
          )}

          <Pressable onPress={close} style={({ pressed }) => [styles.later, pressed && { opacity: 0.6 }]}>
            <Text style={styles.laterText}>{isForced ? 'Plus tard' : 'Fermer'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  veil: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#141414',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 24,
  },
  eyebrow: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: RED,
    marginBottom: 10,
  },
  title: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  body: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.85)',
  },
  versions: {
    fontFamily: fonts.monoRegular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 12,
  },
  cta: {
    marginTop: 22,
    backgroundColor: RED,
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  later: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  laterText: {
    fontFamily: fonts.sansSemibold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
});
