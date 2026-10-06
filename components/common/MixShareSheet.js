import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';

import BottomSheet from './BottomSheet';
import Button from './Button';
import IconButton from './IconButton';
import PressTap from './PressTap';
import AppIcon from './AppIcon';
import ShareTipCard from './ShareTipCard';
import { BlockStrip } from './MixPublicSheet';
import { haptic } from '../../hooks/useHaptic';
import { useAuth } from '../../contexts/AuthContext';
import { useTimers } from '../../contexts/TimersContext';
import { usePremium } from '../../hooks/usePremium';
import { fonts } from '../../lib/fonts';
import { ROUND_SIZE } from '../../lib/buttonTokens';
import { DISCIPLINES } from '../../lib/disciplines';
import {
  formatBlockSubtitle,
  getBlockType,
  getMixTotalDuration,
  hasEstimatedDuration,
} from '../../lib/mix-blocks';
import {
  serializeMix,
  deserializeMix,
  sanitizeImportedPayload,
  extractShareCode,
} from '../../lib/mixShare';
import { copyToClipboard } from '../../lib/clipboard';
import { findLibraryMatch, readUid } from '../../lib/mixIdentity';
import { isShareOnboarded, markShareOnboarded } from '../../lib/shareOnboarding';
import { loadProfile } from '../../lib/profile';
import {
  fetchMyPublishedMixes,
  fetchNameTakenByOther,
  isFeedConfigured,
  publishMix,
  unpublishMix,
  updatePublishedMix,
} from '../../lib/publicMixes';
import {
  MAX_PUBLISHED_MIXES,
  FREE_PUBLISHED_MIXES,
  checkPublishable,
  formatFeedDuration,
  formatRating,
  samePublishedContent,
} from '../../lib/publicMixShape';

const ACCENT = '#9575FF'; // violet du MIX
const OK_GREEN = '#1FC777';
const ERROR_RED = '#FF5454';

const TABS = [
  { id: 'send', label: 'ENVOYER', icon: 'share' },
  { id: 'receive', label: 'RECEVOIR', icon: 'link' },
];

export const publishErrorText = (res) => {
  if (res.reason === 'invalid') return res.message || 'Ce mix ne peut pas être publié.';
  if (res.reason === 'limit') {
    return `Tu as déjà ${res.max} mixes publiés. Retire-en un pour en publier un autre.`;
  }
  if (res.reason === 'duplicate') {
    return 'Ce nom est déjà utilisé dans le fil public. Change le nom du mix.';
  }
  if (res.reason === 'already') {
    return 'Ce mix est déjà publié dans le fil. Ouvre-le pour le mettre à jour.';
  }
  if (res.reason === 'unavailable') return "Le fil public n'est pas encore ouvert.";
  if (res.reason === 'forbidden') {
    return "Mise à jour impossible pour l'instant. Ton mix, ses étoiles et ses commentaires sont conservés.";
  }
  return 'Impossible de publier, vérifie ta connexion.';
};

