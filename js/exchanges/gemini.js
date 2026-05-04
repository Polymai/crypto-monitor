const GEMINI_ENDPOINTS = [
  "https://api.gemini.com/v1/pubticker/btcusd",
  "https://api.gemini.com/v2/ticker/btcusd",
];

export async function fetchGeminiTicker() {
  const payload = await fetchFirstJson(GEMINI_ENDPOINTS, "Gemini");
  const bid = Number(payload.bid ?? payload.bidPrice);
  const ask = Number(payload.ask ?? payload.askPrice);

  if (!Number.isFinite(bid) || !Number.isFinite(ask)) {
    throw new Error("Gemini response did not include usable bid and ask prices.");
  }

  return {
    id: "gemini",
    name: "Gemini",
    pair: "BTC/USD",
    currency: "USD",
    bid,
    ask,
    mid: (bid + ask) / 2,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchFirstJson(urls, label) {
  const errors = [];

  for (const url of urls) {
    try {
      const response = await fetchWithTimeout(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      errors.push(`${url}: ${error.message}`);
    }
  }

  throw new Error(`${label} failed after ${urls.length} endpoint attempts. ${errors.join(" | ")}`);
}

function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);

  return fetch(url, {
    signal: controller.signal,
    headers: { Accept: "application/json" },
  }).finally(() => window.clearTimeout(timeout));
}
