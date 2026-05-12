package ai.imbas.companion

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import android.net.Uri
import kotlinx.coroutines.launch

enum class CompanionTab(val label: String) {
    Pair("Pair"),
    Status("Status"),
    Runledger("Runs"),
    Lorekeeper("Wiki"),
    Capture("Capture"),
    Diagnostics("Diagnostics")
}

@Composable
fun ImbasCompanionApp(initialCaptureDraft: String? = null, scannedPairingPayload: String? = null, qrScanMessage: String? = null, voiceCaptureDraft: String? = null, voiceCaptureMessage: String? = null, onScanPairingQr: () -> Unit = {}, onStartVoiceCapture: () -> Unit = {}) {
    var selectedTab by remember { mutableStateOf(if (initialCaptureDraft.isNullOrBlank()) CompanionTab.Status else CompanionTab.Capture) }
    var serviceUrl by remember { mutableStateOf("http://10.0.2.2:3077") }
    val context = LocalContext.current
    val sessionStore = remember { SecureSessionStore(context) }
    var mobileSession by remember { mutableStateOf<ImbasMobileSession?>(null) }
    var lastPairingMessage by remember { mutableStateOf("Not paired yet") }

    var status by remember { mutableStateOf<ImbasStatus?>(null) }
    var runledgerItems by remember { mutableStateOf<List<RunledgerItem>>(emptyList()) }
    var proposals by remember { mutableStateOf<List<LorekeeperProposalItem>>(emptyList()) }
    var connectionMessage by remember { mutableStateOf("Not connected yet") }
    var actionMessage by remember { mutableStateOf("No mobile action sent yet") }
    var diagnosticChecks by remember { mutableStateOf<List<DiagnosticCheck>>(emptyList()) }
    val scope = rememberCoroutineScope()

    fun refreshLiveStatus() {
        scope.launch {
            connectionMessage = "Connecting to Conduit…"
            try {
                val client = ImbasApiClient(serviceUrl)
                status = client.fetchStatus(mobileSession)
                runledgerItems = client.fetchRunledger(session = mobileSession)
                proposals = client.fetchLorekeeperProposals(session = mobileSession)
                connectionMessage = if (mobileSession == null) "Live Conduit read succeeded without paired session" else "Live Conduit read succeeded with paired session"
            } catch (error: Exception) {
                connectionMessage = "Live Conduit read failed: ${error.message ?: error.javaClass.simpleName}"
                if (status == null) {
                    status = ImbasStatus(
                        service = "imbas-os-conduit",
                        status = "offline demo fallback",
                        counts = ImbasCounts(runs = 3, runledger = 3, lorekeeperProposals = 2, mobileSessions = 0)
                    )
                    runledgerItems = listOf(
                        RunledgerItem("run-001", "Android private-preview APK installed", "success", "today", "APK installed and first scaffold reviewed."),
                        RunledgerItem("run-002", "Conduit mobile endpoints scaffolded", "draft", "private preview", "Status and Runledger reads are wired."),
                        RunledgerItem("run-003", "Secure token storage pending", "next", "upcoming", "Pairing tokens should remain revocable and encrypted.")
                    )
                    proposals = listOf(
                        LorekeeperProposalItem("prop-001", "Android companion install notes", "draft", "AI_OS/Imbas/mobile", "Show install evidence on-device", "APK installed and Conduit reads are live.", listOf("demo://android")),
                        LorekeeperProposalItem("prop-002", "Pairing flow hardening", "planned", "AI_OS/Imbas/security", "Make mobile auth clearer", "Pairing should use scoped revocable tokens.", listOf("demo://security"))
                    )
                }
            }
        }
    }

    fun runDiagnostics() {
        scope.launch {
            diagnosticChecks = listOf(DiagnosticCheck("Diagnostics", false, "Running checks…"))
            diagnosticChecks = try {
                ImbasApiClient(serviceUrl).runDiagnostics(mobileSession)
            } catch (error: Exception) {
                listOf(DiagnosticCheck("Diagnostics", false, error.message ?: error.javaClass.simpleName))
            }
        }
    }

    LaunchedEffect(Unit) {
        mobileSession = sessionStore.load()
        mobileSession?.serviceUrl?.takeIf { it.isNotBlank() }?.let { serviceUrl = it }
        lastPairingMessage = mobileSession?.let { "Paired as ${it.deviceLabel}; token is stored with Android Keystore." } ?: "Not paired yet"
        refreshLiveStatus()
    }

    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            HeaderCard(serviceUrl = serviceUrl, onServiceUrlChange = { serviceUrl = it })
            TabRow(selectedTab = selectedTab, onSelect = { selectedTab = it })

            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                when (selectedTab) {
                    CompanionTab.Pair -> PairingScreen(
                        mobileSession = mobileSession,
                        lastPairingMessage = lastPairingMessage,
                        scannedPairingPayload = scannedPairingPayload,
                        qrScanMessage = qrScanMessage,
                        onScanPairingQr = onScanPairingQr,
                        onServiceUrlChange = { serviceUrl = it },
                        onPair = { request ->
                            scope.launch {
                                lastPairingMessage = "Completing pairing for ${request.deviceLabel}…"
                                try {
                                    val session = ImbasApiClient(serviceUrl).completePairing(request)
                                    sessionStore.save(session)
                                    mobileSession = session
                                    lastPairingMessage = "Paired as ${session.deviceLabel}; token stored with Android Keystore."
                                    refreshLiveStatus()
                                } catch (error: Exception) {
                                    lastPairingMessage = "Pairing failed: ${error.message ?: error.javaClass.simpleName}"
                                }
                            }
                        },
                        onForget = {
                            scope.launch {
                                val session = mobileSession
                                try { if (session != null) ImbasApiClient(serviceUrl).revokeSession(session) } catch (_: Exception) { }
                                sessionStore.clear()
                                mobileSession = null
                                lastPairingMessage = "Local mobile session forgotten."
                                refreshLiveStatus()
                            }
                        }
                    )
                    CompanionTab.Status -> AiWorldScreen(status = status, serviceUrl = serviceUrl, connectionMessage = connectionMessage, onRefresh = { refreshLiveStatus() })
                    CompanionTab.Runledger -> RunledgerScreen(items = runledgerItems)
                    CompanionTab.Lorekeeper -> LorekeeperReviewScreen(
                        proposals = proposals,
                        actionMessage = actionMessage,
                        canReview = mobileSession != null,
                        onApprove = { proposalId ->
                            scope.launch {
                                val session = mobileSession
                                if (session == null) {
                                    actionMessage = "Pair before approving proposals."
                                } else {
                                    try {
                                        ImbasApiClient(serviceUrl).approveLorekeeperProposal(proposalId, session)
                                        actionMessage = "Approved proposal $proposalId"
                                        refreshLiveStatus()
                                    } catch (error: Exception) {
                                        actionMessage = "Approve failed: ${error.message ?: error.javaClass.simpleName}"
                                    }
                                }
                            }
                        },
                        onReject = { proposalId ->
                            scope.launch {
                                val session = mobileSession
                                if (session == null) {
                                    actionMessage = "Pair before rejecting proposals."
                                } else {
                                    try {
                                        ImbasApiClient(serviceUrl).rejectLorekeeperProposal(proposalId, session)
                                        actionMessage = "Rejected proposal $proposalId"
                                        refreshLiveStatus()
                                    } catch (error: Exception) {
                                        actionMessage = "Reject failed: ${error.message ?: error.javaClass.simpleName}"
                                    }
                                }
                            }
                        }
                    )
                    CompanionTab.Capture -> CaptureScreen(
                        mobileSession = mobileSession,
                        actionMessage = actionMessage,
                        initialNote = initialCaptureDraft,
                        voiceDraft = voiceCaptureDraft,
                        voiceMessage = voiceCaptureMessage,
                        onStartVoiceCapture = onStartVoiceCapture,
                        onCapture = { note ->
                            scope.launch {
                                val session = mobileSession
                                if (session == null) {
                                    actionMessage = "Pair before capturing notes."
                                } else {
                                    try {
                                        ImbasApiClient(serviceUrl).captureNote(note, session)
                                        actionMessage = "Captured note into Conduit."
                                        refreshLiveStatus()
                                    } catch (error: Exception) {
                                        actionMessage = "Capture failed: ${error.message ?: error.javaClass.simpleName}"
                                    }
                                }
                            }
                        }
                    )
                    CompanionTab.Diagnostics -> DiagnosticsScreen(
                        serviceUrl = serviceUrl,
                        mobileSession = mobileSession,
                        checks = diagnosticChecks,
                        onRunDiagnostics = { runDiagnostics() }
                    )
                }
            }

            Text(
                "Private preview build — live Conduit reads, pairing, proposal review, and capture notes.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun HeaderCard(serviceUrl: String, onServiceUrlChange: (String) -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Imbas Companion", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("Android control surface for the private-preview Imbas OS loop.")
            OutlinedTextField(
                modifier = Modifier.fillMaxWidth(),
                value = serviceUrl,
                onValueChange = onServiceUrlChange,
                label = { Text("Conduit URL") },
                singleLine = true
            )
        }
    }
}

