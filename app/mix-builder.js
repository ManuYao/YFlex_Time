import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Swipeable } from 'react-native-gesture-handler';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import DraggableFlatList, {
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  interpolateColor,
} from 'react-native-reanimated';

import GradientBackground from '../components/common/GradientBackground';
import MixBuilderSkeleton from '../components/screens/MixBuilderSkeleton';
import { useScreenReady } from '../hooks/useScreenReady';
import BottomSheet from '../components/common/BottomSheet';
import WheelPicker from '../components/common/WheelPicker';
import PressTap from '../components/common/PressTap';
import Button from '../components/common/Button';
import IconButton from '../components/common/IconButton';
import BlockRoleIcon from '../components/common/BlockRoleIcon';
import AppIcon from '../components/common/AppIcon';
import MixShareSheet, { publishErrorText } from '../components/common/MixShareSheet';
import MixPublicSheet from '../components/common/MixPublicSheet';
import MixLibrarySheet from '../components/common/MixLibrarySheet';
import UnsavedChangesSheet from '../components/common/UnsavedChangesSheet';
import MiniToast from '../components/common/MiniToast';
import SaveFlashRing from '../components/common/SaveFlashRing';
import {
  BLOCK_TYPES,
  getBlockType,
  getBlockDuration,
  getMixTotalDuration,
  hasEstimatedDuration,
  formatBlockSubtitle,
  makeBlock,
  MAX_BLOCK_NOTE_LENGTH,
  getRangesForType,
} from '../lib/mix-blocks';
import { makeDefaultMix, isDefaultMix, mixSignature } from '../lib/mixes';
import { findLibraryMatch, withFreshUid } from '../lib/mixIdentity';
import { loadProfile } from '../lib/profile';
import { getPreviewMix } from '../lib/previewMix';
import { updatePublishedMix } from '../lib/publicMixes';
import { DISCIPLINES } from '../lib/disciplines';
import { formatHoursMinutes } from '../lib/formatters';
import { DAYS, loadPlanning, formatBlockAsText } from '../lib/planning';
import { BLOCK_ROLES, getBlockRole, resolveBlockRole } from '../lib/blockRoles';
import { fonts } from '../lib/fonts';
import { easeImpact, springBouncy, springEnergetic } from '../lib/animations';
import {
  BOTTOM_GAP,
  BUTTON_FONT,
  BUTTON_HEIGHT,
  ROUND_SIZE,
  TAP_SCALE,
  buttonRecipe,
} from '../lib/buttonTokens';
import { useLayoutLevel } from '../lib/responsive';
import { useTimers } from '../contexts/TimersContext';
import { useHaptic } from '../hooks/useHaptic';
import { useMixLauncher } from '../hooks/useMixLauncher';
import { useAuth } from '../contexts/AuthContext';

const ACCENT = '#9575FF';
// Maintenir « Enregistrer » 2 s = copie dans Mes mix (jamais plus long : au-delà on
// croit que le bouton ne répond pas).
const SAVE_HOLD_MS = 2000;

