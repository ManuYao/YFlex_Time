import React from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Voile invisible qui avale les appuis sur tout son parent (position absolue :
 * le parent doit englober ce qu'on veut protéger). À monter seulement le temps
 * d'une validation (useSubmitGuard.locked) : le second appui d'un double-clic
 * ne doit pas tomber sur ce que la nouvelle vue affiche à la même place.
 */
export default function TouchShield() {
  return <View style={StyleSheet.absoluteFill} />;
}