@Composable
private fun TabRow(selectedTab: CompanionTab, onSelect: (CompanionTab) -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
        CompanionTab.entries.forEach { tab ->
            if (tab == selectedTab) {
                Button(onClick = { onSelect(tab) }) { Text(tab.label) }
            } else {
                OutlinedButton(onClick = { onSelect(tab) }) { Text(tab.label) }
            }
        }
    }
}

@Composable
fun PairingScreen(mobileSession: ImbasMobileSession?, lastPairingMessage: String, scannedPairingPayload: String? = null, qrScanMessage: String? = null, onScanPairingQr: () -> Unit = {}, onServiceUrlChange: (String) -> Unit = {}, onPair: (ImbasPairingRequest) -> Unit, onForget: () -> Unit) {
    var challengeId by remember { mutableStateOf("") }
    var serviceCode by remember { mutableStateOf("") }
    var deviceLabel by remember { mutableStateOf("Maintainer Android") }
    var parsedPairingMessage by remember { mutableStateOf("No QR pairing payload scanned yet") }

    LaunchedEffect(scannedPairingPayload) {
        val payload = scannedPairingPayload ?: return@LaunchedEffect
        val parsed = parsePairingPayload(payload)
        if (parsed == null) {
            parsedPairingMessage = "QR payload was not an Imbas pairing link."
        } else {
            challengeId = parsed.challengeId
            serviceCode = parsed.code
            parsed.serviceUrl?.takeIf { it.isNotBlank() }?.let { onServiceUrlChange(it) }
            parsedPairingMessage = "QR pairing details loaded. Tap Complete pairing to finish."
        }
    }
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Pair with Imbas OS", style = MaterialTheme.typography.titleLarge)
        Text("Scan the Command Center QR code, or enter the challenge ID and 6-digit code manually. The returned mobile token is encrypted with Android Keystore.")
        Button(onClick = onScanPairingQr) { Text("Scan pairing QR") }
        StatusCard(title = "QR scanner", body = qrScanMessage ?: parsedPairingMessage)
        OutlinedTextField(
            modifier = Modifier.fillMaxWidth(),
            value = challengeId,
            onValueChange = { challengeId = it },
            label = { Text("Challenge ID") },
            singleLine = true
        )
        OutlinedTextField(
            modifier = Modifier.fillMaxWidth(),
            value = serviceCode,
            onValueChange = { serviceCode = it },
            label = { Text("Pairing code") },
            singleLine = true
        )
        OutlinedTextField(
            modifier = Modifier.fillMaxWidth(),
            value = deviceLabel,
            onValueChange = { deviceLabel = it },
            label = { Text("Device label") },
            singleLine = true
        )
        Button(onClick = { onPair(ImbasPairingRequest(challengeId = challengeId, code = serviceCode, deviceLabel = deviceLabel)) }) {
            Text("Complete pairing")
        }
        if (mobileSession != null) {
            OutlinedButton(onClick = onForget) { Text("Forget/revoke local session") }
            StatusCard(title = "Stored session", body = "${mobileSession.deviceLabel} · ${mobileSession.sessionId} · ${mobileSession.scopes.joinToString()}")
        }
        StatusCard(title = "Pairing state", body = lastPairingMessage)
    }
}

