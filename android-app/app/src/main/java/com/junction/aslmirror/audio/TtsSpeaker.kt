package com.junction.aslmirror.audio

import android.content.Context
import android.speech.tts.TextToSpeech
import java.util.Locale

/**
 * Speaks finalized ASL words aloud word-by-word through phone speakers
 * (or connected Bluetooth audio device).
 */
class TtsSpeaker(context: Context) : TextToSpeech.OnInitListener {

    private var tts: TextToSpeech? = TextToSpeech(context.applicationContext, this)
    private var isReady = false
    var isMuted: Boolean = false

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts?.language = Locale.US
            tts?.setSpeechRate(1.0f)
            isReady = true
        }
    }

    fun speakWord(word: String) {
        if (isMuted || !isReady || word.isBlank()) return
        tts?.speak(word, TextToSpeech.QUEUE_ADD, null, "word_${System.nanoTime()}")
    }

    fun speakSentence(sentence: String) {
        if (isMuted || !isReady || sentence.isBlank()) return
        tts?.speak(sentence, TextToSpeech.QUEUE_FLUSH, null, "sentence_${System.nanoTime()}")
    }

    fun shutdown() {
        tts?.stop()
        tts?.shutdown()
        tts = null
        isReady = false
    }
}

