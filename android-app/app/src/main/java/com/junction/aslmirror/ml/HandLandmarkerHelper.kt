package com.junction.aslmirror.ml

import android.content.Context
import android.graphics.Bitmap
import android.os.SystemClock
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarker

data class HandDetectionResult(
    /** 21 landmarks, each [x, y, z] normalized to [0..1] in image space */
    val landmarks: List<FloatArray>,
    val handedness: String,
    val inferenceMs: Long
)

/**
 * Wraps MediaPipe HandLandmarker to extract 21 3D hand landmarks per frame.
 */
class HandLandmarkerHelper(context: Context) {

    private val landmarker: HandLandmarker

    init {
        val baseOptions = BaseOptions.builder()
            .setModelAssetPath("hand_landmarker.task")
            .setDelegate(Delegate.CPU)
            .build()

        val options = HandLandmarker.HandLandmarkerOptions.builder()
            .setBaseOptions(baseOptions)
            .setRunningMode(RunningMode.VIDEO)
            .setNumHands(1)
            .setMinHandDetectionConfidence(0.5f)
            .setMinHandPresenceConfidence(0.5f)
            .setMinTrackingConfidence(0.5f)
            .build()

        landmarker = HandLandmarker.createFromOptions(context, options)
    }

    private var lastTimestampMs = 0L

    fun detect(bitmap: Bitmap, timestampMs: Long = SystemClock.uptimeMillis()): HandDetectionResult? {
        val start = SystemClock.uptimeMillis()
        val safeTs = if (timestampMs > lastTimestampMs) timestampMs else lastTimestampMs + 1L
        lastTimestampMs = safeTs

        val mpImage = BitmapImageBuilder(bitmap).build()
        val result = landmarker.detectForVideo(mpImage, safeTs)
        val elapsed = SystemClock.uptimeMillis() - start

        val hand = result.landmarks().firstOrNull() ?: return null
        val points = hand.map { lm -> floatArrayOf(lm.x(), lm.y(), lm.z()) }
        val handedness = result.handedness()
            .firstOrNull()
            ?.firstOrNull()
            ?.categoryName()
            ?: "Unknown"

        return HandDetectionResult(
            landmarks = points,
            handedness = handedness,
            inferenceMs = elapsed
        )
    }

    fun close() {
        landmarker.close()
    }
}

