const BINANCE_ENDPOINTS = [
  "https://api.binance.com/api/v3/ticker/bookTicker?symbol=BTCUSDT",
  "https://api.binance.us/api/v3/ticker/bookTicker?symbol=BTCUSDT",
];

export async function fetchBinanceTicker() {
  const payload = await fetchFirstJson(BINANCE_ENDPOINTS, "Binance");
  const bid = Number(payload.bidPrice);
  const ask = Number(payload.askPrice);

  if (!Number.isFinite(bid) || !Number.isFinite(ask)) {
    throw new Error("Binance response did not include usable bid and ask prices.");
  }

  return {
    id: "binance",
    name: "Binance",
    pair: "BTC/USDT",
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
