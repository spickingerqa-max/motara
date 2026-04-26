import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import { colors, shadows } from '../theme/colors';
import { useAppStore, SavedRecord } from '../store/useAppStore';

const BUBBLE_PALETTE = [
  { bg: colors.blueLight,   border: colors.blueBorder,   label: colors.blue   },
  { bg: colors.greenLight,  border: colors.greenBorder,  label: colors.green  },
  { bg: colors.purpleLight, border: '#C4B5FD',           label: colors.purple },
  { bg: colors.amberLight,  border: colors.amberBorder,  label: colors.amber  },
] as const;

interface ArchiveScreenProps {
  onBack: () => void;
}

export default function ArchiveScreen({ onBack }: ArchiveScreenProps) {
  const { savedRecords, archiveTab, setArchiveTab } = useAppStore();
  const [detail, setDetail] = useState<SavedRecord | null>(null);

  const filteredRecords = savedRecords
    .filter((r) => r.type === archiveTab)
    .sort((a, b) => b.ts - a.ts);

  const icon = archiveTab === 'conv' ? '🗣️' : '💼';

  // Demo data for detail view
  const getDemoMessages = (type: 'conv' | 'proj') => {
    if (type === 'conv') {
      return [
        { who: '🇰🇷 나', orig: '이 근처에 지하철역이 있나요?', trans: 'この近くに地下鉄の駅はありますか？' },
        { who: '🇯🇵 상대방', orig: 'まっすぐ行って左です。', trans: '직진해서 왼쪽이에요.' },
      ];
    }
    return [
      { who: '🪄 Motara AI', orig: 'NPU 모델 분석 결과', trans: 'MobileNetV3-Small — 8ms, 2.1MB' },
    ];
  };

  const detailMessages = useMemo(() => {
    if (!detail) return [];
    const msgs = detail.messages.length > 0 ? detail.messages : getDemoMessages(detail.type);
    const whoOrder = new Map<string, number>();
    msgs.forEach(m => { if (!whoOrder.has(m.who)) whoOrder.set(m.who, whoOrder.size); });
    return msgs.map(m => ({
      ...m,
      colorIdx: (whoOrder.get(m.who) ?? 0) % BUBBLE_PALETTE.length,
      isMe: m.who.includes('나'),
    }));
  }, [detail]);

  return (
    <View style={styles.container}>
      {/* Top */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📂 보관함</Text>
        <View style={{ width: 42 }} />
      </View>

      {/* Sub Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, archiveTab === 'conv' && styles.tabOn]}
          onPress={() => setArchiveTab('conv')}>
          <Text style={[styles.tabText, archiveTab === 'conv' && styles.tabTextOn]}>🗣️ 대화 기록</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, archiveTab === 'proj' && styles.tabOn]}
          onPress={() => setArchiveTab('proj')}>
          <Text style={[styles.tabText, archiveTab === 'proj' && styles.tabTextOn]}>💼 프로젝트 기록</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView style={styles.body} contentContainerStyle={{ padding: 16 }}>
        {filteredRecords.length === 0 ? (
          <Text style={styles.empty}>아직 저장된 기록이 없어요</Text>
        ) : (
          filteredRecords.map((record, i) => (
            <TouchableOpacity
              key={i}
              style={styles.item}
              activeOpacity={0.85}
              onPress={() => setDetail(record)}>
              <View style={[styles.itemIcon, archiveTab === 'conv' ? styles.iconConv : styles.iconProj]}>
                <Text style={{ fontSize: 20 }}>{icon}</Text>
              </View>
              <View style={styles.itemBody}>
                <Text style={styles.itemTitle}>{record.title}</Text>
                <Text style={styles.itemTime}>{record.time}</Text>
              </View>
              <Text style={styles.itemArrow}>→</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={!!detail} transparent={false} animationType="slide" statusBarTranslucent>
        {detail && (
          <View style={styles.detailContainer}>
            <View style={styles.detailTop}>
              <Text style={styles.detailTitle} numberOfLines={1}>{detail.title}</Text>
              <TouchableOpacity style={styles.detailClose} onPress={() => setDetail(null)}>
                <Text style={styles.detailCloseText}>닫기</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.detailMeta}>
              <Text style={styles.metaText}>
                {detail.type === 'conv' ? '🗣️ 대화' : '💼 프로젝트'}
              </Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>{detail.time}</Text>
            </View>
            <ScrollView style={styles.detailBody} contentContainerStyle={{ padding: 16, gap: 10 }}>
              {detailMessages.map((m, i) => {
                const pal = BUBBLE_PALETTE[m.colorIdx];
                return (
                  <View
                    key={i}
                    style={[
                      styles.bubble,
                      {
                        alignSelf: m.isMe ? 'flex-start' : 'flex-end',
                        backgroundColor: pal.bg,
                        borderColor: pal.border,
                      },
                    ]}>
                    <Text style={[styles.dsWho, { color: pal.label, textAlign: m.isMe ? 'left' : 'right' }]}>
                      {m.who}
                    </Text>
                    <Text style={[styles.dsOrig, m.isMe ? null : { textAlign: 'right' }]}>{m.orig}</Text>
                    <Text style={[styles.dsTrans, m.isMe ? null : { textAlign: 'right' }]}>{m.trans}</Text>
                  </View>
                );
              })}
              {detail.messages.length === 0 && (
                <Text style={styles.dsNote}>저장된 {detail.type === 'conv' ? '대화' : '프로젝트'} 미리보기</Text>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 18, color: colors.t1 },
  title: { fontSize: 17, fontWeight: '800', color: colors.t1, flex: 1 },
  // Tabs
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1.5, borderBottomColor: colors.border, paddingHorizontal: 16 },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 2.5, borderBottomColor: 'transparent', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabOn: { borderBottomColor: colors.blue },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.t3 },
  tabTextOn: { color: colors.t1 },
  // Body
  body: { flex: 1 },
  empty: { paddingVertical: 40, textAlign: 'center', fontSize: 14, color: colors.t4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  itemIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconConv: { backgroundColor: colors.blueLight },
  iconProj: { backgroundColor: colors.purpleLight },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '600', color: colors.t1 },
  itemTime: { fontSize: 11, color: colors.t3, marginTop: 1 },
  itemArrow: { fontSize: 12, color: colors.t4 },
  // Detail
  detailContainer: { flex: 1, backgroundColor: colors.bg },
  detailTop: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailTitle: { fontSize: 16, fontWeight: '800', color: colors.t1, flex: 1 },
  detailClose: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.elevated },
  detailCloseText: { fontSize: 13, fontWeight: '600', color: colors.t2 },
  detailMeta: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  metaText: { fontSize: 12, fontWeight: '600', color: colors.t3 },
  metaDot: { fontSize: 12, color: colors.t3 },
  detailBody: { flex: 1 },
  bubble: { maxWidth: '80%', padding: 16, borderRadius: 18, borderWidth: 1.5 },
  dsWho: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  dsOrig: { fontSize: 14, color: colors.t2, lineHeight: 21, fontStyle: 'italic' },
  dsTrans: { fontSize: 22, fontWeight: '800', color: colors.t1, lineHeight: 28.6, marginTop: 6 },
  dsNote: { textAlign: 'center', paddingVertical: 24, fontSize: 13, color: colors.t4 },
});
