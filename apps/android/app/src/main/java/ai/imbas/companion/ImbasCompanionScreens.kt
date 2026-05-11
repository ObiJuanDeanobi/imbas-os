package ai.imbas.companion

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun PairingScreen(onPair: (ImbasPairingRequest) -> Unit) {
    var serviceCode by remember { mutableStateOf("") }
    var deviceLabel by remember { mutableStateOf("Android companion") }
    Column {
        Text("Pair with Imbas OS", style = MaterialTheme.typography.headlineSmall)
        OutlinedTextField(value = serviceCode, onValueChange = { serviceCode = it }, label = { Text("Pairing code") })
        OutlinedTextField(value = deviceLabel, onValueChange = { deviceLabel = it }, label = { Text("Device label") })
        Button(onClick = { onPair(ImbasPairingRequest(challengeId = "manual", code = serviceCode, deviceLabel = deviceLabel)) }) {
            Text("Pair")
        }
    }
}

@Composable
fun AiWorldScreen(status: ImbasStatus?) {
    Column {
        Text("AI world", style = MaterialTheme.typography.headlineSmall)
        Card {
            Column {
                Text("Service: ${status?.service ?: "not connected"}")
                Text("Runs: ${status?.counts?.runs ?: 0}")
                Text("Runledger: ${status?.counts?.runledger ?: 0}")
                Text("Lorekeeper proposals: ${status?.counts?.lorekeeperProposals ?: 0}")
            }
        }
    }
}

@Composable
fun RunledgerScreen(items: List<RunledgerItem>) {
    Column {
        Text("Runledger", style = MaterialTheme.typography.headlineSmall)
        items.forEach { item ->
            Text("${item.outcome}: ${item.title}")
            Spacer(Modifier.height(4.dp))
        }
    }
}

@Composable
fun LorekeeperReviewScreen(proposals: List<LorekeeperProposalItem>, onApprove: (String) -> Unit, onReject: (String) -> Unit) {
    Column {
        Text("Lorekeeper review", style = MaterialTheme.typography.headlineSmall)
        proposals.forEach { proposal ->
            Card {
                Column {
                    Text("${proposal.status}: ${proposal.title}")
                    Text(proposal.targetPageId ?: "No target page")
                    Button(onClick = { onApprove(proposal.id) }) { Text("Approve") }
                    Button(onClick = { onReject(proposal.id) }) { Text("Reject") }
                }
            }
        }
    }
}
