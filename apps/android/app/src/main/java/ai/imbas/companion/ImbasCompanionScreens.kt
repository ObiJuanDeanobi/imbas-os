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
import kotlinx.coroutines.launch

enum class CompanionTab(val label: String) {
    Pair("Pair"),
    Status("Status"),
    Runledger("Runs"),
    Lorekeeper("Wiki")
}

@Composable
fun ImbasCompanionApp() {
    var selectedTab by remember { mutableStateOf(CompanionTab.Status) }
    var serviceUrl by remember { mutableStateOf("http://100.81.12.30:3077") }
    val context = LocalContext.current
    val sessionStore = remember { SecureSessionStore(context) }
    var mobileSession by remember { mutableStateOf<ImbasMobileSession?>(null) }
    var lastPairingMessage by remember { mutableStateOf("Not paired yet") }

    var status by remember { mutableStateOf<ImbasStatus?>(null) }
    var runledgerItems by remember { mutableStateOf<List<RunledgerItem>>(emptyList()) }
    var proposals by remember { mutableStateOf<List<LorekeeperProposalItem>>(emptyList()) }
    var connectionMessage by remember { mutableStateOf("Not connected yet") }
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
                        RunledgerItem("run-001", "Android private-preview APK installed", "success", "today"),
                        RunledgerItem("run-002", "Conduit mobile endpoints scaffolded", "draft", "private preview"),
                        RunledgerItem("run-003", "Secure token storage pending", "next", "upcoming")
                    )
                    proposals = listOf(
                        LorekeeperProposalItem("prop-001", "Android companion install notes", "draft", "AI_OS/Imbas/mobile"),
                        LorekeeperProposalItem("prop-002", "Pairing flow hardening", "planned", "AI_OS/Imbas/security")
                    )
                }
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
                        onApprove = { },
                        onReject = { }
                    )
                }
            }

            Text(
                "Private preview build — live Conduit reads and Android Keystore-backed pairing token storage.",
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
fun PairingScreen(mobileSession: ImbasMobileSession?, lastPairingMessage: String, onPair: (ImbasPairingRequest) -> Unit, onForget: () -> Unit) {
    var challengeId by remember { mutableStateOf("") }
    var serviceCode by remember { mutableStateOf("") }
    var deviceLabel by remember { mutableStateOf("Johnathan's Android") }
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Pair with Imbas OS", style = MaterialTheme.typography.titleLarge)
        Text("Enter the challenge ID and 6-digit code from the Imbas OS Command Center. The returned mobile token is encrypted with Android Keystore.")
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
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Runledger", style = MaterialTheme.typography.titleLarge)
        items.forEach { item ->
            Card {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(item.title, fontWeight = FontWeight.Bold)
                    Text("Outcome: ${item.outcome}")
                    Text("When: ${item.createdAt}")
                }
            }
        }
    }
}

@Composable
fun LorekeeperReviewScreen(proposals: List<LorekeeperProposalItem>, onApprove: (String) -> Unit, onReject: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Lorekeeper review", style = MaterialTheme.typography.titleLarge)
        proposals.forEach { proposal ->
            Card {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(proposal.title, fontWeight = FontWeight.Bold)
                    Text("Status: ${proposal.status}")
                    Text("Target: ${proposal.targetPageId ?: "No target page"}")
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = { onApprove(proposal.id) }) { Text("Approve") }
                        OutlinedButton(onClick = { onReject(proposal.id) }) { Text("Reject") }
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
