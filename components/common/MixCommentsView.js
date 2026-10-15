import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import Button from './Button';
import IconButton from './IconButton';
import PressTap from './PressTap';
import AppIcon from './AppIcon';
import { haptic } from '../../hooks/useHaptic';
import { useAuth } from '../../contexts/AuthContext';
import { fonts } from '../../lib/fonts';
import { ROUND_SIZE } from '../../lib/buttonTokens';
import { loadProfile } from '../../lib/profile';
import {
  addComment,
  deleteComment,
  editComment,
  fetchComments,
  fetchMyCommentLikes,
  fetchMyCommentReports,
  likeComment,
  removeCommentAsOwner,
  reportComment,
  unlikeComment,
} from '../../lib/mixComments';
import { useBlockedUsers } from '../../hooks/useBlockedUsers';
import { REPORT_REASONS } from '../../lib/publicMixShape';
import {
  MAX_COMMENT_LENGTH,
  MAX_ROOT_COMMENTS,
  ROOT_LIMIT_TEXT,
  buildThreads,
  formatAgo,
  hasReplies,
  isApproved,
  rootQuota,
  threadRootIdOf,
  validateBody,
} from '../../lib/mixCommentsShape';

const ACCENT = '#9575FF'; // violet du MIX
const OK_GREEN = '#1FC777';
const ERROR_RED = '#FF5454';

const errorText = (res) => {
  if (res.reason === 'invalid') return res.message || 'Commentaire impossible.';
  if (res.reason === 'limit') return ROOT_LIMIT_TEXT;
  if (res.reason === 'unavailable') return "Les commentaires ne sont pas encore ouverts.";
  if (res.reason === 'gone') return "Ce commentaire n'existe plus.";
  return 'Impossible d\'envoyer, vérifie ta connexion.';
};

/**
 * Commentaires d'un mix publié (v16.4.0), affichés DANS la feuille du fil
 * public à la place de la liste — jamais une deuxième feuille par-dessus la
 * première. Règles (lib/mixCommentsShape.js, appliquées aussi par la base) :
 *  - lire est ouvert à tous ; écrire demande un compte ;
 *  - FILS : 3 au maximum par personne sur ce mix, sauf pour son auteur ;
 *  - RÉPONSES : illimitées, dans n'importe quel fil, y compris à soi-même ;
 *  - chacun modifie et supprime ses commentaires.
 */
