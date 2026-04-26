import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { colors, shadows } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';

interface ProjectScreenProps {
  onExit: () => void;
}

export default function ProjectScreen({ onExit }: ProjectScreenProps) {
  const { inviteCode, sessionRole, participantCount, projectTab, setProjectTab } = useAppStore();
  const [showExitModal, setShowExitModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [aiBadge, setAiBadge] = useState(false);
  const [todoStates, setTodoStates] = useState([true, false, false]);
  const chatScrollRef = useRef<ScrollView>(null);

  const [chatMessages, setChatMessages] = useState([
    { who: '🇰🇷 김민수', whoType: 'kr' as const, text: '"딥러닝 모델 설계는 어떻게 할까?"' },
    { who: '🇺🇸 John', whoType: 'en' as const, text: '"Not sure. @motara, recommend CNN for NPU."' },
    { who: '🪄 Motara AI', whoType: 'ai' as const, text: '"분석을 시작했습니다. AI 보드에서 확인하세요."' },
  ]);

  const getDefaultName = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())} 프로젝트`;
  };

  const handleShowExit = () => {
    setSaveName(getDefaultName());
    setShowExitModal(true);
  };

  const handleSave = () => {
    const { addSavedRecord } = useAppStore.getState();
    addSavedRecord({
      type: 'proj',
      title: saveName || getDefaultName(),
      time: new Date().toLocaleString('ko-KR'),
      messages: [],
    });
    setShowExitModal(false);
    onExit();
  };

  const handleChatSend = () => {
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatMessages((prev) => [...prev, { who: '🇰🇷 나', whoType: 'kr' as const, text }]);
    setChatInput('');

    if (text.includes('@motara') || text.includes('/ai')) {
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          { who: '🪄 Motara AI', whoType: 'ai' as const, text: '"분석을 진행 중입니다. AI 보드에서 확인하세요."' },
        ]);
        setAiBadge(true);
      }, 500);
    }
  };

  const toggleTodo = (idx: number) => {
    setTodoStates((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  };

  const whoColors = { kr: colors.green, en: colors.blue, ai: colors.amber };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={handleShowExit}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>💼 프로젝트</Text>
        <TouchableOpacity style={styles.endBtn} onPress={handleShowExit}>
          <Text style={styles.endText}>종료</Text>
        </TouchableOpacity>
      </View>

      {/* Session Info */}
      <View style={styles.sessionBar}>
        <View style={styles.greenDot} />
        <Text style={styles.sessionText}>연결됨</Text>
        <View style={styles.codeTag}><Text style={styles.codeTagText}>방 {inviteCode || '—'}</Text></View>
        <View style={styles.roleTag}><Text style={styles.roleTagText}>{sessionRole === 'host' ? 'Host' : '참여자'}</Text></View>
        <View style={styles.cntTag}><Text style={styles.cntTagText}>{participantCount}명</Text></View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, projectTab === 'chat' && styles.tabOn]}
          onPress={() => setProjectTab('chat')}>
          <Text style={[styles.tabText, projectTab === 'chat' && styles.tabTextOn]}>💬 대화방</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, projectTab === 'ai' && styles.tabOn]}
          onPress={() => { setProjectTab('ai'); setAiBadge(false); }}>
          <Text style={[styles.tabText, projectTab === 'ai' && styles.tabTextOn]}>🤖 AI 보드</Text>
          {aiBadge && <View style={styles.badge} />}
        </TouchableOpacity>
      </View>

      {/* Chat Tab */}
      {projectTab === 'chat' && (
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={chatScrollRef}
            style={styles.chatArea}
            contentContainerStyle={{ padding: 14, gap: 10 }}
            onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}>
            <View style={styles.alertInfo}>
              <Text style={styles.alertText}>🔒 종단간 암호화 세션이 시작되었습니다</Text>
            </View>
            {chatMessages.map((msg, i) => (
              <View
                key={i}
                style={[
                  styles.pm,
                  msg.whoType === 'en' && styles.pmR,
                  msg.whoType === 'ai' && styles.pmAi,
                ]}>
                <Text style={[styles.pmWho, { color: whoColors[msg.whoType] }]}>
                  {msg.who}
                </Text>
                <Text style={[styles.pmText, msg.whoType === 'en' && { textAlign: 'right' }]}>
                  {msg.text}
                </Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.chatFoot}>
            <View style={styles.chips}>
              <TouchableOpacity style={styles.chip} onPress={() => setChatInput('@motara ')}>
                <Text style={styles.chipText}>@motara</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.chip} onPress={() => setChatInput('/ai ')}>
                <Text style={styles.chipText}>/ ai 요약</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.chatInput}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="메시지 입력..."
                placeholderTextColor={colors.t4}
                onSubmitEditing={handleChatSend}
              />
              <TouchableOpacity style={styles.sendBtn} onPress={handleChatSend}>
                <Text style={styles.sendText}>🚀</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* AI Board Tab */}
      {projectTab === 'ai' && (
        <View style={{ flex: 1 }}>
          <ScrollView style={styles.aiArea} contentContainerStyle={{ padding: 14 }}>
            <View style={styles.alertWarn}>
              <Text style={styles.alertWarnText}>🪄 AI가 새로운 분석 결과를 생성했습니다</Text>
            </View>
            <View style={styles.aiCard}>
              <View style={styles.aiHead}>
                <Text style={styles.aiTitle}>🪄 NPU 모델 분석</Text>
                <View style={styles.aiBadgeTag}><Text style={styles.aiBadgeText}>Llama 3.2 1B</Text></View>
              </View>
              <View style={styles.aiSummary}>
                <Text style={styles.aiSumText}>
                  현재 NPU의 <Text style={{ fontWeight: '700' }}>INT4 양자화</Text> 조건에서 실시간 추론이 가능한 경량 CNN을 분석했습니다.
                </Text>
              </View>
              {/* Key Points */}
              <Text style={styles.secTitle}>📌 핵심 포인트</Text>
              {[
                { n: '1', c: colors.blue, t: 'MobileNetV3-Small — 8ms 지연, 2.1MB로 NPU 실시간 추론 최적' },
                { n: '2', c: colors.amber, t: 'QAT 적용 필수 — PTQ 대비 3~5% 정확도 향상' },
                { n: '3', c: colors.purple, t: 'CoreML / QNN SDK로 ANE·Hexagon 네이티브 가속' },
              ].map((kp, i) => (
                <View key={i} style={styles.kpItem}>
                  <View style={[styles.kpNum, { backgroundColor: kp.c }]}>
                    <Text style={styles.kpNumText}>{kp.n}</Text>
                  </View>
                  <Text style={styles.kpText}>{kp.t}</Text>
                </View>
              ))}

              {/* Todo */}
              <Text style={[styles.secTitle, { marginTop: 14 }]}>☑️ TODO</Text>
              {[
                { t: 'MobileNetV3 벤치마크 테스트', who: '김민수' },
                { t: 'QAT 학습 파이프라인 구성', who: 'john' },
                { t: 'CoreML 변환 및 NPU 배포', who: '田中' },
              ].map((todo, i) => (
                <TouchableOpacity key={i} style={styles.todoItem} onPress={() => toggleTodo(i)}>
                  <View style={[styles.todoCk, todoStates[i] && styles.todoCkDone]}>
                    <Text style={[styles.todoCkText, todoStates[i] && { color: '#fff' }]}>✓</Text>
                  </View>
                  <Text style={[styles.todoText, todoStates[i] && styles.todoTextDone]}>{todo.t}</Text>
                  <View style={styles.todoWho}><Text style={styles.todoWhoText}>{todo.who}</Text></View>
                </TouchableOpacity>
              ))}

              <TouchableOpacity style={styles.saveAicBtn}>
                <Text style={styles.saveAicText}>💾 결과 저장하기</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          <View style={styles.aiFoot}>
            <View style={styles.aiHint}>
              <View style={[styles.greenDot, { backgroundColor: colors.amber, width: 5, height: 5 }]} />
              <Text style={styles.aiHintText}>AI에게 추가 명령</Text>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.chatInput, { borderColor: colors.border }]}
                value={aiInput}
                onChangeText={setAiInput}
                placeholder="예: 표로 정리해줘..."
                placeholderTextColor={colors.t4}
              />
              <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.amber }]}>
                <Text style={styles.sendText}>🪄</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Exit Modal */}
      <Modal visible={showExitModal} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>프로젝트 종료</Text>
            <Text style={styles.modalDesc}>저장 이름을 확인하고 종료하세요.</Text>
            <TextInput
              style={styles.saveInput}
              value={saveName}
              onChangeText={setSaveName}
              placeholder="저장 이름"
              placeholderTextColor={colors.t4}
            />
            <TouchableOpacity style={styles.btnPrimary} onPress={handleSave}>
              <Text style={styles.btnPrimaryText}>💾 저장하고 나가기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnDanger}
              onPress={() => { setShowExitModal(false); onExit(); }}>
              <Text style={styles.btnDangerText}>저장 없이 나가기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnCancel} onPress={() => setShowExitModal(false)}>
              <Text style={styles.btnCancelText}>취셬</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 18, color: colors.t1 },
  title: { fontSize: 15, fontWeight: '800', color: colors.t1 },
  endBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(220,38,38,0.2)', backgroundColor: colors.redLight },
  endText: { fontSize: 12, fontWeight: '700', color: colors.red },
  // Session info
  sessionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, flexWrap: 'wrap' },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  sessionText: { fontSize: 11, fontWeight: '600', color: colors.t2 },
  codeTag: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6, backgroundColor: colors.amberLight, borderWidth: 1, borderColor: colors.amberBorder },
  codeTagText: { fontSize: 10, fontWeight: '700', color: colors.amber },
  roleTag: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6, backgroundColor: colors.blueLight, borderWidth: 1, borderColor: colors.blueBorder },
  roleTagText: { fontSize: 10, fontWeight: '700', color: colors.blue },
  cntTag: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6, backgroundColor: colors.greenLight, borderWidth: 1, borderColor: colors.greenBorder },
  cntTagText: { fontSize: 10, fontWeight: '700', color: colors.green },
  // Tabs
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1.5, borderBottomColor: colors.border, paddingHorizontal: 16 },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 2.5, borderBottomColor: 'transparent', flexDirection: 'row', justifyContent: 'center', gap: 5 },
  tabOn: { borderBottomColor: colors.blue },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.t3 },
  tabTextOn: { color: colors.blue },
  badge: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.amber },
  // Chat
  chatArea: { flex: 1 },
  alertInfo: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, backgroundColor: colors.blueLight, borderWidth: 1, borderColor: colors.blueBorder },
  alertText: { fontSize: 13, fontWeight: '600', color: colors.blue },
  pm: { maxWidth: '86%', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...shadows.sm },
  pmR: { alignSelf: 'flex-end', backgroundColor: colors.blueLight, borderColor: colors.blueBorder },
  pmAi: { backgroundColor: colors.amberLight, borderColor: colors.amberBorder, maxWidth: '92%' },
  pmWho: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  pmText: { fontSize: 14, fontWeight: '500', lineHeight: 22, color: colors.t1 },
  chatFoot: { paddingVertical: 10, paddingHorizontal: 16, paddingBottom: 20, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  chips: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  chip: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.elevated },
  chipText: { fontSize: 11, fontWeight: '700', color: colors.t2 },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  chatInput: { flex: 1, padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.elevated, color: colors.t1, fontSize: 14, fontWeight: '500' },
  sendBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  sendText: { fontSize: 18 },
  // AI Board
  aiArea: { flex: 1 },
  alertWarn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, backgroundColor: colors.amberLight, borderWidth: 1, borderColor: colors.amberBorder, marginBottom: 12 },
  alertWarnText: { fontSize: 13, fontWeight: '600', color: '#92400E' },
  aiCard: { borderRadius: 20, borderWidth: 1.5, borderColor: colors.amberBorder, backgroundColor: colors.surface, padding: 20, ...shadows.md },
  aiHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  aiTitle: { fontSize: 17, fontWeight: '800', color: colors.t1 },
  aiBadgeTag: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, backgroundColor: colors.amberLight, borderWidth: 1, borderColor: colors.amberBorder },
  aiBadgeText: { fontSize: 9, fontWeight: '700', color: colors.amber },
  aiSummary: { backgroundColor: colors.elevated, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 14 },
  aiSumText: { fontSize: 13, color: colors.t2, lineHeight: 22 },
  secTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, color: colors.t3, marginBottom: 8 },
  kpItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8, padding: 12, backgroundColor: colors.elevated, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  kpNum: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  kpNumText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  kpText: { fontSize: 12, color: colors.t2, lineHeight: 18, flex: 1 },
  todoItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: colors.elevated, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 6 },
  todoCk: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: colors.border2, alignItems: 'center', justifyContent: 'center' },
  todoCkDone: { backgroundColor: colors.green, borderColor: colors.green },
  todoCkText: { fontSize: 12, color: 'transparent' },
  todoText: { fontSize: 13, color: colors.t1, flex: 1 },
  todoTextDone: { textDecorationLine: 'line-through', color: colors.t4 },
  todoWho: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, backgroundColor: colors.blueLight },
  todoWhoText: { fontSize: 10, fontWeight: '700', color: colors.blue },
  saveAicBtn: { minHeight: 48, borderRadius: 14, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveAicText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  aiFoot: { paddingVertical: 12, paddingHorizontal: 16, paddingBottom: 20, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  aiHint: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  aiHintText: { fontSize: 11, fontWeight: '600', color: colors.amber },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 28, backgroundColor: colors.surface, ...shadows.lg },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.t1, textAlign: 'center', marginBottom: 4 },
  modalDesc: { fontSize: 13, color: colors.t2, textAlign: 'center', marginBottom: 16 },
  saveInput: { width: '100%', padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.elevated, fontSize: 15, fontWeight: '600', color: colors.t1, textAlign: 'center', marginBottom: 16 },
  btnPrimary: { minHeight: 48, borderRadius: 14, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  btnPrimaryText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  btnDanger: { minHeight: 48, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(220,38,38,0.2)', backgroundColor: colors.redLight, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  btnDangerText: { fontSize: 15, fontWeight: '600', color: colors.red },
  btnCancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  btnCancelText: { fontSize: 13, fontWeight: '600', color: colors.t3 },
});
