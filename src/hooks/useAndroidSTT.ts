import { useState, useEffect, useRef, useCallback } from 'react';
import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid } from 'react-native';
const { MotaraSpeech } = NativeModules;
interface UseAndroidSTTOptions { onResult: (text: string, lang: string) => void; onError?: (msg: string) => void; }
export function useAndroidSTT({ onResult, onError, onSpeechStart, onSpeechEnd }: UseAndroidSTTOptions) {
  const [isReady, setIsReady] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const emitterRef = useRef<NativeEventEmitter | null>(null);
  const subsRef = useRef<any[]>([]);
  const isListeningRef = useRef(false);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    if (Platform.OS !== 'android' || !MotaraSpeech) return;
    emitterRef.current = new NativeEventEmitter(MotaraSpeech);
    setIsReady(true);
  }, []);
  const startListening = useCallback(async (lang = 'auto') => {
    if (!MotaraSpeech || !emitterRef.current || isListeningRef.current) return;
    isListeningRef.current = true;
    setIsListening(true);
    await MotaraSpeech.startListening(lang);
  }, []);
  const stopListening = useCallback(async () => { if (MotaraSpeech) await MotaraSpeech.stopListening(); }, []);
  const cancelListening = useCallback(async () => { if (MotaraSpeech) { await MotaraSpeech.cancelListening(); setIsListening(false); } }, []);
  return { isReady, isListening, startListening, stopListening, cancelListening };
}
