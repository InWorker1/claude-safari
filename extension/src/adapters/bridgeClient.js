// Must match bridge/server.js: once streaming has begun, errors arrive as this text suffix.
const ERROR_MARK = '\n\n⚠️ ';

// onText(answerSoFar) fires on every chunk the bridge streams back.
export const makeBridgeClient = ({ url, fetch }) => async (prompt, model, onText = () => {}) => {
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model }),
    });
  } catch {
    throw new Error('Bridge is not running. Start it with: npm run bridge');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Bridge error ${res.status}`);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let answer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      const i = answer.lastIndexOf(ERROR_MARK);
      if (i !== -1) throw new Error(answer.slice(i + ERROR_MARK.length));
      return answer;
    }
    answer += value;
    onText(answer);
  }
};
