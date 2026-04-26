import { useEffect, useRef, useState, useCallback } from 'react';
import { NativeModules, Platform } from 'react-native';
const { MotaraTranslate } = NativeModules;
export type TranslateResult = { ok: true; text: string } | { ok: false; error: string };
interface UseMLKitTranslateOptions { sourceLang?: string; targetLang?: string; }
export function useMLKitTranslate({ sourceLang = 'ko', targetLang = 'ja' }: UseMLKitTranslateOptions = {}) {
  const [modelsReady, setModelsReady] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const didPreload = useRef(false);
  useEffect(() => {
    if (Platform.OS !== 'android' || !MotaraTranslate || didPreload.current) return;
    didPreload.current = true;
    MotaraTranslate.preloadModels(sourceLang, targetLang).then(() => setModelsReady(true)).catch((e: Error) => setModelError(e.message));
  }, []);
  const translate = useCallback(async (text: string, from = sourceLang, to = targetLang): Promise<TranslateResult> => {
    if (Platform.OS !== 'android' || !MotaraTranslate) return { ok: false, error: 'ML Kit Android only' };
    if (!text.trim()) return { ok: false, error: 'Empty text' };
    try {
      const result = await MotaraTranslate.translate(text, from, to);
      return { ok: true, text: result };
    } catch (e: any) { return { ok: false, error: e?.message ?? 'Unknown error' }; }
  }, [sourceLang, targetLang]);
  return { modelsReady, modelError, translate };
}
