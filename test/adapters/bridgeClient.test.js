import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeBridgeClient } from '../../extension/src/adapters/bridgeClient.js';

const url = 'http://127.0.0.1:8787/ask';
const json = (status, body) => new Response(JSON.stringify(body), { status });

test('posts prompt and model as JSON and streams the answer', async () => {
  let call;
  const body = new ReadableStream({
    start(c) { for (const s of ['he', 'llo']) c.enqueue(new TextEncoder().encode(s)); c.close(); },
  });
  const complete = makeBridgeClient({
    url,
    fetch: async (u, init) => { call = { u, init }; return new Response(body); },
  });

  const seen = [];
  assert.equal(await complete('p', 'sonnet', (t) => seen.push(t)), 'hello');
  assert.deepEqual(seen, ['he', 'hello']);
  assert.equal(call.u, url);
  assert.equal(call.init.method, 'POST');
  assert.deepEqual(JSON.parse(call.init.body), { prompt: 'p', model: 'sonnet' });
});

test('surfaces the server error message', async () => {
  const complete = makeBridgeClient({ url, fetch: async () => json(500, { error: 'boom' }) });
  await assert.rejects(complete('p'), /boom/);
});

test('explains that the bridge is not running when fetch fails', async () => {
  const complete = makeBridgeClient({ url, fetch: async () => { throw new TypeError('Load failed'); } });
  await assert.rejects(complete('p'), /npm run bridge/);
});

test('rejects when the bridge appends an error after streaming began', async () => {
  const body = new Response('half an answer\n\n⚠️ Claude timed out').body;
  const complete = makeBridgeClient({ url, fetch: async () => new Response(body) });
  await assert.rejects(complete('p'), { message: 'Claude timed out' });
});