export default function MixBuilder() {
  const router = useRouter();
  const haptic = useHaptic();
  const { height: screenH } = useWindowDimensions();
  const {
    currentMix,
    library,
    saveCurrentMix,
    saveAsLibraryEntry,
    receiveMix,
    loadFromLibrary,
    removeFromLibrary,
    markPublished,
  } = useTimers();
  const insets = useSafeAreaInsets();

  const [draft, setDraft] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMix, setShareMix] = useState(null);
  // La publication liée au brouillon (publishedLink) ne vaut que pour LE
  // brouillon : partager un autre mix depuis « Mes mix » ne doit jamais mettre
  // à jour la publication du mix qu'on est en train de modifier.
  const [shareIsDraft, setShareIsDraft] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  // Retour visuel de « Enregistrer » : null | 'saved' | 'added'.
  const [saveStatus, setSaveStatus] = useState(null);
  const [saveTick, setSaveTick] = useState(0);
  const [toast, setToast] = useState(null);
  const [barH, setBarH] = useState(150);
  // Avertissement « modifications non sauvegardées » : { action } (remplacer le
  // brouillon par un autre mix) ou { leaving: true } (quitter le constructeur).
  const [unsaved, setUnsaved] = useState(null);
  const toastTimer = useRef(null);
  const saveStatusTimer = useRef(null);
  const resetUndoRef = useRef(null);
  const launchMix = useMixLauncher();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  // Publication en cours de modification (v16.3.0) : ouverte depuis « Modifier »
  // sur un de MES mix publiés (Mes publications, ou ma carte dans le fil). Tant
  // qu'elle est liée, un bandeau propose d'envoyer les corrections au fil, et
  // la feuille de partage retrouve la publication par son id — renommer le mix
  // ne crée donc pas un doublon qu'on ne pourrait plus retirer.
  const [publishedLink, setPublishedLink] = useState(() =>
    params.publishedId
      ? {
          id: String(params.publishedId),
          category: params.publishedCategory ? String(params.publishedCategory) : null,
        }
      : null
  );
  const [pubState, setPubState] = useState({ phase: 'idle', text: null }); // idle | busy | ok | err
  // Aperçu (« Tester » sur un mix publié) : on voit ce qu'on va lancer, sans
  // rien pouvoir modifier ni réordonner. Maintenir Enregistrer l'ajoute à Mes
  // mix, et il devient alors modifiable comme les autres.
  // Un mix qui ne m'appartient pas (venu du fil public, pas encore enregistré) :
  // lecture seule — on peut le lancer ou l'enregistrer, rien d'autre (ni
  // modifier, ni partager, ni publier). Il l'est aussi quand l'écran s'ouvre sur
  // un MIX courant resté en aperçu après un lancement (`isPreview`) : sans ça,
  // « Modifier » l'ouvrait comme si c'était le mien, partage compris.
  // Il m'appartient dès qu'il est enregistré dans Mes mix.
  const [preview, setPreview] = useState(() => params.preview === '1' || !!currentMix?.isPreview);
  // Verrou anti double-tap : le lancement est asynchrone (écriture du MIX
  // courant avant de partir), un second appui ne doit pas consommer deux
  // places du quota.
  const launchingRef = useRef(false);

  useEffect(
    () => () => {
      clearTimeout(toastTimer.current);
      clearTimeout(saveStatusTimer.current);
    },
    []
  );

  // Empreinte du CONTENU (nom + blocs) : ne bouge pas quand seul un lien de
  // publication change.
  const draftSig = draft ? mixSignature(draft) : '';

  // Une modification du brouillon (ou de sa catégorie) après une mise à jour
  // réussie (ou ratée) : le bandeau redevient « à envoyer ».
  useEffect(() => {
    setPubState((p) => (p.phase === 'ok' || p.phase === 'err' ? { phase: 'idle', text: null } : p));
  }, [draftSig, publishedLink?.category]);

  useEffect(() => {
    if (draft) return;
    const pv = params.preview === '1' ? getPreviewMix() : null;
    if (pv) {
      setDraft({ ...pv, blocks: pv.blocks.map((b) => ({ ...b })) });
    } else if (currentMix) {
      setDraft({ ...currentMix, blocks: currentMix.blocks.map((b) => ({ ...b })) });
    } else {
      setDraft(makeDefaultMix());
    }
  }, [currentMix]);

  // Le constructeur (liste déplaçable, feuilles) est lourd à monter : un
  // squelette respire sur le fil d'interface pendant ce temps, au lieu de
  // laisser l'écran vide et figé (hooks/useScreenReady.js).
  const { ready, skeletonGone, skeletonStyle } = useScreenReady({ dataReady: !!draft });

  if (!draft) {
    return (
      <GradientBackground colors={[ACCENT, '#0A0A0A', '#000000']} ambient textMode="light">
        <MixBuilderSkeleton />
      </GradientBackground>
    );
  }

  const totalSec = getMixTotalDuration(draft.blocks);
  const totalIsEstimate = hasEstimatedDuration(draft.blocks);
  const totalMin = Math.floor(totalSec / 60);
  const totalRest = totalSec % 60;

  const updateName = (v) => setDraft((d) => ({ ...d, name: v }));

  // Copie sans le drapeau « aperçu » : tout ce qui est enregistré devient un vrai mix.
  const cloneMix = (m) => {
    const { isPreview: _p, ...rest } = m;
    return { ...rest, blocks: m.blocks.map((b) => ({ ...b })) };
  };

  // Le brouillon est une copie : une publication faite depuis la feuille de
  // partage n'y apparaît pas toute seule. On relit donc le lien de publication
  // là où il est tenu à jour (Mes mix, MIX courant).
  const withLatestPublishedId = (m) => {
    const lib = library.find((x) => x.id === m.id);
    const cur = currentMix?.id === m.id ? currentMix : null;
    const pid = lib?.publishedId ?? cur?.publishedId ?? m.publishedId;
    return pid ? { ...m, publishedId: pid } : m;
  };

  const inLibrary = library.some((m) => m.id === draft.id);
  // Le brouillon a-t-il changé depuis qu'il a été chargé ou enregistré ? Le MIX
  // courant est la référence : il est écrit à chaque chargement et à chaque
  // enregistrement.
  const dirty = !!currentMix && draftSig !== mixSignature(currentMix);
  // En aperçu, le brouillon n'est pas « modifié » : rien n'est à perdre.
  const hasUnsavedWork = dirty && !preview && draft.blocks.length > 0;

  // ---- Petits messages et retour visuel ----

  const showToast = (t, ms = 3200) => {
    clearTimeout(toastTimer.current);
    setToast({ ...t, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), ms);
  };

  const dismissUndo = () => {
    if (!resetUndoRef.current) return;
    resetUndoRef.current = null;
    clearTimeout(toastTimer.current);
    setToast(null);
  };

  const flashSaved = (status, text) => {
    setSaveStatus(status);
    setSaveTick((t) => t + 1);
    showToast({ text, icon: 'check' });
    clearTimeout(saveStatusTimer.current);
    saveStatusTimer.current = setTimeout(() => setSaveStatus(null), 2000);
  };

  // ---- Blocs ----

  const addBlock = (typeId) => {
    const block = makeBlock(typeId);
    if (!block) return;
    haptic.light();
    dismissUndo();
    // Pas de rôle figé à la création : il suit le nom du bloc (resolveBlockRole)
    // tant que l'utilisateur n'a pas touché une pastille.
    // La feuille se referme elle-même (animation), puis onClose remet addOpen à false.
    setDraft((d) => ({ ...d, blocks: [...d.blocks, block] }));
  };

  const removeBlock = (id) => {
    haptic.warning();
    setDraft((d) => ({ ...d, blocks: d.blocks.filter((b) => b.id !== id) }));
  };

  const updateBlock = (id, patch) => {
    setDraft((d) => ({
      ...d,
      blocks: d.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  };

  const handleDragEnd = ({ data }) => {
    haptic.selection();
    setDraft((d) => ({ ...d, blocks: data }));
  };

  // Tout vider en un appui (plus de suppression bloc par bloc). Seuls les blocs
  // du brouillon partent : le nom, « Mes mix » et les publications ne bougent
  // pas. Un « Annuler » de quelques secondes rattrape une erreur de doigt.
  const undoReset = () => {
    const blocks = resetUndoRef.current;
    if (!blocks) return;
    resetUndoRef.current = null;
    haptic.light();
    clearTimeout(toastTimer.current);
    setToast(null);
    setDraft((d) => (d.blocks.length === 0 ? { ...d, blocks } : d));
  };

  const handleReset = () => {
    if (draft.blocks.length === 0) return;
    haptic.warning();
    resetUndoRef.current = draft.blocks;
    setDraft((d) => ({ ...d, blocks: [] }));
    showToast({ text: 'Builder vidé', icon: 'reset', actionLabel: 'Annuler', onAction: undoReset }, 6000);
  };

  // ---- Enregistrer ----

  // Deux mix de Mes mix ne peuvent pas porter le même nom (hors le mix lui-même).
  const nameTaken = () => {
    const name = (draft.name || '').trim().toLowerCase();
    return !!name && library.some((m) => m.id !== draft.id && (m.name || '').trim().toLowerCase() === name);
  };
  // Refus : le bouton lui-même passe au rouge (« Nom déjà pris ») pendant 2,5 s.
  // Un simple petit message en bas passait inaperçu : le bouton se remplissait,
  // vibrait, et on croyait que ça avait enregistré.
  const refuseTakenName = () => {
    haptic.error();
    setSaveStatus('refused');
    setSaveTick((t) => t + 1);
    showToast({ text: 'Ce nom existe déjà : change le nom du mix pour l\'enregistrer.', icon: 'close' }, 4200);
    clearTimeout(saveStatusTimer.current);
    saveStatusTimer.current = setTimeout(() => setSaveStatus(null), 2500);
  };

  // Le brouillon devient le MIX courant ; s'il est déjà dans « Mes mix », son
  // entrée est mise à jour au passage (sinon la version enregistrée là-bas
  // restait l'ancienne).
  const persistDraft = async () => {
    const mix = withLatestPublishedId(cloneMix(draft));
    await saveCurrentMix(mix);
    if (inLibrary) {
      await saveAsLibraryEntry({ ...mix, name: mix.name?.trim() ? mix.name : 'Sans nom' });
    }
  };

  // Un appui : on enregistre et on RESTE sur la page (avant, l'écran se fermait
  // tout seul, ce qui surprenait). Le retour est visuel : contour vert, bouton
  // « Enregistré », petit message.
  const handleSave = async () => {
    if (draft.blocks.length === 0) return;
    // Mix qui ne m'appartient pas : un simple appui l'enregistre dans Mes mix
    // (il devient alors le mien) — plus besoin de maintenir 2 s.
    if (preview) return handleSavePreview();
    if (inLibrary && nameTaken()) return refuseTakenName();
    haptic.success();
    await persistDraft();
    flashSaved('saved', inLibrary ? 'Enregistré · Mes mix mis à jour' : 'Enregistré comme ton MIX');
  };

  // Maintien 2 s : archiver dans « Mes mix », sous un nom qui n'y existe pas
  // encore. Un mix qui n'y était pas y entre et le brouillon devient cette
  // entrée ; un mix déjà archivé, renommé, y laisse une COPIE.
  // Aperçu → Mes mix : une copie à moi, jamais liée à la publication d'origine.
  // Le nom n'est pas modifiable en aperçu : s'il existe déjà, on ajoute « 2 », « 3 »…
  //
  // Anti-doublon (clé unique du mix, lib/mixIdentity.js) : si ce mix est DÉJÀ dans
  // Mes mix, on n'en ajoute jamais une deuxième copie. Même version : on ouvre
  // celle qu'on a déjà. Version différente : on propose UNIQUEMENT de la mettre à
  // jour.
  const handleSavePreview = async () => {
    const base = cloneMix(draft);
    delete base.publishedId;
    delete base.own;
    const match = findLibraryMatch(library, base);

    if (match?.status === 'same') {
      haptic.warning();
      await stashBaseline();
      await saveCurrentMix(match.entry);
      setDraft(cloneMix(match.entry));
      setPreview(false);
      showToast({ text: 'Déjà dans Mes mix : ouvert pour modification.', icon: 'check' });
      return;
    }

    if (match) {
      haptic.warning();
      const applyUpdate = async () => {
        const res = await receiveMix(base, { update: true });
        await stashBaseline();
        await saveCurrentMix(res.entry);
        setDraft(cloneMix(res.entry));
        setPreview(false);
        flashSaved('added', 'Mix mis à jour dans Mes mix');
      };
      showToast(
        {
          text: `« ${match.entry.name} » est déjà dans Mes mix, en version différente.`,
          icon: 'reset',
          actionLabel: 'Mettre à jour',
          onAction: applyUpdate,
        },
        7000
      );
      return;
    }

    haptic.success();
    await stashBaseline();
    const res = await receiveMix(base);
    await saveCurrentMix(res.entry);
    setDraft(cloneMix(res.entry));
    setPreview(false);
    flashSaved('added', 'Ajouté à Mes mix : tu peux le modifier');
  };

  const handleSaveAsNew = async () => {
    if (draft.blocks.length === 0) return;
    if (preview) return handleSavePreview();
    const baseName = (draft.name || '').trim() || 'Sans nom';
    // Archiver sous un nom déjà utilisé (y compris celui du mix d'origine) est
    // refusé : le nom doit être différent.
    if (library.some((m) => (m.name || '').trim().toLowerCase() === baseName.toLowerCase())) {
      return refuseTakenName();
    }
    haptic.success();
    const base = withLatestPublishedId(cloneMix(draft));
    const entry = { ...base, id: `mix_${Date.now()}`, name: baseName.slice(0, 28) };
    if (inLibrary) {
      // La copie est à moi, et n'est pas publiée. C'est un AUTRE mix : clé unique
      // neuve, sinon elle serait prise pour l'original (anti-doublon).
      delete entry.publishedId;
      delete entry.fromFeed;
      delete entry.own;
      delete entry.syncSig;
      await saveAsLibraryEntry(withFreshUid(entry));
      flashSaved('added', 'Ajouté à Mes mix');
      return;
    }
    // Le mix entre dans Mes mix : même mix, il garde sa clé unique. Si Mes mix en
    // contenait déjà un avec cette clé, c'est lui qui est mis à jour et rendu.
    const stored = (await saveAsLibraryEntry(entry)) || entry;
    await saveCurrentMix(stored);
    setDraft(cloneMix(stored));
    flashSaved('added', 'Ajouté à Mes mix');
  };

  // ---- Quitter / changer de mix sans rien perdre ----

  const handleCancel = () => {
    haptic.warning();
    if (hasUnsavedWork) {
      setUnsaved({ leaving: true });
      return;
    }
    router.back();
  };

  // L'ancien MIX courant, s'il n'est nulle part ailleurs (ni dans Mes mix, ni le
  // MIX d'usine), est rangé dans Mes mix avant d'être remplacé : rien ne se perd
  // en silence (même règle que « Tester » depuis le fil).
  const stashBaseline = async () => {
    if (currentMix?.blocks?.length && !currentMix.isPreview && !isDefaultMix(currentMix) && !library.some((m) => m.id === currentMix.id)) {
      await saveAsLibraryEntry(cloneMix(currentMix));
    }
  };

  // Remplace le brouillon par un autre mix (`action`). Si le brouillon a des
  // modifications non enregistrées, rien ne bouge : l'avertissement s'ouvre et
  // rend `false` (la feuille d'où l'on vient reste ouverte).
  const guardedReplace = async (action) => {
    if (hasUnsavedWork) {
      haptic.warning();
      setUnsaved({ action });
      return false;
    }
    await stashBaseline();
    await action();
    return true;
  };

  const handleUnsavedSave = async () => {
    const pending = unsaved;
    if (!pending) return;
    if (pending.leaving) {
      await persistDraft();
      router.back();
      return;
    }
    // Changer de mix : le brouillon modifié est enregistré dans Mes mix (mis à
    // jour s'il y est déjà), puis on continue.
    if (nameTaken()) return refuseTakenName();
    const mix = withLatestPublishedId(cloneMix(draft));
    const name = mix.name?.trim() ? mix.name : 'Sans nom';
    await saveAsLibraryEntry(inLibrary ? { ...mix, name } : { ...mix, id: `mix_${Date.now()}`, name });
    await pending.action();
    setLibraryOpen(false);
    setFeedOpen(false);
  };

  const handleUnsavedDiscard = async () => {
    const pending = unsaved;
    if (!pending) return;
    if (pending.leaving) {
      router.back();
      return;
    }
    await stashBaseline();
    await pending.action();
    setLibraryOpen(false);
    setFeedOpen(false);
  };

  // Lancer = enregistrer ce brouillon comme MIX courant ET partir tout de
  // suite sur le 3-2-1, sans repasser par l'accueil. Même quota que le bouton
  // Lancer de l'accueil (hooks/useMixLauncher.js).
  const handleLaunch = async () => {
    if (draft.blocks.length === 0 || launchingRef.current) return;
    launchingRef.current = true;
    try {
      if (preview) {
        // Lancer un aperçu : le MIX courant devient ce mix (marqué « aperçu », jamais
        // rangé dans Mes mix tout seul) ; l'ancien reste sauvegardé s'il était à moi.
        await stashBaseline();
        await launchMix({ ...draft, isPreview: true });
        return;
      }
      await launchMix(cloneMix(draft));
    } finally {
      launchingRef.current = false;
    }
  };

  // ---- Publication ----

  // Une publication faite (ou retirée) depuis la feuille de partage : le
  // brouillon, s'il s'agit de ce mix, retient son lien.
  const handlePublishedChange = (mixId, publishedId, category) => {
    setDraft((d) => {
      if (!d || d.id !== mixId) return d;
      const next = { ...d };
      if (publishedId) next.publishedId = publishedId;
      else delete next.publishedId;
      return next;
    });
    // Le lien du bandeau suit la publication : sans ça, sa catégorie (ou son id,
    // si elle a été remplacée) resterait celle d'avant, et « Mettre à jour le
    // fil » la remettrait.
    if (draft?.id === mixId && publishedLink) {
      setPublishedLink(publishedId ? { id: publishedId, category: category ?? publishedLink.category } : null);
    }
  };

  // Change la catégorie de la publication qu'on modifie. Elle part avec « Mettre
  // à jour le fil », comme le reste des corrections.
  const handleChangeCategory = (categoryId) => {
    if (!publishedLink || publishedLink.category === categoryId) return;
    setPublishedLink((l) => (l ? { ...l, category: categoryId } : l));
  };

  // Envoie les corrections (nom, orthographe, blocs) vers le fil public.
  const handlePublishUpdate = async () => {
    if (!publishedLink || pubState.phase === 'busy') return;
    if (!user) {
      haptic.warning();
      setPubState({ phase: 'err', text: 'Connecte-toi pour mettre à jour ton mix publié.' });
      showToast({ text: 'Connecte-toi pour mettre à jour ton mix publié.', icon: 'lock' });
      return;
    }
    setPubState({ phase: 'busy', text: null });
    const profile = await loadProfile();
    const res = await updatePublishedMix(publishedLink.id, draft, {
      userId: user.id,
      authorName: profile.pseudo,
      category: publishedLink.category,
    });
    if (!res.ok) {
      haptic.error();
      const text = publishErrorText(res);
      setPubState({ phase: 'err', text });
      showToast({ text, icon: 'close' });
      return;
    }
    haptic.success();
    // La publication peut avoir changé d'id (remplacement) : on suit la nouvelle.
    setPublishedLink({ id: res.item.id, category: res.item.category });
    handlePublishedChange(draft.id, res.item.id, res.item.category);
    await markPublished(draft.id, res.item.id);
    const text = res.reset
      ? 'Mis à jour. Les étoiles ont repris à zéro.'
      : 'À jour dans le fil public.';
    setPubState({ phase: 'ok', text });
    showToast({ text, icon: 'check' });
  };

  // ---- Charger un autre mix ----

  const handleLoadMix = (mixId) =>
    guardedReplace(async () => {
      haptic.medium();
      const loaded = await loadFromLibrary(mixId);
      if (loaded) {
        dismissUndo();
        setPreview(false);
        setDraft(cloneMix(loaded));
        // Un autre mix n'est pas la publication qu'on modifiait.
        setPublishedLink(null);
        setPubState({ phase: 'idle', text: null });
      }
    });

  const handleDeleteMix = async (mixId) => {
    haptic.warning();
    await removeFromLibrary(mixId);
  };

  // Partage : un lien pour un ami (sans compte, sans backend) et la publication
  // dans le fil public (compte obligatoire) passent tous les deux par
  // MixShareSheet — aperçu avant d'envoyer, onglet « Recevoir » pour coller un
  // lien reçu (retour utilisateur v14.3.0 : beaucoup d'apps de messagerie ne
  // rendent pas cliquable un scheme personnalisé).
  const openShare = (mix, { isDraft = false } = {}) => {
    // Un mix qui ne m'appartient pas ne se partage pas (voir `preview`).
    if (preview) {
      haptic.warning();
      return;
    }
    haptic.light();
    setShareMix(withLatestPublishedId(mix));
    setShareIsDraft(isDraft);
    setShareOpen(true);
  };

  const handleImported = (mix) => {
    dismissUndo();
    setPreview(false);
    setDraft(cloneMix(mix));
    setPublishedLink(null);
  };

  // « Modifier » sur ma carte du fil, depuis le constructeur : la publication
  // devient le brouillon, liée à son id. Un brouillon modifié n'est jamais
  // écrasé sans avertissement.
  const handleEditFromFeed = (mix, item) =>
    guardedReplace(async () => {
      await saveCurrentMix(mix);
      dismissUndo();
      setPreview(false);
      setDraft(cloneMix(mix));
      setPublishedLink({ id: item.id, category: item.category });
      setPubState({ phase: 'idle', text: null });
    });

  // « Tester » dans le fil public, depuis le Constructeur : le mix devient le
  // MIX courant ET le brouillon affiché (même geste que charger un mix de la
  // bibliothèque) au lieu de quitter l'écran avec un brouillon non enregistré.
  const handleTestFromFeed = (mix) =>
    guardedReplace(async () => {
      // Aperçu : rien n'est enregistré (ni MIX courant, ni Mes mix).
      dismissUndo();
      setPreview(true);
      setDraft(cloneMix(mix));
      setPublishedLink(null);
      setPubState({ phase: 'idle', text: null });
    });

  const editingBlock = editingBlockId
    ? draft.blocks.find((b) => b.id === editingBlockId)
    : null;

  const ListHeader = (
    <View>
      {preview && (
        <View style={styles.pubBanner}>
          <View style={styles.pubBannerHead}>
            <AppIcon name="expand" size={13} color={ACCENT} />
            <Text style={styles.pubBannerKicker}>APERÇU</Text>
          </View>
          <Text style={styles.pubBannerText}>
            Ce mix ne t'appartient pas encore : tu peux le lancer ou l'enregistrer. Une fois enregistré dans Mes mix, il est à toi : tu peux le modifier et le partager.
          </Text>
        </View>
      )}
      {!!publishedLink && !preview && (
        <View style={styles.pubBanner}>
          <View style={styles.pubBannerHead}>
            <AppIcon name="globe" size={13} color={ACCENT} />
            <Text style={styles.pubBannerKicker}>MIX PUBLIÉ</Text>
          </View>
          <Text style={styles.pubBannerText}>Tu modifies un mix du fil public.</Text>
          <Text style={styles.pubBannerLabel}>CATÉGORIE</Text>
          <View style={styles.pubBannerChips}>
            {DISCIPLINES.map((d) => {
              const active = d.id === publishedLink.category;
              return (
                <PressTap
                  key={d.id}
                  tapScale={0.94}
                  onHapticIn={haptic.selection}
                  onPress={() => handleChangeCategory(d.id)}
                  style={[styles.pubChip, active && styles.pubChipActive]}
                >
                  <AppIcon name={d.icon} size={11} color={active ? '#0A0A0A' : 'rgba(255,255,255,0.70)'} />
                  <Text style={[styles.pubChipText, active && styles.pubChipTextActive]}>{d.short}</Text>
                </PressTap>
              );
            })}
          </View>
          {!!pubState.text && (
            <Text style={[styles.pubBannerFeedback, { color: pubState.phase === 'ok' ? '#1FC777' : '#FF5454' }]}>
              {pubState.text}
            </Text>
          )}
        </View>
      )}

      <View style={styles.hero}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroKicker}>Ton MIX</Text>
          <TextInput
            value={draft.name}
            onChangeText={updateName}
            editable={!preview}
            style={styles.heroName}
            maxLength={28}
            placeholder="Nom du mix"
            placeholderTextColor="rgba(255,255,255,0.30)"
            selectionColor={ACCENT}
          />
          <Text style={styles.heroMeta}>
            {draft.blocks.length} bloc{draft.blocks.length > 1 ? 's' : ''} ·{' '}
            {totalIsEstimate ? '~' : ''}
            {formatTotalShort(totalSec)}
          </Text>
        </View>
        <View style={styles.heroRight}>
          <Text style={styles.heroDurLabel}>{totalIsEstimate ? 'Durée estimée' : 'Durée'}</Text>
          <Text style={styles.heroDurValue}>
            {totalSec >= 3600 ? (
              <>
                {Math.floor(Math.round(totalSec / 60) / 60)}
                <Text style={styles.heroDurSep}>h</Text>
                {String(Math.round(totalSec / 60) % 60).padStart(2, '0')}
              </>
            ) : (
              <>
                {String(totalMin).padStart(2, '0')}
                <Text style={styles.heroDurSep}>:</Text>
                {String(totalRest).padStart(2, '0')}
              </>
            )}
          </Text>
        </View>
      </View>

      <View style={styles.timeline}>
        {draft.blocks.length === 0 ? (
          <View style={styles.timelineEmpty} />
        ) : (
          draft.blocks.map((b) => {
            const t = getBlockType(b.type);
            const flex = Math.max(0.001, getBlockDuration(b)) / Math.max(1, totalSec);
            return (
              <View
                key={b.id}
                style={[
                  styles.timelineSeg,
                  { flex, backgroundColor: t?.color || '#FFFFFF' },
                ]}
              />
            );
          })
        )}
      </View>

      <View style={styles.sectionHead}>
        <View style={styles.sectionHeadText}>
          <Text style={styles.sectionTitle}>Blocs de la séance</Text>
          <Text style={styles.sectionHint}>
            {preview ? 'Aperçu en lecture seule' : 'Tap édite · Glisse ← supprime · Maintiens drag'}
          </Text>
        </View>
        {draft.blocks.length > 0 && !preview && (
          <Button
            variant="glass"
            size="sm"
            icon="reset"
            label="Tout vider"
            onPress={handleReset}
            accessibilityLabel="Vider le builder : retirer tous les blocs"
          />
        )}
      </View>
    </View>
  );

  return (
    <GradientBackground colors={[ACCENT, '#0A0A0A', '#000000']} ambient textMode="light">
      {ready && (
      <>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>BUILDER MIX</Text>
        </View>

        <View style={styles.topBar}>
          <IconButton icon="close" onPress={handleCancel} accessibilityLabel="Annuler" />
          <Text style={styles.topTitle}>Constructeur</Text>
          <View style={styles.topBarRight}>
            {!preview && (
              <IconButton
                icon="share"
                size={ROUND_SIZE.nav}
                onPress={() => openShare(draft, { isDraft: true })}
                accessibilityLabel="Partager ce mix"
              />
            )}
            <Button
              variant="glass"
              size="nav"
              icon="list"
              label={String(library.length)}
              accessibilityLabel="Mes mix enregistrés"
              onPress={() => {
                haptic.light();
                setLibraryOpen(true);
              }}
            />
          </View>
        </View>

        <View style={styles.listWrap}>
          <DraggableFlatList
            data={draft.blocks}
            onDragEnd={handleDragEnd}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={styles.listContent}
            style={styles.listInner}
            containerStyle={styles.listInner}
            activationDistance={6}
            renderItem={({ item, drag, isActive, getIndex }) => (
              <BlockRow
                block={item}
                index={getIndex() ?? 0}
                drag={drag}
                isActive={isActive}
                readOnly={preview}
                onEdit={() => setEditingBlockId(item.id)}
                onDelete={() => removeBlock(item.id)}
              />
            )}
          />
        </View>

        {/* Fixe, jamais dans le scroll (retour utilisateur 25/09/2026 : avec
            beaucoup de blocs, "Ajouter un bloc" finissait tout en bas de la
            liste et fallait tout dérouler pour l'atteindre). */}
        <View style={styles.bottomBar} onLayout={(e) => setBarH(e.nativeEvent.layout.height)}>
          {!preview && (
            <Button
              variant="glass"
              fullWidth
              icon="plus"
              label="Ajouter un bloc"
              onPress={() => {
                haptic.light();
                setAddOpen(true);
              }}
            />
          )}
          {/* Lancer en premier plan (accent, plus large) : c'est l'action
              principale du constructeur. Enregistrer reste à côté, en verre.
              « Annuler » n'est plus ici : la croix en haut à gauche fait déjà
              ce travail, et trois boutons ne tiennent pas sur une rangée. */}
          <View style={styles.bottomActions}>
            <SaveButton
              disabled={draft.blocks.length === 0}
              oneTap={preview}
              onTap={handleSave}
              onLongComplete={handleSaveAsNew}
              status={saveStatus}
              flashTick={saveTick}
            />
            {/* En modification d'un mix publié, l'action principale est
                « Mettre à jour le fil » (même état que l'encadré du haut) :
                « Lancer » n'a plus sa place ici. */}
            {publishedLink ? (
              <Button
                variant="accent"
                color={ACCENT}
                icon={pubState.phase === 'ok' ? 'check' : 'globe'}
                label={
                  pubState.phase === 'busy'
                    ? 'Envoi…'
                    : pubState.phase === 'ok'
                      ? 'À jour'
                      : 'Mettre à jour le fil'
                }
                disabled={pubState.phase === 'busy' || pubState.phase === 'ok' || draft.blocks.length === 0}
                onPress={handlePublishUpdate}
                accessibilityLabel="Mettre à jour ce mix dans le fil public"
                style={styles.launchSlot}
              />
            ) : (
              <Button
                variant="accent"
                color={ACCENT}
                icon="play"
                label="Lancer"
                disabled={draft.blocks.length === 0}
                onPress={handleLaunch}
                accessibilityLabel="Lancer ce mix"
                style={styles.launchSlot}
              />
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* Petit message (enregistré, builder vidé…) juste au-dessus de la barre du bas. */}
      {!!toast && (
        <View style={[styles.toastLayer, { bottom: insets.bottom + barH + 4 }]} pointerEvents="box-none">
          <MiniToast
            key={toast.id}
            text={toast.text}
            icon={toast.icon}
            actionLabel={toast.actionLabel}
            onAction={toast.onAction}
          />
        </View>
      )}

      {/* Feuilles dans la fenêtre principale, pas dans des <Modal> : Android
          n'envoie ni les événements ni les insets du clavier à une Modal, le
          clavier y recouvrait les champs. Rendues en dernier pour passer
          au-dessus de la liste et de la barre du bas. */}
      {addOpen && (
        <AddBlockSheet
          screenH={screenH}
          onClose={() => setAddOpen(false)}
          onPick={addBlock}
        />
      )}

      {!!editingBlock && (
        <EditBlockSheet
          screenH={screenH}
          block={editingBlock}
          onClose={() => setEditingBlockId(null)}
          onUpdate={(patch) => updateBlock(editingBlock.id, patch)}
        />
      )}

      {libraryOpen && (
        <MixLibrarySheet
          screenH={screenH}
          library={library}
          onClose={() => setLibraryOpen(false)}
          onLoad={handleLoadMix}
          onDelete={handleDeleteMix}
          onShare={(m) => {
            setShareMix(withLatestPublishedId(m));
            setShareIsDraft(false);
            setShareOpen(true);
          }}
        />
      )}

      {shareOpen && (
        <MixShareSheet
          screenH={screenH}
          mix={shareMix}
          publishedLink={shareIsDraft ? publishedLink : null}
          onPublishedChange={handlePublishedChange}
          onClose={() => setShareOpen(false)}
          onImported={handleImported}
          onOpenFeed={() => setFeedOpen(true)}
        />
      )}

      {feedOpen && (
        <MixPublicSheet
          screenH={screenH}
          onClose={() => setFeedOpen(false)}
          onTest={handleTestFromFeed}
          onEdit={handleEditFromFeed}
        />
      )}

      {!!unsaved && (
        <UnsavedChangesSheet
          screenH={screenH}
          leaving={!!unsaved.leaving}
          mixName={(draft.name || '').trim()}
          onSave={handleUnsavedSave}
          onDiscard={handleUnsavedDiscard}
          onClose={() => setUnsaved(null)}
        />
      )}
      </>
      )}
      {!skeletonGone && (
        <Animated.View style={[StyleSheet.absoluteFill, skeletonStyle]} pointerEvents="none">
          <MixBuilderSkeleton />
        </Animated.View>
      )}
    </GradientBackground>
  );
}

function BlockRow({ block, index, drag, isActive, onEdit, onDelete, readOnly = false }) {
  const type = getBlockType(block.type);
  const swipeRef = useRef(null);
  if (!type) return null;

  const renderRightActions = () => (
    <Pressable
      onPress={() => {
        swipeRef.current?.close();
        onDelete?.();
      }}
      style={({ pressed }) => [
        styles.swipeDelete,
        pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
      ]}
    >
      <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
        <Path
          d="M3 5h12M7 5V3h4v2M5 5l1 10h6l1-10M8 8v5M10 8v5"
          stroke="#FFFFFF"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <Text style={styles.swipeDeleteLabel}>Supprimer</Text>
    </Pressable>
  );

  return (
    <ScaleDecorator>
      <Swipeable
        ref={swipeRef}
        renderRightActions={renderRightActions}
        overshootRight={false}
        friction={2}
        rightThreshold={40}
        enabled={!isActive && !readOnly}
        containerStyle={styles.swipeWrap}
      >
        <Pressable
          onLongPress={readOnly ? undefined : drag}
          delayLongPress={250}
          onPress={readOnly ? undefined : onEdit}
          style={({ pressed }) => [
            styles.row,
            isActive && {
              backgroundColor: 'rgba(149,117,255,0.18)',
              borderColor: ACCENT,
            },
            pressed && !isActive && { opacity: 0.92 },
          ]}
        >
          <View
            style={[styles.rowBlob, { backgroundColor: type.color }]}
            pointerEvents="none"
          />
          <View
            style={[
              styles.rowIndex,
              {
                backgroundColor: `${type.color}22`,
                borderColor: `${type.color}66`,
              },
            ]}
          >
            <Text style={[styles.rowIndexText, { color: type.color }]}>{index + 1}</Text>
          </View>

          <View style={styles.rowInfo}>
            <View style={styles.rowInfoTop}>
              <View
                style={[
                  styles.rowBadge,
                  { backgroundColor: `${type.color}22` },
                ]}
              >
                <Text style={[styles.rowBadgeText, { color: type.color }]}>{type.name}</Text>
              </View>
              <Text style={styles.rowLabel} numberOfLines={1}>{block.label}</Text>
            </View>
            <View style={styles.rowMeta}>
              <RoleBadge role={resolveBlockRole(block)} />
              <Text style={styles.rowSubtitle} numberOfLines={1}>
                {formatBlockSubtitle(block)}
              </Text>
            </View>
            {/* Note libre : quelle séance/quel exercice ce bloc contient,
                visible d'un coup d'œil chaque fois qu'on revoit la liste —
                le seul "avant le lancement" qui existe vraiment pour un MIX,
                puisqu'il se lance directement depuis Home sans écran
                intermédiaire (v15.0.0). */}
            {!!block.note && (
              <View style={styles.rowNoteWrap}>
                <AppIcon name="note" size={11} color="rgba(255,255,255,0.45)" />
                <Text style={styles.rowNote} numberOfLines={1}>{block.note}</Text>
              </View>
            )}
          </View>

          <View style={styles.dragHandle} pointerEvents="none">
            <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
              <Path
                d="M5 5h2M11 5h2M5 9h2M11 9h2M5 13h2M11 13h2"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </Svg>
          </View>
        </Pressable>
      </Swipeable>
    </ScaleDecorator>
  );
}

function RoleBadge({ role }) {
  const info = getBlockRole(role);
  const pop = useSharedValue(1);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    pop.value = withSequence(
      withTiming(1.14, { duration: 120 }),
      withSpring(1, springBouncy)
    );
  }, [role]);

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));

  return (
    <Animated.View style={[styles.roleBadge, popStyle]}>
      <BlockRoleIcon role={role} size={11} opacity={0.85} />
      <Text style={styles.roleBadgeText} numberOfLines={1}>{info?.short}</Text>
    </Animated.View>
  );
}

