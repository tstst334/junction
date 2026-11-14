package com.junction.aslmirror

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.core.content.ContextCompat
import com.junction.aslmirror.ui.MainScreen

class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            val uiState by viewModel.uiState.collectAsState()

            var hasCamera by remember { mutableStateOf(hasPermission(Manifest.permission.CAMERA)) }
            var hasAudio by remember { mutableStateOf(hasPermission(Manifest.permission.RECORD_AUDIO)) }

            val requiredPermissions = remember {
                buildList {
                    add(Manifest.permission.CAMERA)
                    add(Manifest.permission.RECORD_AUDIO)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        add(Manifest.permission.BLUETOOTH_CONNECT)
                    }
                }.toTypedArray()
            }

            val permissionLauncher = rememberLauncherForActivityResult(
                contract = ActivityResultContracts.RequestMultiplePermissions()
            ) {
                hasCamera = hasPermission(Manifest.permission.CAMERA)
                hasAudio = hasPermission(Manifest.permission.RECORD_AUDIO)
            }

            LaunchedEffect(Unit) {
                if (!hasCamera || !hasAudio) {
                    permissionLauncher.launch(requiredPermissions)
                }
            }

            MaterialTheme(colorScheme = darkColorScheme()) {
                MainScreen(
                    uiState = uiState,
                    hasCameraPermission = hasCamera,
                    hasAudioPermission = hasAudio,
                    onRequestPermissions = { permissionLauncher.launch(requiredPermissions) },
                    onFrame = viewModel::processFrame,
                    onSourceChanged = viewModel::setVideoSourceMode,
                    onSourceError = viewModel::setStatusBanner,
                    onFinalizeWord = viewModel::finalizeCurrentWord,
                    onBackspace = viewModel::backspaceRawLetter,
                    onClearAsl = viewModel::clearAllAsl,
                    onSpeakSentence = viewModel::speakFullSentence,
                    onToggleMute = viewModel::toggleTtsMute,
                    onToggleMic = viewModel::toggleMicListening,
                    onClearCaptions = viewModel::clearCaptions,
                    onUpdateConfig = viewModel::updateDecoderConfig,
                    onImportGemmaUri = viewModel::importGemmaModel
                )
            }
        }
    }

    private fun hasPermission(permission: String): Boolean {
        return ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED
    }
}

