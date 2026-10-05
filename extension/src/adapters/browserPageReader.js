export const makeBrowserPageReader = (browser) => async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab) throw new Error('No active tab');

  let result;
  try {
    [{ result }] = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.body?.innerText ?? '',
    });
  } catch {
    // Safari: tab opened before the extension was (re)enabled, a system page, or site access set to "Deny".
    throw new Error('Нет доступа к вкладке. Обнови страницу (⌘R) и открой попап снова. Не помогло — Safari → Настройки → Расширения → Claude for Safari → разрешить на этом сайте. Или задай вопрос с префиксом /q — он не читает страницу.');
  }
  return { title: tab.title ?? '', url: tab.url ?? '', text: result ?? '' };
};
