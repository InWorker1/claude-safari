import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createBridgeServer, MAX_BODY_BYTES } from '../../bridge/server.js';

const EXT = 'safari-web-extension://1234-abcd';
let server, base, calls, fail;

before(async () => {
  server = createBridgeServer({
    complete: async (prompt, model) => {
      calls.push({ prompt, model });
      if (fail) throw new Error('claude crashed');
      return `echo: ${prompt}`;
    },
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const ask = (body, { origin = EXT, path = '/ask', failModel = false } = {}) => {
  calls = [];
  fail = failModel;
  return fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(origin && { Origin: origin }) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
};

test('answers a prompt from the extension', async () => {
  const res = await ask({ prompt: 'hi' });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { answer: 'echo: hi' });
  assert.equal(res.headers.get('access-control-allow-origin'), EXT);
});

test('passes the chosen model to claude', async () => {
  await ask({ prompt: 'hi', model: 'haiku' });
  assert.deepEqual(calls, [{ prompt: 'hi', model: 'haiku' }]);
});

test('uses sonnet when no model is given', async () => {
  await ask({ prompt: 'hi' });
  assert.deepEqual(calls, [{ prompt: 'hi', model: 'sonnet' }]);
});

test('rejects unknown model', async () => {
  const res = await ask({ prompt: 'hi', model: 'opus --tools default' });
  assert.equal(res.status, 400);
  assert.deepEqual(calls, []);
});

test('rejects requests from web pages', async () => {
  const res = await ask({ prompt: 'hi' }, { origin: 'https://evil.example' });
  assert.equal(res.status, 403);
  assert.deepEqual(calls, []);
});

test('rejects requests without origin', async () => {
  const res = await ask({ prompt: 'hi' }, { origin: null });
  assert.equal(res.status, 403);
  assert.deepEqual(calls, []);
});

test('handles CORS preflight from the extension', async () => {
  const res = await fetch(base + '/ask', { method: 'OPTIONS', headers: { Origin: EXT } });
  assert.equal(res.status, 204);
  assert.match(res.headers.get('access-control-allow-headers'), /content-type/i);
});

test('rejects empty prompt', async () => {
  const res = await ask({ prompt: '  ' });
  assert.equal(res.status, 400);
  assert.deepEqual(calls, []);
});

test('rejects invalid JSON', async () => {
  assert.equal((await ask('{nope')).status, 400);
});

test('rejects oversized body', async () => {
  const res = await ask({ prompt: 'x'.repeat(MAX_BODY_BYTES) });
  assert.equal(res.status, 413);
  assert.deepEqual(calls, []);
});

test('returns 404 for unknown path', async () => {
  assert.equal((await ask({ prompt: 'hi' }, { path: '/nope' })).status, 404);
});

test('reports model failure as 500', async () => {
  const res = await ask({ prompt: 'hi' }, { failModel: true });
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: 'claude crashed' });
});
