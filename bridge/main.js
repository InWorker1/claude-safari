import { createBridgeServer } from './server.js';
import { makeCliCompleter, CLAUDE_ARGS } from './cliCompleter.js';

const PORT = Number(process.env.PORT ?? 8787);

const complete = makeCliCompleter({ command: process.env.CLAUDE_BIN ?? 'claude', args: CLAUDE_ARGS });

createBridgeServer({ complete }).listen(PORT, '127.0.0.1', () => {
  console.log(`Claude bridge listening on http://127.0.0.1:${PORT}`);
});
