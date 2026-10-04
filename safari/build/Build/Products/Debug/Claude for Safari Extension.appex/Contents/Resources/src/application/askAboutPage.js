import { buildPrompt } from '../domain/buildPrompt.js';

// readPage: () => Promise<{ title, url, text }>, complete: (prompt, model) => Promise<string>
export const makeAskAboutPage = ({ readPage, complete }) => async (question, model) =>
  complete(buildPrompt(question, await readPage()), model);
