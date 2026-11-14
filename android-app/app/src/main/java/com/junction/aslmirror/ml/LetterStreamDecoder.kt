package com.junction.aslmirror.ml

import kotlin.math.hypot
import kotlin.math.max

data class DecoderConfig(
    val emaAlpha: Float = 0.50f,
    val confidenceThreshold: Float = 0.55f,
    val releaseThreshold: Float = 0.35f,
    val maxMotionForHold: Float = 0.040f,
    val rearmMotionThreshold: Float = 0.045f,
    val minHoldFrames: Int = 3,
    val minPeakFrames: Int = 2,
    val peakDropDelta: Float = 0.08f,
    val wordPauseMs: Long = 1200L
)

sealed class DecoderEvent {
    data class LetterCommitted(val letter: Char, val confidence: Float) : DecoderEvent()
    data object WordPauseDetected : DecoderEvent()
}

enum class DecoderPhase {
    IDLE,
    HOLDING,
    COOLDOWN
}

data class DecoderSnapshot(
    val phase: DecoderPhase,
    val candidateLetter: Char?,
    val smoothedTopLetter: Char?,
    val smoothedTopProb: Float,
    val landmarkVelocity: Float,
    val holdProgress: Float,
    val event: DecoderEvent? = null
)

/**
 * Temporal segmentation state machine that separates actual held/peaked ASL letters
 * from in-between transition frames using:
 * 1. Exponential Moving Average (EMA) smoothing of class probabilities.
 * 2. Inter-frame 21-landmark L2 velocity gating to ignore fast hand transitions.
 * 3. Hold-and-Peak hysteresis with cooldown to prevent duplicate emissions.
 * 4. Pause detection for automatic word boundaries.
 */
