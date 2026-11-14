package com.junction.aslmirror.ui

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Backspace
import androidx.compose.material.icons.automirrored.filled.VolumeOff
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.SpaceBar
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.junction.aslmirror.AslUiState
import com.junction.aslmirror.VideoSourceMode
import com.junction.aslmirror.camera.FrameData
import com.junction.aslmirror.camera.MetaGlassesFrameSource
import com.junction.aslmirror.camera.PhoneCameraFrameSource
import com.junction.aslmirror.ml.DecoderConfig
import com.junction.aslmirror.ml.DecoderPhase
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    uiState: AslUiState,
    hasCameraPermission: Boolean,
    hasAudioPermission: Boolean,
    onRequestPermissions: () -> Unit,
    onFrame: (FrameData) -> Unit,
    onSourceChanged: (VideoSourceMode) -> Unit,
    onSourceError: (String) -> Unit,
    onFinalizeWord: () -> Unit,
    onBackspace: () -> Unit,
    onClearAsl: () -> Unit,
    onSpeakSentence: () -> Unit,
    onToggleMute: () -> Unit,
    onToggleMic: () -> Unit,
    onClearCaptions: () -> Unit,
    onUpdateConfig: (DecoderConfig) -> Unit,
    onImportGemmaUri: (Uri) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var showSettings by remember { mutableStateOf(false) }

    val previewView = remember {
        PreviewView(context).apply {
            scaleType = PreviewView.ScaleType.FILL_CENTER
        }
    }

    // Manage active VideoFrameSource (Phone Camera vs Meta Glasses stub)
    DisposableEffect(uiState.videoSourceMode, hasCameraPermission) {
        if (!hasCameraPermission && uiState.videoSourceMode != VideoSourceMode.META_GLASSES) {
            onDispose { }
        } else {
            val source = when (uiState.videoSourceMode) {
                VideoSourceMode.PHONE_FRONT -> PhoneCameraFrameSource(
                    context = context,
                    lifecycleOwner = lifecycleOwner,
                    previewView = previewView,
                    useFrontCamera = true,
                    targetFps = 15
                )
                VideoSourceMode.PHONE_BACK -> PhoneCameraFrameSource(
                    context = context,
                    lifecycleOwner = lifecycleOwner,
                    previewView = previewView,
                    useFrontCamera = false,
                    targetFps = 15
                )
                VideoSourceMode.META_GLASSES -> MetaGlassesFrameSource()
            }
            source.start(
                onFrame = onFrame,
                onError = onSourceError
            )
            onDispose {
                source.stop()
            }
        }
    }

    val modelPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri != null) {
            onImportGemmaUri(uri)
        }
    }

    Scaffold(
        containerColor = Color(0xFF0B1120),
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF0F172A),
                    titleContentColor = Color.White
                ),
                title = {
                    Column {
                        Text(
                            text = "ASL Glasses Bridge",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "${String.format(Locale.US, "%.1f", uiState.fps)} FPS • ${uiState.inferenceMs}ms • ${uiState.llmEngineLabel}",
                            fontSize = 11.sp,
                            color = Color(0xFF94A3B8)
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { showSettings = true }) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "Settings",
                            tint = Color.White
                        )
                    }
                }
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Source selector chips
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                VideoSourceMode.entries.forEach { mode ->
                    FilterChip(
                        selected = uiState.videoSourceMode == mode,
                        onClick = { onSourceChanged(mode) },
                        label = { Text(mode.label, fontSize = 12.sp) },
                        leadingIcon = {
                            Icon(
                                imageVector = Icons.Default.CameraAlt,
                                contentDescription = null
                            )
                        }
                    )
                }
            }

            if (uiState.statusBanner != null) {
                Surface(
                    color = Color(0xFF7C2D12),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = uiState.statusBanner,
                        color = Color(0xFFFED7AA),
                        fontSize = 12.sp,
                        modifier = Modifier.padding(10.dp)
                    )
                }
            }

            // Camera + Hand Skeleton + Live Classification HUD
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1.1f)
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color(0xFF1E293B))
            ) {
                if (hasCameraPermission && uiState.videoSourceMode != VideoSourceMode.META_GLASSES) {
                    AndroidView(
                        factory = { previewView },
                        modifier = Modifier.fillMaxSize()
                    )
                    if (uiState.handDetected) {
                        HandOverlay(
                            landmarks = uiState.landmarks,
                            isMirrored = uiState.isMirroredPreview,
                            imageWidth = uiState.imageWidth,
                            imageHeight = uiState.imageHeight
                        )
                    }
                } else if (!hasCameraPermission) {
                    Column(
                        modifier = Modifier.align(Alignment.Center),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text("Camera permission needed for demo", color = Color.White)
                        Spacer(Modifier.height(8.dp))
                        Button(onClick = onRequestPermissions) {
                            Text("Grant Permissions")
                        }
                    }
                } else {
                    Text(
                        text = "Meta Glasses Stream Ready for DAT SDK",
                        color = Color(0xFF94A3B8),
                        modifier = Modifier.align(Alignment.Center)
                    )
                }

                // Top-3 predictions & Decoder phase HUD overlay
                Surface(
                    color = Color(0xCC0F172A),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .padding(8.dp)
                ) {
                    Column(modifier = Modifier.padding(10.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            val phaseColor = when (uiState.decoderPhase) {
                                DecoderPhase.IDLE -> Color(0xFF94A3B8)
                                DecoderPhase.HOLDING -> Color(0xFF38BDF8)
                                DecoderPhase.COOLDOWN -> Color(0xFF22C55E)
                            }
                            Text(
                                text = when (uiState.decoderPhase) {
                                    DecoderPhase.IDLE -> if (uiState.handDetected) "TRACKING" else "NO HAND"
                                    DecoderPhase.HOLDING -> "HOLDING '${uiState.candidateLetter}'"
                                    DecoderPhase.COOLDOWN -> "LOCKED"
                                },
                                color = phaseColor,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )

                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                uiState.topPredictions.forEach { pred ->
                                    Text(
                                        text = "${pred.letter} ${(pred.probability * 100).toInt()}%",
                                        color = Color.White,
                                        fontFamily = FontFamily.Monospace,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }
                        }
                        Spacer(Modifier.height(6.dp))
                        LinearProgressIndicator(
                            progress = { uiState.holdProgress },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(6.dp)
                                .clip(RoundedCornerShape(3.dp)),
                            color = Color(0xFF38BDF8),
                            trackColor = Color(0xFF334155)
                        )
                    }
                }
            }

            // ASL Output -> Word Correction -> TTS Card
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "YOUR ASL → SPEECH",
                            color = Color(0xFF38BDF8),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Row {
                            IconButton(onClick = onToggleMute) {
                                Icon(
                                    imageVector = if (uiState.isTtsMuted) {
                                        Icons.AutoMirrored.Filled.VolumeOff
                                    } else {
                                        Icons.AutoMirrored.Filled.VolumeUp
                                    },
                                    contentDescription = "Mute TTS",
                                    tint = if (uiState.isTtsMuted) Color(0xFFEF4444) else Color(0xFF22C55E)
                                )
                            }
                            IconButton(onClick = onSpeakSentence) {
                                Icon(
                                    imageVector = Icons.Default.PlayArrow,
                                    contentDescription = "Speak sentence",
                                    tint = Color.White
                                )
                            }
                            IconButton(onClick = onClearAsl) {
                                Icon(
                                    imageVector = Icons.Default.Clear,
                                    contentDescription = "Clear ASL",
                                    tint = Color(0xFF94A3B8)
                                )
                            }
                        }
                    }

                    // Raw letters buffer + controls
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = if (uiState.rawLetters.isEmpty()) "Letters: —" else "Letters: ${uiState.rawLetters}",
                            color = Color(0xFFFACC15),
                            fontFamily = FontFamily.Monospace,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.weight(1f)
                        )
                        IconButton(onClick = onBackspace) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.Backspace,
                                contentDescription = "Backspace",
                                tint = Color.White
                            )
                        }
                        Button(
                            onClick = onFinalizeWord,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                            contentPadding = ButtonDefaults.ContentPadding
                        ) {
                            Icon(Icons.Default.SpaceBar, contentDescription = null)
                            Spacer(Modifier.width(4.dp))
                            Text("Word", fontSize = 12.sp)
                        }
                    }

                    Spacer(Modifier.height(6.dp))
                    Text(
                        text = if (uiState.sentenceWords.isEmpty()) {
                            "Signed sentence will appear here..."
                        } else {
                            uiState.sentenceWords.joinToString(" ")
                        },
                        color = Color.White,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Medium
                    )

                    if (uiState.lastCorrectionInfo.isNotEmpty()) {
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = uiState.lastCorrectionInfo,
                            color = Color(0xFF94A3B8),
                            fontSize = 11.sp
                        )
                    }
                }
            }

            // Other Person Speech -> Live Captions Card
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(0.65f)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "OTHER PERSON (MIC CAPTIONS)",
                                color = Color(0xFF22C55E),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Input: ${uiState.micSource.label}",
                                color = Color(0xFF94A3B8),
                                fontSize = 11.sp
                            )
                        }

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            IconButton(onClick = onClearCaptions) {
                                Icon(
                                    imageVector = Icons.Default.Clear,
                                    contentDescription = "Clear captions",
                                    tint = Color(0xFF94A3B8)
                                )
                            }
                            Button(
                                onClick = {
                                    if (!hasAudioPermission) {
                                        onRequestPermissions()
                                    } else {
                                        onToggleMic()
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (uiState.isMicListening) {
                                        Color(0xFFDC2626)
                                    } else {
                                        Color(0xFF16A34A)
                                    }
                                )
                            ) {
                                Icon(
                                    imageVector = if (uiState.isMicListening) {
                                        Icons.Default.MicOff
                                    } else {
                                        Icons.Default.Mic
                                    },
                                    contentDescription = null
                                )
                                Spacer(Modifier.width(4.dp))
                                Text(
                                    text = if (uiState.isMicListening) "Stop" else "Listen",
                                    fontSize = 12.sp
                                )
                            }
                        }
                    }

                    Spacer(Modifier.height(6.dp))
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        if (uiState.otherPersonTranscripts.isEmpty() && uiState.otherPersonPartial.isEmpty()) {
                            Text(
                                text = "Tap Listen to transcribe the other person via Glasses BT mic or Phone mic...",
                                color = Color(0xFF64748B),
                                fontSize = 13.sp
                            )
                        } else {
                            uiState.otherPersonTranscripts.forEach { line ->
                                Text(text = line, color = Color.White, fontSize = 14.sp)
                            }
                            if (uiState.otherPersonPartial.isNotEmpty()) {
                                Text(
                                    text = uiState.otherPersonPartial + " ...",
                                    color = Color(0xFF94A3B8),
                                    fontSize = 14.sp
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (showSettings) {
        ModalBottomSheet(
            onDismissRequest = { showSettings = false },
            containerColor = Color(0xFF0F172A),
            contentColor = Color.White
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text("Decoder & On-Device LLM Settings", fontWeight = FontWeight.Bold, fontSize = 16.sp)

                val cfg = uiState.decoderConfig
                Text("Confidence Threshold: ${String.format(Locale.US, "%.2f", cfg.confidenceThreshold)}")
                Slider(
                    value = cfg.confidenceThreshold,
                    onValueChange = { onUpdateConfig(cfg.copy(confidenceThreshold = it)) },
                    valueRange = 0.25f..0.85f
                )

                Text("Min Hold Frames: ${cfg.minHoldFrames} frames")
                Slider(
                    value = cfg.minHoldFrames.toFloat(),
                    onValueChange = { onUpdateConfig(cfg.copy(minHoldFrames = it.toInt().coerceAtLeast(2))) },
                    valueRange = 2f..10f,
                    steps = 7
                )

                Text("Max Motion for Hold: ${String.format(Locale.US, "%.3f", cfg.maxMotionForHold)}")
                Slider(
                    value = cfg.maxMotionForHold,
                    onValueChange = { onUpdateConfig(cfg.copy(maxMotionForHold = it)) },
                    valueRange = 0.01f..0.08f
                )

                OutlinedButton(
                    onClick = { modelPickerLauncher.launch(arrayOf("*/*")) },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Load Gemma On-Device .task / .bin Model")
                }
                Text(
                    text = "Active engine: ${uiState.llmEngineLabel}. Tip: push gemma3-1b-it-int4.task to /data/local/tmp/llm/ or pick it above.",
                    fontSize = 11.sp,
                    color = Color(0xFF94A3B8)
                )
                Spacer(Modifier.height(16.dp))
            }
        }
    }
}

