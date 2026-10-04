import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeBridgeClient } from '../../extension/src/adapters/bridgeClient.js';

const url = 'http://127.0.0.1:8787/ask';
const json = (status, body) => new Response(JSON.stringify(body), { status });

test('posts prompt and model as JSON and returns the answer', async () => {
  let call;
  const complete = makeBridgeClient({
    url,
    fetch: async (u, init) => { call = { u, init }; return json(200, { answer: 'hi' }); },
  });

  assert.equal(await complete('p', 'sonnet'), 'hi');
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
