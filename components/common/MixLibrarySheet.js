import React, { useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import BottomSheet from './BottomSheet';
import IconButton from './IconButton';
import AppIcon from './AppIcon';
import { getMixTotalDuration, hasEstimatedDuration } from '../../lib/mix-blocks';
import { isFeedMix } from '../../lib/mixes';
import { assignPublications } from '../../lib/publicMixShape';
import { unpublishMix } from '../../lib/publicMixes';
import { useTimers } from '../../contexts/TimersContext';
import { fonts } from '../../lib/fonts';
import { ROUND_SIZE } from '../../lib/buttonTokens';
import { useHaptic } from '../../hooks/useHaptic';
import { useMyPublications } from '../../hooks/useMyPublications';

const ONLINE = '#1FC777';

/**
 * « Mes mix » : la bibliothèque des mix enregistrés. Sortie du constructeur
 * (app/mix-builder.js) pour être aussi ouverte depuis le hub Mix et Partage
 * (app/mix-hub.js) — une seule liste, un seul rendu.
 *
 * Deux familles, séparées à l'écran : MES CRÉATIONS, et les mix ENREGISTRÉS
 * DEPUIS LE FIL PUBLIC (créés par d'autres). Un mix du fil reste modifiable une
 * fois dans la bibliothèque : on le charge comme les autres.
 *
 * Chaque création porte un repère de publication : « EN LIGNE » (publié dans le
 * fil public) ou « PRIVÉ ». Sans compte ou sans réseau on ne peut pas savoir :
 * aucun repère n'est alors affiché (jamais « privé » sur une supposition).
 *
 * `onLoad(id)` peut renvoyer `false` pour dire « pas maintenant » (une
 * confirmation s'affiche par-dessus) : la feuille reste alors ouverte.
 *
 * `hint` : ligne d'aide sous la liste (dépend de l'écran d'où on l'ouvre).
 */
export default function MixLibrarySheet({
  screenH,
  library,
  onClose,
  onLoad,
  onDelete,
  onShare,
  hint = 'Tap = charger · 2s sur Enregistrer = nouveau mix',
  emptyText = 'Aucun mix sauvegardé. Maintiens "Enregistrer" 2s dans le constructeur pour en archiver un.',
}) {
  const haptic = useHaptic();
  const pubs = useMyPublications();
  const { clearPublication } = useTimers();
  // Message après une suppression (ex. « retiré aussi du fil public »).
  const [notice, setNotice] = useState(null);
  // Partager depuis la liste : cette feuille se referme d'abord, la feuille
  // de partage monte ensuite (jamais deux feuilles l'une sur l'autre).
  const shareAfterCloseRef = useRef(null);
  const handleClosed = () => {
    const m = shareAfterCloseRef.current;
    onClose();
    if (m) onShare(m);
  };

  // `close` (animé) n'existe que dans le rendu de BottomSheet : on le garde
  // dans une ref pour que les lignes ci-dessous s'en servent.
  const close = useRef(null);

  const ownIds = useMemo(() => new Set(pubs.items.map((p) => p.id)), [pubs.items]);
  // Qui est « en ligne » : chaque publication n'est attribuée qu'à UN mix.
  const assigned = useMemo(
    () => (pubs.status === 'ok' ? assignPublications(library.filter((m) => !isFeedMix(m, ownIds)), pubs.items) : new Map()),
    [library, pubs.status, pubs.items, ownIds]
  );
  const groups = useMemo(() => {
    const mine = [];
    const fromFeed = [];
    for (const m of library) (isFeedMix(m, ownIds) ? fromFeed : mine).push(m);
    return { mine, fromFeed };
  }, [library, ownIds]);

  // Supprimer un mix de MA liste retire aussi sa publication du fil public :
  // l'un suit l'autre. Un mix pris chez quelqu'un d'autre n'a rien à retirer.
  const handleDelete = async (m, publication) => {
    onDelete(m.id);
    if (!publication) {
      setNotice(null);
      return;
    }
    const res = await unpublishMix(publication.id);
    if (res.ok) {
      await clearPublication(publication.id);
      pubs.refresh();
      setNotice({ ok: true, text: 'Supprimé, et retiré aussi du fil public.' });
    } else {
      setNotice({
        ok: false,
        text: 'Supprimé ici, mais pas retiré du fil public (connexion). Retire-le depuis Mes publications.',
      });
    }
  };

  const renderRow = (m, { feed }) => {
    const total = getMixTotalDuration(m.blocks || []);
    const min = Math.floor(total / 60);
    const sec = total % 60;
    // Le repère de publication ne concerne que MES créations.
    const published = !feed && pubs.status === 'ok' ? assigned.get(m.id) ?? null : null;
    const showPrivate = !feed && pubs.status === 'ok' && !published;
    const author = feed ? m.fromFeed?.author : null;
    return (
      <View key={m.id} style={styles.libRow}>
        <Pressable
          onPress={async () => {
            const r = await onLoad(m.id);
            if (r !== false) close.current?.();
          }}
          style={({ pressed }) => [styles.libRowMain, pressed && { opacity: 0.7 }]}
        >
          <View
            style={[
              styles.libDot,
              { backgroundColor: published ? ONLINE : feed ? 'rgba(149,117,255,0.75)' : 'rgba(255,255,255,0.40)' },
            ]}
          />
          <View style={{ flex: 1 }}>
            <View style={styles.nameLine}>
              <Text style={styles.libName} numberOfLines={1}>{m.name}</Text>
              {!!published && (
                <View style={styles.onlinePill}>
                  <AppIcon name="globe" size={10} color={ONLINE} />
                  <Text style={styles.onlineText}>EN LIGNE</Text>
                </View>
              )}
              {showPrivate && (
                <View style={styles.privatePill}>
                  <AppIcon name="lock" size={10} color="rgba(255,255,255,0.45)" />
                  <Text style={styles.privateText}>PRIVÉ</Text>
                </View>
              )}
            </View>
            <Text style={styles.libMeta} numberOfLines={1}>
              {(m.blocks?.length || 0)} blocs · {hasEstimatedDuration(m.blocks) ? '~' : ''}
              {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
              {author ? ` · par ${author}` : ''}
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => {
            haptic.light();
            shareAfterCloseRef.current = m;
            close.current?.();
          }}
          style={({ pressed }) => [styles.libShare, pressed && { opacity: 0.7 }]}
          hitSlop={10}
        >
          <AppIcon name="share" size={14} color="rgba(255,255,255,0.55)" />
        </Pressable>
        <Pressable
          onPress={() => handleDelete(m, published)}
          style={({ pressed }) => [styles.libDelete, pressed && { opacity: 0.7 }]}
          hitSlop={10}
        >
          <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <Path d="M3 3l8 8M11 3l-8 8" stroke="#FF5454" strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </Pressable>
      </View>
    );
  };

  return (
    <BottomSheet screenH={screenH} onClose={handleClosed}>
      {({ close: sheetClose }) => {
        close.current = sheetClose;
        return (
          <View>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.kicker}>MES MIX</Text>
                <Text style={styles.title}>
                  {library.length} enregistré{library.length > 1 ? 's' : ''}
                </Text>
              </View>
              <IconButton
                icon="close"
                size={ROUND_SIZE.sheet}
                haptic={haptic.light}
                onPress={sheetClose}
                accessibilityLabel="Fermer"
              />
            </View>

            {library.length === 0 && <Text style={styles.libEmpty}>{emptyText}</Text>}

            {groups.mine.length > 0 && (
              <View style={styles.group}>
                <Text style={styles.groupTitle}>MES CRÉATIONS · {groups.mine.length}</Text>
                <View style={styles.libList}>{groups.mine.map((m) => renderRow(m, { feed: false }))}</View>
              </View>
            )}

            {groups.fromFeed.length > 0 && (
              <View style={styles.group}>
                <View style={styles.groupHead}>
                  <AppIcon name="globe" size={11} color="rgba(149,117,255,0.9)" />
                  <Text style={[styles.groupTitle, { color: 'rgba(149,117,255,0.9)' }]}>
                    ENREGISTRÉS DEPUIS LE FIL · {groups.fromFeed.length}
                  </Text>
                </View>
                <View style={styles.libList}>{groups.fromFeed.map((m) => renderRow(m, { feed: true }))}</View>
                <Text style={styles.groupNote}>
                  Créés par d'autres : tu peux les modifier, ta version reste la tienne.
                </Text>
              </View>
            )}

            {!!notice && (
              <Text style={[styles.notice, { color: notice.ok ? '#1FC777' : '#FF5454' }]}>{notice.text}</Text>
            )}

            <Text style={styles.libHint}>{hint}</Text>
          </View>
        );
      }}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  kicker: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.50)',
    marginBottom: 6,
  },
  title: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  group: {
    marginBottom: 14,
  },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  groupTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 2.4,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 8,
  },
  groupNote: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    lineHeight: 15,
    color: 'rgba(255,255,255,0.40)',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  libList: {
    gap: 8,
  },
  libEmpty: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    paddingVertical: 24,
  },
  libRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderRadius: 14,
    paddingRight: 8,
  },
  libRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  libDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  libName: {
    flexShrink: 1,
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(31,199,119,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(31,199,119,0.45)',
  },
  onlineText: {
    fontFamily: fonts.monoBold,
    fontSize: 8.5,
    letterSpacing: 1,
    color: ONLINE,
  },
  privatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  privateText: {
    fontFamily: fonts.monoBold,
    fontSize: 8.5,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.45)',
  },
  libMeta: {
    fontFamily: fonts.monoRegular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  libShare: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  libDelete: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,84,84,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: {
    fontFamily: fonts.sansSemibold,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginBottom: 10,
  },
  libHint: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.40)',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
