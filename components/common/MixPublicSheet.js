import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import BottomSheet from './BottomSheet';
import Button from './Button';
import IconButton from './IconButton';
import PressTap from './PressTap';
import AppIcon from './AppIcon';
import StarRating, { STAR_ON } from './StarRating';
import { haptic } from '../../hooks/useHaptic';
import { useAuth } from '../../contexts/AuthContext';
import { useTimers } from '../../contexts/TimersContext';
import { fonts } from '../../lib/fonts';
import { ROUND_SIZE } from '../../lib/buttonTokens';
import { TIMERS } from '../../lib/timers-config';
import { DISCIPLINES, getDiscipline } from '../../lib/disciplines';
import { makeDefaultMix } from '../../lib/mixes';
import { fetchFeed, fetchMyRatings, rateMix } from '../../lib/publicMixes';
import {
  FEED_SORTS,
  feedItemToMix,
  formatFeedDuration,
  formatRating,
} from '../../lib/publicMixShape';

const MODE_COLOR = Object.fromEntries(TIMERS.map((t) => [t.id, t.color]));
const MIX_COLOR = MODE_COLOR.mix;
// Un bloc repos n'a pas de couleur de mode : blanc translucide, plus court.
const REST_COLOR = 'rgba(255,255,255,0.22)';

/**
 * Bande de segments, un par bloc, à la couleur de son mode. Partagée avec le
 * Hub Profil (ProfileMixShare) et la feuille de partage du Constructeur MIX.
 */
export function BlockStrip({ blocks, height = 6, style }) {
  return (
    <View style={[styles.strip, { height }, style]}>
      {blocks.map((id, i) => (
        <View
          key={`${id}-${i}`}
          style={{
            flex: id === 'rest' ? 0.5 : 1,
            borderRadius: height / 2,
            backgroundColor: id === 'rest' ? REST_COLOR : MODE_COLOR[id] ?? REST_COLOR,
          }}
        />
      ))}
    </View>
  );
}

// « Karim.W » → KW, « ThomasR » → TR.
function initialsOf(author) {
  const parts = author.split(/[^A-Za-zÀ-ÿ0-9]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  const word = parts[0] ?? '?';
  const cap = word.slice(1).match(/[A-Z]/);
  return (word[0] + (cap ? cap[0] : word[1] ?? '')).toUpperCase();
}

// Le MIX « Mon WOD » fourni à l'installation : le remplacer ne perd rien.
const isDefaultMix = (mix) =>
  JSON.stringify(mix?.blocks) === JSON.stringify(makeDefaultMix().blocks);

function FeedCard({ item, user, myStars, saved, onRate, onSave, onTest, onLogin }) {
  const isOwn = !!user && item.ownerId === user.id;
  const discipline = getDiscipline(item.category);
  // L'avatar prend la couleur du premier bloc : aucune couleur inventée.
  const tint = MODE_COLOR[item.blockTypes.find((b) => b !== 'rest')] ?? '#FFFFFF';

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={[styles.avatar, { backgroundColor: `${tint}24`, borderColor: `${tint}55` }]}>
          <Text style={[styles.avatarText, { color: tint }]}>{initialsOf(item.author || '?')}</Text>
        </View>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardAuthor} numberOfLines={1}>par {item.author || 'Athlète'}</Text>
        </View>
        <View style={styles.tag}>
          <AppIcon name={discipline.icon} size={11} color="rgba(255,255,255,0.70)" />
          <Text style={styles.tagText} numberOfLines={1}>{discipline.short}</Text>
        </View>
      </View>

      <BlockStrip blocks={item.blockTypes} style={styles.cardStrip} />

      <View style={styles.meta}>
        <AppIcon name="clock" size={12} color="rgba(255,255,255,0.55)" />
        <Text style={styles.metaText}>{formatFeedDuration(item.durationSeconds, item.estimate)}</Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.metaText}>{item.blockCount} bloc{item.blockCount > 1 ? 's' : ''}</Text>
        <Text style={styles.metaDot}>·</Text>
        <AppIcon name="star-fill" size={12} color={item.ratingCount ? STAR_ON : 'rgba(255,255,255,0.28)'} />
        <Text style={styles.metaText}>{formatRating(item.ratingAvg, item.ratingCount)}</Text>
      </View>

      {!user ? (
        <Button
          variant="glass"
          size="sm"
          icon="lock"
          label="Connecte-toi pour tester"
          onPress={onLogin}
          style={styles.cardAction}
        />
      ) : isOwn ? (
        <View style={styles.ownPill}>
          <AppIcon name="user" size={12} color="rgba(255,255,255,0.70)" />
          <Text style={styles.ownText}>TON MIX</Text>
        </View>
      ) : (
        <>
          <View style={styles.cardActions}>
            <Button
              variant="glass"
              size="sm"
              icon={saved ? 'check' : 'plus'}
              label={saved ? 'Enregistré' : 'Enregistrer'}
              onPress={onSave}
              disabled={saved}
              style={styles.actionBtn}
            />
            <Button
              variant="accent"
              color={MIX_COLOR}
              size="sm"
              icon="play"
              label="Tester"
              onPress={onTest}
              style={styles.actionBtn}
            />
          </View>
          <View style={styles.rateRow}>
            <Text style={styles.rateLabel}>TA NOTE</Text>
            <StarRating value={myStars} size={20} gap={6} onRate={onRate} />
          </View>
        </>
      )}
    </View>
  );
}

