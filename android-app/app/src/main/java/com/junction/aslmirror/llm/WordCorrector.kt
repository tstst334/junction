package com.junction.aslmirror.llm

import android.content.Context
import android.net.Uri
import android.os.SystemClock
import android.util.Log
import com.google.mediapipe.tasks.genai.llminference.LlmInference
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import kotlin.math.min

data class CorrectionResult(
    val correctedWord: String,
    val engineName: String,
    val latencyMs: Long
)

interface WordCorrector {
    suspend fun correctWord(rawLetters: String, contextSentence: String): CorrectionResult
}

/**
 * Offline, zero-setup fallback corrector using the 10k English frequency list
 * (`assets/english_words.txt`) and Damerau-Levenshtein distance.
 * Ensures the app works immediately out-of-the-box even before a Gemma .task model is loaded.
 */
class DictionaryWordCorrector(context: Context) : WordCorrector {

    private val wordRank: Map<String, Int>
    private val wordsByLength: Map<Int, List<String>>

    init {
        val ranks = HashMap<String, Int>(12000)
        val byLen = HashMap<Int, MutableList<String>>()
        context.assets.open("english_words.txt").bufferedReader().useLines { lines ->
            var idx = 0
            lines.forEach { line ->
                val w = line.trim().lowercase()
                if (w.isNotEmpty() && w.all { it in 'a'..'z' }) {
                    if (!ranks.containsKey(w)) {
                        ranks[w] = idx++
                        byLen.getOrPut(w.length) { mutableListOf() }.add(w)
                    }
                }
            }
        }
        wordRank = ranks
        wordsByLength = byLen
    }

    override suspend fun correctWord(rawLetters: String, contextSentence: String): CorrectionResult =
        withContext(Dispatchers.Default) {
            val start = SystemClock.uptimeMillis()
            val cleaned = rawLetters.trim().lowercase().filter { it in 'a'..'z' }
            if (cleaned.isEmpty()) {
                return@withContext CorrectionResult("", "Offline Dict", 0L)
            }

            // Exact match
            if (wordRank.containsKey(cleaned)) {
                return@withContext CorrectionResult(
                    cleaned,
                    "Offline Dict",
                    SystemClock.uptimeMillis() - start
                )
            }

            // Collapse accidental triple/double repeats from held signs (e.g. HEELLO -> HELLO)
            val collapsed = collapseRepeats(cleaned)
            if (wordRank.containsKey(collapsed)) {
                return@withContext CorrectionResult(
                    collapsed,
                    "Offline Dict",
                    SystemClock.uptimeMillis() - start
                )
            }

            // Search candidate words within +/- 2 characters in length
            val maxDist = when {
                cleaned.length <= 3 -> 1
                cleaned.length <= 6 -> 2
                else -> 3
            }

            var bestWord = cleaned
            var bestScore = Double.MAX_VALUE

            val minLen = (cleaned.length - 2).coerceAtLeast(1)
            val maxLen = cleaned.length + 2
            for (len in minLen..maxLen) {
                val bucket = wordsByLength[len] ?: continue
                for (candidate in bucket) {
                    val d1 = damerauLevenshtein(cleaned, candidate)
                    val d2 = if (collapsed != cleaned) damerauLevenshtein(collapsed, candidate) else d1
                    val dist = min(d1, d2)
                    if (dist <= maxDist) {
                        val rank = wordRank[candidate] ?: 10000
                        // Prefer lower edit distance, then higher word frequency (lower rank)
                        val score = dist * 1000.0 + (rank / 10000.0) * 100.0
                        if (score < bestScore) {
                            bestScore = score
                            bestWord = candidate
                        }
                    }
                }
            }

            CorrectionResult(
                correctedWord = bestWord,
                engineName = "Offline Dict",
                latencyMs = SystemClock.uptimeMillis() - start
            )
        }

    private fun collapseRepeats(s: String): String {
        if (s.length <= 1) return s
        val sb = StringBuilder()
        var prev = '\u0000'
        for (ch in s) {
            if (ch != prev) {
                sb.append(ch)
                prev = ch
            }
        }
        return sb.toString()
    }

    private fun damerauLevenshtein(a: String, b: String): Int {
        val n = a.length
        val m = b.length
        val dp = Array(n + 1) { IntArray(m + 1) }
        for (i in 0..n) dp[i][0] = i
        for (j in 0..m) dp[0][j] = j

        for (i in 1..n) {
            for (j in 1..m) {
                val cost = if (a[i - 1] == b[j - 1]) 0 else 1
                var v = min(
                    min(dp[i - 1][j] + 1, dp[i][j - 1] + 1),
                    dp[i - 1][j - 1] + cost
                )
                if (i > 1 && j > 1 && a[i - 1] == b[j - 2] && a[i - 2] == b[j - 1]) {
                    v = min(v, dp[i - 2][j - 2] + cost)
                }
                dp[i][j] = v
            }
        }
        return dp[n][m]
    }
}

/**
 * On-device LLM corrector powered by MediaPipe LlmInference (e.g., Gemma 3 1B / Gemma 2 2B int4 .task).
 * Falls back cleanly if no local model file is present yet.
 */