@Composable
fun AiWorldScreen(status: ImbasStatus?, serviceUrl: String, connectionMessage: String, onRefresh: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("AI world status", style = MaterialTheme.typography.titleLarge)
        StatusCard("Service", status?.service ?: "not connected")
        StatusCard("Conduit URL", serviceUrl)
        StatusCard("Connection", connectionMessage)
        Button(onClick = onRefresh) { Text("Refresh live status") }
        Card {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("Current scaffold counts", fontWeight = FontWeight.Bold)
                Text("Status: ${status?.status ?: "unknown"}")
                Text("Runs: ${status?.counts?.runs ?: 0}")
                Text("Runledger items: ${status?.counts?.runledger ?: 0}")
                Text("Lorekeeper proposals: ${status?.counts?.lorekeeperProposals ?: 0}")
                Text("Mobile sessions: ${status?.counts?.mobileSessions ?: 0}")
            }
        }
    }
}

@Composable
fun RunledgerScreen(items: List<RunledgerItem>) {
    var query by remember { mutableStateOf("") }
    val filteredItems = remember(items, query) {
        val needle = query.trim().lowercase()
        if (needle.isBlank()) items else items.filter { item ->
            listOf(item.title, item.outcome, item.createdAt, item.summary, item.refs.joinToString(" "))
                .any { value -> value.lowercase().contains(needle) }
        }
    }
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Runledger", style = MaterialTheme.typography.titleLarge)
        OutlinedTextField(
            modifier = Modifier.fillMaxWidth(),
            value = query,
            onValueChange = { query = it },
            label = { Text("Filter runs, outcomes, refs") },
            singleLine = true
        )
        Text("Showing ${filteredItems.size} of ${items.size} entries", style = MaterialTheme.typography.bodySmall)
        filteredItems.forEach { item ->
            Card {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(item.title, fontWeight = FontWeight.Bold)
                    Text("Outcome: ${item.outcome}")
                    Text("When: ${item.createdAt}")
                    if (item.summary.isNotBlank()) Text(item.summary)
                    if (item.refs.isNotEmpty()) Text("Refs: ${item.refs.joinToString()}")
                }
            }
        }
        if (filteredItems.isEmpty()) StatusCard("No matching entries", "Try a different run title, outcome, or reference.")
    }
}

