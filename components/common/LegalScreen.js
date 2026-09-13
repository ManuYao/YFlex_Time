import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import GradientBackground from './GradientBackground';
import { fonts } from '../../lib/fonts';

export default function LegalScreen({ title, updatedAt, sections }) {
  const router = useRouter();

  return (
    <GradientBackground colors={['#1A1A1A', '#0A0A0A', '#000000']} ambient>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
            <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
              <Path
                d="M9 2L3 7l6 5"
                stroke="#FFFFFF"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
          <Text style={styles.topTitle}>{title}</Text>
          <View style={styles.iconBtnGhost} />
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {!!updatedAt && <Text style={styles.updatedAt}>Dernière mise à jour · {updatedAt}</Text>}

          {sections.map((section, i) => (
            <View key={i} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.heading}</Text>
              {section.paragraphs.map((p, j) => (
                <Text key={j} style={styles.paragraph}>{p}</Text>
              ))}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnGhost: { width: 40, height: 40 },
  topTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },

  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  updatedAt: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.40)',
    marginBottom: 20,
  },

  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    letterSpacing: -0.2,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  paragraph: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 8,
  },
});