class OnDeviceLlmWordCorrector(private val context: Context) : WordCorrector {

    private var llmInference: LlmInference? = null
    var loadedModelName: String? = null
        private set

    val isReady: Boolean
        get() = llmInference != null

    fun modelDirectory(): File {
        return File(context.getExternalFilesDir(null), "models").apply { mkdirs() }
    }

    /**
     * Scans `app/files/models` and `/data/local/tmp/llm` for a `.task` or `.bin` Gemma model.
     */
    suspend fun tryAutoLoad(): Boolean = withContext(Dispatchers.IO) {
        if (llmInference != null) return@withContext true

        val candidates = buildList {
            modelDirectory().listFiles()?.let { addAll(it) }
            File("/data/local/tmp/llm").listFiles()?.let { addAll(it) }
        }.filter { file ->
            file.isFile && (file.name.endsWith(".task", ignoreCase = true) ||
                file.name.endsWith(".bin", ignoreCase = true))
        }

        val modelFile = candidates.firstOrNull() ?: return@withContext false
        loadModelFromFile(modelFile)
    }

    suspend fun importAndLoadFromUri(uri: Uri): Boolean = withContext(Dispatchers.IO) {
        try {
            val destFile = File(modelDirectory(), "gemma_asl.task")
            context.contentResolver.openInputStream(uri)?.use { input ->
                destFile.outputStream().use { output ->
                    input.copyTo(output)
                }
            } ?: return@withContext false
            loadModelFromFile(destFile)
        } catch (e: Exception) {
            Log.e("OnDeviceLlm", "Failed to import model URI", e)
            false
        }
    }

    private fun loadModelFromFile(file: File): Boolean {
        return try {
            llmInference?.close()
            val options = LlmInference.LlmInferenceOptions.builder()
                .setModelPath(file.absolutePath)
                .setMaxTokens(64)
                .build()
            llmInference = LlmInference.createFromOptions(context, options)
            loadedModelName = file.name
            true
        } catch (e: Exception) {
            Log.e("OnDeviceLlm", "Failed to load LlmInference from ${file.absolutePath}", e)
            llmInference = null
            loadedModelName = null
            false
        }
    }

    override suspend fun correctWord(rawLetters: String, contextSentence: String): CorrectionResult =
        withContext(Dispatchers.Default) {
            val engine = llmInference ?: return@withContext CorrectionResult(
                rawLetters.lowercase(),
                "LLM Not Loaded",
                0L
            )
            val start = SystemClock.uptimeMillis()
            val cleanRaw = rawLetters.trim().uppercase()
            val ctx = contextSentence.trim().takeLast(80)

            val prompt = buildPrompt(cleanRaw, ctx)
            val rawOutput = try {
                engine.generateResponse(prompt)
            } catch (e: Exception) {
                Log.e("OnDeviceLlm", "Generation failed", e)
                cleanRaw.lowercase()
            }

            // Extract first clean word/token from the LLM output
            val parsed = rawOutput
                .trim()
                .lineSequence()
                .firstOrNull { it.isNotBlank() }
                ?.trim()
                ?.trim('"', '\'', '.', ',', '!', '?')
                ?.split(Regex("\\s+"))
                ?.firstOrNull()
                ?.lowercase()
                ?.ifBlank { cleanRaw.lowercase() }
                ?: cleanRaw.lowercase()

            CorrectionResult(
                correctedWord = parsed,
                engineName = "Gemma On-Device",
                latencyMs = SystemClock.uptimeMillis() - start
            )
        }

    private fun buildPrompt(rawLetters: String, contextSentence: String): String {
        return """
Fix noisy ASL fingerspelling into the single intended English word.
Rules: Output ONLY the corrected word in lowercase, with no punctuation or explanation.
Examples:
Context: "" | Letters: HELO -> hello
Context: "hello" | Letters: WROLD -> world
Context: "how are" | Letters: YUO -> you
Context: "thank" | Letters: YUO -> you
Context: "i am" | Letters: FNIE -> fine
Context: "$contextSentence" | Letters: $rawLetters ->
        """.trimIndent()
    }

    fun close() {
        llmInference?.close()
        llmInference = null
    }
}

/**
 * Uses on-device Gemma LLM when loaded, and seamlessly falls back to the 10k English
 * frequency dictionary when no `.task` LLM file is present on the phone.
 */
class HybridWordCorrector(context: Context) : WordCorrector {
    val llmCorrector = OnDeviceLlmWordCorrector(context)
    private val dictCorrector = DictionaryWordCorrector(context)

    val activeEngineLabel: String
        get() = if (llmCorrector.isReady) {
            "Gemma (${llmCorrector.loadedModelName ?: "On-Device"})"
        } else {
            "Offline Dict (Gemma Ready)"
        }

    suspend fun initialize(): Boolean = llmCorrector.tryAutoLoad()

    override suspend fun correctWord(rawLetters: String, contextSentence: String): CorrectionResult {
        return if (llmCorrector.isReady) {
            llmCorrector.correctWord(rawLetters, contextSentence)
        } else {
            dictCorrector.correctWord(rawLetters, contextSentence)
        }
    }

    fun close() {
        llmCorrector.close()
    }
}

