import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  PanResponder,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { colors, shadows } from '../theme/colors';
import { useAppStore, MicState } from '../store/useAppStore';
import Waveform from '../components/Waveform';
import { useAndroidSTT } from '../hooks/useAndroidSTT';
import { useMLKitTranslate } from '../hooks/useMLKitTranslate';

// Demo data
const DEMO_PAIRS = [
  { o: '이 근처에 지하철역이 있나요?', t: 'この近くに地下鉄の駅はありますか？' },
  { o: '얼마예요?', t: 'いくらですか？' },
  { o: '감사합니다, 맛있어요.', t: 'ありがとう、美味しいです。' },
  { o: '화장실은 어디예요?', t: 'トイレはどこですか？' },
  { o: '물 한 잔 주세요.', t: 'お水を一杯ください。' },
];

const DEMO_REPLIES = [
  { o: 'まっすぐ行って左です。', t: '직진해서 왼쪽이에요.' },
  { o: '500円です。', t: '500엔입니다.' },
  { o: 'こちらのメニューです。', t: '여기 메뉴입니다.' },
];

const VAD_LABELS: Record<MicState, string> = {
  idle: '듣고 있어요. 편하게 말하세요',
  listening: '🎙 말하고 있어요...',
  translating: '🔄 번역 중...',
  error: '잘 안 들렸어요. 다시 말씀해 주세요',
};

const VAD_COLORS: Record<MicState, string> = {
  idle: colors.green,
  listening: colors.blue,
  translating: colors.amber,
  error: colors.red,
};

interface ConversationScreenProps {
  onExit: () => void;
}

