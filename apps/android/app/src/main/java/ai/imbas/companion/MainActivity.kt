package ai.imbas.companion

import android.content.Intent
import android.os.Bundle
import android.speech.RecognizerIntent
import androidx.activity.result.contract.ActivityResultContracts
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

class MainActivity : ComponentActivity() {
    private var sharedText by mutableStateOf<String?>(null)
    private var pairingQrPayload by mutableStateOf<String?>(null)
    private var qrScanMessage by mutableStateOf<String?>(null)
    private var voiceCaptureDraft by mutableStateOf<String?>(null)
    private var voiceCaptureMessage by mutableStateOf<String?>(null)

    private val speechLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val matches = result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS).orEmpty()
        val transcript = matches.firstOrNull()?.trim().orEmpty()
        voiceCaptureDraft = transcript.ifBlank { null }
        voiceCaptureMessage = if (transcript.isBlank()) "Voice capture returned no transcript." else "Voice transcript added to capture draft."
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        sharedText = extractSharedText(intent)
        setContent {
            MaterialTheme {
                ImbasCompanionApp(initialCaptureDraft = sharedText, scannedPairingPayload = pairingQrPayload, qrScanMessage = qrScanMessage, voiceCaptureDraft = voiceCaptureDraft, voiceCaptureMessage = voiceCaptureMessage, onScanPairingQr = { scanPairingQr() }, onStartVoiceCapture = { startVoiceCapture() })
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        sharedText = extractSharedText(intent)
    }

    private fun scanPairingQr() {
        qrScanMessage = "Opening QR scanner…"
        val options = GmsBarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
            .build()
        GmsBarcodeScanning.getClient(this, options).startScan()
            .addOnSuccessListener { barcode ->
                pairingQrPayload = barcode.rawValue
                qrScanMessage = if (barcode.rawValue.isNullOrBlank()) "QR scan returned no payload." else "QR pairing payload captured."
            }
            .addOnCanceledListener { qrScanMessage = "QR scan cancelled." }
            .addOnFailureListener { error -> qrScanMessage = "QR scan failed: ${error.message ?: error.javaClass.simpleName}" }
    }

    private fun startVoiceCapture() {
        voiceCaptureMessage = "Opening voice capture…"
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_PROMPT, "Capture a private Imbas note")
        }
        try {
            speechLauncher.launch(intent)
        } catch (error: Exception) {
            voiceCaptureMessage = "Voice capture unavailable: ${error.message ?: error.javaClass.simpleName}"
        }
    }

    private fun extractSharedText(intent: Intent?): String? {
        if (intent?.action != Intent.ACTION_SEND || intent.type != "text/plain") return null
        val subject = intent.getStringExtra(Intent.EXTRA_SUBJECT)?.trim().orEmpty()
        val text = intent.getStringExtra(Intent.EXTRA_TEXT)?.trim().orEmpty()
        return listOf(subject, text).filter { it.isNotBlank() }.joinToString("\n\n").ifBlank { null }
    }
}