// Une ligne par bloc : type (couleur), nom, réglage, note. Sert à montrer ce
// qui va partir, et l'aperçu d'un mix reçu avant de l'ajouter.
function BlockRows({ blocks }) {
  return (
    <View style={styles.rows}>
      {blocks.map((block, i) => {
        const type = getBlockType(block.type);
        return (
          <View key={block.id ?? i} style={styles.row}>
            <View style={[styles.rowIconBox, { backgroundColor: `${type?.color || '#FFFFFF'}22` }]}>
              <AppIcon name={type?.icon || 'mix'} size={13} color={type?.color || '#FFFFFF'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel} numberOfLines={1}>{block.label}</Text>
              <Text style={styles.rowSub}>{formatBlockSubtitle(block)}</Text>
              {!!block.note && (
                <Text style={styles.rowNote} numberOfLines={1}>{block.note}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// Carte à icône : le même langage que les rangées du Profil (ProfileMixShare).
function OptionCard({ icon, title, sub, children }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.iconBox}>
          <AppIcon name={icon} size={18} color="#FFFFFF" />
        </View>
        <View style={styles.cardHeadText}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSub}>{sub}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

/**
 * Carte « Publier dans le fil public » : compte obligatoire, catégorie au choix.
 *
 * On peut publier PLUSIEURS mix (jusqu'à MAX_PUBLISHED_MIXES), un par nom. Chaque
 * mix est relié à sa publication par un identifiant (`mix.publishedId`, posé à
 * la publication), jamais par son nom seul : deux mix de même nom ne
 * s'écrasent plus en silence.
 *
 * Retrouver la publication de CE mix, dans l'ordre :
 *  1. `publishedLink` ({ id, category }) : le constructeur est ouvert sur une
 *     publication qu'on modifie (« Modifier »), on la retrouve par son id ;
 *  2. `mix.publishedId` : le lien posé à la dernière publication ;
 *  3. le même nom ET le même contenu : un mix publié avant l'existence du lien,
 *     qu'on relie alors sans rien changer ;
 *  4. même nom mais contenu différent : c'est un AUTRE mix (`clash`). Rien n'est
 *     écrasé : on demande de changer le nom, ou de remplacer l'autre en toute
 *     connaissance de cause.
 */
function PublishCard({ mix, goLogin, publishedLink, onPublishedChange }) {
  const { user } = useAuth();
  const { markPublished } = useTimers();
  const router = useRouter();
  const { isPremium } = usePremium();
  const userId = user?.id ?? null;
  const [pseudo, setPseudo] = useState('');
  const [category, setCategory] = useState(null);
  const [published, setPublished] = useState(null);
  const [clash, setClash] = useState(null); // un AUTRE de mes mix publié sous ce nom
  const [taken, setTaken] = useState(false); // un autre sportif a déjà ce nom
  const [count, setCount] = useState(null); // combien j'en ai publié
  const [phase, setPhase] = useState('checking'); // 'checking' | 'ready' | 'busy' | 'unavailable'
  const [feedback, setFeedback] = useState(null); // { ok: boolean, text }
  const [infoOpen, setInfoOpen] = useState(false);

  const linkId = publishedLink?.id || mix?.publishedId || null;
  const limit = isPremium ? MAX_PUBLISHED_MIXES : FREE_PUBLISHED_MIXES;
  // Une NOUVELLE publication est bloquée à la limite ; mettre à jour ne l'est jamais.
  const atLimit = !published && count != null && count >= limit;

  useEffect(() => {
    if (!userId || !isFeedConfigured) return undefined;
    let cancelled = false;
    setPhase('checking');
    (async () => {
      const profile = await loadProfile();
      const all = await fetchMyPublishedMixes(userId);
      if (cancelled) return;
      setPseudo(profile.pseudo);
      if (!all.ok && all.reason === 'unavailable') {
        setPhase('unavailable');
        return;
      }
      // Panne réseau : on laisse publier quand même, sans savoir s'il l'est déjà.
      const list = all.ok ? all.items : [];
      setCount(all.ok ? list.length : null);
      const name = String(mix?.name || '').trim().slice(0, 28);
      let item = linkId ? list.find((p) => p.id === linkId) || null : null;
      // Même clé unique (lib/mixIdentity.js) : c'est le même mix, même renommé
      // depuis — on le met à jour au lieu d'en publier un deuxième.
      if (!item) {
        const uid = readUid(mix);
        if (uid) item = list.find((p) => p.uid === uid) || null;
      }
      let other = null;
      if (!item && name) {
        const byName = list.find((p) => p.name.trim() === name) || null;
        if (byName) {
          if (samePublishedContent(mix, byName)) item = byName;
          else other = byName;
        }
      }
      // Le nom est unique dans TOUT le fil : un autre sportif qui l'a déjà bloque la publication.
      const byOther = name ? await fetchNameTakenByOther(name, userId) : { ok: true, item: null };
      if (cancelled) return;
      setTaken(byOther.ok && !!byOther.item);
      setPublished(item);
      setClash(item ? null : other);
      // Catégorie du mix déjà publié — ou celle que le constructeur est en train
      // de lui donner (pas encore envoyée) —, sinon la discipline principale du profil.
      const pending = item && publishedLink?.id === item.id ? publishedLink.category : null;
      setCategory(pending ?? item?.category ?? publishedLink?.category ?? profile.disciplineIds?.[0] ?? null);
      setPhase('ready');
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, mix?.name, mix?.id, linkId]);

  const handlePublish = async () => {
    if (phase === 'busy') return;
    const check = checkPublishable(mix);
    if (!check.ok || !category) {
      haptic.warning();
      setFeedback({ ok: false, text: check.ok ? 'Choisis une catégorie.' : check.reason });
      return;
    }
    const wasPublished = !!published;
    if (!wasPublished && count != null && count >= limit) {
      haptic.warning();
      return;
    }
    setPhase('busy');
    setFeedback(null);
    // Déjà publié (retrouvé par lien ou par contenu) : modification SUR PLACE,
    // qui garde toujours les étoiles et les commentaires (si la base refuse,
    // on le dit, on ne remplace jamais). Sinon, nouvelle publication (jamais en
    // écrasant un autre mix).
    const res = published
      ? await updatePublishedMix(published.id, mix, { userId, authorName: pseudo, category })
      : await publishMix(mix, { userId, authorName: pseudo, category });
    setPhase('ready');
    if (!res.ok) {
      haptic.error();
      setFeedback({ ok: false, text: publishErrorText(res) });
      return;
    }
    haptic.success();
    setPublished(res.item);
    setClash(null);
    if (!wasPublished) setCount((c) => (c == null ? c : c + 1));
    await markPublished(mix.id, res.item.id);
    onPublishedChange?.(mix.id, res.item.id, res.item.category);
    setFeedback({
      ok: true,
      text: !wasPublished
        ? 'Publié ! Visible dans le fil public.'
        : res.republished
          ? "Remis en ligne : l'ancienne publication n'existait plus."
          : 'Mis à jour. Tes étoiles et commentaires sont gardés.',
    });
  };

  // Choix assumé : l'AUTRE mix publié sous ce nom est remplacé par celui-ci.
  const handleReplaceClash = async () => {
    if (phase === 'busy' || !clash) return;
    const check = checkPublishable(mix);
    if (!check.ok || !category) {
      haptic.warning();
      setFeedback({ ok: false, text: check.ok ? 'Choisis une catégorie.' : check.reason });
      return;
    }
    setPhase('busy');
    setFeedback(null);
    const res = await updatePublishedMix(clash.id, mix, { userId, authorName: pseudo, category });
    setPhase('ready');
    if (!res.ok) {
      haptic.error();
      setFeedback({ ok: false, text: publishErrorText(res) });
      return;
    }
    haptic.success();
    setPublished(res.item);
    setClash(null);
    await markPublished(mix.id, res.item.id);
    onPublishedChange?.(mix.id, res.item.id, res.item.category);
    setFeedback({ ok: true, text: 'Remplacé.' });
  };

  const handleUnpublish = async () => {
    if (phase === 'busy' || !published) return;
    setPhase('busy');
    setFeedback(null);
    const res = await unpublishMix(published.id);
    setPhase('ready');
    if (!res.ok) {
      haptic.error();
      setFeedback({ ok: false, text: 'Impossible de le retirer, réessaie.' });
      return;
    }
    haptic.warning();
    setPublished(null);
    setCount((c) => (c == null ? c : Math.max(0, c - 1)));
    await markPublished(mix.id, null);
    onPublishedChange?.(mix.id, null);
    setFeedback({ ok: true, text: 'Retiré du fil public.' });
  };

  const sub = 'Tout le monde voit ton mix et peut le tester. Il faut un compte pour l’enregistrer ou le noter.';

  if (!isFeedConfigured) {
    return <OptionCard icon="globe" title="Publier dans le fil public" sub="Bientôt disponible." />;
  }

  if (!user) {
    return (
      <OptionCard icon="globe" title="Publier dans le fil public" sub={sub}>
        <Text style={styles.lockText}>
          Pour publier, connecte-toi. Ça reste facultatif : sans compte, tu peux toujours envoyer un lien à un ami.
        </Text>
        <Button
          variant="glass"
          fullWidth
          icon="lock"
          label="Se connecter pour publier"
          onPress={goLogin}
          haptic={haptic.light}
          style={styles.cardAction}
        />
      </OptionCard>
    );
  }

  if (phase === 'unavailable') {
    return (
      <OptionCard
        icon="globe"
        title="Publier dans le fil public"
        sub="Le fil public n'est pas encore ouvert. Reviens bientôt."
      />
    );
  }

  const busy = phase === 'busy' || phase === 'checking';
  // Contenu OU catégorie différents de ce qui est en ligne : il y a une mise à jour à envoyer.
  const publishedChanged =
    !!published && (!samePublishedContent(mix, published) || (!!category && category !== published.category));

  return (
    <OptionCard icon="globe" title="Publier dans le fil public" sub={sub}>
      {/* Ce qui va partir en ligne, et la possibilité d'en choisir un autre. */}
      <View style={styles.target}>
        <Text style={styles.fieldLabel}>CE MIX SERA PUBLIÉ</Text>
        <View style={styles.targetRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.targetName} numberOfLines={1}>{mix?.name || 'Sans nom'}</Text>
            <Text style={styles.targetMeta}>
              {mix?.blocks?.length || 0} bloc{(mix?.blocks?.length || 0) > 1 ? 's' : ''} ·{' '}
              {formatFeedDuration(getMixTotalDuration(mix?.blocks || []), hasEstimatedDuration(mix?.blocks || []))}
            </Text>
          </View>
          <View
            style={[
              styles.statusChip,
              clash || taken || publishedChanged
                ? styles.statusWarn
                : published
                  ? styles.statusOk
                  : null,
            ]}
          >
            <Text style={styles.statusChipText}>
              {clash || taken
                ? 'NOM DÉJÀ PRIS'
                : published
                  ? publishedChanged
                    ? 'MODIFIÉ'
                    : 'EN LIGNE'
                  : 'NOUVEAU'}
            </Text>
          </View>
        </View>
      </View>

      {!!published && (
        <View style={styles.publishedRow}>
          <View style={styles.publishedDot} />
          <Text style={styles.publishedText}>PUBLIÉ</Text>
          <Text style={styles.publishedRating}>{formatRating(published.ratingAvg, published.ratingCount)}</Text>
        </View>
      )}

      <Text style={styles.fieldLabel}>CATÉGORIE</Text>
      <View style={styles.chips}>
        {DISCIPLINES.map((d) => {
          const active = d.id === category;
          return (
            <PressTap
              key={d.id}
              tapScale={0.94}
              onHapticIn={haptic.selection}
              onPress={() => {
                setCategory(d.id);
                setFeedback(null);
              }}
              style={[styles.chip, active && styles.chipActive]}
            >
              <AppIcon name={d.icon} size={11} color={active ? '#0A0A0A' : 'rgba(255,255,255,0.70)'} />
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{d.short}</Text>
            </PressTap>
          );
        })}
      </View>

      {taken && (
        <View style={styles.clashBox}>
          <Text style={styles.clashTitle}>Ce nom est déjà pris</Text>
          <Text style={styles.clashText}>
            Un autre sportif a déjà publié un mix sous le nom « {mix?.name} ». Change le nom de ton mix pour le publier.
          </Text>
        </View>
      )}
      {!taken && !!clash && (
        <View style={styles.clashBox}>
          <Text style={styles.clashTitle}>Ce nom est déjà pris</Text>
          <Text style={styles.clashText}>
            Un autre de tes mix est publié sous le nom « {clash.name} ». Change le nom de celui-ci pour
            les garder tous les deux en ligne, ou remplace l'ancien par celui-ci.
          </Text>
        </View>
      )}

      <Button
        variant="accent"
        color={ACCENT}
        fullWidth
        icon="globe"
        label={
          taken || (!published && clash)
            ? 'Change le nom pour publier'
            : published
              ? 'Mettre à jour'
              : atLimit
                ? 'Limite atteinte'
                : 'Publier'
        }
        onPress={handlePublish}
        disabled={busy || !category || !!clash || taken || atLimit}
        haptic={haptic.medium}
        style={styles.cardAction}
      />
      {!!clash && (
        <Button
          variant="ghost"
          size="md"
          fullWidth
          label={`Remplacer « ${clash.name} » en ligne`}
          onPress={handleReplaceClash}
          disabled={busy || !category}
          labelStyle={{ color: ERROR_RED }}
          haptic={haptic.warning}
        />
      )}
      {!!published && (
        <Button
          variant="ghost"
          size="md"
          fullWidth
          label="Retirer du fil"
          onPress={handleUnpublish}
          disabled={busy}
          labelStyle={{ color: ERROR_RED }}
          haptic={haptic.light}
        />
      )}
      {/* Infos repliées : un compteur et un petit « Infos » qui déplie le détail. */}
      <View style={styles.infoRow}>
        {count != null ? (
          <Text style={styles.infoCount}>
            {count}/{limit} publiés
          </Text>
        ) : (
          <View />
        )}
        <PressTap tapScale={0.95} hitSlop={8} onHapticIn={haptic.selection} onPress={() => setInfoOpen((v) => !v)}>
          <Text style={styles.infoToggle}>{infoOpen ? 'MASQUER' : 'INFOS'}</Text>
        </PressTap>
      </View>
      {infoOpen && (
        <>
          <Text style={styles.hint}>
            Tu peux publier jusqu'à {limit} mix, un par nom.
            {published ? ' Mettre à jour change le mix publié (nom et blocs) ; tu peux aussi le retirer du fil à tout moment.' : ''}
          </Text>
        </>
      )}
      {atLimit && !isPremium && (
        <Button
          variant="premium"
          size="md"
          fullWidth
          icon="crown"
          label={`Passe en Premium : jusqu'à ${MAX_PUBLISHED_MIXES} mix`}
          onPress={() => router.push('/premium')}
          haptic={haptic.medium}
          style={styles.cardAction}
        />
      )}
      {atLimit && isPremium && (
        <Text style={styles.hint}>Retire un mix du fil pour en publier un autre.</Text>
      )}
      {!!feedback && (
        <Text style={[styles.feedback, { color: feedback.ok ? OK_GREEN : ERROR_RED }]}>{feedback.text}</Text>
      )}
    </OptionCard>
  );
}

// Composant à part : l'effet qui fait défiler a besoin de scrollToEnd, que
// BottomSheet ne fournit qu'à ses enfants.
function ShareContent({ mix: mixProp, close, scrollToEnd, onImported, goLogin, openFeed, initialTab, publishedLink: linkProp, onPublishedChange }) {
  const { receiveMix, saveCurrentMix, library } = useTimers();
  // UN SEUL mix pour toute la feuille : le titre, l'aperçu, « Copier le lien » et
  // « Publier » suivent le même. Changer ici change tout, d'un coup.
  const [picked, setPicked] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const mix = picked ?? mixProp;
  const publishedLink = mix?.id === mixProp?.id ? linkProp : null;
  // Un mix en aperçu (venu du fil, pas encore enregistré) ne m'appartient pas :
  // il n'est jamais proposé au partage (voir `notOwned` plus bas).
  const options = [
    ...(mixProp && !mixProp.isPreview && !library.some((m) => m.id === mixProp.id) ? [mixProp] : []),
    ...library,
  ];
  const pickMix = (m) => {
    setPicked(m);
    setPickerOpen(false);
    setShowBlocks(false);
    setCopied(false);
    setShowTip(false);
  };
  const [tab, setTab] = useState(initialTab);
  const [showBlocks, setShowBlocks] = useState(false);
  const [pasted, setPasted] = useState('');
  const [preview, setPreview] = useState(null);
  // Anti-doublon (clé unique du mix, lib/mixIdentity.js) : le mix reçu est-il déjà
  // dans la bibliothèque ? 'same' = même version, 'update' = version différente.
  const previewMatch = useMemo(
    () => (preview ? findLibraryMatch(library, preview) : null),
    [preview, library]
  );
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const importingRef = useRef(false);
  const copiedTimer = useRef(null);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  // Le clavier reste ouvert après le collage : sans le fermer ni faire
  // défiler, le résultat (aperçu OU message d'erreur) se rend sous la
  // ligne de flottaison, cachée par le clavier — on dirait que le bouton
  // ne fait rien (retour utilisateur, v14.3.0). Si le clavier était ouvert,
  // on attend que la feuille soit redescendue et ait repris sa hauteur.
  useEffect(() => {
    if (!preview && !error) return undefined;
    const keyboardWasOpen = Keyboard.isVisible();
    Keyboard.dismiss();
    const t = setTimeout(scrollToEnd, keyboardWasOpen ? 350 : 80);
    return () => clearTimeout(t);
  }, [preview, error]);

  const hasBlocks = !!mix?.blocks?.length;
  // Un mix qui ne m'appartient pas (aperçu d'un mix du fil, pas encore enregistré
  // dans Mes mix) ne s'envoie ni ne se publie : on ne peut que le lancer ou
  // l'enregistrer. Il devient le mien à l'enregistrement.
  const notOwned = !!mix?.isPreview;
  const totalSec = hasBlocks ? getMixTotalDuration(mix.blocks) : 0;

  // Copie seulement le lien (demande utilisateur) : la personne choisit elle-
  // même où l'envoyer. Beaucoup d'apps ne rendent pas cliquable un lien
  // flextimer://, le destinataire le colle de toute façon dans « Recevoir ».
  // Marche sans compte, des deux côtés.
  const handleCopy = async () => {
    if (!hasBlocks) return;
    const link = Linking.createURL('import-mix', { queryParams: { m: serializeMix(mix) } });
    if (!(await copyToClipboard(link))) {
      haptic.error();
      return;
    }
    haptic.success();
    setCopied(true);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2200);
    if (!(await isShareOnboarded())) {
      await markShareOnboarded();
      setShowTip(true);
    }
  };

  const handlePreview = () => {
    haptic.light();
    const { ok, payload } = deserializeMix(extractShareCode(pasted));
    const sanitized = ok ? sanitizeImportedPayload(payload) : null;
    setPreview(sanitized);
    setError(!sanitized);
  };

  const handleImport = async () => {
    // La feuille reste touchable pendant sa fermeture : pas de double import.
    if (!preview || importingRef.current) return;
    // Déjà là, même version : rien à ajouter (le bouton est grisé, ceci est un
    // second rempart contre la double sauvegarde).
    if (previewMatch?.status === 'same') return;
    importingRef.current = true;
    haptic.success();
    // `update: true` : si le mix est déjà là mais en version différente, la
    // personne a touché « Mettre à jour » — jamais une deuxième copie.
    const res = await receiveMix(preview, { update: true });
    await saveCurrentMix(res.entry);
    onImported?.(res.entry);
    close();
  };

  return (
    <View>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>PARTAGER</Text>
          <Text style={styles.title} numberOfLines={1}>{mix?.name || 'Ce mix'}</Text>
        </View>
        <IconButton
          icon="close"
          size={ROUND_SIZE.sheet}
          haptic={haptic.light}
          onPress={close}
          accessibilityLabel="Fermer"
        />
      </View>

      <View style={styles.segment}>
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <PressTap
              key={t.id}
              containerStyle={styles.segmentSlot}
              tapScale={0.97}
              onHapticIn={haptic.selection}
              onPress={() => setTab(t.id)}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
            >
              <AppIcon name={t.icon} size={13} color={active ? '#0A0A0A' : 'rgba(255,255,255,0.65)'} />
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{t.label}</Text>
            </PressTap>
          );
        })}
      </View>

      {tab === 'send' && (
        <>
          {options.length > 1 && (
            <View style={styles.picker}>
              <PressTap
                tapScale={0.98}
                onHapticIn={haptic.light}
                onPress={() => setPickerOpen((v) => !v)}
                accessibilityLabel="Choisir le mix à partager"
                style={styles.pickerHead}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>MIX CHOISI</Text>
                  <Text style={styles.pickerName} numberOfLines={1}>{mix?.name || 'Sans nom'}</Text>
                </View>
                <Text style={styles.pickerAction}>{pickerOpen ? 'Fermer' : 'Changer'}</Text>
              </PressTap>
              {pickerOpen &&
                options.map((m) => (
                  <PressTap
                    key={m.id}
                    tapScale={0.98}
                    onHapticIn={haptic.selection}
                    onPress={() => pickMix(m)}
                    style={[styles.optionRow, m.id === mix?.id && styles.optionRowActive]}
                  >
                    <Text style={styles.optionName} numberOfLines={1}>{m.name || 'Sans nom'}</Text>
                    <Text style={styles.optionMeta}>{m.blocks?.length || 0} blocs</Text>
                  </PressTap>
                ))}
            </View>
          )}

          {hasBlocks ? (
            <View style={styles.summary}>
              <BlockStrip blocks={mix.blocks.map((b) => b.type)} height={6} />
              <View style={styles.summaryFoot}>
                <View style={styles.summaryMeta}>
                  <AppIcon name="clock" size={12} color="rgba(255,255,255,0.55)" />
                  <Text style={styles.metaText}>
                    {formatFeedDuration(totalSec, hasEstimatedDuration(mix.blocks))}
                  </Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaText}>
                    {mix.blocks.length} bloc{mix.blocks.length > 1 ? 's' : ''}
                  </Text>
                </View>
                <PressTap
                  tapScale={0.95}
                  hitSlop={8}
                  onHapticIn={haptic.selection}
                  onPress={() => setShowBlocks((v) => !v)}
                >
                  <Text style={styles.toggleText}>{showBlocks ? 'MASQUER' : 'VOIR LES BLOCS'}</Text>
                </PressTap>
              </View>
              {showBlocks && <BlockRows blocks={mix.blocks} />}
            </View>
          ) : (
            <Text style={styles.emptyText}>Ajoute au moins un bloc pour pouvoir partager ce mix.</Text>
          )}

          {notOwned && (
            <Text style={styles.emptyText}>
              Ce mix ne t'appartient pas encore : tu ne peux pas le partager. Enregistre-le dans Mes mix, il sera à
              toi.
            </Text>
          )}

          {hasBlocks && !notOwned && (
            <>
              <OptionCard
                icon="link"
                title="Envoyer à un ami"
                sub="Un lien à coller où tu veux. Ton ami n'a pas besoin de compte."
              >
                <Button
                  variant="accent"
                  color={copied ? OK_GREEN : ACCENT}
                  fullWidth
                  icon={copied ? 'check' : 'share'}
                  label={copied ? 'Lien copié' : 'Copier le lien'}
                  onPress={handleCopy}
                  style={styles.cardAction}
                />
                {showTip && (
                  <View style={{ marginTop: 12 }}>
                    <ShareTipCard onDismiss={() => setShowTip(false)} />
                  </View>
                )}
              </OptionCard>

              <PublishCard key={mix?.id} mix={mix} goLogin={goLogin} publishedLink={publishedLink} onPublishedChange={onPublishedChange} />
            </>
          )}

          {isFeedConfigured && !!openFeed && (
            <Button
              variant="glass"
              size="md"
              fullWidth
              icon="globe"
              label="Parcourir le fil public"
              onPress={openFeed}
              haptic={haptic.light}
            />
          )}
        </>
      )}

      {tab === 'receive' && (
        <>
          <Text style={styles.fieldLabel}>COLLE LE LIEN REÇU</Text>
          <TextInput
            value={pasted}
            onChangeText={(v) => {
              setPasted(v);
              setPreview(null);
              setError(false);
            }}
            placeholder="Colle ici le lien reçu…"
            placeholderTextColor="rgba(255,255,255,0.30)"
            selectionColor="#FFFFFF"
            multiline
            textAlignVertical="top"
            style={styles.pasteInput}
          />
          <Button
            variant="glass"
            fullWidth
            label="Prévisualiser"
            onPress={handlePreview}
            disabled={!pasted.trim()}
            style={{ marginTop: 10 }}
          />

          {error && (
            <Text style={[styles.feedback, { color: ERROR_RED }]}>
              Lien non reconnu — vérifie qu'il est collé en entier.
            </Text>
          )}

          {!!preview && (
            <View style={styles.importBox}>
              <Text style={styles.importName} numberOfLines={1}>{preview.name}</Text>
              <Text style={styles.importMeta}>
                {preview.blocks.length} bloc{preview.blocks.length > 1 ? 's' : ''}
              </Text>
              <BlockRows blocks={preview.blocks} />
              {previewMatch?.status === 'same' && (
                <Text style={[styles.feedback, { color: OK_GREEN }]}>
                  Ce mix est déjà dans ta bibliothèque (« {previewMatch.entry.name} »).
                </Text>
              )}
              {previewMatch?.status === 'update' && (
                <Text style={[styles.feedback, { color: ACCENT }]}>
                  Tu as déjà ce mix (« {previewMatch.entry.name} »), mais cette version est différente. Tu peux
                  mettre ta copie à jour : elle sera remplacée.
                </Text>
              )}
              <Button
                variant="accent"
                color={ACCENT}
                fullWidth
                icon={previewMatch?.status === 'same' ? 'check' : previewMatch?.status === 'update' ? 'reset' : undefined}
                label={
                  previewMatch?.status === 'same'
                    ? 'Déjà dans ma bibliothèque'
                    : previewMatch?.status === 'update'
                      ? 'Mettre à jour ma version'
                      : 'Ajouter à ma bibliothèque'
                }
                disabled={previewMatch?.status === 'same'}
                onPress={handleImport}
                style={{ marginTop: 12 }}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}

/**
 * Menu de partage d'un MIX. Deux onglets :
 *  - ENVOYER : un lien pour un ami (sans compte, des deux côtés) et la
 *    publication dans le FIL PUBLIC (compte obligatoire, catégorie au choix).
 *  - RECEVOIR : coller un lien reçu et l'aperçu avant de l'ajouter — utile aussi
 *    parce que certaines apps de messagerie (Instagram en tête) ne rendent pas
 *    un lien flextimer:// cliquable.
 * `initialTab` : 'send' (défaut) ou 'receive' — le hub Mix et Partage ouvre
 * directement l'onglet « Recevoir » depuis son bloc dédié.
 * `onOpenFeed` ouvre le fil public une fois cette feuille refermée (jamais deux
 * feuilles empilées).
 */
export default function MixShareSheet({
  screenH,
  mix,
  onClose,
  onImported,
  onOpenFeed,
  initialTab = 'send',
  publishedLink = null,
  onPublishedChange,
}) {
  const router = useRouter();
  const afterCloseRef = useRef(null);

  // Une navigation demandée depuis la feuille (connexion) attend la fin de son
  // animation de fermeture : partir avant laisserait son BackHandler armé sous
  // l'écran suivant, et le retour Android fermerait la feuille invisible.
  const handleClose = () => {
    onClose();
    const next = afterCloseRef.current;
    afterCloseRef.current = null;
    next?.();
  };

  return (
    <BottomSheet screenH={screenH} onClose={handleClose} keyboardAware>
      {({ close, scrollToEnd }) => (
        <ShareContent
          initialTab={initialTab}
          publishedLink={publishedLink}
          onPublishedChange={onPublishedChange}
          mix={mix}
          close={close}
          scrollToEnd={scrollToEnd}
          onImported={onImported}
          goLogin={() => {
            afterCloseRef.current = () => router.push('/login');
            close();
          }}
          openFeed={
            onOpenFeed
              ? () => {
                  afterCloseRef.current = onOpenFeed;
                  close();
                }
              : undefined
          }
        />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
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

  segment: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 16,
  },
  segmentSlot: {
    flex: 1,
  },
  segmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 9,
    borderRadius: 999,
  },
  segmentItemActive: {
    backgroundColor: '#FFFFFF',
  },
  segmentText: {
    fontFamily: fonts.sansBold,
    fontSize: 10.5,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.65)',
  },
  segmentTextActive: {
    color: '#0A0A0A',
  },

  summary: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  summaryFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
  },
  summaryMeta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
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
  toggleText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.55)',
  },
  emptyText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 14,
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  },
  cardHeadText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  cardSub: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  cardAction: {
    marginTop: 14,
  },
  lockText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 12,
  },

  target: {
    marginTop: 4,
    marginBottom: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(149,117,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(149,117,255,0.35)',
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  targetName: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  targetMeta: {
    fontFamily: fonts.monoRegular,
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.60)',
    marginTop: 2,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  statusOk: {
    backgroundColor: 'rgba(31,199,119,0.14)',
    borderColor: 'rgba(31,199,119,0.45)',
  },
  statusWarn: {
    backgroundColor: 'rgba(255,84,84,0.12)',
    borderColor: 'rgba(255,84,84,0.45)',
  },
  statusChipText: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    letterSpacing: 1,
    color: '#FFFFFF',
  },
  picker: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(149,117,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(149,117,255,0.35)',
  },
  pickerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerName: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 15,
    color: '#FFFFFF',
    marginTop: 2,
  },
  pickerAction: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 13,
    color: ACCENT,
  },
  changeBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  changeText: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 12,
    color: ACCENT,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  optionRowActive: {
    borderColor: ACCENT,
  },
  optionName: {
    flex: 1,
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  optionMeta: {
    fontFamily: fonts.monoRegular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  infoCount: {
    fontFamily: fonts.monoBold,
    fontSize: 10.5,
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.55)',
  },
  infoToggle: {
    fontFamily: fonts.monoBold,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: ACCENT,
  },
  clashBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,84,84,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,84,84,0.35)',
  },
  clashTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 12.5,
    color: ERROR_RED,
    marginBottom: 4,
  },
  clashText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.70)',
  },
  publishedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  publishedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: OK_GREEN,
  },
  publishedText: {
    fontFamily: fonts.monoBold,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: OK_GREEN,
  },
  publishedRating: {
    fontFamily: fonts.monoRegular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.60)',
  },
  fieldLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 14,
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
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
    fontSize: 10,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.75)',
  },
  chipTextActive: {
    color: '#0A0A0A',
  },
  hint: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    lineHeight: 15,
    color: 'rgba(255,255,255,0.40)',
    marginTop: 4,
  },
  feedback: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    marginTop: 10,
  },

  rows: {
    gap: 8,
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12,
    padding: 10,
  },
  rowIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontFamily: fonts.sansSemibold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  rowSub: {
    fontFamily: fonts.monoRegular,
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.50)',
    marginTop: 1,
  },
  rowNote: {
    fontFamily: fonts.sansMedium,
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.42)',
    marginTop: 2,
  },

  pasteInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 60,
    fontFamily: fonts.sansSemibold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  importBox: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  importName: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 17,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  importMeta: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.50)',
  },
});
