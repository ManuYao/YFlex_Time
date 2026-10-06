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
  fetchMyCommentReports,
  reportComment,
} from '../../lib/mixComments';
import { REPORT_REASONS } from '../../lib/publicMixShape';
import {
  MAX_COMMENT_LENGTH,
  MAX_ROOT_COMMENTS,
  ROOT_LIMIT_TEXT,
  buildThreads,
  formatAgo,
  hasReplies,
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
        const mine = await fetchMyCommentReports(res.comments.map((c) => c.id));
        if (!cancelled && mine.ok) setReportedIds(mine.reported);
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

  const startReply = (comment) => {
    haptic.light();
    setFeedback(null);
    setDeletingId(null);
    setReportingId(null);
    setMode({ type: 'reply', rootId: threadRootIdOf(comment), to: comment.author });
    setText('');
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  const startEdit = (comment) => {
    haptic.light();
    setFeedback(null);
    setDeletingId(null);
    setReportingId(null);
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

  const bubbleProps = (c) => ({
    comment: c,
    isAuthorOfMix: c.authorId === item.ownerId,
    mine: !!userId && c.authorId === userId,
    canReply: !!userId,
    // On ne signale ni son propre commentaire ni un commentaire déjà supprimé,
    // et il faut un compte (comme pour signaler un mix).
    canReport: !!userId && c.authorId !== userId && !c.deleted,
    reported: reportedIds.includes(c.id),
    reporting: reportingId === c.id,
    deleting: deletingId === c.id,
    willSoftDelete: !c.parentId && hasReplies(comments, c.id),
    onReply: () => startReply(c),
    onEdit: () => startEdit(c),
    onAskDelete: () => {
      haptic.light();
      setReportingId(null);
      setDeletingId(c.id);
    },
    onCancelDelete: () => setDeletingId(null),
    onConfirmDelete: () => handleDelete(c),
    onAskReport: () => {
      haptic.light();
      setDeletingId(null);
      setFeedback(null);
      setReportingId(c.id);
    },
    onCancelReport: () => setReportingId(null),
    onReport: (reason) => handleReport(c, reason),
  });

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
  reported,
  reporting,
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
}) {
  return (
    <View style={[styles.bubble, isReply && styles.bubbleReply, mine && styles.bubbleMine]}>
      <View style={styles.bubbleHead}>
        <Text style={styles.author} numberOfLines={1}>{comment.author}</Text>
        {isAuthorOfMix && (
          <View style={styles.creatorChip}>
            <Text style={styles.creatorText}>AUTEUR</Text>
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
        <Text style={styles.deletedText}>Commentaire supprimé</Text>
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
      ) : (
        <View style={styles.actions}>
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
    alignItems: 'center',
    gap: 16,
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

  reportAsk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 'auto',
  },
  reportDoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 'auto',
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
