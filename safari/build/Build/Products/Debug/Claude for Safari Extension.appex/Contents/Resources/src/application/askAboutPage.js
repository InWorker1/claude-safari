import { buildPrompt, isQuickQuestion } from '../domain/buildPrompt.js';

// readPage: () => Promise<{ title, url, text }>, complete: (prompt, model, onText) => Promise<string>
// Quick questions ("/q ...") skip readPage, so they also work on tabs the extension can't read.
export const makeAskAboutPage = ({ readPage, complete }) => async (question, model, onText, history) =>
  complete(buildPrompt(question, isQuickQuestion(question) ? null : await readPage(), history), model, onText);
