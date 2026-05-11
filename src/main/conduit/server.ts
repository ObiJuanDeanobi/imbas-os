import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';
import { createConduitRecordStore, ConduitRecordStore, handleConduitRequest } from './localApi.js';
import { authenticateMobileSession, MobileSessionScope } from '../mobile/pairing.js';

export interface ConduitLoopbackServiceOptions {
  host?: string;
  port?: number;
  store?: ConduitRecordStore;
}

export interface ConduitLoopbackService {
  host: string;
  port: number;
  url: string;
  store: ConduitRecordStore;
  close(): Promise<void>;
}

export async function startConduitLoopbackService(options: ConduitLoopbackServiceOptions = {}): Promise<ConduitLoopbackService> {
  const host = options.host ?? '127.0.0.1';
  const store = options.store ?? createConduitRecordStore();
  const server = createServer((req, res) => {
    void handleNodeRequest(req, res, store);
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? 0, host, () => {
      server.off('error', reject);
      resolve();
    });
  });

  const address = server.address() as AddressInfo;
  const port = address.port;
  return {
    host,
    port,
    url: `http://${host}:${port}`,
    store,
    close: () => closeServer(server)
  };
}

async function handleNodeRequest(req: IncomingMessage, res: ServerResponse, store: ConduitRecordStore): Promise<void> {
  try {
    const request = await nodeRequestToFetchRequest(req);
    const authorization = authorizeLoopbackRequest(request, store);
    if (authorization) {
      res.statusCode = authorization.status;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(authorization.body));
      return;
    }
    const response = await handleConduitRequest(request, store);
    res.statusCode = response.status;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(response.body));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'internal_error', message: error instanceof Error ? error.message : String(error) }));
  }
}

function authorizeLoopbackRequest(request: Request, store: ConduitRecordStore): { status: number; body: unknown } | null {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'GET') {
    if (path === '/v0/status') return null;
    if (path === '/v0/events') return requireMobileScope(request, store, 'events.read');
    if (path === '/v0/runs' || /^\/v0\/replay\/runs\/[^/]+$/.test(path)) return requireMobileScope(request, store, 'runs.read');
    if (path === '/v0/runledger') return requireMobileScope(request, store, 'runledger.read');
    if (path === '/v0/wiki/proposals' || path === '/v0/wiki/snapshots') return requireMobileScope(request, store, 'lorekeeper.read');
    return null;
  }

  if (request.method !== 'POST') return null;
  if (path === '/v0/mobile/pairing-challenges' || path === '/v0/mobile/pairing-challenges/complete') return null;

  if (path === '/v0/events') return requireMobileScope(request, store, 'capture.write');
  if (path === '/v0/search' || path === '/v0/context-packs') return requireMobileScope(request, store, 'events.read');
  if (/^\/v0\/wiki\/proposals\/[^/]+\/(approve|reject)$/.test(path)) return requireMobileScope(request, store, 'approvals.review');
  if (/^\/v0\/mobile\/sessions\/[^/]+\/revoke$/.test(path)) return requireMobileScope(request, store, 'status.read');

  if (path === '/v0/agents/openclaw/dispatch') return { status: 403, body: { errors: ['loopback Agent Console dispatch is disabled; use the desktop Agent Console'] } };
  if (path === '/v0/wiki/proposals' || /^\/v0\/wiki\/proposals\/[^/]+\/(preview|apply)$/.test(path)) return { status: 403, body: { errors: ['loopback Lorekeeper mutation is disabled; use the desktop review path'] } };
  if (path === '/v0/runs' || path === '/v0/artifacts') return { status: 403, body: { errors: ['loopback write endpoint is disabled; use desktop or an approved connector boundary'] } };
  return null;
}

function requireMobileScope(request: Request, store: ConduitRecordStore, scope: MobileSessionScope): { status: number; body: unknown } | null {
  const token = readBearerToken(request);
  if (!token || !authenticateMobileSession(store.mobile, token, scope)) return { status: 401, body: { errors: [`mobile scope ${scope} is required`] } };
  return null;
}

function readBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

async function nodeRequestToFetchRequest(req: IncomingMessage): Promise<Request> {
  const host = req.headers.host ?? '127.0.0.1';
  const url = `http://${host}${req.url ?? '/'}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) headers.set(key, value.join(', '));
    else if (value !== undefined) headers.set(key, String(value));
  }
  const method = req.method ?? 'GET';
  const body = method === 'GET' || method === 'HEAD' ? undefined : (await readRequestBody(req)).toString('utf8');
  return new Request(url, { method, headers, body });
}

async function readRequestBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