function RoleChip({ role, selected, onPress, onLayout }) {
  const progress = useSharedValue(selected ? 1 : 0);
  const pop = useSharedValue(1);
  const mountedRef = useRef(false);

  useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, { duration: 200, easing: easeImpact });
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (selected) {
      pop.value = withSequence(
        withTiming(1.1, { duration: 110 }),
        withSpring(1, springBouncy)
      );
    }
  }, [selected]);

  const chipStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      ['rgba(255,255,255,0.16)', '#FFFFFF']
    ),
  }));

  const onStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    // PressTap ne relaie pas onLayout : la mesure vit sur la View autour.
    <View onLayout={onLayout}>
      <PressTap onPress={onPress} tapScale={0.92} accessibilityLabel={role.label}>
        <Animated.View style={[sheetStyles.roleChip, chipStyle]}>
          <BlockRoleIcon role={role.id} size={14} opacity={0.7} />
          <Text style={sheetStyles.roleChipText}>{role.label}</Text>
          <Animated.View pointerEvents="none" style={[sheetStyles.roleChipOn, onStyle]}>
            <BlockRoleIcon role={role.id} size={14} color="#0A0A0A" />
            <Text style={[sheetStyles.roleChipText, sheetStyles.roleChipTextOn]}>
              {role.label}
            </Text>
          </Animated.View>
        </Animated.View>
      </PressTap>
    </View>
  );
}

