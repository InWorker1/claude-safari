import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

const run = promisify(execFile);

// Page text may carry prompt injection, so Claude gets no tools at all: no Bash, no files, no MCP.
export const CLAUDE_ARGS = [
  '-p',
  '--tools', '',
  '--strict-mcp-config',
  '--no-session-persistence',
  '--system-prompt', 'You answer questions about a web page the user is viewing. Reply in the language of the question. Be concise.',
];

export const makeCliCompleter = ({ command, args, timeoutMs = 120_000 }) => async (prompt, model) => {
  const pending = run(command, model ? [...args, '--model', model] : args, { cwd: tmpdir(), timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 });
  pending.child.stdin.end(prompt);
  try {
    const { stdout } = await pending;
    return stdout.trim();
  } catch (err) {
    if (err.killed) throw new Error(`Claude timed out after ${timeoutMs / 1000}s`);
    throw new Error(err.stderr?.trim() || err.message);
  }
};
