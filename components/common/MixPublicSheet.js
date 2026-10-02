import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import BottomSheet from './BottomSheet';
import Button from './Button';
import IconButton from './IconButton';
import MiniToast from './MiniToast';
import PressTap from './PressTap';
import AppIcon from './AppIcon';
import MixCommentsView from './MixCommentsView';
import StarRating, { STAR_ON } from './StarRating';
import { haptic } from '../../hooks/useHaptic';
import { useAuth } from '../../contexts/AuthContext';
import { useTimers } from '../../contexts/TimersContext';
import { fonts } from '../../lib/fonts';
import { ROUND_SIZE } from '../../lib/buttonTokens';
import { TIMERS } from '../../lib/timers-config';
import { DISCIPLINES, getDiscipline } from '../../lib/disciplines';
import { isDefaultMix } from '../../lib/mixes';
import { fetchCommentCounts } from '../../lib/mixComments';
import {
  fetchFeed,
  fetchMyPublishedMixes,
  fetchMyRatings,
  fetchMyReports,
  rateMix,
  reportMix,
  unpublishMix,
} from '../../lib/publicMixes';
import {
  FEED_SORTS,
  REPORT_REASONS,
  feedItemToMix,
  formatFeedDuration,
  formatRating,
} from '../../lib/publicMixShape';

const MODE_COLOR = Object.fromEntries(TIMERS.map((t) => [t.id, t.color]));
const MIX_COLOR = MODE_COLOR.mix;
// Durée d'affichage du petit message « connecte-toi… ».
const TOAST_MS = 3200;
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

function FeedCard({
  item,
  user,
  myStars,
  saved,
  reported,
  reporting,
  removing,
  commentCount,
  onOpenComments,
  onRate,
  onSave,
  onTest,
  onEdit,
  onAskRemove,
  onCancelRemove,
  onRemove,
  onOpenReport,
  onCancelReport,
  onReport,
}) {
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

      {/* Commentaires : lisibles par tous, ouverts à l'écriture avec un compte
          (MixCommentsView). Pastille « n commentaires » quand on les connaît. */}
      <PressTap
        tapScale={0.97}
        hitSlop={8}
        onHapticIn={haptic.light}
        onPress={onOpenComments}
        containerStyle={styles.commentsRow}
        accessibilityLabel="Voir les commentaires"
      >
        <AppIcon name="chat" size={13} color="rgba(255,255,255,0.65)" />
        <Text style={styles.commentsText}>
          {commentCount > 0
            ? `${commentCount} commentaire${commentCount > 1 ? 's' : ''}`
            : 'Commenter'}
        </Text>
        <Text style={styles.commentsChevron}>›</Text>
      </PressTap>

      {isOwn ? (
        <>
          <View style={styles.ownPill}>
            <AppIcon name="user" size={12} color="rgba(255,255,255,0.70)" />
            <Text style={styles.ownText}>TON MIX</Text>
          </View>
          {/* L'auteur n'est plus bloqué (v16.3.0) : il peut corriger son mix
              (nom, orthographe, blocs), le tester et le retirer du fil sans
              toucher à son compte. Noter ou signaler son propre mix n'a pas de
              sens : ces lignes restent réservées aux autres. */}
          <View style={styles.cardActions}>
            <Button
              variant="glass"
              size="sm"
              icon="sliders"
              label="Modifier"
              onPress={onEdit}
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
          {removing ? (
            <View style={styles.reportBox}>
              <Text style={styles.reportTitle}>Retirer « {item.name} » du fil ?</Text>
              <Text style={styles.removeNote}>
                Il disparaît du fil public, avec ses notes. Il reste enregistré sur ton téléphone si tu l'y as gardé.
              </Text>
              <View style={styles.cardActions}>
                <Button variant="glass" size="sm" label="Annuler" onPress={onCancelRemove} style={styles.actionBtn} />
                <Button variant="danger" size="sm" label="Retirer" onPress={onRemove} style={styles.actionBtn} />
              </View>
            </View>
          ) : (
            <PressTap
              tapScale={0.96}
              hitSlop={8}
              onHapticIn={haptic.light}
              onPress={onAskRemove}
              containerStyle={styles.reportRow}
              accessibilityLabel="Retirer ce mix du fil public"
            >
              <AppIcon name="close" size={12} color="rgba(255,255,255,0.45)" />
              <Text style={styles.reportLink}>Retirer du fil</Text>
            </PressTap>
          )}
        </>
      ) : (
        <>
          {/* Tester est ouvert à tous ; Enregistrer, noter et signaler demandent un
              compte (le parent répond par un petit message si personne n'est connecté). */}
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

          {reporting ? (
            <View style={styles.reportBox}>
              <Text style={styles.reportTitle}>Pourquoi signaler ce mix ?</Text>
              <View style={styles.reportChips}>
                {REPORT_REASONS.map((r) => (
                  <PressTap
                    key={r.id}
                    tapScale={0.94}
                    onHapticIn={haptic.selection}
                    onPress={() => onReport(r.id)}
                    style={styles.reportChip}
                  >
                    <Text style={styles.reportChipText}>{r.label}</Text>
                  </PressTap>
                ))}
              </View>
              <PressTap tapScale={0.96} hitSlop={8} onPress={onCancelReport} containerStyle={styles.reportCancel}>
                <Text style={styles.reportLink}>Annuler</Text>
              </PressTap>
            </View>
          ) : reported ? (
            <View style={styles.reportRow}>
              <AppIcon name="check" size={12} color="rgba(255,255,255,0.45)" />
              <Text style={styles.reportDone}>Signalé, merci</Text>
            </View>
          ) : (
            <PressTap
              tapScale={0.96}
              hitSlop={8}
              onHapticIn={haptic.light}
              onPress={onOpenReport}
              containerStyle={styles.reportRow}
              accessibilityLabel="Signaler ce mix"
            >
              <AppIcon name="flag" size={12} color="rgba(255,255,255,0.45)" />
              <Text style={styles.reportLink}>Signaler</Text>
            </PressTap>
          )}
        </>
      )}
    </View>
  );
}

