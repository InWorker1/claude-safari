import { buildPrompt } from '../domain/buildPrompt.js';

// readPage: () => Promise<{ title, url, text }>, complete: (prompt, model, onText) => Promise<string>
export const makeAskAboutPage = ({ readPage, complete }) => async (question, model, onText, history) =>
  complete(buildPrompt(question, await readPage(), history), model, onText);
