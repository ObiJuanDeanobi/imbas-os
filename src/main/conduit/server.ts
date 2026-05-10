import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';
import { createConduitRecordStore, ConduitRecordStore, handleConduitRequest } from './localApi.js';

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
