import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { createInterface } from 'node:readline';

// Page text may carry prompt injection, so Claude gets no tools at all: no Bash, no files, no MCP.
export const CLAUDE_ARGS = [
  '-p',
  '--tools', '',
  '--strict-mcp-config',
  '--no-session-persistence',
  '--output-format', 'stream-json', '--verbose', '--include-partial-messages',
  '--system-prompt', 'You answer questions about a web page the user is viewing. Reply in the language of the question. Be concise.',
];

// Streams answer text to onText as claude writes it; resolves with the full answer. Aborting `signal` kills claude.
export const makeCliCompleter = ({ command, args, timeoutMs = 120_000 }) => (prompt, model, { onText = () => {}, signal } = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, model ? [...args, '--model', model] : args, { cwd: tmpdir(), timeout: timeoutMs, signal });
    let stderr = '';
    let result;

    child.on('error', reject);
    child.stdin.on('error', () => {}); // claude may exit before reading the whole prompt; 'close' reports why
    child.stderr.on('data', (d) => { stderr += d; });
    createInterface({ input: child.stdout }).on('line', (line) => {
      let msg;
      try { msg = JSON.parse(line); } catch { return; }
      const delta = msg.type === 'stream_event' ? msg.event?.delta : null;
      if (delta?.type === 'text_delta') onText(delta.text);
      else if (msg.type === 'result') result = msg;
    });
    child.on('close', (code, sig) => {
      if (result && !result.is_error) return resolve(String(result.result ?? '').trim());
      if (sig && !signal?.aborted) return reject(new Error(`Claude timed out after ${timeoutMs / 1000}s`));
      reject(new Error(result?.result || stderr.trim() || `claude exited with code ${code}`));
    });
    child.stdin.end(prompt);
  });
