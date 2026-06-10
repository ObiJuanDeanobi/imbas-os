import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createArtifact, defaultVaultRoot, readArtifact, searchArtifacts, updateArtifactNotes } from '../main/vault/vaultStore.js';
import { createDurableConduitRecordStore } from '../main/conduit/durableStore.js';
import { searchRunledger } from '../main/runledger/store.js';
import os from 'node:os';
import path from 'node:path';

const server = new Server(
  {
    name: 'imbas-os-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'imbas_search_artifacts',
        description: 'Search for artifacts in the Imbas OS vault using keywords.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
          },
          required: ['query'],
        },
      },
      {
        name: 'imbas_read_artifact',
        description: 'Read the contents of an artifact bundle (metadata, HTML, notes).',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Artifact ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'imbas_create_artifact',
        description: 'Create a new artifact in the Imbas OS vault.',
        inputSchema: {
          type: 'object',
          properties: {
            html: { type: 'string', description: 'HTML content of the artifact' },
            title: { type: 'string', description: 'Title of the artifact' },
            prompt: { type: 'string', description: 'Prompt or instruction that generated this artifact' },
          },
          required: ['html', 'title'],
        },
      },
      {
        name: 'imbas_update_notes',
        description: 'Update the notes of an artifact.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Artifact ID' },
            notes: { type: 'string', description: 'New notes markdown content' },
          },
          required: ['id', 'notes'],
        },
      },
      {
        name: 'imbas_search_runledger',
        description: 'Search the local Imbas OS Conduit Runledger for past agent events, runs, and provenance traces.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query for the Runledger' },
            limit: { type: 'number', description: 'Maximum number of entries to return (default 10)' },
          },
          required: ['query'],
        },
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const defaultAppData = process.platform === 'darwin'
    ? path.join(os.homedir(), 'Library', 'Application Support', 'imbas-os')
    : process.platform === 'win32'
    ? path.join(process.env.APPDATA || os.homedir(), 'imbas-os')
    : path.join(os.homedir(), '.config', 'imbas-os');
  const root = process.env.ARTIFACT_VAULT_DIR || defaultVaultRoot(defaultAppData);

  if (request.params.name === 'imbas_search_artifacts') {
    const query = request.params.arguments?.query as string;
    const results = await searchArtifacts(root, query);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  if (request.params.name === 'imbas_read_artifact') {
    const id = request.params.arguments?.id as string;
    const bundle = await readArtifact(root, id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(bundle, null, 2),
        },
      ],
    };
  }

  if (request.params.name === 'imbas_create_artifact') {
    const html = request.params.arguments?.html as string;
    const title = request.params.arguments?.title as string;
    const prompt = request.params.arguments?.prompt as string;
    
    const bundle = await createArtifact(root, { html, title, prompt });
    return {
      content: [
        {
          type: 'text',
          text: `Created artifact ${bundle.metadata.id} successfully.\n\n${JSON.stringify(bundle.metadata, null, 2)}`,
        },
      ],
    };
  }

  if (request.params.name === 'imbas_update_notes') {
    const id = request.params.arguments?.id as string;
    const notes = request.params.arguments?.notes as string;
    const bundle = await updateArtifactNotes(root, id, notes);
    return {
      content: [
        {
          type: 'text',
          text: `Updated notes for artifact ${bundle.metadata.id} successfully.`,
        },
      ],
    };
  }

  if (request.params.name === 'imbas_search_runledger') {
    const query = request.params.arguments?.query as string;
    const limit = (request.params.arguments?.limit as number | undefined) ?? 10;
    const conduitDir = path.join(root, 'conduit');
    const store = await createDurableConduitRecordStore({ dir: conduitDir });
    const results = searchRunledger(store.runledger, query, limit);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  throw new Error(`Tool not found: ${request.params.name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Imbas OS MCP server running on stdio');
}

main().catch((error) => {
  console.error('MCP server error:', error);
  process.exit(1);
});
