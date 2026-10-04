// Composition root: the only place that touches real browser APIs and the DOM.
import { makeAskAboutPage } from '../application/askAboutPage.js';
import { makeBrowserPageReader } from '../adapters/browserPageReader.js';
import { makeBridgeClient } from '../adapters/bridgeClient.js';
import { renderMarkdown } from './renderMarkdown.js';

const ask = makeAskAboutPage({
  readPage: makeBrowserPageReader(globalThis.browser ?? globalThis.chrome),
  complete: makeBridgeClient({ url: 'http://127.0.0.1:8787/ask', fetch: (...a) => fetch(...a) }),
});

const form = document.querySelector('form');
const question = document.querySelector('#question');
const button = form.querySelector('button');
const answer = document.querySelector('#answer');
const model = document.querySelector('#model');

try { model.value = localStorage.getItem('model') ?? 'sonnet'; } catch {}
model.addEventListener('change', () => {
  try { localStorage.setItem('model', model.value); } catch {}
});

question.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.metaKey) form.requestSubmit();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  button.disabled = true;
  answer.className = '';
  answer.textContent = 'Думаю…';
  try {
    const show = (text) => { answer.innerHTML = renderMarkdown(text); };
    show(await ask(question.value, model.value, show));
  } catch (err) {
    answer.className = 'error';
    answer.textContent = err.message;
  } finally {
    button.disabled = false;
  }
});
