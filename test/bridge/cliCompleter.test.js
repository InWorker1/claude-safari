import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeCliCompleter, CLAUDE_ARGS } from '../../bridge/cliCompleter.js';

const node = process.execPath;

test('passes prompt via stdin and returns trimmed stdout', async () => {
  const complete = makeCliCompleter({ command: node, args: ['-e', 'process.stdin.pipe(process.stdout)'] });
  assert.equal(await complete('  привет \n'), 'привет');
});

test('appends the model flag to the command args', async () => {
  const complete = makeCliCompleter({ command: node, args: ['-e', 'console.log(process.argv.slice(1).join(" "))', '--'] });
  assert.equal(await complete('p', 'haiku'), '--model haiku');
});

test('rejects with stderr when the command fails', async () => {
  const complete = makeCliCompleter({ command: node, args: ['-e', 'console.error("no auth"); process.exit(1)'] });
  await assert.rejects(complete('p'), /no auth/);
});

test('rejects when the command times out', async () => {
  const complete = makeCliCompleter({ command: node, args: ['-e', 'setTimeout(() => {}, 5000)'], timeoutMs: 100 });
  await assert.rejects(complete('p'), /timed out/i);
});

test('claude runs headless with every tool disabled', () => {
  assert.ok(CLAUDE_ARGS.includes('-p'));
  assert.equal(CLAUDE_ARGS[CLAUDE_ARGS.indexOf('--tools') + 1], '');
  assert.ok(CLAUDE_ARGS.includes('--strict-mcp-config'));
});
