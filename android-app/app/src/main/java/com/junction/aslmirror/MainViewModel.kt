package com.junction.aslmirror

import android.app.Application
import android.net.Uri
import android.os.SystemClock
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.junction.aslmirror.audio.ConversationSpeechRecognizer
import com.junction.aslmirror.audio.MicSourceType
import com.junction.aslmirror.audio.TtsSpeaker
import com.junction.aslmirror.camera.FrameData
import com.junction.aslmirror.llm.HybridWordCorrector
import com.junction.aslmirror.ml.AslClassifier
import com.junction.aslmirror.ml.DecoderConfig
import com.junction.aslmirror.ml.DecoderEvent
import com.junction.aslmirror.ml.DecoderPhase
import com.junction.aslmirror.ml.HandLandmarkerHelper
import com.junction.aslmirror.ml.LetterPrediction
import com.junction.aslmirror.ml.LetterStreamDecoder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class VideoSourceMode(val label: String) {
    PHONE_FRONT("Phone Front"),
    PHONE_BACK("Phone Back"),
    META_GLASSES("Meta Glasses")
}

data class AslUiState(
    val videoSourceMode: VideoSourceMode = VideoSourceMode.PHONE_FRONT,
    val fps: Float = 0f,
    val inferenceMs: Long = 0L,
    val handDetected: Boolean = false,
    val landmarks: List<FloatArray> = emptyList(),
    val isMirroredPreview: Boolean = true,
    val imageWidth: Int = 0,
    val imageHeight: Int = 0,
    val topPredictions: List<LetterPrediction> = emptyList(),
    val decoderPhase: DecoderPhase = DecoderPhase.IDLE,
    val candidateLetter: Char? = null,
    val holdProgress: Float = 0f,
    val landmarkVelocity: Float = 0f,
    val rawLetters: String = "",
    val sentenceWords: List<String> = emptyList(),
    val lastCorrectionInfo: String = "",
    val llmEngineLabel: String = "Offline Dict (Gemma Ready)",
    val isTtsMuted: Boolean = false,
    val isMicListening: Boolean = false,
    val micSource: MicSourceType = MicSourceType.PHONE_MIC,
    val otherPersonPartial: String = "",
    val otherPersonTranscripts: List<String> = emptyList(),
    val statusBanner: String? = null,
    val decoderConfig: DecoderConfig = DecoderConfig()
)

