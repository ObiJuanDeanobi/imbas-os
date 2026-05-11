import { app, BrowserWindow, dialog, ipcMain, protocol, session } from 'electron';
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createArtifact, createArtifactFromFile, createSnapshot, defaultVaultRoot, exportArtifactBundleToDirectory, exportArtifactJson, exportArtifactMarkdown, exportArtifactPromptPackage, getArtifactGraph, importArtifactBundleFromDirectory, initVault, listArtifacts, listSnapshots, readArtifact, restoreSnapshot, searchArtifacts, updateArtifactMetadata, updateArtifactNotes } from './vault/vaultStore.js';
import { exportMixedPromptPackage } from './vault/mixedExport.js';
import { rebuildSearchIndex, searchArtifactsWithIndex } from './vault/searchIndex.js';
import { renderPolicyForTrustLevel, shouldBlockArtifactRequest, wrapHtmlForSandbox } from './security/artifactPolicy.js';
import { seedDemoVault } from './demo/demoVault.js';
import { buildWikiBridgeReport, indexMarkdownVault, mergeArtifactAndWikiGraphs, readMarkdownPage, searchMarkdownPages } from './wiki/wikiBridge.js';
import { getSyncStatus, rebuildSyncManifest } from './sync/syncManifest.js';
import { createMarkdownPage, getMarkdownGraph, readMarkdownPageFromVault, searchMarkdownPagesInVault, updateMarkdownPage } from './markdown/markdownStore.js';
import { startConduitLoopbackService, ConduitLoopbackService } from './conduit/server.js';
import { createDurableConduitRecordStore } from './conduit/durableStore.js';
import { createConduitRecordStore, ConduitRecordStore, handleConduitRequest } from './conduit/localApi.js';
import { createMemsocketCliClient } from './memsocket/cliClient.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const devServerUrl = process.env.IMBAS_OS_DEV_SERVER_URL ?? process.env.ARTIFACT_VAULT_DEV_SERVER_URL;
const capturePath = process.env.IMBAS_OS_CAPTURE_PATH ?? process.env.ARTIFACT_VAULT_CAPTURE_PATH;
let vaultRoot = '';
let wikiBridgeRoot = '';
let conduitService: ConduitLoopbackService | null = null;
let conduitStore: ConduitRecordStore = createConduitRecordStore();

async function prepareRuntime() {
  vaultRoot = defaultVaultRoot(app.getPath('userData'));
  await initVault(vaultRoot);
  conduitStore = await createDurableConduitRecordStore({ dir: path.join(vaultRoot, 'conduit') });
  conduitStore.vaultRoot = vaultRoot;
  conduitStore.markdownRoot = vaultRoot;
  configureMemsocketModule();
  installArtifactProtocol();
  installNetworkBlocker();
  await maybeStartConduitLoopback();
}

async function maybeStartConduitLoopback() {
  if (process.env.IMBAS_OS_CONDUIT_LOOPBACK !== '1') return;
  if (conduitService) return;
  const port = process.env.IMBAS_OS_CONDUIT_PORT ? Number(process.env.IMBAS_OS_CONDUIT_PORT) : 0;
  conduitService = await startConduitLoopbackService({ port, store: conduitStore });
  console.log(`Imbas OS Conduit loopback listening on ${conduitService.url}`);
}


