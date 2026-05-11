package ai.imbas.companion

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Thin Conduit API client for the Android MVP.
 *
 * The companion talks to Conduit over HTTP only. It never reads Imbas OS storage
 * directly and it never displays or persists raw Sanctum secrets.
 */
class ImbasApiClient(private val serviceUrl: String) {
    private val normalizedServiceUrl = serviceUrl.trim().trimEnd('/')
    val completePairingEndpoint = "$normalizedServiceUrl/v0/mobile/pairing-challenges/complete"
    val statusEndpoint = "$normalizedServiceUrl/v0/status"
    val runledgerEndpoint = "$normalizedServiceUrl/v0/runledger"
    val lorekeeperProposalsEndpoint = "$normalizedServiceUrl/v0/wiki/proposals"

    fun authorizationHeader(session: ImbasMobileSession): Pair<String, String> =
        "Authorization" to "Bearer ${session.token}"

    suspend fun completePairing(request: ImbasPairingRequest): ImbasMobileSession = withContext(Dispatchers.IO) {
        val json = postJson(completePairingEndpoint, JSONObject()
            .put("challengeId", request.challengeId)
            .put("code", request.code)
            .put("deviceLabel", request.deviceLabel))
        val session = json.optJSONObject("session") ?: error("Pairing response did not include a session")
        val scopesJson = session.optJSONArray("scopes") ?: org.json.JSONArray()
        ImbasMobileSession(
            serviceUrl = normalizedServiceUrl,
            token = json.optString("token"),
            deviceLabel = session.optString("deviceLabel", request.deviceLabel),
            scopes = (0 until scopesJson.length()).mapNotNull { index -> scopesJson.optString(index).ifBlank { null } },
            sessionId = session.optString("id"),
            createdAt = session.optString("createdAt")
        )
    }

    suspend fun revokeSession(session: ImbasMobileSession): Boolean = withContext(Dispatchers.IO) {
        postJson("$normalizedServiceUrl/v0/mobile/sessions/${session.sessionId}/revoke", JSONObject(), session)
        true
    }

    suspend fun fetchStatus(session: ImbasMobileSession? = null): ImbasStatus = withContext(Dispatchers.IO) {
        val json = getJson(statusEndpoint, session)
        val counts = json.optJSONObject("counts") ?: JSONObject()
        ImbasStatus(
            service = json.optString("service", "imbas-os-conduit"),
            status = json.optString("status", "unknown"),
            counts = ImbasCounts(
                events = counts.optInt("events", 0),
                runs = counts.optInt("runs", 0),
                runledger = counts.optInt("runledger", 0),
                lorekeeperProposals = counts.optInt("lorekeeperProposals", 0),
                mobileSessions = counts.optInt("mobileSessions", 0)
            )
        )
    }

    suspend fun fetchRunledger(limit: Int = 10, session: ImbasMobileSession? = null): List<RunledgerItem> = withContext(Dispatchers.IO) {
        val json = getJson("$runledgerEndpoint?limit=$limit", session)
        val entries = json.optJSONArray("entries") ?: return@withContext emptyList()
        (0 until entries.length()).mapNotNull { index ->
            entries.optJSONObject(index)?.let { entry ->
                RunledgerItem(
                    id = entry.optString("id", "runledger-$index"),
                    title = entry.optString("title", "Untitled runledger entry"),
                    outcome = entry.optString("outcome", "unknown"),
                    createdAt = entry.optString("createdAt", "unknown")
                )
            }
        }
    }

    suspend fun fetchLorekeeperProposals(limit: Int = 10, session: ImbasMobileSession? = null): List<LorekeeperProposalItem> = withContext(Dispatchers.IO) {
        val json = getJson("$lorekeeperProposalsEndpoint?limit=$limit", session)
        val proposals = json.optJSONArray("proposals") ?: return@withContext emptyList()
        (0 until proposals.length()).mapNotNull { index ->
            proposals.optJSONObject(index)?.let { proposal ->
                LorekeeperProposalItem(
                    id = proposal.optString("id", "proposal-$index"),
                    title = proposal.optString("title", "Untitled proposal"),
                    status = proposal.optString("status", "unknown"),
                    targetPageId = proposal.optString("targetPageId").ifBlank { null }
                )
            }
        }
    }

    private fun getJson(endpoint: String, session: ImbasMobileSession? = null): JSONObject {
        val connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 5_000
            readTimeout = 5_000
            setRequestProperty("Accept", "application/json")
            session?.let { setRequestProperty(authorizationHeader(it).first, authorizationHeader(it).second) }
        }
        return try {
            val stream = if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream
            val body = stream.bufferedReader().use { it.readText() }
            if (connection.responseCode !in 200..299) error("HTTP ${connection.responseCode}: $body")
            JSONObject(body)
        } finally {
            connection.disconnect()
        }
    }

    private fun postJson(endpoint: String, payload: JSONObject, session: ImbasMobileSession? = null): JSONObject {
        val connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 5_000
            readTimeout = 5_000
            doOutput = true
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Content-Type", "application/json")
            session?.let { setRequestProperty(authorizationHeader(it).first, authorizationHeader(it).second) }
        }
        return try {
            connection.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
            val stream = if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream
            val body = stream.bufferedReader().use { it.readText() }
            if (connection.responseCode !in 200..299) error("HTTP ${connection.responseCode}: $body")
            JSONObject(body.ifBlank { "{}" })
        } finally {
            connection.disconnect()
        }
    }

}