// Enregistrer : un appui = enregistrer (on reste sur la page, avec un retour
// visuel), 2 s d'appui = archiver une copie dans Mes mix.
// Garde sa propre mécanique d'appui (la barre qui se remplit, que Button ne
// sait pas faire) mais porte le rendu de la recette 'accent' de
// lib/buttonTokens.js : même capsule que tous les autres boutons.
function SaveButton({ disabled, onTap, onLongComplete, oneTap = false, status = null, flashTick = 0 }) {
  const haptic = useHaptic();
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);
  const longFiredRef = useRef(false);
  // Verre, pas l'accent : le bouton Lancer à côté est l'action principale.
  const r = buttonRecipe({ variant: 'glass' });

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const confirmed = status === 'saved' || status === 'added';
  const refused = status === 'refused';

  return (
    // Contour vert qui se dessine à chaque enregistrement réussi : la
    // confirmation que « ça a bien été pris », sans quitter l'écran.
    <SaveFlashRing trigger={flashTick} radius={BUTTON_HEIGHT.lg / 2} style={styles.saveSlot}>
    <Pressable
      disabled={disabled}
      delayLongPress={SAVE_HOLD_MS}
      // Un maintien de 2 s fait presque toujours dériver le doigt : au-delà de
      // la tolérance par défaut (quelques mm) Android annule l'appui, la barre
      // se vidait et rien ne s'enregistrait, une fois sur deux. Large tolérance.
      pressRetentionOffset={{ top: 80, bottom: 80, left: 80, right: 80 }}
      onPressIn={() => {
        if (disabled) return;
        longFiredRef.current = false;
        scale.value = withSpring(TAP_SCALE.lg, springEnergetic);
        // `oneTap` (mix qui n'est pas à moi) : un appui suffit, pas de barre de maintien.
        if (!oneTap) progress.value = withTiming(1, { duration: SAVE_HOLD_MS });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, springEnergetic);
        progress.value = withTiming(0, { duration: 200 });
      }}
      onLongPress={() => {
        if (disabled) return;
        longFiredRef.current = true;
        // Pas de vibration ici : c'est le gestionnaire qui vibre, une fois sûr
        // que l'enregistrement a lieu (sinon un refus vibrait comme un succès).
        // En `oneTap`, un appui prolongé vaut un appui simple.
        if (oneTap) onTap?.();
        else onLongComplete?.();
      }}
      onPress={() => {
        if (disabled) return;
        if (longFiredRef.current) {
          longFiredRef.current = false;
          return;
        }
        onTap?.();
      }}
      style={styles.savePress}
    >
      <Animated.View
        style={[styles.saveOuter, disabled ? styles.saveDisabled : { boxShadow: r.outer }, scaleStyle]}
      >
        <View
          style={[
            styles.saveInner,
            {
              backgroundColor: r.backgroundColor,
              borderColor: r.borderColor,
              borderWidth: r.borderWidth,
              boxShadow: r.inner,
            },
          ]}
        >
          {r.fill ? (
            <LinearGradient
              colors={r.fill}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <LinearGradient
            colors={r.sheen}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.saveSheen}
            pointerEvents="none"
          />
          <Animated.View pointerEvents="none" style={[styles.btnPrimaryFill, fillStyle]} />
          {confirmed && <AppIcon name="check" size={16} color="#1FC777" />}
          <Text
            style={[styles.saveText, { color: confirmed ? '#1FC777' : refused ? '#FF5454' : r.textColor }]}
            numberOfLines={1}
          >
            {status === 'added' ? 'Ajouté' : status === 'saved' ? 'Enregistré' : refused ? 'Nom déjà pris' : 'Enregistrer'}
          </Text>
          {!confirmed && !oneTap && (
            <Text style={[styles.btnPrimaryHint, refused && { color: '#FF5454' }]} numberOfLines={1}>
              {refused ? 'Change le nom du mix' : 'Maintiens 2s = nouveau'}
            </Text>
          )}
        </View>
      </Animated.View>
    </Pressable>
    </SaveFlashRing>
  );
}

