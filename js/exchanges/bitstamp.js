const BITSTAMP_ENDPOINTS = [
  "https://www.bitstamp.net/api/v2/ticker/btcusd/",
  "https://www.bitstamp.net/api/v2/ticker/btcusd",
];

export async function fetchBitstampTicker() {
  const payload = await fetchFirstJson(BITSTAMP_ENDPOINTS, "Bitstamp");
  const bid = Number(payload.bid);
  const ask = Number(payload.ask);

  if (!Number.isFinite(bid) || !Number.isFinite(ask)) {
    throw new Error("Bitstamp response did not include usable bid and ask prices.");
  }

  return {
    id: "bitstamp",
    name: "Bitstamp",
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
