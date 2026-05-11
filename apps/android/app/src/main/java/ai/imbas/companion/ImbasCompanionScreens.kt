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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

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
    var lastPairingMessage by remember { mutableStateOf("Not paired yet") }

    val status = ImbasStatus(
        service = "imbas-os-conduit",
        status = "private-preview scaffold",
        counts = ImbasCounts(runs = 3, runledger = 3, lorekeeperProposals = 2, mobileSessions = 0)
    )
    val runledgerItems = listOf(
        RunledgerItem("run-001", "Android private-preview APK installed", "success", "today"),
        RunledgerItem("run-002", "Conduit mobile endpoints scaffolded", "draft", "private preview"),
        RunledgerItem("run-003", "Secure token storage pending", "next", "upcoming")
    )
    val proposals = listOf(
        LorekeeperProposalItem("prop-001", "Android companion install notes", "draft", "AI_OS/Imbas/mobile"),
        LorekeeperProposalItem("prop-002", "Pairing flow hardening", "planned", "AI_OS/Imbas/security")
    )

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
                        lastPairingMessage = lastPairingMessage,
                        onPair = { request ->
                            lastPairingMessage = "Pairing request staged for ${request.deviceLabel} (${request.code.ifBlank { "no code entered" }})"
                        }
                    )
                    CompanionTab.Status -> AiWorldScreen(status = status, serviceUrl = serviceUrl)
                    CompanionTab.Runledger -> RunledgerScreen(items = runledgerItems)
                    CompanionTab.Lorekeeper -> LorekeeperReviewScreen(
                        proposals = proposals,
                        onApprove = { },
                        onReject = { }
                    )
                }
            }

            Text(
                "Private preview build — local demo data until live Conduit HTTP is wired in.",
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
fun PairingScreen(lastPairingMessage: String, onPair: (ImbasPairingRequest) -> Unit) {
    var serviceCode by remember { mutableStateOf("") }
    var deviceLabel by remember { mutableStateOf("Johnathan's Android") }
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Pair with Imbas OS", style = MaterialTheme.typography.titleLarge)
        Text("This stages the pairing payload locally for now. Next build will POST it to Conduit and store the session token securely.")
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
        Button(onClick = { onPair(ImbasPairingRequest(challengeId = "manual", code = serviceCode, deviceLabel = deviceLabel)) }) {
            Text("Stage pairing request")
        }
        StatusCard(title = "Pairing state", body = lastPairingMessage)
    }
}

@Composable
fun AiWorldScreen(status: ImbasStatus?, serviceUrl: String) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("AI world status", style = MaterialTheme.typography.titleLarge)
        StatusCard("Service", status?.service ?: "not connected")
        StatusCard("Conduit URL", serviceUrl)
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
