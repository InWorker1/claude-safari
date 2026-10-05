import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeAskAboutPage } from '../../extension/src/application/askAboutPage.js';

const readPage = async () => ({ title: 'T', url: 'https://t', text: 'page body' });

test('sends page and question to the chosen model and returns its answer', async () => {
  let sent, sentModel;
  const ask = makeAskAboutPage({
    readPage,
    complete: async (prompt, model) => { sent = prompt; sentModel = model; return 'answer'; },
  });

  assert.equal(await ask('what?', 'haiku'), 'answer');
  assert.ok(sent.includes('what?') && sent.includes('page body'));
  assert.equal(sentModel, 'haiku');
});

test('does not call the model for an empty question', async () => {
  const ask = makeAskAboutPage({
    readPage,
    complete: async () => assert.fail('model must not be called'),
  });

  await assert.rejects(ask(''), /question/i);
});

test('quick question skips reading the page', async () => {
  let sent;
  const ask = makeAskAboutPage({
    readPage: async () => assert.fail('page must not be read'),
    complete: async (prompt) => { sent = prompt; return 'Paris'; },
  });

  assert.equal(await ask('/q capital of France?'), 'Paris');
  assert.ok(!sent.includes('<page') && sent.includes('capital of France?'));
});

test('page question still surfaces an unreadable-tab error', async () => {
  const ask = makeAskAboutPage({
    readPage: async () => { throw new Error('no access'); },
    complete: async () => assert.fail('model must not be called'),
  });

  await assert.rejects(ask('what?'), /no access/);
});
