package com.motarav2

import android.util.Log
import com.facebook.react.bridge.*
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.TranslatorOptions

private const val TAG = "MotaraTranslate"

class TranslateModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "MotaraTranslate"

    /**
     * translate(text, sourceLang, targetLang) → Promise<String>
     * sourceLang / targetLang: "ko" | "ja" | "en" 등 BCP-47 코드
     *
     * 동작 흐름:
     *  1. 모델이 없으면 Wi-Fi/셀룰러 무제한으로 다운로드
     *  2. 다운로드 완료 후 번역
     *  3. 결과 Promise resolve
     */
    @ReactMethod
    fun translate(text: String, sourceLang: String, targetLang: String, promise: Promise) {
        val srcCode = langCode(sourceLang)
        val tgtCode = langCode(targetLang)
        Log.d(TAG, "translate() called: $sourceLang→$targetLang | text=\"${text.take(60)}\"")

        if (srcCode == null || tgtCode == null) {
            Log.e(TAG, "Unsupported language: $sourceLang → $targetLang")
            promise.reject("INVALID_LANG", "Unsupported language: $sourceLang → $targetLang")
            return
        }

        val options = TranslatorOptions.Builder()
            .setSourceLanguage(srcCode)
            .setTargetLanguage(tgtCode)
            .build()
        val translator = Translation.getClient(options)
        val conditions = DownloadConditions.Builder().build()

        translator.downloadModelIfNeeded(conditions)
            .addOnSuccessListener {
                Log.d(TAG, "Model ready, translating...")
                translator.translate(text)
                    .addOnSuccessListener { result ->
                        Log.d(TAG, "Result: \"${result.take(80)}\"")
                        promise.resolve(result)
                        translator.close()
                    }
                    .addOnFailureListener { e ->
                        Log.e(TAG, "translate() failed: ${e.message}")
                        promise.reject("TRANSLATE_ERROR", e.message ?: "Translation failed", e)
                        translator.close()
                    }
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "Model download failed: ${e.message}")
                promise.reject("MODEL_DOWNLOAD_ERROR", e.message ?: "Model download failed", e)
                translator.close()
            }
    }

    /**
     * preloadModels(sourceLang, targetLang) → Promise<Boolean>
     * 앱 시작 시 미리 모델 다운로드
     */
    @ReactMethod
    fun preloadModels(sourceLang: String, targetLang: String, promise: Promise) {
        val srcCode = langCode(sourceLang)
        val tgtCode = langCode(targetLang)
        Log.d(TAG, "preloadModels() called: $sourceLang ↔ $targetLang")

        if (srcCode == null || tgtCode == null) {
            Log.e(TAG, "Unsupported language pair: $sourceLang / $targetLang")
            promise.reject("INVALID_LANG", "Unsupported language pair")
            return
        }

        val fwdOptions = TranslatorOptions.Builder()
            .setSourceLanguage(srcCode)
            .setTargetLanguage(tgtCode)
            .build()
        val bwdOptions = TranslatorOptions.Builder()
            .setSourceLanguage(tgtCode)
            .setTargetLanguage(srcCode)
            .build()

        val fwdTranslator = Translation.getClient(fwdOptions)
        val bwdTranslator = Translation.getClient(bwdOptions)
        val conditions = DownloadConditions.Builder().build()

        fwdTranslator.downloadModelIfNeeded(conditions)
            .addOnSuccessListener { Log.d(TAG, "KO→JA model ready") }
            .continueWithTask { bwdTranslator.downloadModelIfNeeded(conditions) }
            .addOnSuccessListener {
                Log.d(TAG, "JA→KO model ready. Both models loaded.")
                promise.resolve(true)
                fwdTranslator.close()
                bwdTranslator.close()
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "preloadModels() failed: ${e.message}")
                promise.reject("PRELOAD_ERROR", e.message ?: "Preload failed", e)
                fwdTranslator.close()
                bwdTranslator.close()
            }
    }

    private fun langCode(lang: String): String? = when (lang.lowercase()) {
        "ko", "korean"   -> TranslateLanguage.KOREAN
        "ja", "japanese" -> TranslateLanguage.JAPANESE
        "en", "english"  -> TranslateLanguage.ENGLISH
        "zh", "chinese"  -> TranslateLanguage.CHINESE
        else             -> null
    }
}