function AddBlockSheet({ screenH, onClose, onPick }) {
  const haptic = useHaptic();
  // La feuille reste touchable pendant son animation de fermeture : sans ce
  // verrou, un double tap ajouterait deux blocs.
  const pickedRef = useRef(false);
  return (
    <BottomSheet screenH={screenH} onClose={onClose}>
      {({ close }) => (
        <View>
          <View style={sheetStyles.headerRow}>
            <View>
              <Text style={sheetStyles.kicker}>NOUVEAU BLOC</Text>
              <Text style={sheetStyles.title}>Choisis un type</Text>
            </View>
            <IconButton
              icon="close"
              size={ROUND_SIZE.sheet}
              haptic={haptic.light}
              onPress={close}
              accessibilityLabel="Fermer"
            />
          </View>

          <View style={sheetStyles.grid}>
            {BLOCK_TYPES.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => {
                  if (pickedRef.current) return;
                  pickedRef.current = true;
                  onPick(t.id);
                  close();
                }}
                style={({ pressed }) => [
                  sheetStyles.gridCell,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
                ]}
              >
                <View style={[sheetStyles.gridBlob, { backgroundColor: t.color }]} pointerEvents="none" />
                <View
                  style={[
                    sheetStyles.gridIcon,
                    { backgroundColor: `${t.color}22` },
                  ]}
                >
                  <AppIcon name={t.icon} size={20} color={t.color} />
                </View>
                <Text style={sheetStyles.gridName}>{t.name}</Text>
                <Text style={[sheetStyles.gridHint, { color: t.color }]}>{t.hint}</Text>
              </Pressable>
            ))}
            <View style={[sheetStyles.gridCell, { opacity: 0 }]} pointerEvents="none" />
          </View>
        </View>
      )}
    </BottomSheet>
  );
}

