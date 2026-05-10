import { spawn } from 'node:child_process';
import { ImbasContextEventDraft, ImbasContextPackRequest } from '../../shared/imbas/protocol.js';
import { imbasEventToMemsocketPayload, MemsocketContextEventPayload } from './adapter.js';

export interface MemsocketCliCommand {
  command: string;
  args: string[];
  stdin?: string;
  cwd?: string;
}

export interface MemsocketCliResult {
  status: 'ok' | 'error';
  stdout: string;
  stderr: string;
  json?: unknown;
}

export type MemsocketCliRunner = (command: MemsocketCliCommand) => Promise<MemsocketCliResult>;

export interface MemsocketCliClientOptions {
  pythonCommand?: string;
  moduleArgs?: string[];
  configPath?: string;
  cwd?: string;
  namespace?: string;
  runner?: MemsocketCliRunner;
}

export interface MemsocketCliClient {
  writeEvent(event: ImbasContextEventDraft): Promise<MemsocketCliResult>;
  search(query: string, options?: { namespace?: string; limit?: number; sessionId?: string }): Promise<MemsocketCliResult>;
  contextPack(request: ImbasContextPackRequest): Promise<MemsocketCliResult>;
}

export function createMemsocketCliClient(options: MemsocketCliClientOptions = {}): MemsocketCliClient {
  const runner = options.runner ?? defaultRunner;
  const moduleArgs = options.moduleArgs ?? ['-m', 'memsocket.cli'];
  const pythonCommand = options.pythonCommand ?? 'python3';

  return {
    writeEvent(event) {
      const payload = imbasEventToMemsocketPayload(event, { namespace: options.namespace });
      return runner({
        command: pythonCommand,
        args: [...moduleArgs, 'write', '--json', ...configArgs(options), ...namespaceArgs(payload.namespace)],
        stdin: JSON.stringify(payload),
        cwd: options.cwd
      });
    },
    search(query, searchOptions = {}) {
      return runner({
        command: pythonCommand,
        args: [
          ...moduleArgs,
          'search',
          '--json',
          '--query', query,
          '--limit', String(searchOptions.limit ?? 10),
          ...configArgs(options),
          ...namespaceArgs(searchOptions.namespace ?? options.namespace),
          ...sessionArgs(searchOptions.sessionId)
        ],
        cwd: options.cwd
      });
    },
    contextPack(request) {
      return runner({
        command: pythonCommand,
        args: [
          ...moduleArgs,
          'brief',
          '--json',
          '--query', request.task,
          '--task', request.task,
          '--token-budget', String(request.maxTokens ?? 4000),
          ...configArgs(options),
          ...namespaceArgs(request.projectId ?? options.namespace)
        ],
        cwd: options.cwd
      });
    }
  };
}

export function memsocketPayloadToCliJson(payload: MemsocketContextEventPayload): string {
  return JSON.stringify(payload);
}

async function defaultRunner(command: MemsocketCliCommand): Promise<MemsocketCliResult> {
  return new Promise((resolve) => {
    const child = spawn(command.command, command.args, {
      cwd: command.cwd,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({ status: 'error', stdout, stderr: `${stderr}Memsocket CLI timed out after 30000ms` });
    }, 30_000);
    let settled = false;
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => { stdout += chunk; });
    child.stderr.on('data', (chunk: string) => { stderr += chunk; });
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({ status: 'error', stdout, stderr: `${stderr}${error.message}` });
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({ status: code === 0 ? 'ok' : 'error', stdout, stderr, json: parseJson(stdout) });
    });
    if (command.stdin) child.stdin.end(command.stdin);
    else child.stdin.end();
  });
}

function configArgs(options: MemsocketCliClientOptions): string[] {
  return options.configPath ? ['--config', options.configPath] : [];
}

function namespaceArgs(namespace?: string): string[] {
  return namespace ? ['--namespace', namespace] : [];
}

function sessionArgs(sessionId?: string): string[] {
  return sessionId ? ['--session', sessionId] : [];
}

function parseJson(stdout: string): unknown | undefined {
  try {
    return stdout.trim() ? JSON.parse(stdout) : undefined;
  } catch {
    return undefined;
  }
}
