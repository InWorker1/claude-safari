import http from 'node:http';

export const MAX_BODY_BYTES = 1_000_000;
// Allowlist, not pass-through: the value ends up in claude's argv.
const MODELS = ['haiku', 'sonnet'];
const DEFAULT_MODEL = 'sonnet';
// Only Safari extensions may call the bridge: web pages can reach localhost too, but can't fake Origin.
const ALLOWED_ORIGIN = /^safari-web-extension:\/\//;

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

async function readJson(req) {
  if (Number(req.headers['content-length']) > MAX_BODY_BYTES) throw new HttpError(413, 'Body too large');
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'Body too large');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks));
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

export function createBridgeServer({ complete }) {
  return http.createServer(async (req, res) => {
    const origin = req.headers.origin ?? '';
    if (!ALLOWED_ORIGIN.test(origin)) return send(res, 403, { error: 'Forbidden origin' });
    res.setHeader('Access-Control-Allow-Origin', origin);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' });
      return res.end();
    }
    if (req.method !== 'POST' || req.url !== '/ask') return send(res, 404, { error: 'Not found' });

    try {
      const body = await readJson(req);
      const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
      if (!prompt) throw new HttpError(400, 'Prompt is required');
      const model = body.model ?? DEFAULT_MODEL;
      if (!MODELS.includes(model)) throw new HttpError(400, `Model must be one of: ${MODELS.join(', ')}`);
      // Popup closed mid-answer → stop claude instead of letting it burn time in the background.
      const aborter = new AbortController();
      res.on('close', () => aborter.abort());
      const start = () => res.headersSent || res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      const answer = await complete(prompt, model, {
        signal: aborter.signal,
        onText: (text) => { start(); res.write(text); },
      });
      if (!res.headersSent) { start(); res.write(answer); }
      res.end();
    } catch (err) {
      // Status is already sent once streaming began: append the error to the text instead.
      if (res.headersSent) return res.end(`\n\n⚠️ ${err.message}`);
      if (err.status === 413) res.setHeader('Connection', 'close');
      send(res, err.status ?? 500, { error: err.message });
    }
  });
}