function PublicContent({ screenH, close, afterClose, onTest }) {
  const router = useRouter();
  const { user } = useAuth();
  const { library, currentMix, saveAsLibraryEntry, saveCurrentMix } = useTimers();

  const [category, setCategory] = useState(null);
  const [sort, setSort] = useState('recent');
  const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'unavailable' | 'error'
  const [items, setItems] = useState([]);
  const [myRatings, setMyRatings] = useState({});
  const [reloadKey, setReloadKey] = useState(0);

  const userId = user?.id ?? null;

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    (async () => {
      const res = await fetchFeed({ category, sort });
      if (cancelled) return;
      if (!res.ok) {
        setStatus(res.reason === 'unavailable' ? 'unavailable' : 'error');
        return;
      }
      setItems(res.items);
      setStatus('ok');
      if (userId && res.items.length) {
        const mine = await fetchMyRatings(res.items.map((i) => i.id));
        if (!cancelled && mine.ok) setMyRatings(mine.ratings);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category, sort, reloadKey, userId]);

  const goLogin = () => {
    haptic.light();
    afterClose(() => router.push('/login'));
    close();
  };

  const handleRate = async (item, stars) => {
    if (!userId) return;
    const previous = myRatings[item.id] ?? 0;
    setMyRatings((r) => ({ ...r, [item.id]: stars }));
    const res = await rateMix(item.id, userId, stars);
    if (!res.ok) {
      setMyRatings((r) => ({ ...r, [item.id]: previous }));
      haptic.error();
      return;
    }
    haptic.success();
    if (res.ratingAvg != null) {
      setItems((list) =>
        list.map((i) => (i.id === item.id ? { ...i, ratingAvg: res.ratingAvg, ratingCount: res.ratingCount } : i))
      );
    }
  };

  const handleSave = async (item) => {
    const mix = feedItemToMix(item);
    if (!mix) {
      haptic.error();
      return;
    }
    haptic.success();
    await saveAsLibraryEntry(mix);
  };

  const handleTest = async (item) => {
    const mix = feedItemToMix(item);
    if (!mix) {
      haptic.error();
      return;
    }
    haptic.medium();
    if (onTest) {
      await onTest(mix);
      close();
      return;
    }
    // « Tester » remplace le MIX de l'accueil : on range d'abord l'ancien dans
    // « Mes mix » s'il n'y est pas (et qu'il a été modifié), pour ne rien perdre.
    if (currentMix?.blocks?.length && !isDefaultMix(currentMix) && !library.some((m) => m.id === currentMix.id)) {
      await saveAsLibraryEntry(currentMix);
    }
    await saveCurrentMix(mix);
    afterClose(() => {
      if (router.canDismiss()) router.dismissAll();
      router.replace({ pathname: '/home', params: { lastTimerId: 'mix' } });
    });
    close();
  };

  return (
    <View>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>FIL PUBLIC</Text>
          <Text style={styles.title} numberOfLines={1}>Les mixes des autres</Text>
        </View>
        <IconButton
          icon="close"
          size={ROUND_SIZE.sheet}
          haptic={haptic.light}
          onPress={close}
          accessibilityLabel="Fermer"
        />
      </View>

      {!user && status !== 'unavailable' && (
        <View style={styles.notice}>
          <AppIcon name="lock" size={14} color="rgba(255,255,255,0.60)" />
          <Text style={styles.noticeText}>
            Tu peux tout voir. Pour tester, enregistrer ou noter un mix, il faut un compte.
          </Text>
          <Button variant="glass" size="sm" label="Connexion" onPress={goLogin} />
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chips}
      >
        {[null, ...DISCIPLINES.map((d) => d.id)].map((id) => {
          const active = id === category;
          return (
            <PressTap
              key={id ?? 'all'}
              tapScale={0.94}
              onHapticIn={haptic.selection}
              onPress={() => setCategory(id)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {id === null ? 'TOUS' : getDiscipline(id).short}
              </Text>
            </PressTap>
          );
        })}
      </ScrollView>

      <View style={styles.sortRow}>
        <Text style={styles.countText}>
          {status === 'ok' ? `${items.length} MIX` : ' '}
        </Text>
        <View style={styles.sorts}>
          {FEED_SORTS.map((s) => {
            const active = s.id === sort;
            return (
              <PressTap
                key={s.id}
                tapScale={0.94}
                onHapticIn={haptic.selection}
                onPress={() => setSort(s.id)}
                hitSlop={8}
              >
                <Text style={[styles.sortText, active && styles.sortTextActive]}>{s.label}</Text>
              </PressTap>
            );
          })}
        </View>
      </View>

      {/* BottomSheet grandit vers le haut sans limite : la liste est bornée. */}
      <ScrollView
        style={{ maxHeight: Math.min(460, screenH * 0.55) }}
        contentContainerStyle={styles.list}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        {status === 'loading' && (
          <View style={styles.stateBox}>
            <ActivityIndicator color="rgba(255,255,255,0.6)" />
          </View>
        )}
        {status === 'unavailable' && (
          <View style={styles.stateBox}>
            <AppIcon name="globe" size={22} color="rgba(255,255,255,0.45)" />
            <Text style={styles.stateTitle}>Le fil public n'est pas encore ouvert</Text>
            <Text style={styles.stateText}>Reviens bientôt : les mixes des autres apparaîtront ici.</Text>
          </View>
        )}
        {status === 'error' && (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>Impossible de charger le fil</Text>
            <Text style={styles.stateText}>Vérifie ta connexion internet.</Text>
            <Button
              variant="glass"
              size="sm"
              label="Réessayer"
              onPress={() => setReloadKey((k) => k + 1)}
              style={{ marginTop: 12 }}
            />
          </View>
        )}
        {status === 'ok' && items.length === 0 && (
          <View style={styles.stateBox}>
            <AppIcon name="mix" size={22} color="rgba(255,255,255,0.45)" />
            <Text style={styles.stateTitle}>Rien ici pour l'instant</Text>
            <Text style={styles.stateText}>
              {category ? 'Aucun mix dans cette catégorie.' : 'Sois le premier à publier un mix !'}
            </Text>
          </View>
        )}
        {status === 'ok' &&
          items.map((item) => (
            <FeedCard
              key={item.id}
              item={item}
              user={user}
              myStars={myRatings[item.id] ?? 0}
              saved={library.some((m) => m.id === `mix_pub_${item.id}`)}
              onRate={(n) => handleRate(item, n)}
              onSave={() => handleSave(item)}
              onTest={() => handleTest(item)}
              onLogin={goLogin}
            />
          ))}
      </ScrollView>
    </View>
  );
}

/**
 * Fil public. `onTest(mix)` (facultatif) remplace le comportement par défaut de
 * « Tester » (ranger l'ancien MIX, mettre celui-ci à l'accueil et y aller) :
 * le Constructeur MIX s'en sert pour charger le mix dans son brouillon au lieu
 * de quitter l'écran.
 */
export default function MixPublicSheet({ screenH, onClose, onTest }) {
  const afterCloseRef = useRef(null);

  // Une navigation demandée depuis la feuille (connexion, accueil) attend la
  // fin de son animation de fermeture : partir avant laisserait son
  // BackHandler armé sous l'écran suivant, et le retour Android fermerait la
  // feuille invisible au lieu de l'écran.
  const handleClose = () => {
    onClose();
    const next = afterCloseRef.current;
    afterCloseRef.current = null;
    next?.();
  };

  return (
    <BottomSheet screenH={screenH} onClose={handleClose}>
      {({ close }) => (
        <PublicContent
          screenH={screenH}
          close={close}
          afterClose={(fn) => {
            afterCloseRef.current = fn;
          }}
          onTest={onTest}
        />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    gap: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerText: {
    flex: 1,
    paddingRight: 12,
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
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.60)',
  },
  // Les puces vont d'un bord à l'autre de la feuille (qui a 20 de marge).
  chipsScroll: {
    flexGrow: 0,
    marginHorizontal: -20,
    marginBottom: 12,
  },
  chips: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  chipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  chipText: {
    fontFamily: fonts.sansBold,
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.75)',
  },
  chipTextActive: {
    color: '#0A0A0A',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  countText: {
    fontFamily: fonts.monoBold,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.50)',
  },
  sorts: {
    flexDirection: 'row',
    gap: 14,
  },
  sortText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.40)',
  },
  sortTextActive: {
    color: '#FFFFFF',
  },
  list: {
    gap: 10,
    paddingBottom: 4,
  },
  stateBox: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 6,
  },
  stateTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 6,
  },
  stateText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
    padding: 14,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardName: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  cardAuthor: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 1,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: 120,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  tagText: {
    flexShrink: 1,
    fontFamily: fonts.monoBold,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.70)',
  },
  cardStrip: {
    marginTop: 14,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 12,
  },
  metaText: {
    fontFamily: fonts.monoRegular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.60)',
  },
  metaDot: {
    fontFamily: fonts.monoRegular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.30)',
  },
  cardAction: {
    marginTop: 12,
    alignSelf: 'stretch',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  rateLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.45)',
  },
  ownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  ownText: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.70)',
  },
});