class MainViewModel(application: Application) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(AslUiState())
    val uiState: StateFlow<AslUiState> = _uiState.asStateFlow()

    private val handLandmarker = HandLandmarkerHelper(application)
    private val aslClassifier = AslClassifier(application)
    private val decoder = LetterStreamDecoder()
    private val wordCorrector = HybridWordCorrector(application)
    private val ttsSpeaker = TtsSpeaker(application)

    private val speechRecognizer = ConversationSpeechRecognizer(
        context = application,
        onPartialResult = { partial ->
            _uiState.update { it.copy(otherPersonPartial = partial) }
        },
        onFinalResult = { finalLine ->
            _uiState.update { state ->
                state.copy(
                    otherPersonPartial = "",
                    otherPersonTranscripts = (state.otherPersonTranscripts + finalLine).takeLast(12)
                )
            }
        },
        onMicSourceChanged = { mic ->
            _uiState.update { it.copy(micSource = mic) }
        },
        onStatusError = { err ->
            _uiState.update { it.copy(statusBanner = err) }
        }
    )

    private var frameCounter = 0
    private var fpsWindowStartMs = SystemClock.uptimeMillis()

    init {
        viewModelScope.launch {
            wordCorrector.initialize()
            _uiState.update { it.copy(llmEngineLabel = wordCorrector.activeEngineLabel) }
        }
    }

    fun processFrame(frame: FrameData) {
        val nowMs = SystemClock.uptimeMillis()
        frameCounter++
        val elapsedFpsWindow = nowMs - fpsWindowStartMs
        val updatedFps = if (elapsedFpsWindow >= 1000L) {
            val fps = frameCounter * 1000f / elapsedFpsWindow.toFloat()
            frameCounter = 0
            fpsWindowStartMs = nowMs
            fps
        } else {
            null
        }

        val detection = handLandmarker.detect(frame.bitmap)
        frame.bitmap.recycle()

        if (detection == null) {
            val snap = decoder.onNoHand(frame.timestampMs)
            if (snap.event is DecoderEvent.WordPauseDetected) {
                finalizeCurrentWord()
            }
            _uiState.update { state ->
                state.copy(
                    fps = updatedFps ?: state.fps,
                    handDetected = false,
                    landmarks = emptyList(),
                    topPredictions = emptyList(),
                    decoderPhase = snap.phase,
                    candidateLetter = null,
                    holdProgress = 0f,
                    landmarkVelocity = 0f
                )
            }
            return
        }

        // For front camera, MediaPipe sees mirrored image; flip X when classifying so it matches standard hand orientation
        val probs = aslClassifier.predict(detection.landmarks, mirrorX = frame.isFrontCamera)
        val top3 = aslClassifier.topK(probs, 3)
        val snap = decoder.onFrame(probs, detection.landmarks, frame.timestampMs)

        when (val evt = snap.event) {
            is DecoderEvent.LetterCommitted -> {
                _uiState.update { state ->
                    state.copy(rawLetters = state.rawLetters + evt.letter)
                }
            }
            is DecoderEvent.WordPauseDetected -> {
                finalizeCurrentWord()
            }
            null -> Unit
        }

        _uiState.update { state ->
            state.copy(
                fps = updatedFps ?: state.fps,
                inferenceMs = detection.inferenceMs,
                handDetected = true,
                landmarks = detection.landmarks,
                isMirroredPreview = frame.isFrontCamera,
                imageWidth = frame.imageWidth,
                imageHeight = frame.imageHeight,
                topPredictions = top3,
                decoderPhase = snap.phase,
                candidateLetter = snap.candidateLetter,
                holdProgress = snap.holdProgress,
                landmarkVelocity = snap.landmarkVelocity
            )
        }
    }

    fun finalizeCurrentWord() {
        val raw = _uiState.value.rawLetters.trim()
        if (raw.isEmpty()) return

        decoder.markWordFinalized()
        val contextSentence = _uiState.value.sentenceWords.joinToString(" ")
        _uiState.update { it.copy(rawLetters = "") }

        viewModelScope.launch {
            val result = wordCorrector.correctWord(raw, contextSentence)
            if (result.correctedWord.isNotBlank()) {
                ttsSpeaker.speakWord(result.correctedWord)
                _uiState.update { state ->
                    state.copy(
                        sentenceWords = state.sentenceWords + result.correctedWord,
                        lastCorrectionInfo = "${raw} → ${result.correctedWord} (${result.engineName}, ${result.latencyMs}ms)"
                    )
                }
            }
        }
    }

    fun backspaceRawLetter() {
        _uiState.update { state ->
            if (state.rawLetters.isEmpty()) state
            else state.copy(rawLetters = state.rawLetters.dropLast(1))
        }
    }

    fun clearAllAsl() {
        decoder.reset()
        _uiState.update {
            it.copy(
                rawLetters = "",
                sentenceWords = emptyList(),
                lastCorrectionInfo = ""
            )
        }
    }

    fun speakFullSentence() {
        val sentence = _uiState.value.sentenceWords.joinToString(" ")
        if (sentence.isNotBlank()) {
            ttsSpeaker.speakSentence(sentence)
        }
    }

    fun toggleTtsMute() {
        val next = !_uiState.value.isTtsMuted
        ttsSpeaker.isMuted = next
        _uiState.update { it.copy(isTtsMuted = next) }
    }

    fun toggleMicListening() {
        val next = !_uiState.value.isMicListening
        if (next) {
            speechRecognizer.start()
        } else {
            speechRecognizer.stop()
            _uiState.update { it.copy(otherPersonPartial = "") }
        }
        _uiState.update { it.copy(isMicListening = next) }
    }

    fun clearCaptions() {
        _uiState.update { it.copy(otherPersonPartial = "", otherPersonTranscripts = emptyList()) }
    }

    fun setVideoSourceMode(mode: VideoSourceMode) {
        decoder.reset()
        _uiState.update {
            it.copy(
                videoSourceMode = mode,
                statusBanner = null,
                handDetected = false,
                landmarks = emptyList()
            )
        }
    }

    fun setStatusBanner(msg: String?) {
        _uiState.update { it.copy(statusBanner = msg) }
    }

    fun updateDecoderConfig(config: DecoderConfig) {
        decoder.config = config
        _uiState.update { it.copy(decoderConfig = config) }
    }

    fun importGemmaModel(uri: Uri) {
        viewModelScope.launch(Dispatchers.IO) {
            _uiState.update { it.copy(statusBanner = "Loading Gemma on-device model...") }
            val ok = wordCorrector.llmCorrector.importAndLoadFromUri(uri)
            _uiState.update {
                it.copy(
                    llmEngineLabel = wordCorrector.activeEngineLabel,
                    statusBanner = if (ok) "Gemma on-device LLM loaded!" else "Failed to load .task model."
                )
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        speechRecognizer.stop()
        ttsSpeaker.shutdown()
        handLandmarker.close()
        wordCorrector.close()
    }
}

