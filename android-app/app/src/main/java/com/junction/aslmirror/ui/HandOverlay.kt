package com.junction.aslmirror.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap

private val HAND_CONNECTIONS = listOf(
    0 to 1, 1 to 2, 2 to 3, 3 to 4,         // Thumb
    0 to 5, 5 to 6, 6 to 7, 7 to 8,         // Index
    5 to 9, 9 to 10, 10 to 11, 11 to 12,    // Middle
    9 to 13, 13 to 14, 14 to 15, 15 to 16,  // Ring
    13 to 17, 17 to 18, 18 to 19, 19 to 20, // Pinky
    0 to 17                                 // Palm base
)

@Composable
fun HandOverlay(
    landmarks: List<FloatArray>,
    isMirrored: Boolean,
    imageWidth: Int,
    imageHeight: Int,
    modifier: Modifier = Modifier
) {
    Canvas(modifier = modifier.fillMaxSize()) {
        if (landmarks.size < 21 || imageWidth <= 0 || imageHeight <= 0) return@Canvas

        // Match PreviewView.ScaleType.FILL_CENTER crop & scale math
        val scale = maxOf(
            size.width / imageWidth.toFloat(),
            size.height / imageHeight.toFloat()
        )
        val scaledWidth = imageWidth * scale
        val scaledHeight = imageHeight * scale
        val offsetX = (size.width - scaledWidth) / 2f
        val offsetY = (size.height - scaledHeight) / 2f

        fun mapPoint(lm: FloatArray): Offset {
            val normX = if (isMirrored) (1f - lm[0]) else lm[0]
            val x = offsetX + normX * scaledWidth
            val y = offsetY + lm[1] * scaledHeight
            return Offset(x, y)
        }

        val points = landmarks.map { mapPoint(it) }

        for ((startIdx, endIdx) in HAND_CONNECTIONS) {
            drawLine(
                color = Color(0xFF38BDF8),
                start = points[startIdx],
                end = points[endIdx],
                strokeWidth = 5f,
                cap = StrokeCap.Round
            )
        }

        points.forEachIndexed { idx, pt ->
            val radius = if (idx == 0) 10f else 7f
            drawCircle(
                color = if (idx in listOf(4, 8, 12, 16, 20)) Color(0xFF22C55E) else Color.White,
                radius = radius,
                center = pt
            )
        }
    }
}

