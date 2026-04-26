package com.motarav2

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

private const val TAG = "MotaraSpeech"

class SpeechModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "MotaraSpeech"

    private var recognizer: SpeechRecognizer? = null

    // cancel() 호출 후 onError(ERROR_CLIENT)가 발생하는 경우가 있음.
    // 새 세션 시작 전 cancel로 인한 오류는 JS로 올리지 않기 위한 플래그.
    private var suppressErrors = false

    // onBeginningOfSpeech 발생 여부 추적
    // stopListening()이 onBeginningOfSpeech 전에 호출되면 pendingStop=true로 마킹,
    // onBeginningOfSpeech 발생 시 실제 stopListening() 실행
    private var speechBegun = false
    private var pendingStop = false

    // RN EventEmitter boilerplate
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    private fun emit(name: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(name, params)
    }

    // RecognitionListener를 클래스 레벨 필드로 정의 → recognizer 재사용 시에도 동일 리스너 사용
    private val listener = object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {
            suppressErrors = false   // 이제 실제 세션 시작됨
            Log.d(TAG, "onReadyForSpeech")
            emit("onSpeechStart", Arguments.createMap())
        }

        override fun onBeginningOfSpeech() {
            speechBegun = true
            Log.d(TAG, "onBeginningOfSpeech pendingStop=$pendingStop")
            if (pendingStop) {
                pendingStop = false
                recognizer?.stopListening()
                Log.d(TAG, "deferred stopListening() executed after onBeginningOfSpeech")
            }
        }

        override fun onRmsChanged(rmsdB: Float) {}
        override fun onBufferReceived(buffer: ByteArray?) {}

        override fun onEndOfSpeech() {
            Log.d(TAG, "onEndOfSpeech — waiting for result")
            emit("onSpeechEnd", Arguments.createMap())
        }

        override fun onError(error: Int) {
            // 오류 발생 시 상태 리셋 (다음 세션 오염 방지)
            speechBegun = false
            pendingStop = false

            if (suppressErrors) {
                Log.d(TAG, "onError suppressed (cancel/restart): $error")
                return
            }
            val msg = errorMessage(error)
            Log.e(TAG, "onError: $error ($msg)")

            val p = Arguments.createMap().apply {
                putInt("code", error)
                putString("message", msg)
            }
            emit("onSpeechError", p)

            // 복구 불가능한 오류는 recognizer를 파괴해서 다음 호출 시 재생성
            if (error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY ||
                error == SpeechRecognizer.ERROR_CLIENT) {
                Log.d(TAG, "Destroying recognizer due to error $error — will recreate next session")
                recognizer?.destroy()
                recognizer = null
            }
        }

        override fun onResults(results: Bundle?) {
            val matches = results
                ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            val text = matches?.firstOrNull() ?: ""

            val detectedLang: String = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                results?.getString("android.speech.extra.DETECTED_LANGUAGE") ?: ""
            } else ""

            Log.d(TAG, "onResults text=\"${text.take(80)}\" detectedLang=$detectedLang")

            val p = Arguments.createMap().apply {
                putString("text", text)
                putString("lang", detectedLang)
            }
            emit("onSpeechResults", p)
        }

        override fun onPartialResults(partialResults: Bundle?) {
            val matches = partialResults
                ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            val text = matches?.firstOrNull() ?: ""
            if (text.isNotEmpty()) {
                Log.d(TAG, "onPartialResults: \"${text.take(60)}\"")
                val p = Arguments.createMap().apply { putString("text", text) }
                emit("onSpeechPartial", p)
            }
        }

        override fun onEvent(eventType: Int, params: Bundle?) {}
    }

    /**
     * Recognizer를 한 번만 생성하고 재사용.
     * createOnDeviceSpeechRecognizer → Samsung AiAi AMBIENT_ONESHOT 모드 (5초 타임아웃, PTT에 부적합)
     * createSpeechRecognizer → 기기 기본 서비스 (GoogleTTSRecognitionService, PTT에 적합)
     */
    private fun ensureRecognizer(): SpeechRecognizer {
        if (recognizer == null) {
            Log.d(TAG, "createSpeechRecognizer (default service)")
            recognizer = SpeechRecognizer.createSpeechRecognizer(reactApplicationContext)
            recognizer?.setRecognitionListener(listener)
        }
        return recognizer!!
    }

    /**
     * isOnDeviceAvailable() → Promise<Boolean>
     * 기본 createSpeechRecognizer를 사용하므로 항상 true 반환
     */
    @ReactMethod
    fun isOnDeviceAvailable(promise: Promise) {
        Log.d(TAG, "isOnDeviceAvailable: true (using default SpeechRecognizer)")
        promise.resolve(true)
    }

    /**
     * startListening(lang) → Promise<Boolean>
     * 이전 세션을 cancel()로 리셋한 뒤 동일 recognizer로 새 세션 시작.
     * destroy()/recreate() 대신 cancel() + startListening() 재사용.
     */
    @ReactMethod
    fun startListening(lang: String, promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No activity")
            return
        }

        activity.runOnUiThread {
            try {
                val rec = ensureRecognizer()

                // 새 세션 시작 전 상태 리셋
                speechBegun = false
                pendingStop = false
                // 이전 세션 취소. cancel()로 인한 onError는 suppress.
                suppressErrors = true
                rec.cancel()

                val isAuto = lang == "auto" || lang.isEmpty()
                // auto 모드: ko-KR 우선, 일본어도 지원
                val primaryLang = if (isAuto) "ko-KR" else lang

                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                        RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, primaryLang)
                    if (isAuto) {
                        // 한국어/일본어 모두 인식 시도
                        putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "ko-KR")
                        putExtra("android.speech.extra.EXTRA_ADDITIONAL_LANGUAGES",
                            arrayOf("ja-JP"))
                    }
                    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                    putExtra("android.speech.extra.SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS", 1500L)
                    putExtra("android.speech.extra.SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS", 800L)
                    putExtra("android.speech.extra.SPEECH_INPUT_MINIMUM_LENGTH_MILLIS", 300L)
                }

                // cancel() 이후 즉시 startListening 하면 ERROR_RECOGNIZER_BUSY 발생 가능
                // 150ms 딜레이로 race condition 방지
                Handler(Looper.getMainLooper()).postDelayed({
                    try {
                        rec.startListening(intent)
                        Log.d(TAG, "startListening() dispatched, lang=$primaryLang (input=$lang)")
                    } catch (e2: Exception) {
                        suppressErrors = false
                        Log.e(TAG, "startListening (delayed) failed: ${e2.message}")
                        val p = Arguments.createMap().apply {
                            putInt("code", -1)
                            putString("message", "시작 실패: ${e2.message}")
                        }
                        emit("onSpeechError", p)
                    }
                }, 150)

                promise.resolve(true)

            } catch (e: Exception) {
                suppressErrors = false
                Log.e(TAG, "startListening failed: ${e.message}")
                promise.reject("START_ERROR", e.message ?: "Unknown", e)
            }
        }
    }

    /**
     * stopListening() → Promise<Boolean>
     * PTT 버튼 뗐을 때 → 녹음 종료 후 결과 처리
     */
    @ReactMethod
    fun stopListening(promise: Promise) {
        currentActivity?.runOnUiThread {
            try {
                Log.d(TAG, "stopListening() speechBegun=$speechBegun")
                if (speechBegun) {
                    // 발화가 이미 시작됨 → 즉시 stop
                    recognizer?.stopListening()
                } else {
                    // 아직 발화 감지 전 → onBeginningOfSpeech 이후 stop 실행
                    pendingStop = true
                    Log.d(TAG, "stopListening() deferred — waiting for onBeginningOfSpeech")
                }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("STOP_ERROR", e.message ?: "Unknown", e)
            }
        } ?: promise.reject("NO_ACTIVITY", "No activity")
    }

    /**
     * cancelListening() → Promise<Boolean>
     */
    @ReactMethod
    fun cancelListening(promise: Promise) {
        currentActivity?.runOnUiThread {
            try {
                Log.d(TAG, "cancelListening()")
                pendingStop = false
                suppressErrors = true
                recognizer?.cancel()
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("CANCEL_ERROR", e.message ?: "Unknown", e)
            }
        } ?: promise.resolve(false)
    }

    override fun onCatalystInstanceDestroy() {
        currentActivity?.runOnUiThread {
            suppressErrors = true
            recognizer?.destroy()
            recognizer = null
        }
    }

    private fun errorMessage(code: Int) = when (code) {
        SpeechRecognizer.ERROR_AUDIO                    -> "오디오 녹음 오류"
        SpeechRecognizer.ERROR_CLIENT                   -> "클라이언트 오류"
        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "마이크 권한 없음"
        SpeechRecognizer.ERROR_NETWORK                  -> "네트워크 오류 (온디바이스 확인)"
        SpeechRecognizer.ERROR_NETWORK_TIMEOUT          -> "네트워크 타임아웃"
        SpeechRecognizer.ERROR_NO_MATCH                 -> "음성을 인식하지 못했습니다"
        SpeechRecognizer.ERROR_RECOGNIZER_BUSY          -> "인식기 사용 중"
        SpeechRecognizer.ERROR_SERVER                   -> "서버 오류"
        SpeechRecognizer.ERROR_SPEECH_TIMEOUT           -> "음성 입력 없음"
        else                                            -> "알 수 없는 오류 ($code)"
    }
}
