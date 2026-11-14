package com.junction.aslmirror.camera

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Matrix
import android.util.Log
import android.util.Size
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

data class FrameData(
    val bitmap: Bitmap,
    val timestampMs: Long,
    val isFrontCamera: Boolean,
    val imageWidth: Int = bitmap.width,
    val imageHeight: Int = bitmap.height
)

/**
 * Abstraction over the video source (phone camera for demo, or Meta AI Glasses stream).
 * Downstream hand landmarking and ASL classification do not depend on where frames originate.
 */
interface VideoFrameSource {
    val name: String
    fun start(
        onFrame: (FrameData) -> Unit,
        onError: (String) -> Unit
    )
    fun stop()
}

/**
 * CameraX-backed VideoFrameSource for the phone camera demo.
 * Paces frames to [targetFps] (default 12 FPS) on a dedicated single-thread executor.
 */
class PhoneCameraFrameSource(
    private val context: Context,
    private val lifecycleOwner: LifecycleOwner,
    private val previewView: PreviewView,
    private val useFrontCamera: Boolean = true,
    private val targetFps: Int = 15
) : VideoFrameSource {

    override val name: String
        get() = if (useFrontCamera) "Phone Front Cam" else "Phone Back Cam"

    private var cameraProvider: ProcessCameraProvider? = null
    private var analysisExecutor: ExecutorService? = null
    private var lastAnalyzedTimestampMs: Long = 0L

    override fun start(
        onFrame: (FrameData) -> Unit,
        onError: (String) -> Unit
    ) {
        val minIntervalMs = (1000L / targetFps.coerceAtLeast(1))
        analysisExecutor = Executors.newSingleThreadExecutor()

        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        cameraProviderFuture.addListener({
            try {
                val provider = cameraProviderFuture.get()
                cameraProvider = provider
                provider.unbindAll()

                val preview = Preview.Builder().build().also {
                    it.surfaceProvider = previewView.surfaceProvider
                }

                val resolutionSelector = ResolutionSelector.Builder()
                    .setResolutionStrategy(
                        ResolutionStrategy(
                            Size(480, 360),
                            ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER
                        )
                    )
                    .build()

                val imageAnalysis = ImageAnalysis.Builder()
                    .setResolutionSelector(resolutionSelector)
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
                    .build()

                imageAnalysis.setAnalyzer(analysisExecutor!!) { imageProxy ->
                    val now = System.currentTimeMillis()
                    if (now - lastAnalyzedTimestampMs < minIntervalMs) {
                        imageProxy.close()
                        return@setAnalyzer
                    }
                    lastAnalyzedTimestampMs = now

                    try {
                        val bitmap = imageProxyToUprightBitmap(imageProxy)
                        onFrame(
                            FrameData(
                                bitmap = bitmap,
                                timestampMs = now,
                                isFrontCamera = useFrontCamera
                            )
                        )
                    } catch (e: Exception) {
                        Log.e("PhoneCameraSource", "Frame conversion failed", e)
                    } finally {
                        imageProxy.close()
                    }
                }

                val selector = if (useFrontCamera) {
                    CameraSelector.DEFAULT_FRONT_CAMERA
                } else {
                    CameraSelector.DEFAULT_BACK_CAMERA
                }

                provider.bindToLifecycle(lifecycleOwner, selector, preview, imageAnalysis)
            } catch (e: Exception) {
                onError("Camera start failed: ${e.message}")
            }
        }, ContextCompat.getMainExecutor(context))
    }

    override fun stop() {
        try {
            cameraProvider?.unbindAll()
        } catch (_: Exception) {
        }
        analysisExecutor?.shutdownNow()
        analysisExecutor = null
    }

    private fun imageProxyToUprightBitmap(imageProxy: ImageProxy): Bitmap {
        val rawBitmap = imageProxy.toBitmap()
        val rotation = imageProxy.imageInfo.rotationDegrees
        if (rotation == 0) return rawBitmap

        val matrix = Matrix().apply {
            postRotate(rotation.toFloat())
        }
        val rotated = Bitmap.createBitmap(
            rawBitmap, 0, 0, rawBitmap.width, rawBitmap.height, matrix, true
        )
        if (rotated !== rawBitmap) {
            rawBitmap.recycle()
        }
        return rotated
    }
}

/**
 * Adapter stub for Meta Ray-Ban / Meta AI Glasses video stream (Meta Wearables Device Access Toolkit).
 *
 * Integration guide when Meta DAT SDK is added:
 * 1. Add Meta Wearables DAT SDK dependency & register session listener.
 * 2. In [start], subscribe to the glasses video stream frames (YUV/JPEG/Bitmap).
 * 3. Convert each frame to an upright [Bitmap] and invoke `onFrame(FrameData(bitmap, ts, isFrontCamera = false))`.
 */
class MetaGlassesFrameSource : VideoFrameSource {
    override val name: String = "Meta Glasses (Stream)"

    override fun start(
        onFrame: (FrameData) -> Unit,
        onError: (String) -> Unit
    ) {
        onError(
            "Meta Glasses stream not paired yet. Connect via Meta AI / DAT SDK or switch to Phone Cam for demo."
        )
    }

    override fun stop() {
        // Release Meta DAT video session here
    }
}