function PublicContent({ screenH, close, afterClose, onTest, onEdit, mine, launchOnTest }) {
  const router = useRouter();
  const openPreview = () => router.push({ pathname: '/mix-builder', params: { preview: '1' } });
  const { user } = useAuth();
  const { library, currentMix, saveAsLibraryEntry, saveCurrentMix, clearPublication } = useTimers();

  const [category, setCategory] = useState(null);
  const [sort, setSort] = useState('recent');
  const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'unavailable' | 'error'
  const [items, setItems] = useState([]);
  const [myRatings, setMyRatings] = useState({});
  const [reloadKey, setReloadKey] = useState(0);
  const [reportedIds, setReportedIds] = useState(() => new Set());
  const [reportingId, setReportingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  // Mix dont on lit les commentaires : la vue remplace la liste (jamais une
  // deuxième feuille par-dessus celle-ci).
  const [commentsItem, setCommentsItem] = useState(null);
  const [commentCounts, setCommentCounts] = useState({});
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const userId = user?.id ?? null;

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Petit message qui se retire tout seul (MiniToast).
  const showToast = (t) => {
    clearTimeout(toastTimer.current);
    setToast({ ...t, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  };

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    (async () => {
      // « Mes publications » : seulement mes mix, aucune note ni signalement à
      // aller chercher (on ne note ni ne signale les siens).
      if (mine) {
        if (!userId) {
          setItems([]);
          setStatus('login');
          return;
        }
        const own = await fetchMyPublishedMixes(userId);
        if (cancelled) return;
        if (!own.ok) {
          setStatus(own.reason === 'unavailable' ? 'unavailable' : 'error');
          return;
        }
        setItems(own.items);
        setStatus('ok');
        return;
      }
      const res = await fetchFeed({ category, sort });
      if (cancelled) return;
      if (!res.ok) {
        setStatus(res.reason === 'unavailable' ? 'unavailable' : 'error');
        return;
      }
      setItems(res.items);
      setStatus('ok');
      if (userId && res.items.length) {
        const ids = res.items.map((i) => i.id);
        const [mine, flagged] = await Promise.all([fetchMyRatings(ids), fetchMyReports(ids)]);
        if (cancelled) return;
        if (mine.ok) setMyRatings(mine.ratings);
        if (flagged.ok) setReportedIds(new Set(flagged.reported));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category, sort, reloadKey, userId, mine]);

  // Compteurs de commentaires : jamais bloquants (un échec = pas de compteur).
  // Relus à chaque changement de liste et au retour d'un fil de commentaires.
  useEffect(() => {
    if (!items.length) return undefined;
    let cancelled = false;
    fetchCommentCounts(items.map((i) => i.id)).then((res) => {
      if (!cancelled && res.ok) setCommentCounts(res.counts);
    });
    return () => {
      cancelled = true;
    };
  }, [items, commentsItem]);

  const goLogin = () => {
    haptic.light();
    afterClose(() => router.push('/login'));
    close();
  };

  // Sans compte : pas de fenêtre, un petit message qui propose de se connecter.
  const promptLogin = (text) => {
    haptic.warning();
    showToast({ text, icon: 'lock', actionLabel: 'Connexion', onAction: goLogin });
  };

  const handleRate = async (item, stars) => {
    if (!userId) {
      promptLogin('Connecte-toi pour noter ce mix.');
      return;
    }
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
    if (!userId) {
      promptLogin('Connecte-toi pour enregistrer ce mix.');
      return;
    }
    const mix = feedItemToMix(item);
    if (!mix) {
      haptic.error();
      return;
    }
    haptic.success();
    // `fromFeed` : « Mes mix » range les mix des autres à part des miens.
    await saveAsLibraryEntry({ ...mix, fromFeed: { author: item.author, feedId: item.id } });
  };

  const handleOpenReport = (item) => {
    if (!userId) {
      promptLogin('Connecte-toi pour signaler un mix.');
      return;
    }
    setReportingId(item.id);
  };

  const handleReport = async (item, reason) => {
    setReportingId(null);
    setReportedIds((s) => new Set(s).add(item.id));
    const res = await reportMix(item.id, userId, reason);
    if (!res.ok) {
      setReportedIds((s) => {
        const next = new Set(s);
        next.delete(item.id);
        return next;
      });
      haptic.error();
      showToast({ text: 'Signalement impossible, réessaie.', icon: 'flag' });
      return;
    }
    haptic.success();
    showToast({ text: 'Merci, signalement envoyé.', icon: 'check' });
  };

  // L'ancien MIX, s'il a été modifié et n'est pas déjà enregistré, est rangé
  // dans « Mes mix » avant d'être remplacé : rien ne se perd.
  const stashCurrentMix = async () => {
    if (currentMix?.blocks?.length && !isDefaultMix(currentMix) && !library.some((m) => m.id === currentMix.id)) {
      await saveAsLibraryEntry(currentMix);
    }
  };

  // « Modifier » mon mix publié : il devient le MIX courant et s'ouvre dans le
  // constructeur, lié à sa publication (le bandeau « Mettre à jour » y renvoie
  // les corrections vers le fil). Depuis le constructeur lui-même, `onEdit`
  // charge le brouillon sur place au lieu de naviguer.
  const handleEdit = async (item) => {
    const base = feedItemToMix(item);
    if (!base) {
      haptic.error();
      return;
    }
    // Mon propre mix : marqué « à moi » (pas un mix des autres) et relié à sa
    // publication, pour que republier le mette à jour au lieu d'en créer un autre.
    const mix = { ...base, own: true, publishedId: item.id };
    haptic.medium();
    if (onEdit) {
      // `false` = pas maintenant (une confirmation s'affiche) : la feuille reste ouverte.
      const r = await onEdit(mix, item);
      if (r === false) return;
      close();
      return;
    }
    await stashCurrentMix();
    await saveCurrentMix(mix);
    afterClose(() => {
      router.push({
        pathname: '/mix-builder',
        params: { publishedId: item.id, publishedCategory: item.category },
      });
    });
    close();
  };

  const handleRemove = async (item) => {
    setRemovingId(null);
    const res = await unpublishMix(item.id);
    if (!res.ok) {
      haptic.error();
      showToast({ text: 'Impossible de le retirer, réessaie.', icon: 'close' });
      return;
    }
    haptic.warning();
    setItems((list) => list.filter((i) => i.id !== item.id));
    await clearPublication(item.id);
    showToast({ text: 'Retiré du fil public.', icon: 'check' });
  };

  const handleTest = async (item) => {
    const base = feedItemToMix(item);
    if (!base) {
      haptic.error();
      return;
    }
    // Marqué d'où il vient : « Mes mix » range les mix des autres à part des miens.
    const mix =
      userId && item.ownerId === userId
        ? { ...base, own: true, publishedId: item.id }
        : { ...base, fromFeed: { author: item.author, feedId: item.id } };
    haptic.medium();
    if (onTest) {
      const r = await onTest(mix);
      if (r === false) return;
      // Hors constructeur (page Mix et Partage) : « Tester » ouvre l'aperçu.
      if (launchOnTest) afterClose(() => openPreview());
      close();
      return;
    }
    // « Tester » = ouvrir l'APERÇU du mix dans le constructeur (lecture seule) :
    // on voit ce qu'on va lancer, on peut le lancer, ou l'enregistrer (maintien)
    // pour le modifier ensuite. L'ancien MIX est rangé dans « Mes mix » s'il n'y
    // est pas, pour ne rien perdre.
    await stashCurrentMix();
    await saveCurrentMix(mix);
    afterClose(() => openPreview());
    close();
  };

  if (commentsItem) {
    return (
      <MixCommentsView
        item={commentsItem}
        screenH={screenH}
        onBack={() => setCommentsItem(null)}
        goLogin={goLogin}
      />
    );
  }

  return (
    <View>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>{mine ? 'MES PUBLICATIONS' : 'FIL PUBLIC'}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {mine ? 'Tes mix publiés' : 'Les mixes des autres'}
          </Text>
        </View>
        <IconButton
          icon="close"
          size={ROUND_SIZE.sheet}
          haptic={haptic.light}
          onPress={close}
          accessibilityLabel="Fermer"
        />
      </View>

      {!mine && !user && status !== 'unavailable' && (
        <View style={styles.notice}>
          <AppIcon name="lock" size={14} color="rgba(255,255,255,0.60)" />
          <Text style={styles.noticeText}>
            Tu peux voir et tester. Pour enregistrer, noter ou signaler un mix, il faut un compte.
          </Text>
          <Button variant="glass" size="sm" label="Connexion" onPress={goLogin} />
        </View>
      )}

      {/* Catégories et tri : seulement dans le fil. « Mes publications » est une
          courte liste à soi, rien à filtrer. */}
      {!mine && (
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
      )}

      <View style={styles.sortRow}>
        <Text style={styles.countText}>
          {status === 'ok' ? `${items.length} MIX` : ' '}
        </Text>
        {!mine && (
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
        )}
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
        {status === 'login' && (
          <View style={styles.stateBox}>
            <AppIcon name="lock" size={22} color="rgba(255,255,255,0.45)" />
            <Text style={styles.stateTitle}>Connecte-toi pour voir tes publications</Text>
            <Text style={styles.stateText}>Tes mix publiés sont liés à ton compte.</Text>
            <Button variant="glass" size="sm" label="Connexion" onPress={goLogin} style={{ marginTop: 12 }} />
          </View>
        )}
        {status === 'ok' && items.length === 0 && (
          <View style={styles.stateBox}>
            <AppIcon name="mix" size={22} color="rgba(255,255,255,0.45)" />
            <Text style={styles.stateTitle}>{mine ? "Tu n'as rien publié" : "Rien ici pour l'instant"}</Text>
            <Text style={styles.stateText}>
              {mine
                ? "Dans le constructeur, ouvre Partager puis Publier : ton mix apparaîtra ici, modifiable à tout moment."
                : category
                  ? 'Aucun mix dans cette catégorie.'
                  : 'Sois le premier à publier un mix !'}
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
              reported={reportedIds.has(item.id)}
              reporting={reportingId === item.id}
              removing={removingId === item.id}
              commentCount={commentCounts[item.id] ?? 0}
              onOpenComments={() => {
                haptic.light();
                setCommentsItem(item);
              }}
              onRate={(n) => handleRate(item, n)}
              onSave={() => handleSave(item)}
              onTest={() => handleTest(item)}
              onEdit={() => handleEdit(item)}
              onAskRemove={() => setRemovingId(item.id)}
              onCancelRemove={() => setRemovingId(null)}
              onRemove={() => handleRemove(item)}
              onOpenReport={() => handleOpenReport(item)}
              onCancelReport={() => setReportingId(null)}
              onReport={(reason) => handleReport(item, reason)}
            />
          ))}
      </ScrollView>

      {!!toast && (
        <MiniToast
          key={toast.id}
          text={toast.text}
          icon={toast.icon}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
        />
      )}
    </View>
  );
}

/**
 * Fil public. `onTest(mix)` (facultatif) remplace le comportement par défaut de
 * « Tester » (ranger l'ancien MIX, mettre celui-ci à l'accueil et y aller) :
 * le Constructeur MIX s'en sert pour charger le mix dans son brouillon au lieu
 * de quitter l'écran.
 *
 * `mine` : « Mes publications » — la liste de MES mix publiés, avec Modifier /
 * Tester / Retirer (v16.3.0). Les mêmes actions existent sur mes mix dans le
 * fil. `onEdit(mix, item)` (facultatif) remplace « ouvrir le constructeur » :
 * le constructeur s'en sert pour charger la publication dans son brouillon.
 */
export default function MixPublicSheet({ screenH, onClose, onTest, onEdit, mine = false, launchOnTest = false }) {
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
    <BottomSheet screenH={screenH} onClose={handleClose} keyboardAware>
      {({ close }) => (
        <PublicContent
          screenH={screenH}
          close={close}
          afterClose={(fn) => {
            afterCloseRef.current = fn;
          }}
          onTest={onTest}
          onEdit={onEdit}
          mine={mine}
          launchOnTest={launchOnTest}
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
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    marginTop: 10,
  },
  reportLink: {
    fontFamily: fonts.sansBold,
    fontSize: 10.5,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.45)',
  },
  reportDone: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
  },
  reportBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  reportTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  reportChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reportChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  reportChipText: {
    fontFamily: fonts.sansSemibold,
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.85)',
  },
  reportCancel: {
    alignSelf: 'flex-end',
    marginTop: 10,
  },
  commentsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 10,
    paddingVertical: 2,
  },
  commentsText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.70)',
  },
  commentsChevron: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.45)',
  },
  removeNote: {
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.55)',
    marginTop: -4,
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