export default function MixCommentsView({ item, screenH, onBack, goLogin }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const isCreator = !!userId && item.ownerId === userId;

  const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'error' | 'unavailable'
  const [comments, setComments] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  // Ce que le champ en bas est en train de faire.
  const [mode, setMode] = useState({ type: 'root' }); // 'root' | 'reply' {rootId, to} | 'edit' {comment}
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null); // { ok, text }
  const [deletingId, setDeletingId] = useState(null);
  // Signalement : le commentaire dont on choisit le motif, et ceux que j'ai
  // déjà signalés (« Signalé, merci »).
  const [reportingId, setReportingId] = useState(null);
  const [reportedIds, setReportedIds] = useState([]);
  // Modération : retirer un commentaire sur MON mix, bloquer un auteur.
  const [ownerRemovingId, setOwnerRemovingId] = useState(null);
  const [blockingId, setBlockingId] = useState(null);
  // Mes likes (cœur plein) ; `likeBusy` évite qu'un double appui envoie deux fois.
  const [likedIds, setLikedIds] = useState([]);
  const likeBusy = useRef(new Set());
  const blocks = useBlockedUsers();
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    (async () => {
      const res = await fetchComments(item.id);
      if (cancelled) return;
      if (!res.ok) {
        setStatus(res.reason === 'unavailable' ? 'unavailable' : 'error');
        return;
      }
      setComments(res.comments);
      setStatus('ok');
      // Mes signalements : jamais bloquant (table pas encore ouverte, réseau…).
      if (userId) {
        const ids = res.comments.map((c) => c.id);
        const [mine, likes] = await Promise.all([fetchMyCommentReports(ids), fetchMyCommentLikes(ids)]);
        if (cancelled) return;
        if (mine.ok) setReportedIds(mine.reported);
        if (likes.ok) setLikedIds(likes.liked);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [item.id, reloadKey]);

  const threads = useMemo(() => buildThreads(comments), [comments]);
  const quota = useMemo(
    () => rootQuota({ comments, userId, ownerId: item.ownerId }),
    [comments, userId, item.ownerId]
  );

  const total = comments.filter((c) => !c.deleted).length;
  // Nouveau fil impossible (3 atteints) : le champ ne sert plus qu'à répondre.
  const rootBlocked = mode.type === 'root' && !quota.canStartThread;

  const resetComposer = () => {
    setMode({ type: 'root' });
    setText('');
    setFeedback(null);
  };

  // Une seule confirmation en ligne à la fois (supprimer, signaler, retirer, bloquer).
  const clearAsks = () => {
    setDeletingId(null);
    setReportingId(null);
    setOwnerRemovingId(null);
    setBlockingId(null);
  };

  const startReply = (comment) => {
    haptic.light();
    setFeedback(null);
    clearAsks();
    setMode({ type: 'reply', rootId: threadRootIdOf(comment), to: comment.author });
    setText('');
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  const startEdit = (comment) => {
    haptic.light();
    setFeedback(null);
    clearAsks();
    setMode({ type: 'edit', comment });
    setText(comment.body);
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  const handleSend = async () => {
    if (busy) return;
    const check = validateBody(text);
    if (!check.ok) {
      haptic.warning();
      setFeedback({ ok: false, text: check.reason });
      return;
    }
    setBusy(true);
    setFeedback(null);
    let res;
    if (mode.type === 'edit') {
      res = await editComment(mode.comment.id, text, userId);
    } else {
      const profile = await loadProfile();
      res = await addComment({
        mixId: item.id,
        parentId: mode.type === 'reply' ? mode.rootId : null,
        replyToName: mode.type === 'reply' ? mode.to : null,
        body: text,
        userId,
        authorName: profile.pseudo,
      });
    }
    setBusy(false);
    if (!res.ok) {
      haptic.error();
      setFeedback({ ok: false, text: errorText(res) });
      // Quota ou commentaire périmé : on recharge pour que l'écran dise vrai.
      if (res.reason === 'limit' || res.reason === 'gone') setReloadKey((k) => k + 1);
      return;
    }
    haptic.success();
    if (mode.type === 'edit') {
      setComments((list) => list.map((c) => (c.id === res.comment.id ? res.comment : c)));
    } else {
      setComments((list) => [...list, res.comment]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
    }
    resetComposer();
  };

  const handleDelete = async (comment) => {
    setDeletingId(null);
    const soft = !comment.parentId && hasReplies(comments, comment.id);
    const res = await deleteComment({ id: comment.id, userId, softDelete: soft });
    if (!res.ok) {
      haptic.error();
      setFeedback({ ok: false, text: errorText(res) });
      return;
    }
    haptic.warning();
    setComments((list) =>
      res.soft
        ? list.map((c) => (c.id === comment.id ? { ...c, deleted: true, body: '' } : c))
        : list.filter((c) => c.id !== comment.id)
    );
    if (mode.type === 'edit' && mode.comment.id === comment.id) resetComposer();
  };

  const handleReport = async (comment, reason) => {
    setReportingId(null);
    const res = await reportComment(comment.id, userId, reason);
    if (!res.ok) {
      haptic.error();
      setFeedback({
        ok: false,
        text:
          res.reason === 'unavailable'
            ? "Le signalement n'est pas encore ouvert."
            : res.reason === 'invalid'
              ? 'Signalement impossible.'
              : "Impossible de signaler, vérifie ta connexion.",
      });
      return;
    }
    haptic.success();
    setReportedIds((ids) => (ids.includes(comment.id) ? ids : [...ids, comment.id]));
    setFeedback({ ok: true, text: 'Merci, ton signalement est bien reçu.' });
  };

  // L'auteur du mix retire un commentaire gênant sur SON mix. Le texte disparaît,
  // l'écran dit « Retiré par l'auteur du mix » (transparent), les réponses restent.
  const handleOwnerRemove = async (comment) => {
    setOwnerRemovingId(null);
    const res = await removeCommentAsOwner(comment.id);
    if (!res.ok) {
      haptic.error();
      setFeedback({
        ok: false,
        text:
          res.reason === 'unavailable'
            ? "Retirer un commentaire n'est pas encore ouvert."
            : res.reason === 'approved'
              ? 'Ce commentaire est approuvé par la communauté (3 likes ou plus) : tu ne peux plus le retirer.'
              : res.reason === 'forbidden'
                ? 'Tu ne peux retirer que les commentaires de tes propres mix.'
                : 'Impossible de retirer, vérifie ta connexion.',
      });
      // Les likes ont pu changer depuis le chargement : on relit pour que l'écran dise vrai.
      if (res.reason === 'approved') setReloadKey((k) => k + 1);
      return;
    }
    haptic.warning();
    setComments((list) =>
      list.map((c) => (c.id === comment.id ? { ...c, deleted: true, removed: true, body: '' } : c))
    );
    setFeedback({ ok: true, text: 'Commentaire retiré. Les réponses restent visibles.' });
  };

  const handleBlock = async (comment) => {
    setBlockingId(null);
    const res = await blocks.block(comment.authorId, comment.author);
    if (!res.ok) {
      haptic.error();
      setFeedback({
        ok: false,
        text:
          res.reason === 'unavailable'
            ? "Le blocage n'est pas encore ouvert."
            : 'Impossible de bloquer, vérifie ta connexion.',
      });
      return;
    }
    haptic.warning();
    setFeedback({
      ok: true,
      text: `${comment.author} est bloqué : tu ne verras plus ses mix ni ses commentaires. Retrouve la liste dans Paramètres.`,
    });
  };

  // Aimer / ne plus aimer : le cœur et le compteur bougent tout de suite, et
  // reviennent en arrière si la base refuse.
  const handleToggleLike = async (comment) => {
    if (!userId || likeBusy.current.has(comment.id)) return;
    const wasLiked = likedIds.includes(comment.id);
    const apply = (liked) => {
      setLikedIds((ids) => (liked ? [...ids.filter((i) => i !== comment.id), comment.id] : ids.filter((i) => i !== comment.id)));
      setComments((list) =>
        list.map((c) =>
          c.id === comment.id ? { ...c, likeCount: Math.max(0, (c.likeCount || 0) + (liked ? 1 : -1)) } : c
        )
      );
    };
    likeBusy.current.add(comment.id);
    haptic.light();
    apply(!wasLiked);
    const res = wasLiked ? await unlikeComment(comment.id, userId) : await likeComment(comment.id, userId);
    likeBusy.current.delete(comment.id);
    if (!res.ok) {
      apply(wasLiked);
      haptic.error();
      setFeedback({
        ok: false,
        text:
          res.reason === 'unavailable'
            ? "Les likes ne sont pas encore ouverts."
            : "Impossible d'aimer ce commentaire, vérifie ta connexion.",
      });
    }
  };

  const handleUnblock = async (comment) => {
    const res = await blocks.unblock(comment.authorId);
    if (!res.ok) {
      haptic.error();
      setFeedback({ ok: false, text: 'Impossible de débloquer, vérifie ta connexion.' });
      return;
    }
    haptic.light();
  };

  const bubbleProps = (c) => {
    const others = !!userId && c.authorId !== userId && !c.deleted;
    return {
      comment: c,
      isAuthorOfMix: c.authorId === item.ownerId,
      mine: !!userId && c.authorId === userId,
      canReply: !!userId,
      // On ne signale ni son propre commentaire ni un commentaire déjà supprimé,
      // et il faut un compte (comme pour signaler un mix). Même règle pour bloquer.
      canReport: others,
      canBlock: others,
      // L'auteur du mix retire les commentaires des AUTRES sur son mix (les siens,
      // il les supprime comme tout le monde).
      // À 3 likes, le commentaire est approuvé par la communauté : plus de retrait
      // (la base le refuse aussi). Les signalements restent possibles.
      canRemove: isCreator && others && !isApproved(c),
      // Aimer : un compte, jamais son propre commentaire ni un commentaire supprimé.
      canLike: others,
      liked: likedIds.includes(c.id),
      approved: isApproved(c) && !c.deleted,
      onToggleLike: () => handleToggleLike(c),
      blockedAuthor: !!c.authorId && blocks.isBlocked(c.authorId) && !(userId && c.authorId === userId),
      reported: reportedIds.includes(c.id),
      reporting: reportingId === c.id,
      blocking: blockingId === c.id,
      ownerRemoving: ownerRemovingId === c.id,
      deleting: deletingId === c.id,
      willSoftDelete: !c.parentId && hasReplies(comments, c.id),
      onReply: () => startReply(c),
      onEdit: () => startEdit(c),
      onAskDelete: () => {
        haptic.light();
        clearAsks();
        setDeletingId(c.id);
      },
      onCancelDelete: () => setDeletingId(null),
      onConfirmDelete: () => handleDelete(c),
      onAskReport: () => {
        haptic.light();
        clearAsks();
        setFeedback(null);
        setReportingId(c.id);
      },
      onCancelReport: () => setReportingId(null),
      onReport: (reason) => handleReport(c, reason),
      onAskBlock: () => {
        haptic.light();
        clearAsks();
        setFeedback(null);
        setBlockingId(c.id);
      },
      onCancelBlock: () => setBlockingId(null),
      onConfirmBlock: () => handleBlock(c),
      onUnblock: () => handleUnblock(c),
      onAskRemove: () => {
        haptic.light();
        clearAsks();
        setFeedback(null);
        setOwnerRemovingId(c.id);
      },
      onCancelRemove: () => setOwnerRemovingId(null),
      onConfirmRemove: () => handleOwnerRemove(c),
    };
  };

  const composerLabel =
    mode.type === 'reply'
      ? `Réponse à ${mode.to}`
      : mode.type === 'edit'
        ? 'Modifier ton commentaire'
        : 'Nouveau fil de discussion';

  return (
    <View>
      <View style={styles.headerRow}>
        <IconButton
          icon="back"
          size={ROUND_SIZE.sheet}
          haptic={haptic.light}
          onPress={onBack}
          accessibilityLabel="Retour au fil"
        />
        <View style={styles.headerText}>
          <Text style={styles.kicker}>COMMENTAIRES{status === 'ok' ? ` · ${total}` : ''}</Text>
          <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
        </View>
      </View>

      {/* La règle, dite une fois, là où elle s'applique. */}
      {status === 'ok' && !!userId && (
        <Text style={styles.rule}>
          {quota.unlimited
            ? "Tu es l'auteur de ce mix : tu commentes sans limite."
            : `Fils ouverts : ${quota.used}/${MAX_ROOT_COMMENTS} · répondre dans un fil est illimité.`}
        </Text>
      )}

      <ScrollView
        ref={listRef}
        style={{ maxHeight: Math.min(340, screenH * 0.38) }}
        contentContainerStyle={styles.list}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {status === 'loading' && (
          <View style={styles.stateBox}>
            <ActivityIndicator color="rgba(255,255,255,0.6)" />
          </View>
        )}
        {status === 'unavailable' && (
          <View style={styles.stateBox}>
            <AppIcon name="chat" size={22} color="rgba(255,255,255,0.45)" />
            <Text style={styles.stateTitle}>Les commentaires ne sont pas encore ouverts</Text>
            <Text style={styles.stateText}>Reviens bientôt.</Text>
          </View>
        )}
        {status === 'error' && (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>Impossible de charger les commentaires</Text>
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
        {status === 'ok' && threads.length === 0 && (
          <View style={styles.stateBox}>
            <AppIcon name="chat" size={22} color="rgba(255,255,255,0.45)" />
            <Text style={styles.stateTitle}>Aucun commentaire</Text>
            <Text style={styles.stateText}>Lance la discussion sur ce mix.</Text>
          </View>
        )}
        {status === 'ok' &&
          threads.map(({ root, replies }) => (
            <View key={root.id} style={styles.thread}>
              <Bubble {...bubbleProps(root)} />
              {replies.length > 0 && (
                <View style={styles.replies}>
                  {replies.map((r) => (
                    <Bubble key={r.id} {...bubbleProps(r)} isReply />
                  ))}
                </View>
              )}
            </View>
          ))}
      </ScrollView>

      {/* ── Champ de saisie ── */}
      {status === 'ok' && !userId && (
        <View style={styles.loginBox}>
          <AppIcon name="lock" size={14} color="rgba(255,255,255,0.60)" />
          <Text style={styles.loginText}>Tu peux lire. Pour commenter, il faut un compte.</Text>
          <Button variant="glass" size="sm" label="Connexion" onPress={goLogin} haptic={haptic.light} />
        </View>
      )}

      {status === 'ok' && !!userId && (
        <View style={styles.composer}>
          <View style={styles.composerHead}>
            <Text style={styles.composerLabel}>{composerLabel.toUpperCase()}</Text>
            {mode.type !== 'root' && (
              <PressTap
                tapScale={0.94}
                hitSlop={10}
                onHapticIn={haptic.light}
                onPress={resetComposer}
                accessibilityLabel="Annuler"
              >
                <Text style={styles.composerCancel}>Annuler</Text>
              </PressTap>
            )}
          </View>

          {rootBlocked ? (
            <Text style={styles.blocked}>{ROOT_LIMIT_TEXT}</Text>
          ) : (
            <>
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={(v) => {
                  setText(v);
                  if (feedback) setFeedback(null);
                }}
                placeholder={
                  mode.type === 'reply'
                    ? `Répondre à ${mode.to}…`
                    : mode.type === 'edit'
                      ? 'Ton commentaire'
                      : 'Écris un commentaire…'
                }
                placeholderTextColor="rgba(255,255,255,0.30)"
                selectionColor={ACCENT}
                multiline
                maxLength={MAX_COMMENT_LENGTH}
                textAlignVertical="top"
                style={styles.input}
              />
              <View style={styles.sendRow}>
                <Text style={styles.counter}>
                  {text.length > MAX_COMMENT_LENGTH - 100 ? `${text.length}/${MAX_COMMENT_LENGTH}` : ' '}
                </Text>
                <Button
                  variant="accent"
                  color={ACCENT}
                  size="sm"
                  icon={mode.type === 'edit' ? 'check' : 'arrow'}
                  label={busy ? 'Envoi…' : mode.type === 'edit' ? 'Enregistrer' : 'Envoyer'}
                  disabled={busy || !text.trim()}
                  onPress={handleSend}
                  haptic={haptic.medium}
                />
              </View>
            </>
          )}

          {!!feedback && (
            <Text style={[styles.feedback, { color: feedback.ok ? OK_GREEN : ERROR_RED }]}>
              {feedback.text}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

/** Un commentaire — racine d'un fil ou réponse (décalée, un seul niveau). */
function Bubble({
  comment,
  isReply = false,
  isAuthorOfMix,
  mine,
  canReply,
  canReport,
  canBlock,
  canRemove,
  canLike,
  liked,
  approved,
  onToggleLike,
  blockedAuthor,
  reported,
  reporting,
  blocking,
  ownerRemoving,
  deleting,
  willSoftDelete,
  onReply,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
  onAskReport,
  onCancelReport,
  onReport,
  onAskBlock,
  onCancelBlock,
  onConfirmBlock,
  onUnblock,
  onAskRemove,
  onCancelRemove,
  onConfirmRemove,
}) {
  // Auteur bloqué : une ligne discrète à la place du commentaire (le fil garde sa
  // forme, les réponses des autres restent à leur place) et un lien pour débloquer.
  if (blockedAuthor) {
    return (
      <View style={[styles.bubble, styles.bubbleBlocked, isReply && styles.bubbleReply]}>
        <Text style={styles.blockedText}>Commentaire d'un auteur bloqué</Text>
        <PressTap tapScale={0.95} hitSlop={8} onPress={onUnblock} accessibilityLabel="Débloquer cet auteur">
          <Text style={styles.action}>Débloquer</Text>
        </PressTap>
      </View>
    );
  }

  return (
    <View style={[styles.bubble, isReply && styles.bubbleReply, mine && styles.bubbleMine]}>
      <View style={styles.bubbleHead}>
        <Text style={styles.author} numberOfLines={1}>{comment.author}</Text>
        {isAuthorOfMix && (
          <View style={styles.creatorChip}>
            <Text style={styles.creatorText}>AUTEUR</Text>
          </View>
        )}
        {approved && (
          <View style={styles.approvedChip}>
            <Text style={styles.approvedText}>APPROUVÉ</Text>
          </View>
        )}
        <Text style={styles.time} numberOfLines={1}>
          {formatAgo(comment.createdAt)}
          {comment.editedAt && !comment.deleted ? ' · modifié' : ''}
        </Text>
      </View>

      {isReply && !!comment.replyTo && !comment.deleted && (
        <Text style={styles.replyTo} numberOfLines={1}>↪ à {comment.replyTo}</Text>
      )}

      {comment.deleted ? (
        <Text style={styles.deletedText}>
          {comment.removed ? "Retiré par l'auteur du mix" : 'Commentaire supprimé'}
        </Text>
      ) : (
        <Text style={styles.body}>{comment.body}</Text>
      )}

      {deleting ? (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmText}>
            {willSoftDelete
              ? 'Supprimer ce commentaire ? Son texte disparaît, les réponses des autres restent.'
              : 'Supprimer ce commentaire ?'}
          </Text>
          <View style={styles.confirmActions}>
            <Button variant="glass" size="sm" label="Annuler" onPress={onCancelDelete} style={styles.confirmBtn} />
            <Button variant="danger" size="sm" label="Supprimer" onPress={onConfirmDelete} style={styles.confirmBtn} />
          </View>
        </View>
      ) : reporting ? (
        <View style={styles.confirmBox}>
          <Text style={styles.reportTitle}>Pourquoi signaler ce commentaire ?</Text>
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
            <Text style={styles.action}>Annuler</Text>
          </PressTap>
        </View>
      ) : ownerRemoving ? (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmText}>
            Retirer ce commentaire de ton mix ? Son texte disparaît et l'écran affichera « Retiré par l'auteur du mix » :
            tout le monde voit qu'il a été retiré. Les réponses restent.
          </Text>
          <View style={styles.confirmActions}>
            <Button variant="glass" size="sm" label="Annuler" onPress={onCancelRemove} style={styles.confirmBtn} />
            <Button variant="danger" size="sm" label="Retirer" onPress={onConfirmRemove} style={styles.confirmBtn} />
          </View>
        </View>
      ) : blocking ? (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmText}>
            Bloquer {comment.author} ? Tu ne verras plus ses mix ni ses commentaires. Il ne le saura pas, et tu peux le
            débloquer dans les Paramètres.
          </Text>
          <View style={styles.confirmActions}>
            <Button variant="glass" size="sm" label="Annuler" onPress={onCancelBlock} style={styles.confirmBtn} />
            <Button variant="danger" size="sm" label="Bloquer" onPress={onConfirmBlock} style={styles.confirmBtn} />
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          {!comment.deleted && (canLike || comment.likeCount > 0) &&
            (canLike ? (
              <PressTap
                tapScale={0.9}
                hitSlop={8}
                onPress={onToggleLike}
                containerStyle={styles.likeBtn}
                accessibilityLabel={liked ? 'Retirer mon like' : 'Aimer ce commentaire'}
              >
                <AppIcon
                  name={liked ? 'heart-fill' : 'heart'}
                  size={14}
                  color={liked ? ERROR_RED : 'rgba(255,255,255,0.55)'}
                />
                <Text style={[styles.likeCount, liked && styles.likeCountOn]}>
                  {comment.likeCount > 0 ? comment.likeCount : ''}
                </Text>
              </PressTap>
            ) : (
              <View style={styles.likeBtn}>
                <AppIcon name="heart-fill" size={14} color="rgba(255,255,255,0.35)" />
                <Text style={styles.likeCount}>{comment.likeCount}</Text>
              </View>
            ))}
          {canReply && (
            <PressTap tapScale={0.95} hitSlop={8} onPress={onReply} accessibilityLabel="Répondre">
              <Text style={styles.action}>Répondre</Text>
            </PressTap>
          )}
          {mine && !comment.deleted && (
            <>
              <PressTap tapScale={0.95} hitSlop={8} onPress={onEdit} accessibilityLabel="Modifier">
                <Text style={styles.action}>Modifier</Text>
              </PressTap>
              <PressTap tapScale={0.95} hitSlop={8} onPress={onAskDelete} accessibilityLabel="Supprimer">
                <Text style={[styles.action, styles.actionDanger]}>Supprimer</Text>
              </PressTap>
            </>
          )}
          {canRemove && (
            <PressTap tapScale={0.95} hitSlop={8} onPress={onAskRemove} accessibilityLabel="Retirer ce commentaire de mon mix">
              <Text style={[styles.action, styles.actionDanger]}>Retirer</Text>
            </PressTap>
          )}
          {(canReport || canBlock) && (
            <View style={styles.moreActions}>
              {canReport &&
                (reported ? (
                  <View style={styles.reportDoneRow}>
                    <AppIcon name="check" size={11} color="rgba(255,255,255,0.45)" />
                    <Text style={styles.reportDone}>Signalé, merci</Text>
                  </View>
                ) : (
                  <PressTap
                    tapScale={0.95}
                    hitSlop={8}
                    onPress={onAskReport}
                    containerStyle={styles.reportAsk}
                    accessibilityLabel="Signaler ce commentaire"
                  >
                    <AppIcon name="flag" size={11} color="rgba(255,255,255,0.45)" />
                    <Text style={styles.action}>Signaler</Text>
                  </PressTap>
                ))}
              {canBlock && (
                <PressTap
                  tapScale={0.95}
                  hitSlop={8}
                  onPress={onAskBlock}
                  containerStyle={styles.reportAsk}
                  accessibilityLabel="Bloquer cet auteur"
                >
                  <AppIcon name="close" size={11} color="rgba(255,255,255,0.45)" />
                  <Text style={styles.action}>Bloquer</Text>
                </PressTap>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.50)',
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  rule: {
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 10,
  },
  list: {
    paddingBottom: 6,
    gap: 10,
  },
  stateBox: {
    alignItems: 'center',
    paddingVertical: 28,
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

  thread: {
    gap: 6,
  },
  replies: {
    marginLeft: 14,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(149,117,255,0.35)',
    gap: 6,
  },
  bubble: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bubbleReply: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  bubbleMine: {
    borderColor: 'rgba(149,117,255,0.40)',
  },
  bubbleHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  author: {
    flexShrink: 1,
    fontFamily: fonts.sansBold,
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  creatorChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(149,117,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(149,117,255,0.50)',
  },
  creatorText: {
    fontFamily: fonts.monoBold,
    fontSize: 8.5,
    letterSpacing: 1,
    color: ACCENT,
  },
  time: {
    flexShrink: 0,
    marginLeft: 'auto',
    fontFamily: fonts.sansMedium,
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.40)',
  },
  replyTo: {
    fontFamily: fonts.sansMedium,
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 2,
  },
  body: {
    fontFamily: fonts.sansMedium,
    fontSize: 13.5,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.90)',
  },
  deletedText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.35)',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 16,
    rowGap: 8,
    marginTop: 8,
  },
  action: {
    fontFamily: fonts.sansBold,
    fontSize: 10.5,
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.55)',
  },
  actionDanger: {
    color: 'rgba(255,84,84,0.85)',
  },
  confirmBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  confirmText: {
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.70)',
    marginBottom: 8,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmBtn: {
    flex: 1,
  },

  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 28,
  },
  likeCount: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
  },
  likeCountOn: {
    color: ERROR_RED,
  },
  approvedChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(31,199,119,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(31,199,119,0.50)',
  },
  approvedText: {
    fontFamily: fonts.monoBold,
    fontSize: 8.5,
    letterSpacing: 1,
    color: OK_GREEN,
  },
  // Signaler / Bloquer : à droite de la rangée, côte à côte.
  moreActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginLeft: 'auto',
  },
  reportAsk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  reportDoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bubbleBlocked: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  blockedText: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.40)',
  },
  reportDone: {
    fontFamily: fonts.sansMedium,
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.45)',
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

  loginBox: {
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
    marginTop: 10,
  },
  loginText: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.65)',
  },
  composer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  composerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  composerLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 2.4,
    color: ACCENT,
  },
  composerCancel: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
  },
  blocked: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.65)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    maxHeight: 110,
    fontFamily: fonts.sansSemibold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  sendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  counter: {
    fontFamily: fonts.monoRegular,
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.45)',
  },
  feedback: {
    fontFamily: fonts.sansSemibold,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
});