function EditBlockSheet({ screenH, block, onClose, onUpdate }) {
  const haptic = useHaptic();
  const [labelDraft, setLabelDraft] = useState(block?.label || '');
  const [noteDraft, setNoteDraft] = useState(block?.note || '');
  const [importOpen, setImportOpen] = useState(false);
  const roleScrollRef = useRef(null);
  const roleRevealedFor = useRef(null);

  // (V) Même contrainte que PickerSheet : en fenêtre réduite les roues
  // passent à 3 valeurs, sinon la feuille dépasse par le haut. Les trois
  // sont côte à côte, donc c'est bien la hauteur d'une seule qui compte.
  const level = useLayoutLevel();
  const wheelItems = level === 'full' ? 5 : 3;
  // En réduit, une seule rangée qui défile : trois rangées de chips feraient déborder la feuille.
  const rolesInline = level !== 'full';

  useEffect(() => {
    setLabelDraft(block?.label || '');
    setNoteDraft(block?.note || '');
    setImportOpen(false);
    roleRevealedFor.current = null;
  }, [block?.id]);

  if (!block) return null;
  const type = getBlockType(block.type);

  const ranges = getRangesForType(block.type, block);
  // BASIC se règle comme le BASIC normal : travail libre, donc pas de roue
  // de travail, seulement le repos et les tours.
  const showWork = block.type !== 'basic';
  const showRest = block.type === 'tabata' || block.type === 'basic';
  const showRounds = block.type !== 'rest' && block.type !== 'amrap';
  const currentRole = resolveBlockRole(block);

  const pickRole = (id) => {
    haptic.selection();
    if (block.role !== id) onUpdate({ role: id });
  };

  // Le rôle choisi peut être hors champ dans la rangée qui défile (REPOS est le dernier).
  const revealRole = (id, e) => {
    if (!rolesInline || id !== currentRole || roleRevealedFor.current === block.id) return;
    roleRevealedFor.current = block.id;
    const x = e.nativeEvent.layout.x;
    roleScrollRef.current?.scrollTo({ x: Math.max(0, x - 20), animated: false });
  };

  const roleChips = BLOCK_ROLES.map((r) => (
    <RoleChip
      key={r.id}
      role={r}
      selected={r.id === currentRole}
      onPress={() => pickRole(r.id)}
      onLayout={(e) => revealRole(r.id, e)}
    />
  ));

  return (
    <BottomSheet screenH={screenH} onClose={onClose} keyboardAware>
      {({ close }) => (
        <View>
          <View style={sheetStyles.headerRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={sheetStyles.kicker}>BLOC {type.name}</Text>
              <TextInput
                value={labelDraft}
                onChangeText={(v) => {
                  setLabelDraft(v);
                  onUpdate({ label: v });
                }}
                style={sheetStyles.titleInput}
                maxLength={32}
                selectionColor={type.color}
                placeholder="Nom du bloc"
                placeholderTextColor="rgba(255,255,255,0.30)"
              />
            </View>
            <IconButton
              icon="close"
              size={ROUND_SIZE.sheet}
              haptic={haptic.light}
              onPress={close}
              accessibilityLabel="Fermer"
            />
          </View>

          <View style={sheetStyles.roleSection}>
            <Text style={sheetStyles.pickerLabel}>RÔLE</Text>
            {rolesInline ? (
              // "handled" : clavier ouvert, un tap sur une pastille la choisit
              // au lieu de seulement fermer le clavier.
              <ScrollView
                ref={roleScrollRef}
                horizontal
                keyboardShouldPersistTaps="handled"
                showsHorizontalScrollIndicator={false}
                style={sheetStyles.roleScroll}
                contentContainerStyle={sheetStyles.roleScrollContent}
              >
                {roleChips}
              </ScrollView>
            ) : (
              <View style={sheetStyles.roleWrap}>{roleChips}</View>
            )}
          </View>

          <View style={sheetStyles.pickersRow}>
            {showWork && (
              <View style={sheetStyles.pickerCol}>
                <Text style={sheetStyles.pickerLabel}>
                  {block.type === 'rest' ? 'DURÉE'
                    : block.type === 'amrap' ? 'DURÉE'
                    : block.type === 'emom' ? 'INTERVALLE'
                    : 'TRAVAIL'}
                </Text>
                <WheelPicker
                  values={ranges.duration}
                  selectedValue={block.duration}
                  type="seconds"
                  accentColor={type.color}
                  onChange={(v) => onUpdate({ duration: v })}
                  visibleItems={wheelItems}
                />
              </View>
            )}

            {showRest && (
              <View style={sheetStyles.pickerCol}>
                <Text style={sheetStyles.pickerLabel}>REPOS</Text>
                <WheelPicker
                  values={ranges.rest}
                  selectedValue={block.rest || 0}
                  type="seconds"
                  accentColor={type.color}
                  onChange={(v) => onUpdate({ rest: v })}
                  visibleItems={wheelItems}
                />
              </View>
            )}

            {showRounds && (
              <View style={sheetStyles.pickerCol}>
                <Text style={sheetStyles.pickerLabel}>TOURS</Text>
                <WheelPicker
                  values={ranges.rounds}
                  selectedValue={block.rounds || 1}
                  type="rounds"
                  accentColor={type.color}
                  onChange={(v) => onUpdate({ rounds: v })}
                  visibleItems={wheelItems}
                />
              </View>
            )}
          </View>

          {/* Note libre : quelle séance/quel exercice ce bloc contient — la
              seule information "avant le lancement" qu'un MIX porte, puisqu'il
              se lance directement depuis Home (v15.0.0, voir CLAUDE.md). */}
          <View style={sheetStyles.noteSection}>
            <View style={sheetStyles.noteHeaderRow}>
              <Text style={sheetStyles.pickerLabel}>NOTE</Text>
              <Pressable
                hitSlop={8}
                onPress={() => {
                  haptic.light();
                  setImportOpen((v) => !v);
                }}
              >
                <Text style={[sheetStyles.noteImportLink, { color: type.color }]}>
                  {importOpen ? 'Annuler' : 'Importer depuis le Planning'}
                </Text>
              </Pressable>
            </View>

            {importOpen ? (
              <PlanningImportPicker
                accentColor={type.color}
                onPick={(text) => {
                  if (!text) return;
                  haptic.success();
                  const merged = noteDraft.trim() ? `${noteDraft.trim()}\n${text}` : text;
                  const clamped = merged.slice(0, MAX_BLOCK_NOTE_LENGTH);
                  setNoteDraft(clamped);
                  onUpdate({ note: clamped });
                  setImportOpen(false);
                }}
              />
            ) : (
              <TextInput
                value={noteDraft}
                onChangeText={(v) => {
                  const clamped = v.slice(0, MAX_BLOCK_NOTE_LENGTH);
                  setNoteDraft(clamped);
                  onUpdate({ note: clamped });
                }}
                style={sheetStyles.noteInput}
                multiline
                maxLength={MAX_BLOCK_NOTE_LENGTH}
                placeholder="Ex : Pompes 3x15, Dips 3x12…"
                placeholderTextColor="rgba(255,255,255,0.30)"
                selectionColor={type.color}
                textAlignVertical="top"
              />
            )}
          </View>

          <Button
            variant="accent"
            color={type.color}
            fullWidth
            label="OK"
            haptic={haptic.light}
            onPress={close}
            style={sheetStyles.doneCta}
          />
        </View>
      )}
    </BottomSheet>
  );
}

// Pioche un bloc du Planning (jour -> bloc) et renvoie son contenu formaté en
// texte, pour remplir la note d'un bloc MIX sans tout retaper (v15.0.0).
// Chargement paresseux : seulement à l'ouverture, pas à chaque édition de bloc.
function PlanningImportPicker({ accentColor, onPick }) {
  const haptic = useHaptic();
  const [planning, setPlanning] = useState(null);
  const [dayKey, setDayKey] = useState(null);

  useEffect(() => {
    let alive = true;
    loadPlanning().then((p) => {
      if (!alive) return;
      setPlanning(p);
      const firstDay = DAYS.find((d) => dayHasImportable(p[d.key]));
      setDayKey(firstDay?.key ?? null);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!planning) {
    return <Text style={sheetStyles.importEmpty}>Chargement…</Text>;
  }

  const daysWithBlocks = DAYS.filter((d) => dayHasImportable(planning[d.key]));

  if (daysWithBlocks.length === 0) {
    return (
      <Text style={sheetStyles.importEmpty}>
        Ton Planning ne contient pas encore d'exercices à importer.
      </Text>
    );
  }

  const dayBlocks = (dayKey ? planning[dayKey]?.blocks || [] : []).filter(
    (b) => (b.tags?.length || 0) > 0
  );

  return (
    <View style={sheetStyles.importPicker}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={sheetStyles.importDayRow}
      >
        {daysWithBlocks.map((d) => {
          const selected = d.key === dayKey;
          return (
            <Pressable
              key={d.key}
              onPress={() => {
                haptic.selection();
                setDayKey(d.key);
              }}
              style={[
                sheetStyles.importDayChip,
                selected && { backgroundColor: accentColor, borderColor: accentColor },
              ]}
            >
              <Text
                style={[sheetStyles.importDayChipText, selected && { color: '#0A0A0A' }]}
              >
                {d.short}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={sheetStyles.importBlockList}>
        {dayBlocks.map((b) => (
          <Pressable
            key={b.id}
            onPress={() => onPick(formatBlockAsText(b))}
            style={({ pressed }) => [
              sheetStyles.importBlockRow,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={sheetStyles.importBlockName} numberOfLines={1}>
              {b.name || 'Bloc'}
            </Text>
            <Text style={sheetStyles.importBlockCount}>
              {b.tags.length} exercice{b.tags.length > 1 ? 's' : ''}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const dayHasImportable = (day) => (day?.blocks || []).some((b) => (b.tags?.length || 0) > 0);

const formatTotalShort = (s) => {
  if (s < 60) return `${s}s`;
  if (s >= 3600) return formatHoursMinutes(s);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec === 0 ? `${m}min` : `${m}min ${sec}s`;
};

const styles = StyleSheet.create({
  safe: { flex: 1 },

  statusBar: {
    paddingHorizontal: 24,
    paddingTop: 4,
    alignItems: 'center',
  },
  statusText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 4,
    color: 'rgba(255,255,255,0.55)',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  topTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.50)',
    textTransform: 'uppercase',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  listWrap: {
    flex: 1,
  },
  listInner: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  // Bandeau « MIX PUBLIÉ » : liseré violet du mode MIX, aucune couleur nouvelle.
  pubBanner: {
    marginTop: 4,
    marginBottom: 6,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(149,117,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(149,117,255,0.40)',
  },
  pubBannerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  pubBannerKicker: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 2.6,
    color: ACCENT,
  },
  pubBannerText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.72)',
  },
  pubBannerBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  pubBannerLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 2.6,
    color: 'rgba(255,255,255,0.50)',
    marginTop: 12,
    marginBottom: 8,
  },
  pubBannerChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pubChip: {
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
  pubChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  pubChipText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.75)',
  },
  pubChipTextActive: {
    color: '#0A0A0A',
  },
  pubBannerFeedback: {
    fontFamily: fonts.sansSemibold,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },

  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 18,
    gap: 12,
  },
  heroLeft: { flex: 1, minWidth: 0 },
  heroKicker: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: ACCENT,
    marginBottom: 6,
  },
  heroName: {
    color: '#FFFFFF',
    fontFamily: fonts.sansExtraBold,
    fontSize: 28,
    letterSpacing: -0.7,
    padding: 0,
    margin: 0,
    lineHeight: 32,
  },
  heroMeta: {
    fontFamily: fonts.sansSemibold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.50)',
    marginTop: 6,
  },
  heroRight: {
    alignItems: 'flex-end',
  },
  heroDurLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 2.5,
    color: 'rgba(255,255,255,0.50)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroDurValue: {
    fontFamily: fonts.display,
    fontSize: 38,
    letterSpacing: -1.5,
    lineHeight: 38,
    includeFontPadding: false,
    color: '#FFFFFF',
  },
  heroDurSep: {
    color: 'rgba(255,255,255,0.40)',
  },

  timeline: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    gap: 2,
    marginBottom: 24,
  },
  timelineEmpty: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
  },
  timelineSeg: {
    height: '100%',
    borderRadius: 2,
  },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionHeadText: {
    flexShrink: 1,
    gap: 4,
  },
  sectionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.50)',
    textTransform: 'uppercase',
  },
  sectionHint: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.30)',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    overflow: 'hidden',
    minHeight: 72,
  },
  rowBlob: {
    position: 'absolute',
    top: -16,
    left: -16,
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.18,
  },
  rowIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIndexText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowInfoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  rowBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rowBadgeText: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1.3,
  },
  rowLabel: {
    flex: 1,
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  roleBadgeText: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1.1,
    color: 'rgba(255,255,255,0.78)',
    textTransform: 'uppercase',
  },
  rowSubtitle: {
    flexShrink: 1,
    fontFamily: fonts.monoRegular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
  },
  rowNoteWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  rowNote: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
  },
  iconAction: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    width: 28,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeWrap: {
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  swipeDelete: {
    width: 96,
    backgroundColor: '#FF5454',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    gap: 4,
  },
  swipeDeleteLabel: {
    color: '#FFFFFF',
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },


  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: BOTTOM_GAP,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  saveSlot: {
    flex: 1,
  },
  // Dans SaveFlashRing (hauteur = celle du bouton) : jamais de flex ici, une
  // base nulle écraserait le bouton (piège n°14).
  savePress: {
    alignSelf: 'stretch',
  },
  toastLayer: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 52,
    zIndex: 50,
  },
  // Lancer : plus large que Enregistrer (flex 1.35 contre 1).
  launchSlot: {
    flex: 1.35,
  },
  saveOuter: {
    height: BUTTON_HEIGHT.lg,
    borderRadius: BUTTON_HEIGHT.lg / 2,
  },
  saveDisabled: {
    opacity: 0.38,
  },
  // paddingBottom : remonte un peu « Enregistrer » pour laisser respirer
  // l'indice « Maintiens 2s » posé en bas de la capsule.
  saveInner: {
    flex: 1,
    borderRadius: BUTTON_HEIGHT.lg / 2,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 8,
  },
  saveSheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '55%',
  },
  saveText: {
    fontFamily: fonts.sansExtraBold,
    fontSize: BUTTON_FONT.lg,
    letterSpacing: -0.1,
    includeFontPadding: false,
  },
  btnPrimaryFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  btnPrimaryHint: {
    position: 'absolute',
    bottom: 4,
    color: 'rgba(255,255,255,0.65)',
    fontFamily: fonts.sansMedium,
    fontSize: 9,
    letterSpacing: 0.6,
  },
});