function configureMemsocketModule() {
  const configPath = process.env.IMBAS_OS_MEMSOCKET_CONFIG;
  if (!configPath) return;
  conduitStore.memsocket = createMemsocketCliClient({
    configPath,
    cwd: process.env.IMBAS_OS_MEMSOCKET_CWD,
    namespace: process.env.IMBAS_OS_MEMSOCKET_NAMESPACE ?? 'imbas-os'
  });
  conduitStore.modules.memsocket = {
    ...conduitStore.modules.memsocket,
    enabled: true,
    available: true,
    configured: true,
    health: 'ok',
    notes: `Configured with ${configPath}`
  };
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    title: 'Imbas OS',
    webPreferences: {
      preload: path.join(__dirname, '../preload/api.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  if (capturePath) {
    await seedDemoVault(vaultRoot);
  }

  if (devServerUrl) await win.loadURL(devServerUrl);
  else await win.loadFile(path.join(__dirname, '../renderer/index.html'));

  if (capturePath) {
    setTimeout(async () => {
      const image = await win.webContents.capturePage();
      await writeFile(capturePath, image.toPNG());
      app.quit();
    }, 1500);
  }

  if (process.env.IMBAS_OS_SMOKE === '1' || process.env.ARTIFACT_VAULT_SMOKE === '1') {
    setTimeout(() => app.quit(), 500);
  }
}

function installArtifactProtocol() {
  protocol.handle('artifact', async (request) => {
    const url = new URL(request.url);
    const id = url.hostname;
    const bundle = await readArtifact(vaultRoot, id);
    const policy = renderPolicyForTrustLevel(bundle.metadata.trustLevel);
    const html = wrapHtmlForSandbox(bundle.html, policy);
    return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  });
}

function installNetworkBlocker() {
  const filter = { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] };
  session.defaultSession.webRequest.onBeforeRequest(filter, (details, callback) => {
    const detailsWithInitiator = details as unknown as { initiator?: unknown };
    const initiator = typeof detailsWithInitiator.initiator === 'string' ? detailsWithInitiator.initiator : '';
    const referrer = typeof details.referrer === 'string' ? details.referrer : '';
    const fromArtifact = initiator.startsWith('artifact://') || referrer.startsWith('artifact://');
    callback({ cancel: Boolean(fromArtifact && shouldBlockArtifactRequest(details.url)) });
  });
}

ipcMain.handle('conduit:status', async () => (await handleConduitRequest(new Request('http://127.0.0.1/v0/status'), conduitStore)).body);
ipcMain.handle('conduit:search', async (_event, query: string) => (await handleConduitRequest(new Request('http://127.0.0.1/v0/search', { method: 'POST', body: JSON.stringify({ query }) }), conduitStore)).body);
ipcMain.handle('conduit:context-pack', async (_event, task: string) => (await handleConduitRequest(new Request('http://127.0.0.1/v0/context-packs', { method: 'POST', body: JSON.stringify({ task, projectId: 'imbas-os', maxTokens: 1200 }) }), conduitStore)).body);
ipcMain.handle('vault:info', async () => initVault(vaultRoot));
ipcMain.handle('sync:status', async () => getSyncStatus(vaultRoot));
ipcMain.handle('sync:rebuild-manifest', async () => rebuildSyncManifest(vaultRoot));
ipcMain.handle('artifacts:list', async () => listArtifacts(vaultRoot));
ipcMain.handle('artifacts:search', async (_event, query: string) => searchArtifacts(vaultRoot, query));
ipcMain.handle('artifacts:search-indexed', async (_event, query: string) => searchArtifactsWithIndex(vaultRoot, query));
ipcMain.handle('vault:search-unified', async (_event, query: string) => {
  const artifactResults = (await searchArtifacts(vaultRoot, query)).map((artifact) => ({
    id: artifact.id,
    kind: 'artifact' as const,
    title: artifact.title,
    tags: artifact.tags,
    project: artifact.project,
    matchReason: artifact.matchReason,
    trustLevel: artifact.trustLevel,
    createdAt: artifact.createdAt
  }));
  const wikiResults = wikiBridgeRoot ? await searchMarkdownPages(wikiBridgeRoot, query) : [];
  const localMarkdownResults = await searchMarkdownPagesInVault(vaultRoot, query);
  return [...artifactResults, ...localMarkdownResults, ...wikiResults];
});
ipcMain.handle('search-index:rebuild', async () => rebuildSearchIndex(vaultRoot));
ipcMain.handle('artifacts:graph', async () => {
  const artifactGraph = await getArtifactGraph(vaultRoot);
  const localMarkdownGraph = await getMarkdownGraph(vaultRoot);
  const withLocalMarkdown = mergeArtifactAndWikiGraphs(artifactGraph, localMarkdownGraph);
  if (!wikiBridgeRoot) return withLocalMarkdown;
  const wikiGraph = await indexMarkdownVault(wikiBridgeRoot);
  return mergeArtifactAndWikiGraphs(withLocalMarkdown, wikiGraph);
});
ipcMain.handle('artifacts:create', async (_event, input) => createArtifact(vaultRoot, input));
ipcMain.handle('artifacts:import-file', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'HTML artifacts', extensions: ['html', 'htm'] }] });
  if (result.canceled || !result.filePaths[0]) return null;
  return createArtifactFromFile(vaultRoot, result.filePaths[0]);
});
ipcMain.handle('artifacts:import-bundle-directory', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'], title: 'Import artifact bundle folder' });
  if (result.canceled || !result.filePaths[0]) return null;
  return importArtifactBundleFromDirectory(vaultRoot, result.filePaths[0]);
});
ipcMain.handle('artifacts:read', async (_event, id: string) => readArtifact(vaultRoot, id));
ipcMain.handle('artifacts:update-notes', async (_event, id: string, notes: string) => updateArtifactNotes(vaultRoot, id, notes));
ipcMain.handle('artifacts:update-metadata', async (_event, id: string, input) => updateArtifactMetadata(vaultRoot, id, input));
ipcMain.handle('artifacts:snapshot', async (_event, id: string) => createSnapshot(vaultRoot, id));
ipcMain.handle('artifacts:snapshots', async (_event, id: string) => listSnapshots(vaultRoot, id));
ipcMain.handle('artifacts:restore-snapshot', async (_event, id: string, snapshotId: string) => restoreSnapshot(vaultRoot, id, snapshotId));
ipcMain.handle('artifacts:export-markdown', async (_event, id: string) => exportArtifactMarkdown(vaultRoot, id));
ipcMain.handle('artifacts:export-json', async (_event, id: string) => exportArtifactJson(vaultRoot, id));
ipcMain.handle('artifacts:export-prompt-package', async (_event, id: string) => exportArtifactPromptPackage(vaultRoot, id));
ipcMain.handle('vault:export-mixed-prompt-package', async (_event, input) => exportMixedPromptPackage(vaultRoot, wikiBridgeRoot, input));
ipcMain.handle('artifacts:export-bundle-directory', async (_event, id: string) => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'], title: 'Choose export destination' });
  if (result.canceled || !result.filePaths[0]) return null;
  return exportArtifactBundleToDirectory(vaultRoot, id, result.filePaths[0]);
});
ipcMain.handle('wiki:index-directory', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'], title: 'Index Markdown/wiki folder in read-only bridge mode' });
  if (result.canceled || !result.filePaths[0]) return null;
  wikiBridgeRoot = result.filePaths[0];
  const artifactGraph = await getArtifactGraph(vaultRoot);
  return mergeArtifactAndWikiGraphs(artifactGraph, await indexMarkdownVault(wikiBridgeRoot));
});
ipcMain.handle('wiki:report', async () => {
  if (!wikiBridgeRoot) return null;
  return buildWikiBridgeReport(wikiBridgeRoot, await getArtifactGraph(vaultRoot));
});
ipcMain.handle('wiki:read', async (_event, pageId: string) => {
  if (pageId.startsWith('wiki:pages/')) return readMarkdownPageFromVault(vaultRoot, pageId);
  if (!wikiBridgeRoot) return null;
  return readMarkdownPage(wikiBridgeRoot, pageId);
});
ipcMain.handle('markdown:create', async (_event, input) => createMarkdownPage(vaultRoot, input));
ipcMain.handle('markdown:update', async (_event, pageId: string, markdown: string) => updateMarkdownPage(vaultRoot, pageId, markdown));
ipcMain.handle('demo:seed', async () => seedDemoVault(vaultRoot));
ipcMain.handle('sample:malicious', async () => readFile(path.join(app.getAppPath(), 'test/fixtures/malicious-artifact.html'), 'utf8'));

