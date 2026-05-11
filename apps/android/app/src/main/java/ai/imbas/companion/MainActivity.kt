package ai.imbas.companion

import android.content.Intent
import android.os.Bundle
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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        sharedText = extractSharedText(intent)
        setContent {
            MaterialTheme {
                ImbasCompanionApp(initialCaptureDraft = sharedText, scannedPairingPayload = pairingQrPayload, qrScanMessage = qrScanMessage, onScanPairingQr = { scanPairingQr() })
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

    private fun extractSharedText(intent: Intent?): String? {
        if (intent?.action != Intent.ACTION_SEND || intent.type != "text/plain") return null
        val subject = intent.getStringExtra(Intent.EXTRA_SUBJECT)?.trim().orEmpty()
        val text = intent.getStringExtra(Intent.EXTRA_TEXT)?.trim().orEmpty()
        return listOf(subject, text).filter { it.isNotBlank() }.joinToString("\n\n").ifBlank { null }
    }
}
