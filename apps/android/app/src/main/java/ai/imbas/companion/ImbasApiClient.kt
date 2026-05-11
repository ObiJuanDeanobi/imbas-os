package ai.imbas.companion

/**
 * Thin Conduit API map for the Android MVP.
 *
 * This file intentionally avoids direct storage access and keeps endpoint names visible
 * for agent/human review until a typed HTTP client is wired in.
 */
class ImbasApiClient(private val serviceUrl: String) {
    val completePairingEndpoint = "$serviceUrl/v0/mobile/pairing-challenges/complete"
    val statusEndpoint = "$serviceUrl/v0/status"
    val runledgerEndpoint = "$serviceUrl/v0/runledger"
    val lorekeeperProposalsEndpoint = "$serviceUrl/v0/wiki/proposals"

    fun authorizationHeader(session: ImbasMobileSession): Pair<String, String> =
        "Authorization" to "Bearer ${session.token}"
}