async function runSecuritySmoke() {
  await prepareRuntime();
  const fixture = await readFile(path.join(app.getAppPath(), 'test/fixtures/malicious-artifact.html'), 'utf8');
  const created = await createArtifact(vaultRoot, { title: 'Security smoke fixture', html: fixture, sourceType: 'file', tags: ['security-smoke'] });
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  await win.loadURL(`artifact://${created.metadata.id}/`);
  await new Promise((resolve) => setTimeout(resolve, 750));
  const bodyText = await win.webContents.executeJavaScript('document.body.innerText');
  const required = ['typeof process: undefined', 'typeof require: undefined', 'typeof artifactVault bridge: undefined', 'network fetch: blocked'];
  const missing = required.filter((item) => !bodyText.includes(item));
  if (missing.length) {
    console.error(`Security smoke failed; missing: ${missing.join(', ')}`);
    console.error(bodyText);
    app.exit(1);
    return;
  }
  console.log('security smoke passed');
  app.exit(0);
}

app.whenReady().then(async () => {
  if (process.env.IMBAS_OS_SECURITY_SMOKE === '1' || process.env.ARTIFACT_VAULT_SECURITY_SMOKE === '1') return runSecuritySmoke();
  await prepareRuntime();
  return createWindow();
});

app.on('before-quit', () => {
  if (conduitService) {
    void conduitService.close();
    conduitService = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
