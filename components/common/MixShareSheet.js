import React, { useEffect, useRef, useState } from 'react';
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
import { isShareOnboarded, markShareOnboarded } from '../../lib/shareOnboarding';
import { loadProfile } from '../../lib/profile';
import { fetchMyPublished, isFeedConfigured, publishMix, unpublishMix } from '../../lib/publicMixes';
import { checkPublishable, formatFeedDuration, formatRating } from '../../lib/publicMixShape';

const ACCENT = '#9575FF'; // violet du MIX
const OK_GREEN = '#1FC777';
const ERROR_RED = '#FF5454';

const TABS = [
  { id: 'send', label: 'ENVOYER', icon: 'share' },
  { id: 'receive', label: 'RECEVOIR', icon: 'link' },
];

const publishErrorText = (res) => {
  if (res.reason === 'invalid') return res.message || 'Ce mix ne peut pas être publié.';
  if (res.reason === 'limit') {
    return `Tu as déjà ${res.max} mixes publiés. Retire-en un pour en publier un autre.`;
  }
  if (res.reason === 'unavailable') return "Le fil public n'est pas encore ouvert.";
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

/** Carte « Publier dans le fil public » : compte obligatoire, catégorie au choix. */
function PublishCard({ mix, goLogin }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [pseudo, setPseudo] = useState('');
  const [category, setCategory] = useState(null);
  const [published, setPublished] = useState(null);
  const [phase, setPhase] = useState('checking'); // 'checking' | 'ready' | 'busy' | 'unavailable'
  const [feedback, setFeedback] = useState(null); // { ok: boolean, text }

  useEffect(() => {
    if (!userId || !isFeedConfigured) return undefined;
    let cancelled = false;
    setPhase('checking');
    (async () => {
      const profile = await loadProfile();
      const res = await fetchMyPublished(mix?.name, userId);
      if (cancelled) return;
      setPseudo(profile.pseudo);
      if (!res.ok && res.reason === 'unavailable') {
        setPhase('unavailable');
        return;
      }
      // Panne réseau : on laisse publier quand même, sans savoir s'il l'est déjà.
      const item = res.ok ? res.item : null;
      setPublished(item);
      // Catégorie du mix déjà publié, sinon la discipline principale du profil.
      setCategory(item?.category ?? profile.disciplineIds?.[0] ?? null);
      setPhase('ready');
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, mix?.name]);

  const handlePublish = async () => {
    if (phase === 'busy') return;
    const check = checkPublishable(mix);
    if (!check.ok || !category) {
      haptic.warning();
      setFeedback({ ok: false, text: check.ok ? 'Choisis une catégorie.' : check.reason });
      return;
    }
    const wasPublished = !!published;
    setPhase('busy');
    setFeedback(null);
    const res = await publishMix(mix, { userId, authorName: pseudo, category });
    setPhase('ready');
    if (!res.ok) {
      haptic.error();
      setFeedback({ ok: false, text: publishErrorText(res) });
      return;
    }
    haptic.success();
    setPublished(res.item);
    setFeedback({
      ok: true,
      text: wasPublished ? 'Mis à jour dans le fil public.' : 'Publié ! Il est visible dans le fil public.',
    });
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
    setFeedback({ ok: true, text: 'Retiré du fil public.' });
  };

  const sub = 'Tout le monde voit ton mix. Il faut un compte pour le tester, l’enregistrer ou le noter.';

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

  return (
    <OptionCard icon="globe" title="Publier dans le fil public" sub={sub}>
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

      <Button
        variant="accent"
        color={ACCENT}
        fullWidth
        icon="globe"
        label={published ? 'Mettre à jour' : 'Publier'}
        onPress={handlePublish}
        disabled={busy || !category}
        haptic={haptic.medium}
        style={styles.cardAction}
      />
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
      {!!published && (
        <Text style={styles.hint}>Mettre à jour remplace le mix publié : les étoiles repartent de zéro.</Text>
      )}
      {!!feedback && (
        <Text style={[styles.feedback, { color: feedback.ok ? OK_GREEN : ERROR_RED }]}>{feedback.text}</Text>
      )}
    </OptionCard>
  );
}

// Composant à part : l'effet qui fait défiler a besoin de scrollToEnd, que
// BottomSheet ne fournit qu'à ses enfants.
function ShareContent({ mix, close, scrollToEnd, onImported, goLogin, openFeed }) {
  const { saveAsLibraryEntry, saveCurrentMix } = useTimers();
  const [tab, setTab] = useState('send');
  const [showBlocks, setShowBlocks] = useState(false);
  const [pasted, setPasted] = useState('');
  const [preview, setPreview] = useState(null);
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
  const totalSec = hasBlocks ? getMixTotalDuration(mix.blocks) : 0;

  // Copie seulement le lien (demande utilisateur) : la personne choisit elle-
  // même où l'envoyer. Beaucoup d'apps ne rendent pas cliquable un lien
  // flextimer://, le destinataire le colle de toute façon dans « Recevoir ».
  // Marche sans compte, des deux côtés.
  const handleCopy = async () => {
    if (!hasBlocks) return;
    const link = Linking.createURL('import-mix', { queryParams: { m: serializeMix(mix) } });
    if (!copyToClipboard(link)) {
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
    importingRef.current = true;
    haptic.success();
    await saveAsLibraryEntry(preview);
    await saveCurrentMix(preview);
    onImported?.(preview);
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

          {hasBlocks && (
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

              <PublishCard mix={mix} goLogin={goLogin} />
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
              <Button
                variant="accent"
                color={ACCENT}
                fullWidth
                label="Ajouter à ma bibliothèque"
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
 * `onOpenFeed` ouvre le fil public une fois cette feuille refermée (jamais deux
 * feuilles empilées).
 */
export default function MixShareSheet({ screenH, mix, onClose, onImported, onOpenFeed }) {
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