@Composable
fun LorekeeperReviewScreen(proposals: List<LorekeeperProposalItem>, actionMessage: String, canReview: Boolean, onApprove: (String) -> Unit, onReject: (String) -> Unit) {
    var query by remember { mutableStateOf("") }
    var statusFilter by remember { mutableStateOf("all") }
    val statuses = remember(proposals) { listOf("all") + proposals.map { it.status.ifBlank { "unknown" } }.distinct().sorted() }
    val filteredProposals = remember(proposals, query, statusFilter) {
        val needle = query.trim().lowercase()
        proposals.filter { proposal ->
            val statusMatches = statusFilter == "all" || proposal.status == statusFilter
            val textMatches = needle.isBlank() || listOf(
                proposal.title,
                proposal.status,
                proposal.targetPageId.orEmpty(),
                proposal.rationale,
                proposal.markdownPreview,
                proposal.sources.joinToString(" ")
            ).any { value -> value.lowercase().contains(needle) }
            statusMatches && textMatches
        }
    }
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Lorekeeper review", style = MaterialTheme.typography.titleLarge)
        Text(if (canReview) "Paired session can approve or reject proposals. Apply remains desktop-guarded." else "Pair before sending proposal decisions.")
        StatusCard("Last action", actionMessage)
        OutlinedTextField(
            modifier = Modifier.fillMaxWidth(),
            value = query,
            onValueChange = { query = it },
            label = { Text("Filter proposals") },
            singleLine = true
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            statuses.forEach { status ->
                if (status == statusFilter) {
                    Button(onClick = { statusFilter = status }) { Text(status) }
                } else {
                    OutlinedButton(onClick = { statusFilter = status }) { Text(status) }
                }
            }
        }
        Text("Showing ${filteredProposals.size} of ${proposals.size} proposals", style = MaterialTheme.typography.bodySmall)
        filteredProposals.forEach { proposal ->
            Card {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(proposal.title, fontWeight = FontWeight.Bold)
                    Text("Status: ${proposal.status}")
                    Text("Target: ${proposal.targetPageId ?: "No target page"}")
                    if (proposal.rationale.isNotBlank()) Text("Rationale: ${proposal.rationale}")
                    if (proposal.markdownPreview.isNotBlank()) StatusCard(title = "Preview", body = proposal.markdownPreview)
                    if (proposal.sources.isNotEmpty()) Text("Sources: ${proposal.sources.joinToString()}")
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(enabled = canReview, onClick = { onApprove(proposal.id) }) { Text("Approve") }
                        OutlinedButton(enabled = canReview, onClick = { onReject(proposal.id) }) { Text("Reject") }
                    }
                }
            }
        }
        if (filteredProposals.isEmpty()) StatusCard("No matching proposals", "Try a different status or search term.")
    }
}


