const KRAKEN_ENDPOINTS = [
  "https://api.kraken.com/0/public/Ticker?pair=XBTUSD",
  "https://api.kraken.com/0/public/Ticker?pair=BTCUSD",
];

export async function fetchKrakenTicker() {
  const payload = await fetchFirstJson(KRAKEN_ENDPOINTS, "Kraken");

  if (Array.isArray(payload.error) && payload.error.length > 0) {
    throw new Error(`Kraken returned ${payload.error.join(", ")}`);
  }

  const ticker = Object.values(payload.result ?? {})[0];
  const bid = Number(ticker?.b?.[0]);
  const ask = Number(ticker?.a?.[0]);

  if (!Number.isFinite(bid) || !Number.isFinite(ask)) {
    throw new Error("Kraken response did not include usable bid and ask prices.");
  }

  return {
    id: "kraken",
    name: "Kraken",
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
