import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeCliCompleter, CLAUDE_ARGS } from '../../bridge/cliCompleter.js';

const node = process.execPath;
// Fake claude: echoes stdin back as two text deltas plus a final result, like `--output-format stream-json`.
const ECHO = `let s = ''; process.stdin.on('data', (d) => s += d).on('end', () => {
  const half = s.length >> 1;
  for (const text of [s.slice(0, half), s.slice(half)])
    console.log(JSON.stringify({ type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'text_delta', text } } }));
  console.log('not json');
  console.log(JSON.stringify({ type: 'result', is_error: false, result: s }));
});`;

test('passes prompt via stdin, streams deltas and returns trimmed result', async () => {
  const complete = makeCliCompleter({ command: node, args: ['-e', ECHO] });
  const chunks = [];
  assert.equal(await complete('  привет \n', undefined, { onText: (t) => chunks.push(t) }), 'привет');
  assert.equal(chunks.join(''), '  привет \n');
  assert.equal(chunks.length, 2);
});

test('appends the model flag to the command args', async () => {
  const script = 'console.log(JSON.stringify({ type: "result", result: process.argv.slice(1).join(" ") }))';
  const complete = makeCliCompleter({ command: node, args: ['-e', script, '--'] });
  assert.equal(await complete('p', 'haiku'), '--model haiku');
});

test('rejects with stderr when the command fails', async () => {
  const complete = makeCliCompleter({ command: node, args: ['-e', 'console.error("no auth"); process.exit(1)'] });
  await assert.rejects(complete('p'), /no auth/);
});

test('rejects with the result message when claude reports an error', async () => {
  const script = 'console.log(JSON.stringify({ type: "result", is_error: true, result: "rate limited" }))';
  const complete = makeCliCompleter({ command: node, args: ['-e', script] });
  await assert.rejects(complete('p'), /rate limited/);
});

test('rejects when the command times out', async () => {
  const complete = makeCliCompleter({ command: node, args: ['-e', 'setTimeout(() => {}, 5000)'], timeoutMs: 100 });
  await assert.rejects(complete('p'), /timed out/i);
});

test('kills the command on abort', async () => {
  const complete = makeCliCompleter({ command: node, args: ['-e', 'setTimeout(() => {}, 5000)'] });
  const aborter = new AbortController();
  const started = Date.now();
  setTimeout(() => aborter.abort(), 50);
  await assert.rejects(complete('p', undefined, { signal: aborter.signal }), { name: 'AbortError' });
  assert.ok(Date.now() - started < 2000);
});

test('claude runs headless with every tool disabled and streams JSON', () => {
  assert.ok(CLAUDE_ARGS.includes('-p'));
  assert.equal(CLAUDE_ARGS[CLAUDE_ARGS.indexOf('--tools') + 1], '');
  assert.ok(CLAUDE_ARGS.includes('--strict-mcp-config'));
  assert.equal(CLAUDE_ARGS[CLAUDE_ARGS.indexOf('--output-format') + 1], 'stream-json');
  assert.ok(CLAUDE_ARGS.includes('--include-partial-messages'));
});
