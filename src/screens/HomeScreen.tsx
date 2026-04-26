import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
} from 'react-native';
import { colors, shadows } from '../theme/colors';

interface HomeScreenProps {
  onOpenConversation: () => void;
  onOpenProject: () => void;
  onOpenArchive: () => void;
}

export default function HomeScreen({
  onOpenConversation,
  onOpenProject,
  onOpenArchive,
}: HomeScreenProps) {
  // Brand icon floating animation
  const floatAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -4,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [floatAnim]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Brand */}
      <View style={styles.brandArea}>
        <Animated.Text
          style={[styles.brandIcon, { transform: [{ translateY: floatAnim }] }]}>
          🗣️
        </Animated.Text>
        <Text style={styles.brandTitle}>모타라</Text>
        <Text style={styles.brandSub}>CONVERSATION SYSTEM</Text>
      </View>

      {/* 3 Equal Cards */}
      <View style={styles.cards}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={onOpenConversation}>
          <View style={[styles.cardIcon, { backgroundColor: colors.blueLight }]}>
            <Text style={styles.iconEmoji}>🗣️</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>대화</Text>
            <Text style={styles.cardDesc}>자동으로 듣고 번역합니다</Text>
          </View>
          <View style={styles.cardArrow}>
            <Text style={styles.arrowText}>→</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={onOpenProject}>
          <View style={[styles.cardIcon, { backgroundColor: colors.purpleLight }]}>
            <Text style={styles.iconEmoji}>💼</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>프로젝트</Text>
            <Text style={styles.cardDesc}>AI 협업과 구조화된 분석</Text>
          </View>
          <View style={styles.cardArrow}>
            <Text style={styles.arrowText}>→</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={onOpenArchive}>
          <View style={[styles.cardIcon, { backgroundColor: colors.amberLight }]}>
            <Text style={styles.iconEmoji}>📂</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>보관함</Text>
            <Text style={styles.cardDesc}>저장된 기록을 확인합니다</Text>
          </View>
          <View style={styles.cardArrow}>
            <Text style={styles.arrowText}>→</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Footer Badge */}
      <View style={styles.footer}>
        <View style={styles.badge}>
          <View style={styles.dot} />
          <Text style={styles.badgeText}>v2.0 — 100% On-Device AI</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  brandArea: {
    alignItems: 'center',
    marginBottom: 36,
  },
  brandIcon: {
    fontSize: 48,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1.5,
    color: colors.t1,
    marginTop: 2,
  },
  brandSub: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.t3,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  cards: {
    width: '100%',
    gap: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 22,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.md,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 24,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.t1,
  },
  cardDesc: {
    fontSize: 12,
    color: colors.t2,
    marginTop: 2,
  },
  cardArrow: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 13,
    color: colors.t3,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.green,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.t3,
  },
});