// La coquille (voile, poignée, fond opaque) vient de BottomSheet.
const sheetStyles = StyleSheet.create({
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
  titleInput: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    padding: 0,
    margin: 0,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridCell: {
    width: '48%',
    minHeight: 110,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  gridBlob: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 64,
    height: 64,
    borderRadius: 32,
    opacity: 0.30,
  },
  gridIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridName: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  gridHint: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },

  roleSection: {
    marginBottom: 16,
  },
  roleWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  roleScroll: {
    flexGrow: 0,
    marginHorizontal: -20,
  },
  roleScrollContent: {
    paddingHorizontal: 20,
    gap: 6,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  roleChipOn: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  roleChipText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1.1,
    color: 'rgba(255,255,255,0.72)',
    textTransform: 'uppercase',
  },
  roleChipTextOn: {
    color: '#0A0A0A',
  },

  pickersRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 16,
  },
  pickerCol: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 6,
  },
  doneCta: {
    marginTop: 4,
  },

  noteSection: {
    marginBottom: 18,
  },
  noteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  noteImportLink: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  noteInput: {
    minHeight: 64,
    maxHeight: 110,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: '#FFFFFF',
  },
  importEmpty: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    paddingVertical: 12,
  },
  importPicker: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 10,
  },
  importDayRow: {
    gap: 6,
    paddingBottom: 10,
  },
  importDayChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  importDayChipText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.75)',
  },
  importBlockList: {
    gap: 6,
  },
  importBlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  importBlockName: {
    flex: 1,
    fontFamily: fonts.sansSemibold,
    fontSize: 12.5,
    color: '#FFFFFF',
    paddingRight: 8,
  },
  importBlockCount: {
    fontFamily: fonts.monoRegular,
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.50)',
  },

});