@Composable
fun CaptureScreen(mobileSession: ImbasMobileSession?, actionMessage: String, initialNote: String? = null, voiceDraft: String? = null, voiceMessage: String? = null, onStartVoiceCapture: () -> Unit = {}, onCapture: (String) -> Unit) {
    var note by remember { mutableStateOf(initialNote.orEmpty()) }
    LaunchedEffect(initialNote) {
        if (!initialNote.isNullOrBlank() && note.isBlank()) note = initialNote
    }
    LaunchedEffect(voiceDraft) {
        if (!voiceDraft.isNullOrBlank()) note = listOf(note, voiceDraft).filter { it.isNotBlank() }.joinToString("\n\n")
    }
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Capture note", style = MaterialTheme.typography.titleLarge)
        Text("Send a lightweight private observation into Conduit. Shared text and voice transcripts open here as drafts; raw secrets are still redacted by Imbas OS before durable storage.")
        OutlinedTextField(
            modifier = Modifier.fillMaxWidth(),
            value = note,
            onValueChange = { note = it },
            label = { Text("Private note") },
            minLines = 4
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = onStartVoiceCapture) { Text("Dictate") }
            Button(enabled = mobileSession != null && note.isNotBlank(), onClick = { onCapture(note); note = "" }) {
                Text("Capture to Conduit")
            }
        }
        StatusCard("Pairing", mobileSession?.let { "Paired as ${it.deviceLabel}" } ?: "Pair before capturing notes")
        StatusCard("Voice", voiceMessage ?: "No voice transcript captured yet")
        StatusCard("Last action", actionMessage)
    }
}

@Composable
fun DiagnosticsScreen(serviceUrl: String, mobileSession: ImbasMobileSession?, checks: List<DiagnosticCheck>, onRunDiagnostics: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Diagnostics", style = MaterialTheme.typography.titleLarge)
        Text("Check Conduit reachability, mobile auth, and stored session scopes before deeper phone testing.")
        StatusCard("Conduit URL", serviceUrl)
        StatusCard("Pairing", mobileSession?.let { "Paired as ${it.deviceLabel} · ${it.sessionId}" } ?: "No paired session stored")
        StatusCard("Scopes", mobileSession?.scopes?.joinToString()?.ifBlank { "No scopes reported" } ?: "Pair to see granted scopes")
        Button(onClick = onRunDiagnostics) { Text("Run diagnostics") }
        if (checks.isEmpty()) {
            StatusCard("Checks", "Not run yet")
        } else {
            checks.forEach { check ->
                Card(colors = CardDefaults.cardColors(containerColor = if (check.ok) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.errorContainer)) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(check.label, fontWeight = FontWeight.Bold)
                        Text(if (check.ok) "OK" else "Needs attention")
                        Text(check.detail)
                    }
                }
            }
        }
    }
}

@Composable
private fun StatusCard(title: String, body: String) {
    Card {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(title, fontWeight = FontWeight.Bold)
            Text(body)
        }
    }
}


private data class ParsedPairingPayload(val serviceUrl: String?, val challengeId: String, val code: String)

private fun parsePairingPayload(payload: String): ParsedPairingPayload? {
    return try {
        val uri = Uri.parse(payload.trim())
        if (uri.scheme != "imbas" || uri.host != "pair") return null
        val challengeId = uri.getQueryParameter("challengeId")?.trim().orEmpty()
        val code = uri.getQueryParameter("code")?.trim().orEmpty()
        val serviceUrl = uri.getQueryParameter("serviceUrl")?.trim()
        if (challengeId.isBlank() || code.isBlank()) null else ParsedPairingPayload(serviceUrl, challengeId, code)
    } catch (_: Exception) {
        null
    }
}
