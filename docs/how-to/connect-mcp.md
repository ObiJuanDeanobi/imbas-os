# Connecting External AI Tools via MCP

Imbas OS includes a bundled Model Context Protocol (MCP) server that allows any standard MCP-compatible AI agent (like Claude Code, Cursor, or ChatGPT desktop) to search, read, and write to your local Imbas OS Vault.

## Connecting Claude Code

1. In your project directory or global config, configure Claude Code to use the Imbas OS MCP server.
2. Edit your `.claudecode/mcp.json` or `~/.gemini/config/mcp_config.json` (or similar depending on the agent):

```json
{
  "mcpServers": {
    "imbas-os": {
      "command": "node",
      "args": [
        "/path/to/imbas-os/dist/mcp/index.js"
      ],
      "env": {
        "ARTIFACT_VAULT_DIR": "/optional/path/to/custom/vault"
      }
    }
  }
}
```

## Connecting Cursor

1. Open **Cursor Settings** > **Features** > **MCP Servers**.
2. Click **Add New MCP Server**.
3. Name: `imbas-os`
4. Type: `stdio`
5. Command: `node /path/to/imbas-os/dist/mcp/index.js`
6. Click **Save**.

## Available Tools

Once connected, your AI agent will have access to the following tools:
- `imbas_search_artifacts`: Search for artifacts using keywords.
- `imbas_read_artifact`: Read the full metadata, HTML, and notes of an artifact.
- `imbas_create_artifact`: Create a new artifact in your local vault.
- `imbas_update_notes`: Update the Markdown notes associated with an artifact.

These tools allow the AI to seamlessly index your previous work and securely save new outputs directly into your Imbas OS vault without leaving the chat environment.
