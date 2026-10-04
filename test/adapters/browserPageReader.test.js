import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeBrowserPageReader } from '../../extension/src/adapters/browserPageReader.js';

const fakeBrowser = (tabs) => ({
  tabs: {
    query: async (q) => { assert.deepEqual(q, { active: true, currentWindow: true }); return tabs; },
  },
  scripting: {
    executeScript: async ({ target }) => { assert.equal(target.tabId, 7); return [{ result: 'page text' }]; },
  },
});

test('reads title, url and text of the active tab', async () => {
  const readPage = makeBrowserPageReader(fakeBrowser([{ id: 7, title: 'T', url: 'https://x' }]));
  assert.deepEqual(await readPage(), { title: 'T', url: 'https://x', text: 'page text' });
});

test('fails when there is no active tab', async () => {
  const readPage = makeBrowserPageReader(fakeBrowser([]));
  await assert.rejects(readPage(), /tab/i);
});
