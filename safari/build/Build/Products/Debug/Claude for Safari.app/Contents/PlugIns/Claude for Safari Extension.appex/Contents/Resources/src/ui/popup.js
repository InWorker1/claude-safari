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

// Lives as long as the popup: closing it starts a fresh chat.
const history = [];

const addBlock = (className, text) => {
  const el = Object.assign(document.createElement('div'), { className, textContent: text });
  answer.append(el);
  return el;
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = question.value;
  if (!q.trim()) return;
  button.disabled = true;
  addBlock('q', q);
  const reply = addBlock('a', 'Думаю…');
  const show = (text) => {
    reply.innerHTML = renderMarkdown(text);
    answer.scrollTop = answer.scrollHeight;
  };
  try {
    const text = await ask(q, model.value, show, history);
    show(text);
    history.push({ question: q, answer: text });
    question.value = '';
  } catch (err) {
    reply.className = 'a error';
    reply.textContent = err.message;
  } finally {
    button.disabled = false;
    question.focus();
  }
});
