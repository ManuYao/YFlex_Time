import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Linking } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as MailComposer from 'expo-mail-composer';

import BottomSheet from './BottomSheet';
import PressTap from './PressTap';
import WheelPicker from './WheelPicker';
import Button from './Button';
import IconButton from './IconButton';
import AppIcon from './AppIcon';
import TouchShield from './TouchShield';
import ExerciseAnimation from './ExerciseAnimation';
import { fonts } from '../../lib/fonts';
import { searchCatalog } from '../../lib/exerciseAnimations';
import { useExerciseAnimation } from '../../hooks/useExerciseAnimation';
import { useAuth } from '../../contexts/AuthContext';
import { loadRequests, markRequestSeen, submitRequest } from '../../lib/animationRequests';
import { isRequestable, requestMail, requestState } from '../../lib/animationRequestsShape';

const APP_VERSION = Constants.expoConfig?.version ?? '';
import { formatValue, formatSecondsCompact } from '../../lib/formatters';
import { getCategory } from '../../lib/exercises';
import { BLOCK_TYPES, getBlockType, getRangesForType } from '../../lib/mix-blocks';
import { PLANNING_TIMER_TYPES, carryTimerParams } from '../../lib/planningMix';
import { useLayoutLevel } from '../../lib/responsive';
import { DANGER, ROUND_SIZE } from '../../lib/buttonTokens';
import { haptic } from '../../hooks/useHaptic';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';

// Même plafond que le nom d'un exercice créé dans la bibliothèque
// (ExerciseLibrarySheet).
const MAX_LABEL_LENGTH = 32;

// Les 4 types utilisables comme chrono d'une étiquette (jamais MIX ni REPOS),
// dans l'ordre du menu de l'accueil (AMRAP, BASIC, EMOM, TABATA), pas celui
// de BLOCK_TYPES.
const TIMER_TYPE_OPTIONS = PLANNING_TIMER_TYPES.map((id) => BLOCK_TYPES.find((t) => t.id === id)).filter(Boolean);

const TIMER_FIELD_LABEL = (typeId, key) => {
  if (key === 'rest') return 'REPOS';
  if (key === 'rounds') return 'TOURS';
  // key === 'duration'
  if (typeId === 'emom') return 'INTERVALLE';
  if (typeId === 'tabata') return 'TRAVAIL';
  return 'DURÉE';
};

const range = (from, to, step) => {
  const out = [];
  for (let v = from; v <= to; v += step) out.push(Math.round(v * 10) / 10);
  return out;
};

// Vrai si la charge se termine par un demi-kilo (12,5 → oui, 12 → non).
const isHalf = (w) => Number.isFinite(w) && Math.abs((w % 1) - 0.5) < 0.01;

const inRange = (list, v) => list.length > 0 && v >= list[0] && v <= list[list.length - 1];
const nearest = (list, v) =>
  list.reduce((best, x) => (Math.abs(x - v) < Math.abs(best - v) ? x : best), list[0]);

// Texte d'une case : "PDC" à 0 kg, "1 min 30" plutôt que "90 s".
const displayOf = (key, v) => {
  if (key === 'weight') return formatValue(v, 'weight');
  if (key === 'sets') return { main: String(v), unit: '' };
  return formatSecondsCompact(v);
};

const FIELDS = [
  { key: 'weight', label: 'CHARGE', unit: 'kg', pickerType: 'weight', fallback: 20 },
  { key: 'sets', label: 'SÉRIES', unit: '', pickerType: 'sets', fallback: 4 },
  { key: 'rest', label: 'REPOS', unit: 's', pickerType: 'seconds', fallback: 90 },
];

function CellValue({ display, color }) {
  return (
    <View style={styles.cellValueRow}>
      <Text
        style={styles.cellValue}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {display ? display.main : '—'}
      </Text>
      {!!display?.unit && <Text style={[styles.cellUnit, { color }]}>{display.unit}</Text>}
    </View>
  );
}