export default function ConversationScreen({ onExit }: ConversationScreenProps) {
  const {
    connectionMode, micState, setMicState, manualOverride, setManualOverride,
    vadFailureCount, incrementVadFailure, resetVadFailure,
    convMessages, addConvMessage, updateConvMessage, inviteCode, sessionRole, participantCount,
  } = useAppStore();

  // ML Kit 번역 (한→일, 일→한 양방향)
  const { modelsReady: translateReady, translate } = useMLKitTranslate({ sourceLang: 'ko', targetLang: 'ja' });

  const [showExitModal, setShowExitModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showFullscreen, setShowFullscreen] = useState<{ trans: string; orig: string; lang: string } | null>(null);
  const scrollRef = useRef<FlatList>(null);
  const demoIdx = useRef(0);
  const replyIdx = useRef(0);

  // ── Android SpeechRecognizer STT (solo 모드 전용) ────────────────────
  const onSTTResult = useCallback(async (text: string, detectedLang: string) => {
    const msgId = addConvMessage({ orig: text, trans: '🔄 번역 중...', isMe: true });
    setMicState('idle');

    // 감지된 언어 기준으로 번역 방향 결정
    const isJapanese = detectedLang.startsWith('ja');
    const srcLang = isJapanese ? 'ja' : 'ko';
    const tgtLang = isJapanese ? 'ko' : 'ja';

    const result = await translate(text, srcLang, tgtLang);
    if (result.ok) {
      updateConvMessage(msgId, { trans: result.text });
    } else {
      updateConvMessage(msgId, { trans: '(번역 실패)' });
    }

    // 자동 상대방 데모 응답 (Phase 1)
    setTimeout(() => {
      const reply = DEMO_REPLIES[replyIdx.current % DEMO_REPLIES.length];
      replyIdx.current++;
      addConvMessage({ orig: reply.o, trans: reply.t, isMe: false });
    }, 800);
  }, [addConvMessage, updateConvMessage, setMicState, translate]);

  const { isReady: sttReady, isListening: sttListening, startListening, stopListening } = useAndroidSTT({
    onResult: onSTTResult,
    onError: useCallback((msg: string) => {
      setMicState('error');
      setTimeout(() => setMicState('idle'), 2000);
    }, [setMicState]),
    onSpeechEnd: useCallback(() => {
      setMicState('translating');
    }, [setMicState]),
  });

  const modeLabels: Record<string, string> = {
    solo: '👤 혼자 대화',
    ear: '🎧 조용한 대화',
    speaker: '🔊 함께 대화',
  };

  const getDefaultName = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())} 대화`;
  };

  const handleShowExit = () => {
    setSaveName(getDefaultName());
    setShowExitModal(true);
  };

  const handleSave = () => {
    const { addSavedRecord } = useAppStore.getState();
    addSavedRecord({
      type: 'conv',
      title: saveName || getDefaultName(),
      time: new Date().toLocaleString('ko-KR'),
      messages: convMessages.map((m) => ({
        who: m.isMe ? '🇰🇷 나' : '🇯🇵 상대방',
        orig: m.orig,
        trans: m.trans,
      })),
    });
    setShowExitModal(false);
    onExit();
  };

  // Simulate demo conversation
  const simulateDemo = useCallback(() => {
    const pair = DEMO_PAIRS[demoIdx.current % DEMO_PAIRS.length];
    demoIdx.current++;
    setMicState('listening');

    setTimeout(() => {
      setMicState('translating');
      setTimeout(() => {
        addConvMessage({ orig: pair.o, trans: pair.t, isMe: true });
        setMicState('idle');
        resetVadFailure();

        setTimeout(() => {
          const reply = DEMO_REPLIES[replyIdx.current % DEMO_REPLIES.length];
          replyIdx.current++;
          addConvMessage({ orig: reply.o, trans: reply.t, isMe: false });
        }, 600);
      }, 800);
    }, 1200);
  }, [addConvMessage, setMicState, resetVadFailure]);

  // Solo PTT 핸들러 — Android SpeechRecognizer
  const handleSoloDown = useCallback(async () => {
    setMicState('listening');
    await startListening('auto');
  }, [startListening, setMicState]);

  const handleSoloUp = useCallback(async () => {
    await stopListening();
  }, [stopListening]);

  // PanResponder: TouchableOpacity는 re-render 시 touch 추적을 잃어버림
  // PanResponder는 native 레벨에서 동작 → re-render 영향 없음
  const soloDownRef = useRef(handleSoloDown);
  const soloUpRef = useRef(handleSoloUp);
  useEffect(() => { soloDownRef.current = handleSoloDown; }, [handleSoloDown]);
  useEffect(() => { soloUpRef.current = handleSoloUp; }, [handleSoloUp]);

  const micStateRef = useRef(micState);
  useEffect(() => { micStateRef.current = micState; }, [micState]);

  const pttPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => micStateRef.current !== 'translating',
      onPanResponderGrant: () => { soloDownRef.current(); },
      onPanResponderRelease: () => { soloUpRef.current(); },
      onPanResponderTerminate: () => { soloUpRef.current(); },
    })
  ).current;

  // Fallback button handlers
  const handleFbDown = () => {
    setMicState('listening');
  };

  const handleFbUp = () => {
    setMicState('translating');
    setTimeout(() => {
      simulateDemo();
    }, 500);
  };

  // Exit manual mode
  const handleExitManual = () => {
    setManualOverride(false);
    resetVadFailure();
    setMicState('idle');
  };

  // Simulate error (double tap waveform)
  const wfTapCount = useRef(0);
  const wfTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleWaveformTap = () => {
    wfTapCount.current++;
    if (wfTapTimer.current) clearTimeout(wfTapTimer.current);
    wfTapTimer.current = setTimeout(() => { wfTapCount.current = 0; }, 400);

    if (wfTapCount.current >= 2) {
      wfTapCount.current = 0;
      incrementVadFailure();
      setMicState('error');

      const newCount = useAppStore.getState().vadFailureCount;
      if (newCount >= 2 && connectionMode === 'solo') {
        setManualOverride(true);
      } else {
        setTimeout(() => setMicState('idle'), 1500);
      }
    }
  };

  const isSolo = connectionMode === 'solo';
  const showSoloAssist = !isSolo && false; // unused — solo now uses PTT-primary layout
  const showFallback = manualOverride && !isSolo;

  const renderMessage = ({ item }: { item: typeof convMessages[0] }) => (
    <View style={[styles.msg, item.isMe ? styles.msgMe : styles.msgOther]}>
      <View style={[styles.msgCard, !item.isMe && styles.msgCardOther]}>
        <Text style={[styles.msgWho, { color: item.isMe ? colors.green : colors.blue }]}>
          {item.isMe ? '🇰🇷 나' : '🇯🇵 상대방'}
        </Text>
        <Text style={[styles.msgOrig, !item.isMe && { textAlign: 'right' }]}>{item.orig}</Text>
        <Text style={[styles.msgTrans, !item.isMe && { textAlign: 'right' }]}>{item.trans}</Text>
        <View style={[styles.msgActs, !item.isMe && { justifyContent: 'flex-end' }]}>
          <TouchableOpacity
            style={styles.msgBtn}
            onPress={() => { /* TTS placeholder */ }}>
            <Text style={styles.msgBtnText}>🔊 재생</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.msgBtn}
            onPress={() => setShowFullscreen({ trans: item.trans, orig: item.orig, lang: item.isMe ? '🇰🇷→🇯🇵' : '🇯🇵→🇰🇷' })}>
            <Text style={styles.msgBtnText}>🔍 크게 보기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={handleShowExit}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.modeBadge}>
          <Text style={styles.modeText}>{modeLabels[connectionMode || 'solo'] || '🗣️ 대화'}</Text>
        </View>
        <TouchableOpacity style={styles.endBtn} onPress={handleShowExit}>
          <Text style={styles.endText}>종료</Text>
        </TouchableOpacity>
      </View>

      {/* Connection Info */}
      <View style={styles.infoBar}>
        <View style={styles.greenDot} />
        <Text style={styles.infoText}>연결됨</Text>
        <View style={styles.langTag}><Text style={styles.langText}>🇰🇷 한국어</Text></View>
        <Text style={styles.infoText}>↔</Text>
        <View style={styles.langTag}><Text style={styles.langText}>🇯🇵 일본어</Text></View>
        {inviteCode && (
          <View style={styles.sessionTag}>
            <Text style={styles.sessionText}>방 {inviteCode} | {sessionRole === 'host' ? 'Host' : '참여'} | {participantCount}명</Text>
          </View>
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={scrollRef}
        data={convMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.msgList}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        ListHeaderComponent={
          <View style={styles.sysMsg}>
            <Text style={styles.sysMsgText}>듣고 있어요. 편하게 말하세요</Text>
          </View>
        }
      />

      {/* VAD Area */}
      {isSolo ? (
        /* Solo mode: PTT-primary layout, 실제 Whisper STT */
        <View style={styles.vadArea}>
          <Text style={[styles.vadLabel, { color: VAD_COLORS[micState] }]}>
            {!sttReady
              ? '음성 인식 엔진 초기화 중...'
              : micState === 'idle' || micState === 'error'
              ? '버튼을 누르고 있는 동안 말하세요'
              : VAD_LABELS[micState]}
          </Text>

          {(micState === 'listening' || micState === 'translating') && (
            <Waveform micState={micState} />
          )}

          {!sttReady ? (
            <View style={styles.pttLoading}>
              <ActivityIndicator size="small" color={colors.blue} />
              <Text style={styles.pttLoadingText}>모델 로드 중...</Text>
            </View>
          ) : (
            <View
              style={[
                styles.pttBtn,
                micState === 'listening' && styles.pttBtnActive,
                micState === 'translating' && styles.pttBtnDisabled,
              ]}
              {...pttPanResponder.panHandlers}>
              <Text style={styles.pttBtnText}>
                {micState === 'listening'
                  ? '🎙 말하는 중...'
                  : micState === 'translating'
                  ? '🔄 인식 중...'
                  : '🎤 누르고 있는 동안 말하기'}
              </Text>
            </View>
          )}
        </View>
      ) : (
        /* Non-solo mode: VAD auto-detection layout */
        <View style={styles.vadArea}>
          <Text style={[styles.vadLabel, { color: VAD_COLORS[micState] }]}>
            {VAD_LABELS[micState]}
          </Text>

          <TouchableOpacity activeOpacity={1} onPress={handleWaveformTap}>
            <Waveform micState={micState} />
          </TouchableOpacity>

          {"manualOverride && (
            <Text style={styles.vadHint}>
              {micState === 'idle' ? '자동으로 음성을 인식합니다' : ''}
            </Text>
          )}

          {/* Fallback (after 2 VAD failures) */}
          {showFallback && (
            <View style={styles.fallback}>
              <TouchableOpacity
                style={styles.fbMic}
                activeOpacity={0.85}
                onPressIn={handleFbDown}
                onPressOut={handleFbUp}>
                <Text style={styles.fbMicText}>🎤 눌러서 말하기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.fbAuto} onPress={handleExitManual}>
                <Text style={styles.fbAutoText}>🔄 자동 모드로 돌아가기</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Fullscreen Modal */}
      {showFullscreen && (
        <Modal visible transparent animationType="fade" statusBarTranslucent>
          <View style={styles.fsOverlay}>
            <View style={styles.fsTop}>
              <TouchableOpacity style={styles.fsClose} onPress={() => setShowFullscreen(null)}>
                <Text style={styles.fsCloseText}>✕ 닫기</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.fsBody}>
              <Text style={styles.fsLang}>{showFullscreen.lang}</Text>
              <Text style={styles.fsText}>{showFullscreen.trans}</Text>
              <Text style={styles.fsOrig}>{showFullscreen.orig}</Text>
              <TouchableOpacity style={styles.fsSpeak}>
                <Text style={styles.fsSpeakText}>🔊 다시 읽기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Exit Modal */}
      <Modal visible={showExitModal} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>대화를 종료할까요?</Text>
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
              <Text style={styles.btnCancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  // Top Bar
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 18, color: colors.t1 },
  modeBadge: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.elevated },
  modeText: { fontSize: 12, fontWeight: '700', color: colors.t2 },
  endBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(220,38,38,0.2)', backgroundColor: colors.redLight },
  endText: { fontSize: 12, fontWeight: '700', color: colors.red },
  // Info Bar
  infoBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, flexWrap: 'wrap' },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  infoText: { fontSize: 11, fontWeight: '600', color: colors.t2 },
  langTag: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6, backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border },
  langText: { fontSize: 10, fontWeight: '700', color: colors.t2 },
  sessionTag: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6, backgroundColor: colors.blueLight, borderWidth: 1, borderColor: colors.blueBorder },
  sessionText: { fontSize: 10, fontWeight: '700', color: colors.blue },
  // Messages
  msgList: { padding: 14, gap: 14 },
  msg: { maxWidth: '92%' },
  msgMe: { alignSelf: 'flex-start' },
  msgOther: { alignSelf: 'flex-end' },
  msgCard: { borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...shadows.sm },
  msgCardOther: { backgroundColor: colors.blueLight, borderColor: colors.blueBorder },
  msgWho: { fontSize: 12, fontWeight: '700', marginBottom: 5 },
  msgOrig: { fontSize: 13, color: colors.t3, lineHeight: 19.5, fontStyle: 'italic', marginBottom: 6 },
  msgTrans: { fontSize: 30, fontWeight: '800', color: colors.t1, lineHeight: 36 },
  msgActs: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  msgBtn: { minHeight: 48, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  msgBtnText: { fontSize: 14, fontWeight: '600', color: colors.t2 },
  sysMsg: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 16, backgroundColor: colors.elevated, borderRadius: 12, marginBottom: 8 },
  sysMsgText: { fontSize: 13, fontWeight: '600', color: colors.t3, textAlign: 'center' },
  // VAD Area
  vadArea: { paddingVertical: 10, paddingHorizontal: 16, paddingBottom: 24, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  vadLabel: { textAlign: 'center', fontSize: 14, fontWeight: '600', minHeight: 22, marginBottom: 8 },
  vadHint: { textAlign: 'center', fontSize: 11, color: colors.t4, minHeight: 16 },
  soloBtn: { marginTop: 4, minHeight: 48, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  soloBtnText: { fontSize: 14, fontWeight: '600', color: colors.t2 },
  pttBtn: { marginTop: 10, minHeight: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue },
  pttBtnActive: { backgroundColor: '#1d4ed8' },
  pttBtnDisabled: { backgroundColor: colors.amber, opacity: 0.8 },
  pttBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  pttLoading: { marginTop: 10, minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  pttLoadingText: { fontSize: 14, fontWeight: '600', color: colors.t3 },
  fallback: { marginTop: 4, gap: 10 },
  fbMic: { minHeight: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue },
  fbMicText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  fbAuto: { minHeight: 48, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  fbAutoText: { fontSize: 14, fontWeight: '600', color: colors.t2 },
  // Fullscreen
  fsOverlay: { flex: 1, backgroundColor: '#111827' },
  fsTop: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 60, paddingHorizontal: 20 },
  fsClose: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.06)' },
  fsCloseText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  fsBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  fsLang: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.4)', marginBottom: 12 },
  fsText: { fontSize: 48, fontWeight: '900', color: '#fff', textAlign: 'center', lineHeight: 55 },
  fsOrig: { fontSize: 16, color: 'rgba(255,255,255,0.35)', marginTop: 16, fontStyle: 'italic', textAlign: 'center' },
  fsSpeak: { marginTop: 28, minHeight: 56, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.06)' },
  fsSpeakText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Modals
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
