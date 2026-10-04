export const makeBridgeClient = ({ url, fetch }) => async (prompt, model) => {
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

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Bridge error ${res.status}`);
  return data.answer;
};
