import React, { useState, useEffect } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View, Text, TouchableOpacity, Clipboard, Alert, PermissionsAndroid } from 'react-native';
import HomeScreen from './screens/HomeScreen';
import ConversationScreen from './screens/ConversationScreen';
import ProjectScreen from './screens/ProjectScreen';
import ArchiveScreen from './screens/ArchiveScreen';
import BottomSheet, { SituationButton, InviteButton } from './components/BottomSheet';
import CodeInput from './components/CodeInput';
import { useAppStore, ConnectionMode } from './store/useAppStore';
import { colors } from './theme/colors';

type Screen = 'home' | 'conv' | 'project' | 'archive';
type SheetStep = 'situation' | 'invite' | 'code' | 'join' | null;
type ProjStep = 'pick' | 'code' | 'join' | null;

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const store = useAppStore();
  useEffect(() => {
    PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO).then(granted => {
      if (!granted) {
        PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, { title: '마이크 권한 필요', message: '음성 인식을 위해 마이크 접근 권한이 필요합니다.', buttonPositive: '허용' });
      }
    });
  }, []);
  const [convSheet, setConvSheet] = useState(false);
  const [convStep, setConvStep] = useState<SheetStep>(null);
  const [pendingMode, setPendingMode] = useState<ConnectionMode>(null);
  const [projSheet, setProjSheet] = useState(false);
  const [projStep, setProjStep] = useState<ProjStep>(null);
  const genCode = () => String(1000 + Math.floor(Math.random() * 9000));
  const openConvSheet = () => { setConvSheet(true); setConvStep('situation'); };
  const pickSituation = (mode: ConnectionMode) => { setPendingMode(mode); if (mode === 'solo') { setConvSheet(false); enterConv('solo', null, null); } else { setConvStep('invite'); } };
  const createConvRoom = () => { const code = genCode(); store.setInviteCode(code); setConvStep('code'); };
  const enterConvFromSheet = (role: 'host' | 'participant') => { setConvSheet(false); enterConv(pendingMode, store.inviteCode, role); };
  const enterConv = (mode: ConnectionMode, code: string | null, role: 'host' | 'participant' | null) => { store.setConnectionMode(mode); store.setSessionRole(role); store.setInviteCode(code); store.setSessionConnected(mode !== 'solo'); store.setParticipantCount(mode === 'solo' ? 1 : 2); store.clearConvMessages(); store.setMicState('idle'); setScreen('conv'); };
  const openProjSheet = () => { setProjSheet(true); setProjStep('pick'); };
  const projCreateRoom = () => { const code = genCode(); store.setInviteCode(code); setProjStep('code'); };
  const enterProject = (role: 'host' | 'participant') => { setProjSheet(false); store.setSessionRole(role); store.setSessionConnected(true); setScreen('project'); };
  const goHome = () => { store.resetSession(); setScreen('home'); };
  return (<SafeAreaView></SafeAreaView>);
}