export default function ExerciseDetailSheet({
  screenH,
  tag,
  blockName,
  dayLabel,
  onClose,
  onSave,
  onRemove,
}) {
  // (V) Même contrainte que PickerSheet : en fenêtre réduite la roue passe
  // à 3 valeurs, sinon la feuille dépasse par le haut (voir lib/responsive.js).
  const level = useLayoutLevel();
  const wheelItems = level === 'full' ? 5 : 3;

  // Copie figée à l'ouverture : "Retirer cet exercice" supprime l'étiquette du
  // planning avant la fin de l'animation de fermeture, donc la prop `tag`
  // devient undefined alors que la feuille est encore à l'écran.
  // Les initialiseurs DOIVENT être des fonctions : un objet littéral passé à
  // useState est reconstruit à chaque rendu (même si sa valeur est ignorée),
  // et lirait tag.weight sur un tag déjà supprimé.
  const [snapshot] = useState(() => tag);
  const [draft, setDraft] = useState(() => ({
    label: tag.label,
    weight: tag.weight,
    sets: tag.sets,
    rest: tag.rest,
    // Animation choisie à la main (exercice perso, ou mauvaise animation
    // trouvée par le nom). null = choix automatique par le nom.
    animationId: tag.animationId ?? null,
  }));
  // Choix d'une animation : vue à part dans la même feuille.
  const [choosing, setChoosing] = useState(false);
  const [animQuery, setAnimQuery] = useState('');
  const anim = useExerciseAnimation(draft.label, draft.animationId);

  // Demande d'animation (étape 6) : autre vue de la même feuille. Connecté,
  // l'envoi part dans Supabase ; sinon connexion ou mail pré-rempli. Le
  // téléphone garde la liste de SES demandes pour dire « Demande envoyée » puis
  // « Ajoutée suite à ta demande ! » (une fois).
  const router = useRouter();
  const { user } = useAuth();
  const [requesting, setRequesting] = useState(false);
  const [reqPhase, setReqPhase] = useState('form'); // 'form' | 'sending' | 'done'
  const [reqError, setReqError] = useState(null);
  const [requests, setRequests] = useState(null);
  const afterCloseRef = useRef(null);
  useEffect(() => {
    let alive = true;
    loadRequests().then((r) => {
      if (alive) setRequests(r);
    });
    return () => {
      alive = false;
    };
  }, []);
  const hasExact = !!anim.entry && anim.entry.exact;
  const reqState = requestState(requests, draft.label, hasExact);
  const [celebrated, setCelebrated] = useState(false);
  useEffect(() => {
    if (reqState !== 'added' || celebrated) return;
    setCelebrated(true);
    markRequestSeen(draft.label);
  }, [reqState]);
  const handleClose = () => {
    onClose();
    const next = afterCloseRef.current;
    afterCloseRef.current = null;
    if (next) next();
  };
  const openRequest = () => {
    haptic.light();
    setReqPhase('form');
    setReqError(null);
    setRequesting(true);
  };
  const sendRequest = async () => {
    if (reqPhase === 'sending') return;
    haptic.medium();
    setReqPhase('sending');
    setReqError(null);
    const res = await submitRequest({ label: draft.label, userId: user?.id });
    if (res.ok) {
      setRequests(await loadRequests());
      setReqPhase('done');
      haptic.success();
    } else {
      setReqPhase('form');
      setReqError(res.reason);
      haptic.warning();
    }
  };
  const mailRequest = async () => {
    haptic.light();
    const mail = requestMail(draft.label, APP_VERSION);
    try {
      if (await MailComposer.isAvailableAsync()) {
        await MailComposer.composeAsync(mail);
        return;
      }
    } catch {}
    Linking.openURL(
      `mailto:${mail.recipients[0]}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`
    ).catch(() => {});
  };
  const [editing, setEditing] = useState(null);
  // Renommage de l'exercice : vue à part dans la même feuille (comme les roues),
  // le nouveau nom se range dans `draft` et part avec « Enregistrer ».
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  // Anti double-appui sur les boutons de validation (OK, Enregistrer) : points
  // animés tout de suite, appuis avalés le temps que la vue change.
  const guard = useSubmitGuard();

  // Type de chrono à lancer pour cet exercice (v15.1.0, import Planning→MIX,
  // voir lib/planningMix.js) — distinct de `draft.rest` ci-dessus (repos entre
  // séries de musculation, pas le repos d'un cycle TABATA). `timerParams` n'a
  // de sens que si `timerType` est réglé ; changer de type repart des
  // réglages par défaut de CE type plutôt que de garder les anciens chiffres,
  // qui n'auraient pas la même signification d'un type à l'autre.
  const [timerType, setTimerType] = useState(() => tag.timerConfig?.type ?? null);
  const [timerParams, setTimerParams] = useState(() => {
    const cfg = tag.timerConfig;
    if (!cfg?.type) return null;
    return { duration: cfg.duration, rest: cfg.rest, rounds: cfg.rounds };
  });
  const [timerEditing, setTimerEditing] = useState(null); // 'duration' | 'rest' | 'rounds'

  const category = getCategory(snapshot.category);
  const values = useMemo(
    () => ({
      // Kilos ENTIERS : les poids réels d'une salle (haltères, machines) vont de
      // 1 en 1. Les demi-kilos (rondelles) passent par la case « + 0,5 kg ».
      weight: range(0, 200, 1),
      sets: range(1, 20, 1),
      rest: range(0, 300, 5),
    }),
    []
  );

  const field = FIELDS.find((f) => f.key === editing);

  const submitName = () => {
    const next = nameDraft.trim();
    if (!next) return;
    guard.run(
      'name',
      () => {
        setDraft((prev) => ({ ...prev, label: next }));
        setRenaming(false);
      },
      haptic.medium
    );
  };

  const hasRest = (id) => id === 'tabata' || id === 'basic';
  const hasRounds = (id) => !!id && id !== 'amrap';

  // Séries ↔ tours et repos ↔ repos restent liés : modifier l'un met l'autre à
  // jour (dans les deux sens). On ne recopie que si la valeur existe dans la
  // roue de l'autre côté, sinon l'autre valeur reste telle quelle.
  const updateDraft = (key, v) => {
    setDraft((prev) => ({ ...prev, [key]: v }));
    if (!timerType) return;
    if (key === 'sets' && hasRounds(timerType)) {
      setTimerParams((prev) => ({ ...prev, rounds: v }));
    } else if (key === 'rest' && hasRest(timerType)) {
      const list = getRangesForType(timerType, timerParams).rest;
      if (inRange(list, v)) setTimerParams((prev) => ({ ...prev, rest: nearest(list, v) }));
    }
  };

  const updateTimerParam = (key, v) => {
    setTimerParams((prev) => ({ ...prev, [key]: v }));
    if (key === 'rounds' && inRange(values.sets, v)) {
      setDraft((prev) => ({ ...prev, sets: v }));
    } else if (key === 'rest' && inRange(values.rest, v)) {
      setDraft((prev) => ({ ...prev, rest: nearest(values.rest, v) }));
    }
  };

  const pickTimerType = (id) => {
    haptic.selection();
    if (timerType === id) {
      setTimerType(null);
      setTimerParams(null);
      return;
    }
    // On reprend ce que la personne venait de régler pour le type quitté (le
    // repos de BASIC devient la durée d'AMRAP ou l'intervalle d'EMOM, et
    // inversement ; repos → repos, tours → tours), puis les séries et le repos
    // de l'exercice, puis les défauts du type (lib/planningMix.js).
    setTimerType(id);
    setTimerParams(
      carryTimerParams({
        toType: id,
        fromType: timerType,
        fromParams: timerParams,
        rest: draft.rest,
        sets: draft.sets,
      })
    );
  };

  const timerTypeInfo = timerType ? getBlockType(timerType) : null;
  const showTimerDuration = timerType && timerType !== 'basic';
  const showTimerRest = hasRest(timerType);
  const showTimerRounds = hasRounds(timerType);
  const timerRanges = timerType ? getRangesForType(timerType, timerParams) : null;

  return (
    // keyboardAware : la feuille contient désormais un champ texte (nom de
    // l'exercice) — obligatoire, sinon le clavier recouvre le champ et le bouton.
    <BottomSheet screenH={screenH} onClose={handleClose} zIndex={94} keyboardAware>
      {({ close }) => (
        <View>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>{draft.label}</Text>
              {/* Renommer : visible sur la fiche principale seulement, pas
                  pendant le réglage d'une roue. */}
              {!field && !timerEditing && !renaming && !choosing && !requesting && (
                <IconButton
                  icon="edit"
                  variant="ghost"
                  size={32}
                  iconSize={16}
                  hitSlop={10}
                  accessibilityLabel="Modifier le nom"
                  style={styles.renameBtn}
                  onPress={() => {
                    haptic.light();
                    setNameDraft(draft.label);
                    setRenaming(true);
                  }}
                />
              )}
            </View>
            <Text style={styles.subtitle}>
              {[blockName, dayLabel].filter(Boolean).join(' · ').toUpperCase()}
            </Text>
          </View>

          {requesting ? (
            <View>
              <View style={styles.editHeader}>
                <IconButton
                  icon="back"
                  size={ROUND_SIZE.sheet}
                  onPress={() => {
                    haptic.light();
                    setRequesting(false);
                  }}
                  accessibilityLabel="Retour"
                />
                <Text style={styles.editLabel}>DEMANDER UNE ANIMATION</Text>
              </View>

              {reqPhase === 'done' ? (
                <View style={styles.reqDone}>
                  <View style={styles.reqCheck}>
                    <AppIcon name="check" size={22} color="#0A0A0A" />
                  </View>
                  <Text style={styles.reqTitle}>Demande envoyée, merci !</Text>
                  <Text style={styles.reqText}>
                    Les animations les plus demandées arrivent en premier. Quand celle de « {draft.label} » sera
                    prête, tu le verras ici.
                  </Text>
                  <Button
                    variant="solid"
                    fullWidth
                    label="OK"
                    onPress={() => {
                      haptic.light();
                      setRequesting(false);
                    }}
                    style={styles.cta}
                  />
                </View>
              ) : (
                <View>
                  <Text style={styles.reqText}>
                    « {draft.label} » n’a pas encore son animation. Dis-nous que tu la veux : on les fabrique
                    petit à petit, en commençant par celles que tout le monde demande.
                  </Text>

                  {!isRequestable(draft.label) ? (
                    <Text style={styles.reqError}>Donne d’abord un nom à cet exercice.</Text>
                  ) : user ? (
                    <Button
                      variant="solid"
                      fullWidth
                      label="Envoyer ma demande"
                      loading={reqPhase === 'sending'}
                      onPress={sendRequest}
                      style={styles.cta}
                    />
                  ) : (
                    <View>
                      <Text style={styles.reqText}>
                        Pour l’envoyer depuis l’appli, connecte-toi (gratuit, facultatif). Sinon, écris-nous un
                        mail déjà prêt.
                      </Text>
                      <Button
                        variant="solid"
                        fullWidth
                        label="Me connecter"
                        onPress={() => {
                          haptic.light();
                          afterCloseRef.current = () => router.push('/login');
                          close();
                        }}
                        style={styles.cta}
                      />
                    </View>
                  )}

                  {!!reqError && (
                    <Text style={styles.reqError}>
                      {reqError === 'limit'
                        ? 'Tu as déjà 30 demandes en attente : on en traite quelques-unes avant d’en prendre d’autres.'
                        : reqError === 'unavailable'
                        ? 'L’envoi depuis l’appli n’est pas disponible pour l’instant. Tu peux nous écrire par mail.'
                        : 'Pas de connexion pour le moment. Réessaie plus tard, ou écris-nous par mail.'}
                    </Text>
                  )}

                  {isRequestable(draft.label) && (
                    <Button
                      variant={user ? 'ghost' : 'glass'}
                      fullWidth={!user}
                      size={user ? 'md' : undefined}
                      icon={user ? undefined : 'note'}
                      label="Plutôt par mail"
                      onPress={mailRequest}
                      style={user ? styles.removeLink : styles.reqMailBtn}
                    />
                  )}
                </View>
              )}
            </View>
          ) : choosing ? (
            <View>
              <View style={styles.editHeader}>
                <IconButton
                  icon="back"
                  size={ROUND_SIZE.sheet}
                  onPress={() => {
                    haptic.light();
                    setChoosing(false);
                  }}
                  accessibilityLabel="Retour"
                />
                <Text style={styles.editLabel}>CHOISIR UNE ANIMATION</Text>
              </View>

              <TextInput
                value={animQuery}
                onChangeText={setAnimQuery}
                placeholder="Chercher un mouvement"
                placeholderTextColor="rgba(255,255,255,0.30)"
                selectionColor="#FFFFFF"
                maxLength={40}
                returnKeyType="search"
                style={styles.nameInput}
              />

              <View style={styles.animList}>
                {searchCatalog(anim.catalog, animQuery).map((e) => {
                  const selected = anim.entry?.id === e.id;
                  return (
                    <PressTap
                      key={e.id}
                      onPress={() => {
                        haptic.selection();
                        setDraft((prev) => ({ ...prev, animationId: e.id }));
                        setChoosing(false);
                      }}
                      tapScale={0.97}
                      style={[styles.animRow, selected && styles.animRowSelected]}
                    >
                      <View style={[styles.animDot, { backgroundColor: getCategory(e.groupId).color }]} />
                      <Text style={styles.animRowText} numberOfLines={1}>
                        {e.names[0] || e.id}
                      </Text>
                      {selected && <AppIcon name="check" size={14} color="#FFFFFF" />}
                    </PressTap>
                  );
                })}
                {searchCatalog(anim.catalog, animQuery).length === 0 && (
                  <Text style={styles.animEmpty}>
                    Aucun mouvement ne correspond. De nouvelles animations arrivent au fil des semaines.
                  </Text>
                )}
              </View>

              {/* Pas le bon mouvement, ou pas de mouvement du tout : la demande
                  se fait d'ici aussi (c'est là qu'on cherche). */}
              {reqState === 'requested' ? (
                <Text style={styles.animEmpty}>Demande envoyée pour « {draft.label} » ✓</Text>
              ) : (
                <Button
                  variant="ghost"
                  size="md"
                  label={`Demander une animation pour « ${draft.label} »`}
                  onPress={() => {
                    setChoosing(false);
                    openRequest();
                  }}
                  style={styles.removeLink}
                />
              )}

              {!!draft.animationId && (
                <Button
                  variant="ghost"
                  size="md"
                  label="Revenir au choix automatique"
                  onPress={() => {
                    haptic.light();
                    setDraft((prev) => ({ ...prev, animationId: null }));
                    setChoosing(false);
                  }}
                  style={styles.removeLink}
                />
              )}
            </View>
          ) : renaming ? (
            <View>
              <View style={styles.editHeader}>
                <IconButton
                  icon="back"
                  size={ROUND_SIZE.sheet}
                  onPress={() => {
                    haptic.light();
                    setRenaming(false);
                  }}
                  accessibilityLabel="Retour"
                />
                <Text style={styles.editLabel}>MODIFIER LE NOM</Text>
              </View>

              <TextInput
                value={nameDraft}
                onChangeText={setNameDraft}
                placeholder="Nom de l'exercice"
                placeholderTextColor="rgba(255,255,255,0.30)"
                selectionColor="#FFFFFF"
                maxLength={MAX_LABEL_LENGTH}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => submitName()}
                style={styles.nameInput}
              />

              <Button
                variant="solid"
                fullWidth
                label="OK"
                disabled={!nameDraft.trim()}
                loading={guard.busyKey === 'name'}
                onPress={() => submitName()}
                style={styles.cta}
              />
            </View>
          ) : field ? (
            <View>
              <View style={styles.editHeader}>
                {/* Vibration déjà dans le handler : pas de prop `haptic`. */}
                <IconButton
                  icon="back"
                  size={ROUND_SIZE.sheet}
                  onPress={() => {
                    haptic.light();
                    setEditing(null);
                  }}
                  accessibilityLabel="Retour"
                />
                <Text style={styles.editLabel}>{field.label}</Text>
              </View>

              <WheelPicker
                key={field.key}
                values={values[field.key]}
                selectedValue={
                  field.key === 'weight'
                    ? Math.floor(draft.weight ?? field.fallback)
                    : draft[field.key] ?? field.fallback
                }
                type={field.pickerType}
                accentColor={category.color}
                onChange={(v) =>
                  updateDraft(field.key, field.key === 'weight' ? v + (isHalf(draft.weight) ? 0.5 : 0) : v)
                }
                visibleItems={wheelItems}
              />

              {/* Demi-kilo : un appui ajoute 0,5 kg à la valeur de la roue
                  (12 kg → 12,5 kg), un second appui l'enlève. */}
              {field.key === 'weight' && (
                <PressTap
                  tapScale={0.97}
                  onHapticIn={haptic.selection}
                  onPress={() =>
                    updateDraft(
                      'weight',
                      Math.floor(draft.weight ?? field.fallback) + (isHalf(draft.weight) ? 0 : 0.5)
                    )
                  }
                  accessibilityLabel="Ajouter 0,5 kilo"
                  containerStyle={styles.halfWrap}
                  style={[styles.halfBtn, isHalf(draft.weight) && { borderColor: category.color, backgroundColor: `${category.color}26` }]}
                >
                  <AppIcon
                    name={isHalf(draft.weight) ? 'check' : 'plus'}
                    size={14}
                    color={isHalf(draft.weight) ? category.color : 'rgba(255,255,255,0.7)'}
                  />
                  <Text style={[styles.halfText, isHalf(draft.weight) && { color: '#FFFFFF' }]}>0,5 kg</Text>
                </PressTap>
              )}

              <Button
                variant="solid"
                fullWidth
                label="OK"
                loading={guard.busyKey === 'ok'}
                onPress={() => guard.run('ok', () => setEditing(null), haptic.medium)}
                style={styles.cta}
              />
            </View>
          ) : timerEditing ? (
            <View>
              <View style={styles.editHeader}>
                <IconButton
                  icon="back"
                  size={ROUND_SIZE.sheet}
                  onPress={() => {
                    haptic.light();
                    setTimerEditing(null);
                  }}
                  accessibilityLabel="Retour"
                />
                <Text style={styles.editLabel}>{TIMER_FIELD_LABEL(timerType, timerEditing)}</Text>
              </View>

              <WheelPicker
                key={`${timerType}-${timerEditing}`}
                values={timerRanges[timerEditing]}
                selectedValue={timerParams[timerEditing]}
                type={timerEditing === 'rounds' ? 'rounds' : 'seconds'}
                accentColor={timerTypeInfo.color}
                onChange={(v) => updateTimerParam(timerEditing, v)}
                visibleItems={wheelItems}
              />

              <Button
                variant="solid"
                fullWidth
                label="OK"
                loading={guard.busyKey === 'ok'}
                onPress={() => guard.run('ok', () => setTimerEditing(null), haptic.medium)}
                style={styles.cta}
              />
            </View>
          ) : (
            <View>
              {/* Animation du mouvement (catalogue en ligne, voir
                  lib/exerciseAnimationStore.js). Rien tant que le catalogue
                  n'est pas lu ; rien du tout s'il est vide (première ouverture
                  sans réseau). Gratuit pour tous dans le planning. */}
              {anim.entry ? (
                <View style={styles.animBlock}>
                  <ExerciseAnimation
                    entry={anim.entry}
                    uri={anim.uri}
                    failed={anim.status === 'error'}
                    label={draft.label}
                  />
                  <View style={styles.animCaption}>
                    {celebrated ? (
                      <View style={styles.animAdded}>
                        <AppIcon name="check" size={12} color="#2ECC71" />
                        <Text style={styles.animAddedText}>AJOUTÉE SUITE À TA DEMANDE</Text>
                      </View>
                    ) : (
                      <Text style={styles.animCaptionLabel}>
                        {anim.entry.exact ? 'MOUVEMENT' : 'MOUVEMENT PROCHE'}
                      </Text>
                    )}
                    <PressTap
                      onPress={() => {
                        haptic.light();
                        setAnimQuery('');
                        setChoosing(true);
                      }}
                      tapScale={0.95}
                      hitSlop={10}
                    >
                      <Text style={styles.animLink}>Changer</Text>
                    </PressTap>
                  </View>
                </View>
              ) : anim.status === 'none' && anim.catalog.length > 0 ? (
                <View style={styles.animNone}>
                  {reqState === 'requested' ? (
                    <View style={styles.animAdded}>
                      <AppIcon name="check" size={12} color="#2ECC71" />
                      <Text style={styles.animNoneText} numberOfLines={2}>
                        Demande envoyée. Merci !
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.animNoneText} numberOfLines={2}>
                      Pas encore d’animation pour cet exercice.
                    </Text>
                  )}
                  <View style={styles.animLinks}>
                    {reqState !== 'requested' && (
                      <PressTap onPress={openRequest} tapScale={0.95} hitSlop={10}>
                        <Text style={styles.animLink}>Demander</Text>
                      </PressTap>
                    )}
                    <PressTap
                      onPress={() => {
                        haptic.light();
                        setAnimQuery('');
                        setChoosing(true);
                      }}
                      tapScale={0.95}
                      hitSlop={10}
                    >
                      <Text style={styles.animLink}>Choisir</Text>
                    </PressTap>
                  </View>
                </View>
              ) : null}

              <View style={styles.grid}>
                {FIELDS.map((f) => (
                  // PressTap applique `style` à sa vue interne, pas au
                  // Pressable : en ligne, sans ce wrapper, les trois cases se
                  // réduisent à la largeur de leur texte au lieu d'occuper un
                  // tiers chacune.
                  <View key={f.key} style={styles.cellWrap}>
                  <PressTap
                    onPress={() => {
                      haptic.selection();
                      // La molette s'ouvre sur `fallback` quand rien n'est
                      // saisi : sans ça, valider sans faire tourner la molette
                      // laisserait la valeur à "—" alors qu'un nombre s'affiche.
                      if (draft[f.key] == null) updateDraft(f.key, f.fallback);
                      setEditing(f.key);
                    }}
                    tapScale={0.95}
                    style={styles.cell}
                  >
                    <View style={styles.cellLabelRow}>
                      <Text style={styles.cellLabel}>{f.label}</Text>
                      <Svg width={8} height={8} viewBox="0 0 10 10" fill="none">
                        <Path
                          d="M2 3.5L5 6.5l3-3"
                          stroke="rgba(255,255,255,0.4)"
                          strokeWidth={1.6}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    </View>
                    <CellValue
                      display={draft[f.key] == null ? null : displayOf(f.key, draft[f.key])}
                      color={category.color}
                    />
                  </PressTap>
                  </View>
                ))}
              </View>

              {/* Type de chrono à lancer pour cet exercice (v15.1.0) — voir
                  lib/planningMix.js. Optionnel : une étiquette sans type est
                  quand même incluse au lancement du bloc, à configurer ou
                  retirer depuis le Mix Builder. */}
              <Text style={styles.sectionLabel}>TYPE DE CHRONO</Text>
              <View style={styles.typeGrid}>
                {TIMER_TYPE_OPTIONS.map((t) => {
                  const selected = timerType === t.id;
                  // Wrapper flex:1 obligatoire : sur PressTap, `flex` dans `style`
                  // s'applique à la vue interne dont le parent (Pressable) n'a
                  // pas de hauteur, et la cellule s'écrase (icône et nom
                  // sortent de la case).
                  return (
                    <View key={t.id} style={styles.cellWrap}>
                      <PressTap
                        onPress={() => pickTimerType(t.id)}
                        tapScale={0.95}
                        style={[
                          styles.typeCell,
                          selected && { backgroundColor: `${t.color}22`, borderColor: t.color },
                        ]}
                      >
                        <AppIcon name={t.icon} size={28} color={selected ? t.color : 'rgba(255,255,255,0.5)'} />
                        <Text style={[styles.typeCellText, selected && { color: t.color }]}>
                          {t.name}
                        </Text>
                      </PressTap>
                    </View>
                  );
                })}
              </View>

              {!!timerType && (
                <View style={[styles.grid, styles.timerParamsGrid]}>
                  {showTimerDuration && (
                    <View style={styles.cellWrap}>
                      <PressTap
                        onPress={() => {
                          haptic.selection();
                          setTimerEditing('duration');
                        }}
                        tapScale={0.95}
                        style={styles.cell}
                      >
                        <Text style={styles.cellLabel}>{TIMER_FIELD_LABEL(timerType, 'duration')}</Text>
                        <CellValue
                          display={formatSecondsCompact(timerParams.duration)}
                          color={timerTypeInfo.color}
                        />
                      </PressTap>
                    </View>
                  )}
                  {showTimerRest && (
                    <View style={styles.cellWrap}>
                      <PressTap
                        onPress={() => {
                          haptic.selection();
                          setTimerEditing('rest');
                        }}
                        tapScale={0.95}
                        style={styles.cell}
                      >
                        <Text style={styles.cellLabel}>REPOS</Text>
                        <CellValue
                          display={formatSecondsCompact(timerParams.rest)}
                          color={timerTypeInfo.color}
                        />
                      </PressTap>
                    </View>
                  )}
                  {showTimerRounds && (
                    <View style={styles.cellWrap}>
                      <PressTap
                        onPress={() => {
                          haptic.selection();
                          setTimerEditing('rounds');
                        }}
                        tapScale={0.95}
                        style={styles.cell}
                      >
                        <Text style={styles.cellLabel}>TOURS</Text>
                        <CellValue display={{ main: String(timerParams.rounds), unit: '' }} color={timerTypeInfo.color} />
                      </PressTap>
                    </View>
                  )}
                </View>
              )}

              <Button
                variant="solid"
                fullWidth
                label="Enregistrer"
                loading={guard.busyKey === 'save'}
                onPress={() =>
                  guard.run(
                    'save',
                    () => {
                      onSave({
                        ...draft,
                        timerConfig: timerType ? { type: timerType, ...timerParams } : null,
                      });
                      close();
                    },
                    haptic.medium
                  )
                }
                style={styles.cta}
              />

              <Button
                variant="ghost"
                size="md"
                label="Retirer cet exercice"
                labelStyle={styles.removeText}
                onPress={() => {
                  haptic.warning();
                  onRemove();
                  close();
                }}
                style={styles.removeLink}
              />
            </View>
          )}

          {/* Pendant une validation (et un instant après), tout appui est
              avalé : le second appui d'un double-clic tomberait sinon sur ce
              que la nouvelle vue affiche à la même place (une case, voire
              « Enregistrer »). */}
          {guard.locked && <TouchShield />}
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 18,
  },
  animBlock: {
    marginBottom: 16,
  },
  animCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  animCaptionLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.32)',
  },
  animLink: {
    fontFamily: fonts.sansSemibold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.70)',
    textDecorationLine: 'underline',
  },
  animNone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  animNoneText: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  animLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  animAdded: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  animAddedText: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    letterSpacing: 1.4,
    color: '#7EE0A5',
  },
  reqDone: {
    alignItems: 'center',
    paddingTop: 6,
  },
  reqCheck: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2ECC71',
    marginBottom: 12,
  },
  reqTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  reqText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.62)',
    textAlign: 'center',
    marginBottom: 4,
  },
  reqError: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 17,
    color: '#FCA5A5',
    textAlign: 'center',
    marginTop: 10,
  },
  reqMailBtn: {
    marginTop: 10,
  },
  animList: {
    marginTop: 12,
    gap: 6,
  },
  animRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  animRowSelected: {
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  animDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  animRowText: {
    flex: 1,
    fontFamily: fonts.sansSemibold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  animEmpty: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.40)',
    textAlign: 'center',
    marginTop: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  // Bouton rond de 32 dp qui n'agrandit pas l'en-tête : marge négative
  // verticale, même principe que le ⋮ des cartes de bloc (PlanningPage).
  renameBtn: {
    marginVertical: -6,
  },
  title: {
    flexShrink: 1,
    fontFamily: fonts.sansBold,
    fontSize: 17,
    color: '#FFFFFF',
  },
  nameInput: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: fonts.sansSemibold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  subtitle: {
    fontFamily: fonts.monoRegular,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.40)',
    marginTop: 3,
  },

  grid: {
    flexDirection: 'row',
    gap: 8,
  },
  cellWrap: {
    flex: 1,
  },
  cell: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  cellLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 6,
  },
  cellLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.40)',
  },
  cellValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  cellValue: {
    fontFamily: fonts.monoBold,
    fontSize: 17,
    color: '#FFFFFF',
  },
  cellUnit: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    marginLeft: 2,
  },

  sectionLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.40)',
    marginTop: 18,
    marginBottom: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  typeCell: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  typeCellText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.55)',
  },
  timerParamsGrid: {
    marginTop: 10,
  },

  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  editLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.55)',
  },

  // Placement seulement : le rendu des boutons vient de Button
  // (lib/buttonTokens.js).
  halfWrap: {
    alignSelf: 'center',
    marginTop: 4,
  },
  halfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  halfText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
  },
  cta: {
    marginTop: 20,
  },
  removeLink: {
    marginTop: 4,
  },
  removeText: {
    color: DANGER,
  },
});
