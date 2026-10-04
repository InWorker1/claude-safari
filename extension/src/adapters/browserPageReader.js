export const makeBrowserPageReader = (browser) => async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab) throw new Error('No active tab');

  const [{ result }] = await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.body?.innerText ?? '',
  });
  return { title: tab.title ?? '', url: tab.url ?? '', text: result ?? '' };
};
