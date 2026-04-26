// Whisper STT hook (legacy)
export function useWhisperSTT(options: any) {
  return { isReady: false, isListening: false, startListening: async () => {}, stopListening: async () => {} };
}
