package com.junction.aslmirror.ml

import android.content.Context
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.exp
import kotlin.math.max
import kotlin.math.sqrt

data class LetterPrediction(
    val letter: Char,
    val probability: Float
)

/**
 * Runs our wrist-centered, scale-normalized front-perspective ASL MLP
 * trained on `sid220/asl-now-fingerspelling` (96.55% validation accuracy):
 *   Normalize(21, 3) -> Flatten(63) -> Dense(256, ReLU) -> Dense(128, ReLU) -> Dense(26, Linear) -> Softmax
 */
class AslClassifier(context: Context) {

    companion object {
        private const val NUM_LANDMARKS = 21
        private const val COORDS_PER_LANDMARK = 3
        private const val INPUT_DIM = NUM_LANDMARKS * COORDS_PER_LANDMARK // 63
        private const val H1_DIM = 256
        private const val H2_DIM = 128
        private const val NUM_CLASSES = 26
        val LABELS = ('A'..'Z').toList()
    }

    private val w1 = FloatArray(INPUT_DIM * H1_DIM)
    private val b1 = FloatArray(H1_DIM)
    private val w2 = FloatArray(H1_DIM * H2_DIM)
    private val b2 = FloatArray(H2_DIM)
    private val w3 = FloatArray(H2_DIM * NUM_CLASSES)
    private val b3 = FloatArray(NUM_CLASSES)

    init {
        val bytes = context.assets.open("asl_normalized_weights.bin").use { it.readBytes() }
        val buffer = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN).asFloatBuffer()
        buffer.get(w1)
        buffer.get(b1)
        buffer.get(w2)
        buffer.get(b2)
        buffer.get(w3)
        buffer.get(b3)
    }

    /**
     * Classifies 21 [x, y, z] hand landmarks into probabilities over A..Z.
     * Centers at wrist (landmark 0) and scales by max 3D distance from wrist,
     * preserving front-perspective orientation (no rotation invariance).
     */
    fun predict(landmarks: List<FloatArray>, mirrorX: Boolean = false): FloatArray {
        require(landmarks.size == NUM_LANDMARKS) { "Expected 21 landmarks, got ${landmarks.size}" }

        val wrist = landmarks[0]
        val wx = if (mirrorX) 1.0f - wrist[0] else wrist[0]
        val wy = wrist[1]
        val wz = wrist[2]

        val centered = FloatArray(INPUT_DIM)
        var maxDist = 1e-6f
        for (i in 0 until NUM_LANDMARKS) {
            val lm = landmarks[i]
            val lx = (if (mirrorX) 1.0f - lm[0] else lm[0]) - wx
            val ly = lm[1] - wy
            val lz = lm[2] - wz
            val base = i * COORDS_PER_LANDMARK
            centered[base] = lx
            centered[base + 1] = ly
            centered[base + 2] = lz
            val d = sqrt(lx * lx + ly * ly + lz * lz)
            maxDist = max(maxDist, d)
        }

        val invScale = 1.0f / maxDist
        for (i in centered.indices) {
            centered[i] *= invScale
        }

        // Layer 1: Dense(63 -> 256, ReLU)
        val h1 = FloatArray(H1_DIM)
        for (j in 0 until H1_DIM) {
            var sum = b1[j]
            for (i in 0 until INPUT_DIM) {
                sum += centered[i] * w1[i * H1_DIM + j]
            }
            h1[j] = if (sum > 0f) sum else 0f
        }

        // Layer 2: Dense(256 -> 128, ReLU)
        val h2 = FloatArray(H2_DIM)
        for (j in 0 until H2_DIM) {
            var sum = b2[j]
            for (i in 0 until H1_DIM) {
                sum += h1[i] * w2[i * H2_DIM + j]
            }
            h2[j] = if (sum > 0f) sum else 0f
        }

        // Layer 3: Dense(128 -> 26, Linear)
        val logits = FloatArray(NUM_CLASSES)
        var maxLogit = Float.NEGATIVE_INFINITY
        for (k in 0 until NUM_CLASSES) {
            var sum = b3[k]
            for (j in 0 until H2_DIM) {
                sum += h2[j] * w3[j * NUM_CLASSES + k]
            }
            logits[k] = sum
            if (sum > maxLogit) maxLogit = sum
        }

        // Softmax
        val probs = FloatArray(NUM_CLASSES)
        var expSum = 0.0
        for (k in 0 until NUM_CLASSES) {
            val e = exp((logits[k] - maxLogit).toDouble())
            probs[k] = e.toFloat()
            expSum += e
        }
        val invSum = (1.0 / expSum).toFloat()
        for (k in 0 until NUM_CLASSES) {
            probs[k] *= invSum
        }
        return probs
    }

    fun topK(probs: FloatArray, k: Int = 3): List<LetterPrediction> {
        return probs.indices
            .sortedByDescending { probs[it] }
            .take(k)
            .map { idx -> LetterPrediction(LABELS[idx], probs[idx]) }
    }
}
