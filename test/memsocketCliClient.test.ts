import assert from 'node:assert/strict';
import test from 'node:test';
import { createMemsocketCliClient, MemsocketCliCommand } from '../src/main/memsocket/cliClient.ts';

test('Memsocket CLI client writes Imbas events through JSON stdin boundary', async () => {
  const commands: MemsocketCliCommand[] = [];
  const client = createMemsocketCliClient({
    configPath: '/tmp/memsocket/config.yaml',
    namespace: 'imbas-os-test',
    runner: async (command) => {
      commands.push(command);
      return { status: 'ok', stdout: '{"status":"ok"}', stderr: '', json: { status: 'ok' } };
    }
  });

  const result = await client.writeEvent({
    connector: 'OpenClaw',
    agent: 'main',
    runId: 'run-1',
    type: 'observation',
    layer: 'episodic',
    visibility: 'private',
    text: 'Memsocket live boundary smoke'
  });

  assert.equal(result.status, 'ok');
  assert.equal(commands.length, 1);
  assert.deepEqual(commands[0].args.slice(0, 4), ['-m', 'memsocket.cli', 'write', '--json']);
  assert.ok(commands[0].args.includes('--config'));
  assert.ok(commands[0].args.includes('--namespace'));
  const payload = JSON.parse(commands[0].stdin ?? '{}') as { namespace: string; text: string; event_type: string };
  assert.equal(payload.namespace, 'imbas-os-test');
  assert.equal(payload.event_type, 'observation');
  assert.equal(payload.text, 'Memsocket live boundary smoke');
});

test('Memsocket CLI client exposes search and context-pack commands', async () => {
  const commands: MemsocketCliCommand[] = [];
  const client = createMemsocketCliClient({
    runner: async (command) => {
      commands.push(command);
      return { status: 'ok', stdout: '{}', stderr: '', json: {} };
    }
  });

  await client.search('agent world', { namespace: 'imbas-os', limit: 5, sessionId: 'run-1' });
  await client.contextPack({ task: 'Summarize Imbas OS sprint', projectId: 'imbas-os', maxTokens: 1200 });

  assert.equal(commands[0].args[2], 'search');
  assert.ok(commands[0].args.includes('--session'));
  assert.equal(commands[1].args[2], 'brief');
  assert.ok(commands[1].args.includes('--token-budget'));
});
