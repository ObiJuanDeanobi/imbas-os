package ai.imbas.companion

/**
 * Android companion contract for private-preview Imbas OS.
 *
 * The Android app should use Conduit APIs only. It must not read or write Imbas OS
 * storage files directly, and must never display or persist raw Sanctum secrets.
 */
data class ImbasMobileSession(
    val serviceUrl: String,
    val token: String,
    val deviceLabel: String,
    val scopes: List<String>,
    val sessionId: String,
    val createdAt: String
)

data class ImbasPairingRequest(
    val challengeId: String,
    val code: String,
    val deviceLabel: String
)

data class ImbasStatus(
    val service: String,
    val status: String,
    val counts: ImbasCounts
)

data class ImbasCounts(
    val events: Int = 0,
    val runs: Int = 0,
    val runledger: Int = 0,
    val lorekeeperProposals: Int = 0,
    val mobileSessions: Int = 0
)

data class RunledgerItem(
    val id: String,
    val title: String,
    val outcome: String,
    val createdAt: String
)

data class LorekeeperProposalItem(
    val id: String,
    val title: String,
    val status: String,
    val targetPageId: String? = null,
    val rationale: String = "",
    val markdownPreview: String = "",
    val sources: List<String> = emptyList()
)
