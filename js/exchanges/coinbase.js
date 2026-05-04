const COINBASE_ENDPOINTS = [
  {
    url: "https://api.exchange.coinbase.com/products/BTC-USD/ticker",
    type: "ticker",
  },
  {
    url: "https://api.coinbase.com/v2/prices/BTC-USD/spot",
    type: "spot",
  },
];

export async function fetchCoinbaseTicker() {
  const { payload, type } = await fetchFirstJson(COINBASE_ENDPOINTS, "Coinbase");
  const last = type === "spot" ? Number(payload.data?.amount) : Number(payload.price);
  const bid = Number(payload.bid ?? last);
  const ask = Number(payload.ask ?? last);

  if (!Number.isFinite(bid) || !Number.isFinite(ask)) {
    throw new Error("Coinbase response did not include usable BTC/USD prices.");
  }

  return {
    id: "coinbase",
    name: "Coinbase",
    pair: "BTC/USD",
    currency: "USD",
    bid,
    ask,
    mid: (bid + ask) / 2,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchFirstJson(endpoints, label) {
  const errors = [];

  for (const endpoint of endpoints) {
    try {
      const response = await fetchWithTimeout(endpoint.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return { payload: await response.json(), type: endpoint.type };
    } catch (error) {
      errors.push(`${endpoint.url}: ${error.message}`);
    }
  }

  throw new Error(`${label} failed after ${endpoints.length} endpoint attempts. ${errors.join(" | ")}`);
}

function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);

  return fetch(url, {
    signal: controller.signal,
    headers: { Accept: "application/json" },
  }).finally(() => window.clearTimeout(timeout));
}
