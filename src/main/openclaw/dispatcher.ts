import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface OpenClawDispatchRequest {
  message: string;
  mode?: 'chat' | 'task';
  agent?: string;
  timeoutSeconds?: number;
}

export interface OpenClawDispatchResult {
  status: 'completed' | 'blocked' | 'failed';
  reply: string;
  sessionId?: string;
  runId?: string;
  transport?: string;
}

export interface OpenClawDispatcher {
  dispatch(request: OpenClawDispatchRequest): Promise<OpenClawDispatchResult>;
}


export function resolveOpenClawCommand(env: NodeJS.ProcessEnv = process.env): string {
  if (env.IMBAS_OS_OPENCLAW_COMMAND?.trim()) return env.IMBAS_OS_OPENCLAW_COMMAND.trim();

  const candidates = [
    join(homedir(), '.npm-global/bin/openclaw'),
    '/usr/local/bin/openclaw',
    '/usr/bin/openclaw'
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return 'openclaw';
}

function buildOpenClawChildEnv(env: NodeJS.ProcessEnv, command: string): NodeJS.ProcessEnv {
  const pathParts = [
    dirname(command),
    join(homedir(), '.npm-global/bin'),
    env.PATH ?? ''
  ].filter((part) => part && part !== '.');
  return {
    ...env,
    NO_COLOR: '1',
    PATH: Array.from(new Set(pathParts.join(':').split(':').filter(Boolean))).join(':')
  };
}

export function createOpenClawCliDispatcher(options: { command?: string; defaultAgent?: string; timeoutSeconds?: number } = {}): OpenClawDispatcher {
  const command = options.command ?? resolveOpenClawCommand(process.env);
  const defaultAgent = options.defaultAgent ?? process.env.IMBAS_OS_OPENCLAW_AGENT ?? 'main';
  const defaultTimeoutSeconds = options.timeoutSeconds ?? Number(process.env.IMBAS_OS_OPENCLAW_TIMEOUT_SECONDS ?? 180);

  return {
    async dispatch(request) {
      const agent = normalizeAgentId(request.agent) ?? defaultAgent;
      const timeoutSeconds = Math.max(15, Math.min(600, Math.trunc(request.timeoutSeconds ?? defaultTimeoutSeconds)));
      const safePrompt = buildImbasDispatchPrompt(request.message, request.mode ?? 'chat');
      const args = ['agent', '--agent', agent, '--message', safePrompt, '--json', '--timeout', String(timeoutSeconds), '--thinking', request.mode === 'task' ? 'medium' : 'low'];
      try {
        const { stdout } = await execFileAsync(command, args, {
          timeout: (timeoutSeconds + 15) * 1000,
          maxBuffer: 1024 * 1024 * 4,
          env: buildOpenClawChildEnv(process.env, command)
        });
        const parsed = parseOpenClawJson(stdout);
        return {
          status: 'completed',
          reply: extractReply(parsed) || 'OpenClaw completed the run without a textual reply.',
          sessionId: extractString(parsed, ['sessionId', 'session_id', 'sessionKey', 'session_key']) ?? extractNestedString(parsed, ['meta', 'agentMeta', 'sessionId']),
          runId: extractString(parsed, ['runId', 'run_id', 'id']) ?? extractNestedString(parsed, ['meta', 'agentMeta', 'runId']),
          transport: extractString(parsed, ['transport']) ?? extractNestedString(parsed, ['meta', 'transport'])
        };
      } catch (error) {
        const anyError = error as { code?: string; signal?: string; stdout?: string; stderr?: string; message?: string };
        const stderr = scrubCliNoise(anyError.stderr ?? '');
        const stdout = scrubCliNoise(anyError.stdout ?? '');
        const detail = [stderr, stdout, anyError.message].filter(Boolean).join('\n').trim();
        return {
          status: anyError.code === 'ENOENT' ? 'blocked' : 'failed',
          reply: detail || 'OpenClaw CLI dispatch failed before returning a reply.',
          transport: 'cli'
        };
      }
    }
  };
}

function buildImbasDispatchPrompt(message: string, mode: 'chat' | 'task'): string {
  const intent = mode === 'task' ? 'task request' : 'chat request';
  return [
    'Imbas OS Agent Console private-preview dispatch.',
    `Treat this as a local ${intent} from the Imbas OS operator via Imbas OS.`,
    'Safety boundary: do not send external communications, spend money, delete data, alter public/live service posture, or take irreversible/destructive actions unless the user explicitly approved that specific action in the message. If the request would require that, explain the approval needed instead.',
    'Keep the reply concise and useful for display in Imbas OS. Mention verification or blockers when relevant.',
    '',
    'User message:',
    message
  ].join('\n');
}

function parseOpenClawJson(stdout: string): unknown {
  const trimmed = stdout.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    const firstJsonLine = trimmed.split(/\r?\n/).find((line) => line.trim().startsWith('{') || line.trim().startsWith('['));
    if (!firstJsonLine) return { text: trimmed };
    try {
      return JSON.parse(firstJsonLine);
    } catch {
      return { text: trimmed };
    }
  }
}

function extractReply(value: unknown): string | null {
  if (!value || typeof value !== 'object') return typeof value === 'string' ? value : null;
  const record = value as Record<string, unknown>;
  for (const key of ['reply', 'message', 'text', 'content', 'output']) {
    if (typeof record[key] === 'string' && record[key].trim()) return record[key] as string;
  }
  if (Array.isArray(record.payloads)) {
    for (const payload of record.payloads) {
      const nested = extractReply(payload);
      if (nested) return nested;
    }
  }
  for (const key of ['result', 'response', 'data']) {
    const nested = extractReply(record[key]);
    if (nested) return nested;
  }
  return null;
}

function extractString(value: unknown, keys: string[]): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  for (const key of keys) if (typeof record[key] === 'string' && record[key].trim()) return record[key] as string;
  return undefined;
}

function extractNestedString(value: unknown, path: string[]): string | undefined {
  let current = value;
  for (const key of path) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' && current.trim() ? current : undefined;
}

function normalizeAgentId(agent?: string): string | undefined {
  if (!agent) return undefined;
  const normalized = agent.trim().toLowerCase();
  if (!normalized || normalized === 'openclaw' || normalized === 'auto-route') return undefined;
  return normalized.replace(/[^a-z0-9._:-]/g, '');
}

function scrubCliNoise(value: string): string {
  return value.replace(/token=[^\s]+/gi, 'token=[REDACTED]').replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]').slice(0, 4000);
}
