#!/usr/bin/env node
import { randomUUID } from 'node:crypto';

const conduitUrl = process.env.IMBAS_OS_CONDUIT_URL ?? 'http://127.0.0.1:39777';
const mode = process.env.IMBAS_OS_SHADOW_CONNECTOR_MODE ?? 'dry-run';
const now = new Date().toISOString();

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, '').split('=');
  return [key, rest.join('=') || '1'];
}));

const runId = args.runId ?? `openclaw-shadow-${randomUUID()}`;
const task = args.task ?? 'OpenClaw shadow connector smoke';
const summary = args.summary ?? 'OpenClaw emitted a shadow-mode run summary into Imbas OS.';
const verification = args.verification ? String(args.verification).split('|') : ['shadow connector generated event'];

const payloads = [
  {
    path: '/v0/runs',
    body: {
      connector: 'OpenClaw',
      agent: args.agent ?? 'main',
      runId,
      task,
      outcome: args.outcome ?? 'completed',
      summary,
      verification,
      createdAt: now
    }
  },
  {
    path: '/v0/events',
    body: {
      connector: 'OpenClaw',
      agent: args.agent ?? 'main',
      runId,
      projectId: args.projectId ?? 'imbas-os',
      type: 'run_summary',
      layer: 'episodic',
      visibility: 'private',
      text: `${task}\n\n${summary}`,
      source: { uri: `openclaw://runs/${runId}`, label: 'OpenClaw shadow connector' },
      createdAt: now
    }
  }
];

if (mode === 'dry-run') {
  console.log(JSON.stringify({ mode, conduitUrl, payloads }, null, 2));
  process.exit(0);
}

for (const payload of payloads) {
  const response = await fetch(`${conduitUrl}${payload.path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload.body)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error(JSON.stringify({ path: payload.path, status: response.status, body }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ path: payload.path, status: response.status, body }, null, 2));
}
