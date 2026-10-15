import React, { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';

import ConfirmSheet from './ConfirmSheet';
import { FREE_CREATIONS, FREE_DOWNLOADS, onLibraryLimit } from '../../lib/libraryLimits';

// Feuille « bibliothèque pleine », montée une seule fois à la racine : le refus
// est décidé dans lib/mixes.js (aucun écran en main), elle s'ouvre par-dessus
// celui d'où la personne a tenté d'enregistrer. On ne supprime jamais rien à sa
// place : la sortie gratuite est d'en retirer un soi-même.
const TEXTS = {
  creation: {
    title: 'Tu as déjà tes 3 mix',
    body: `En gratuit, tu gardes ${FREE_CREATIONS} mix créés par toi. Supprime-en un dans « Mes mix » pour en enregistrer un nouveau, ou passe en Premium pour en garder autant que tu veux.`,
  },
  download: {
    title: 'Tu as déjà tes 5 mix',
    body: `En gratuit, tu gardes ${FREE_DOWNLOADS} mix pris chez les autres. Supprime-en un dans « Mes mix » pour en récupérer un nouveau, ou passe en Premium pour tous les garder.`,
  },
};

export default function LibraryLimitGate() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const [kind, setKind] = useState(null);

  useEffect(() => onLibraryLimit(setKind), []);

  if (!kind) return null;
  const t = TEXTS[kind] || TEXTS.creation;
  return (
    <ConfirmSheet
      screenH={height}
      title={t.title}
      body={t.body}
      confirmLabel="Voir Premium"
      cancelLabel="Fermer"
      destructive={false}
      onConfirm={() => router.push('/premium')}
      onClose={() => setKind(null)}
    />
  );
}
