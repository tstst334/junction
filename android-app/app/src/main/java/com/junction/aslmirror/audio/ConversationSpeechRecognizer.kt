package com.junction.aslmirror.audio

import android.content.Context
import android.content.Intent
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import java.util.Locale

enum class MicSourceType(val label: String) {
    GLASSES_BT("Glasses / BT Mic"),
    PHONE_MIC("Phone Mic")
}

/**
 * Continuous SpeechRecognizer that transcribes what the other person is saying.
 * Automatically prefers a connected Bluetooth headset / Meta Glasses mic (SCO / BLE Headset)
 * when available, and falls back to the phone microphone.
 */
class ConversationSpeechRecognizer(
    private val context: Context,
    private val onPartialResult: (String) -> Unit,
    private val onFinalResult: (String) -> Unit,
    private val onMicSourceChanged: (MicSourceType) -> Unit,
    private val onStatusError: (String) -> Unit
) {
    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private val mainHandler = Handler(Looper.getMainLooper())

    private var speechRecognizer: SpeechRecognizer? = null
    private var isListening = false
    private var scoActive = false

    fun start() {
        if (isListening) return
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            onStatusError("Speech recognition service not available on this device.")
            return
        }
        isListening = true
        configureBluetoothMicIfAvailable()
        startListeningCycle()
    }

    fun stop() {
        isListening = false
        mainHandler.removeCallbacksAndMessages(null)
        try {
            speechRecognizer?.stopListening()
            speechRecognizer?.destroy()
        } catch (_: Exception) {
        }
        speechRecognizer = null
        releaseBluetoothMic()
    }

    fun refreshMicRoute() {
        configureBluetoothMicIfAvailable()
    }

    private fun configureBluetoothMicIfAvailable() {
        try {
            val devices = audioManager.getDevices(AudioManager.GET_DEVICES_INPUTS)
            val btInput = devices.firstOrNull { device ->
                device.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
                    (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
                        device.type == AudioDeviceInfo.TYPE_BLE_HEADSET)
            }

            if (btInput != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
                    audioManager.setCommunicationDevice(btInput)
                } else {
                    @Suppress("DEPRECATION")
                    audioManager.startBluetoothSco()
                    @Suppress("DEPRECATION")
                    audioManager.isBluetoothScoOn = true
                }
                scoActive = true
                onMicSourceChanged(MicSourceType.GLASSES_BT)
            } else {
                releaseBluetoothMic()
                onMicSourceChanged(MicSourceType.PHONE_MIC)
            }
        } catch (_: SecurityException) {
            onMicSourceChanged(MicSourceType.PHONE_MIC)
        } catch (_: Exception) {
            onMicSourceChanged(MicSourceType.PHONE_MIC)
        }
    }

    private fun releaseBluetoothMic() {
        if (!scoActive) return
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                audioManager.clearCommunicationDevice()
                audioManager.mode = AudioManager.MODE_NORMAL
            } else {
                @Suppress("DEPRECATION")
                audioManager.isBluetoothScoOn = false
                @Suppress("DEPRECATION")
                audioManager.stopBluetoothSco()
            }
        } catch (_: Exception) {
        }
        scoActive = false
    }

    private fun startListeningCycle() {
        if (!isListening) return
        mainHandler.post {
            if (!isListening) return@post
            try {
                speechRecognizer?.destroy()
                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
                    setRecognitionListener(listener)
                }

                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(
                        RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                        RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
                    )
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
                    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                }
                speechRecognizer?.startListening(intent)
            } catch (e: Exception) {
                onStatusError("Mic listen error: ${e.message}")
            }
        }
    }

    private fun scheduleRestart(delayMs: Long = 250L) {
        if (!isListening) return
        mainHandler.postDelayed({ startListeningCycle() }, delayMs)
    }

    private val listener = object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {}
        override fun onBeginningOfSpeech() {}
        override fun onRmsChanged(rmsdB: Float) {}
        override fun onBufferReceived(buffer: ByteArray?) {}
        override fun onEndOfSpeech() {}

        override fun onError(error: Int) {
            val delay = when (error) {
                SpeechRecognizer.ERROR_NO_MATCH,
                SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> 150L
                SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> 500L
                else -> 800L
            }
            scheduleRestart(delay)
        }

        override fun onResults(results: Bundle?) {
            val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            val text = matches?.firstOrNull()?.trim().orEmpty()
            if (text.isNotEmpty()) {
                onFinalResult(text)
            }
            onPartialResult("")
            scheduleRestart(150L)
        }

        override fun onPartialResults(partialResults: Bundle?) {
            val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            val text = matches?.firstOrNull()?.trim().orEmpty()
            if (text.isNotEmpty()) {
                onPartialResult(text)
            }
        }

        override fun onEvent(eventType: Int, params: Bundle?) {}
    }
}

