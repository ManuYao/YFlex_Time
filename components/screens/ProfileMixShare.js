import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import PressTap from '../common/PressTap';
import AppIcon from '../common/AppIcon';
import { BlockStrip } from '../common/MixPublicSheet';
import { haptic } from '../../hooks/useHaptic';
import { fonts } from '../../lib/fonts';
import { fetchFeed } from '../../lib/publicMixes';

// Le fil est chargé par lots de PREVIEW_LIMIT : au-delà, on affiche « 12+ ».
const PREVIEW_LIMIT = 12;

function NavRow({ icon, title, sub, onPress, children }) {
  return (
    <PressTap onPress={onPress} onHapticIn={haptic.light} tapScale={0.98} style={styles.row}>
      <View style={styles.iconBox}>
        <AppIcon name={icon} size={18} color="#FFFFFF" />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.rowSub} numberOfLines={2}>{sub}</Text>
        {children ? <View style={styles.preview}>{children}</View> : null}
      </View>
      <AppIcon name="arrow" size={16} color="rgba(255,255,255,0.40)" />
    </PressTap>
  );
}

/**
 * Rangée « Fil public » du Hub Profil. Lit les VRAIS mixes publiés (compte
 * facultatif : lire ne demande rien). `refreshKey` change quand la feuille du
 * fil se referme, pour que le compte et la bande de couleurs suivent.
 */
export default function ProfileMixShare({ onOpenPublic, onOpenHub, refreshKey = 0 }) {
  const [state, setState] = useState({ status: 'loading', items: [] });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchFeed({ limit: PREVIEW_LIMIT });
      if (cancelled) return;
      if (!res.ok) {
        setState({ status: res.reason === 'unavailable' ? 'unavailable' : 'error', items: [] });
        return;
      }
      setState({ status: 'ok', items: res.items });
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const { status, items } = state;
  const strip = items.flatMap((m) => m.blockTypes).slice(0, 12);
  let countLabel = ' ';
  if (status === 'unavailable') countLabel = 'BIENTÔT DISPONIBLE';
  else if (status === 'error') countLabel = 'À OUVRIR POUR RÉESSAYER';
  else if (status === 'ok') {
    if (items.length === 0) countLabel = 'SOIS LE PREMIER À PUBLIER';
    else countLabel = `${items.length >= PREVIEW_LIMIT ? `${PREVIEW_LIMIT}+` : items.length} MIX À TESTER`;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>MIX</Text>
      <View style={styles.card}>
        {/* Fil conducteur (v16.2.0) : la page centrale du MIX, à un tap d'ici. */}
        {onOpenHub && (
          <>
            <NavRow
              icon="mix"
              title="Mix et Partage"
              sub="Crée, lance, reçois et envoie tes mix."
              onPress={onOpenHub}
            />
            <View style={styles.divider} />
          </>
        )}
        <NavRow
          icon="share"
          title="Fil public"
          sub="Les mixes des autres, à tester en un geste."
          onPress={onOpenPublic}
        >
          <Text style={styles.countText}>{countLabel}</Text>
          {strip.length > 0 && <BlockStrip blocks={strip} height={4} style={styles.strip} />}
        </NavRow>
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
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignSelf: 'flex-start',
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  rowSub: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  preview: {
    marginTop: 10,
    alignItems: 'flex-start',
  },
  countText: {
    fontFamily: fonts.monoBold,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.70)',
  },
  strip: {
    alignSelf: 'stretch',
    marginTop: 8,
  },
});