class LetterStreamDecoder(
    var config: DecoderConfig = DecoderConfig()
) {
    private var smoothedProbs: FloatArray? = null
    private var prevLandmarks: List<FloatArray>? = null

    private var phase: DecoderPhase = DecoderPhase.IDLE
    private var candidateLetter: Char? = null
    private var holdFrames: Int = 0
    private var peakProb: Float = 0f
    private var lastCommittedLetter: Char? = null

    private var lastHandSeenMs: Long = 0L
    private var hasPendingWord: Boolean = false

    fun markWordStarted() {
        hasPendingWord = true
    }

    fun markWordFinalized() {
        hasPendingWord = false
    }

    fun reset() {
        smoothedProbs = null
        prevLandmarks = null
        phase = DecoderPhase.IDLE
        candidateLetter = null
        holdFrames = 0
        peakProb = 0f
        lastCommittedLetter = null
        hasPendingWord = false
    }

    fun onNoHand(timestampMs: Long): DecoderSnapshot {
        prevLandmarks = null
        smoothedProbs = null
        phase = DecoderPhase.IDLE
        candidateLetter = null
        holdFrames = 0
        peakProb = 0f

        var event: DecoderEvent? = null
        if (hasPendingWord && lastHandSeenMs > 0L && (timestampMs - lastHandSeenMs) >= config.wordPauseMs) {
            event = DecoderEvent.WordPauseDetected
            hasPendingWord = false
        }

        return DecoderSnapshot(
            phase = phase,
            candidateLetter = null,
            smoothedTopLetter = null,
            smoothedTopProb = 0f,
            landmarkVelocity = 0f,
            holdProgress = 0f,
            event = event
        )
    }

    fun onFrame(
        rawProbs: FloatArray,
        landmarks: List<FloatArray>,
        timestampMs: Long
    ): DecoderSnapshot {
        lastHandSeenMs = timestampMs

        val velocity = computeVelocity(prevLandmarks, landmarks)
        prevLandmarks = landmarks.map { it.copyOf() }

        val smoothed = updateEma(rawProbs)
        var bestIdx = 0
        var bestProb = smoothed[0]
        for (i in 1 until smoothed.size) {
            if (smoothed[i] > bestProb) {
                bestProb = smoothed[i]
                bestIdx = i
            }
        }
        val topLetter = AslClassifier.LABELS[bestIdx]
        val isMovingFast = velocity > config.maxMotionForHold

        var emittedEvent: DecoderEvent? = null

        when (phase) {
            DecoderPhase.IDLE -> {
                if (!isMovingFast && bestProb >= config.confidenceThreshold) {
                    phase = DecoderPhase.HOLDING
                    candidateLetter = topLetter
                    holdFrames = 1
                    peakProb = bestProb
                }
            }

            DecoderPhase.HOLDING -> {
                val sameCandidate = (topLetter == candidateLetter)
                if (sameCandidate && !isMovingFast && bestProb >= config.confidenceThreshold * 0.85f) {
                    holdFrames++
                    peakProb = max(peakProb, bestProb)

                    val reachedHold = holdFrames >= config.minHoldFrames
                    val peakedAndDropping = holdFrames >= config.minPeakFrames &&
                        (peakProb - bestProb) >= config.peakDropDelta

                    if (reachedHold || peakedAndDropping) {
                        val committed = candidateLetter!!
                        emittedEvent = DecoderEvent.LetterCommitted(committed, peakProb)
                        hasPendingWord = true
                        lastCommittedLetter = committed
                        phase = DecoderPhase.COOLDOWN
                        holdFrames = 0
                    }
                } else if (!isMovingFast && bestProb >= config.confidenceThreshold && topLetter != candidateLetter) {
                    // Switched directly to a different stable letter
                    candidateLetter = topLetter
                    holdFrames = 1
                    peakProb = bestProb
                } else {
                    // Transition / dropped confidence
                    phase = DecoderPhase.IDLE
                    candidateLetter = null
                    holdFrames = 0
                    peakProb = 0f
                }
            }

            DecoderPhase.COOLDOWN -> {
                val movedToRearm = velocity >= config.rearmMotionThreshold
                val droppedBelowRelease = bestProb < config.releaseThreshold
                val switchedLetter = (topLetter != lastCommittedLetter && bestProb >= config.confidenceThreshold && !isMovingFast)

                if (switchedLetter) {
                    phase = DecoderPhase.HOLDING
                    candidateLetter = topLetter
                    holdFrames = 1
                    peakProb = bestProb
                } else if (droppedBelowRelease || movedToRearm) {
                    phase = DecoderPhase.IDLE
                    candidateLetter = null
                    holdFrames = 0
                    peakProb = 0f
                }
            }
        }

        val progress = if (phase == DecoderPhase.HOLDING) {
            (holdFrames.toFloat() / config.minHoldFrames.toFloat()).coerceIn(0f, 1f)
        } else {
            0f
        }

        return DecoderSnapshot(
            phase = phase,
            candidateLetter = candidateLetter,
            smoothedTopLetter = topLetter,
            smoothedTopProb = bestProb,
            landmarkVelocity = velocity,
            holdProgress = progress,
            event = emittedEvent
        )
    }

    private fun updateEma(rawProbs: FloatArray): FloatArray {
        val current = smoothedProbs
        if (current == null) {
            val copy = rawProbs.copyOf()
            smoothedProbs = copy
            return copy
        }
        val alpha = config.emaAlpha
        val oneMinus = 1f - alpha
        for (i in rawProbs.indices) {
            current[i] = alpha * rawProbs[i] + oneMinus * current[i]
        }
        return current
    }

    private fun computeVelocity(
        prev: List<FloatArray>?,
        curr: List<FloatArray>
    ): Float {
        if (prev == null || prev.size != curr.size) return 0f
        var sumDist = 0f
        for (i in curr.indices) {
            val dx = curr[i][0] - prev[i][0]
            val dy = curr[i][1] - prev[i][1]
            sumDist += hypot(dx.toDouble(), dy.toDouble()).toFloat()
        }
        return sumDist / curr.size
    }
}

