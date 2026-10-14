import React, { useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import BottomSheet from './BottomSheet';
import IconButton from './IconButton';
import AppIcon from './AppIcon';
import { getMixTotalDuration, hasEstimatedDuration } from '../../lib/mix-blocks';
import { isFeedMix } from '../../lib/mixes';
import { assignPublications, FREE_PUBLISHED_MIXES } from '../../lib/publicMixShape';
import { cleanMixColor } from '../../lib/mixMeta';
import { formatMixClock } from '../../lib/formatters';
import { unpublishMix } from '../../lib/publicMixes';
import { useTimers } from '../../contexts/TimersContext';
import { fonts } from '../../lib/fonts';
import { ROUND_SIZE } from '../../lib/buttonTokens';
import { useHaptic } from '../../hooks/useHaptic';
import { useMyPublications } from '../../hooks/useMyPublications';
import { usePremium } from '../../hooks/usePremium';
import { FREE_CREATIONS, FREE_DOWNLOADS } from '../../lib/libraryLimits';

const ONLINE = '#1FC777';

/**
 * « Mes mix » : la bibliothèque des mix enregistrés. Sortie du constructeur
 * (app/mix-builder.js) pour être aussi ouverte depuis le hub Mix et Partage
 * (app/mix-hub.js) — une seule liste, un seul rendu.
 *
 * Deux familles, séparées à l'écran : MES CRÉATIONS (publiées ou non), et les
 * mix SAUVEGARDÉS (créés par d'autres : fil public ou lien d'un ami). Un mix
 * sauvegardé reste modifiable une fois dans la bibliothèque : on le charge comme
 * les autres, mais il ne rejoint jamais Mes créations.
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
  // Mode « lancement » (Planning) : toucher un mix le LANCE ; ni partage ni
  // suppression ici, on ne fait que choisir quoi lancer.
  launchMode = false,
  hint = launchMode ? 'Tap = lancer ce mix' : 'Tap = charger · 3s sur Enregistrer = couleur et note',
  emptyText = launchMode
    ? 'Aucun mix enregistré pour l’instant. Crée-en un dans le constructeur.'
    : 'Aucun mix sauvegardé. Maintiens "Enregistrer" 3s dans le constructeur pour en ajouter un.',
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
    // Deux volets, jamais mélangés : MES CRÉATIONS (tout ce que j'ai fabriqué ici,
    // publié ou non : le repère EN LIGNE / PRIVÉ est sur chaque ligne) et les mix
    // SAUVEGARDÉS (pris chez les autres, par le fil ou par un lien d'ami).
    // `published` / `privateCount` ne servent qu'à la ligne des limites gratuites.
    const mine = [];
    const fromFeed = [];
    let published = 0;
    for (const m of library) {
      if (isFeedMix(m, ownIds)) fromFeed.push(m);
      else {
        mine.push(m);
        if (assigned.get(m.id)) published += 1;
      }
    }
    return { mine, fromFeed, published, privateCount: mine.length - published };
  }, [library, ownIds, assigned]);
  const { isPremium } = usePremium();
  // Créations ouvertes au départ, le reste fermé : moins de lignes à afficher.
  const [open, setOpen] = useState({ mine: true, fromFeed: false });
  const toggle = (key) => {
    haptic.light();
    setOpen((o) => ({ ...o, [key]: !o[key] }));
  };

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
    // Le repère de publication ne concerne que MES créations.
    const published = !feed && pubs.status === 'ok' ? assigned.get(m.id) ?? null : null;
    const showPrivate = !feed && pubs.status === 'ok' && !published;
    const author = feed ? m.fromFeed?.author : null;
    return (
      <View key={m.id} style={styles.libRow}>
        {/* Code couleur du mix (Constructeur › maintien de « Enregistrer ») :
            une petite barre sur le bord gauche de la carte. */}
        {!!cleanMixColor(m.color) && (
          <View pointerEvents="none" style={[styles.colorBar, { backgroundColor: cleanMixColor(m.color) }]} />
        )}
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
              {formatMixClock(total)}
              {author ? ` · par ${author}` : ''}
            </Text>
            {!!m.note && (
              <Text style={styles.libNote} numberOfLines={1}>
                {m.note}
              </Text>
            )}
          </View>
        </Pressable>
        {launchMode ? (
          <View style={styles.libPlay} pointerEvents="none">
            <AppIcon name="play" size={14} color="#FFFFFF" />
          </View>
        ) : (
          <>
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
          </>
        )}
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
                <Text style={styles.kicker}>{launchMode ? 'LANCER UN MIX' : 'MES MIX'}</Text>
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
                <Pressable onPress={() => toggle('mine')} style={styles.groupHead} hitSlop={6}>
                  <Text style={[styles.groupTitle, styles.groupTitleFlex]}>
                    MES CRÉATIONS · {groups.mine.length}
                  </Text>
                  <Chevron open={open.mine} />
                </Pressable>
                {open.mine && (
                  <>
                    <View style={styles.libList}>{groups.mine.map((m) => renderRow(m, { feed: false }))}</View>
                    {!isPremium && (
                      <Text style={styles.groupNote}>
                        Gratuit : {groups.privateCount} / {FREE_CREATIONS} créations privées
                        {pubs.status === 'ok' ? ` · ${groups.published} / ${FREE_PUBLISHED_MIXES} publiées` : ''}
                      </Text>
                    )}
                  </>
                )}
              </View>
            )}

            {groups.fromFeed.length > 0 && (
              <View style={styles.group}>
                <Pressable onPress={() => toggle('fromFeed')} style={styles.groupHead} hitSlop={6}>
                  <AppIcon name="globe" size={11} color="rgba(149,117,255,0.9)" />
                  <Text style={[styles.groupTitle, styles.groupTitleFlex, { color: 'rgba(149,117,255,0.9)' }]}>
                    SAUVEGARDÉS · {isPremium ? groups.fromFeed.length : `${groups.fromFeed.length} / ${FREE_DOWNLOADS}`}
                  </Text>
                  <Chevron open={open.fromFeed} />
                </Pressable>
                {open.fromFeed && (
                  <>
                    <View style={styles.libList}>{groups.fromFeed.map((m) => renderRow(m, { feed: true }))}</View>
                    <Text style={styles.groupNote}>
                      Créés par d'autres : tu peux les modifier, ils restent dans cette liste.
                    </Text>
                  </>
                )}
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

// Petite flèche de volet : vers le bas = ouvert.
const Chevron = ({ open }) => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none" style={{ transform: [{ rotate: open ? '0deg' : '-90deg' }] }}>
    <Path d="M2.5 4.5L6 8l3.5-3.5" stroke="rgba(255,255,255,0.55)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const styles = StyleSheet.create({
  groupTitleFlex: { flex: 1 },
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
  colorBar: {
    position: 'absolute',
    left: 6,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 2,
  },
  libNote: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 3,
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
  libPlay: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(149,117,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
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
