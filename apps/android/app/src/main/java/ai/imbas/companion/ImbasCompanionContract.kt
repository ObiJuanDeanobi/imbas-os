package ai.imbas.companion

/**
 * Placeholder contract for the future Kotlin/Jetpack Compose Android companion.
 *
 * The Android app should use Conduit APIs only. It must not read or write Imbas OS
 * storage files directly.
 */
data class ImbasMobileSession(
    val serviceUrl: String,
    val token: String,
    val deviceLabel: String,
    val scopes: List<String>
)

data class ImbasPairingRequest(
    val challengeId: String,
    val code: String,
    val deviceLabel: String
)
