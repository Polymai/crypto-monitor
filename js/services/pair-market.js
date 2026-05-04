const PREMIUM_PAIRS = [
  { id: "eth", symbol: "ETH/USD", name: "Ethereum", binance: "ETHUSDT", coinbase: "ETH-USD", kraken: "ETHUSD" },
  { id: "sol", symbol: "SOL/USD", name: "Solana", binance: "SOLUSDT", coinbase: "SOL-USD", kraken: "SOLUSD" },
  { id: "xrp", symbol: "XRP/USD", name: "XRP", binance: "XRPUSDT", coinbase: "XRP-USD", kraken: "XRPUSD" },
  { id: "ada", symbol: "ADA/USD", name: "Cardano", binance: "ADAUSDT", coinbase: "ADA-USD", kraken: "ADAUSD" },
  { id: "doge", symbol: "DOGE/USD", name: "Dogecoin", binance: "DOGEUSDT", coinbase: "DOGE-USD", kraken: "DOGEUSD" },
  { id: "avax", symbol: "AVAX/USD", name: "Avalanche", binance: "AVAXUSDT", coinbase: "AVAX-USD", kraken: "AVAXUSD" },
  { id: "link", symbol: "LINK/USD", name: "Chainlink", binance: "LINKUSDT", coinbase: "LINK-USD", kraken: "LINKUSD" },
  { id: "dot", symbol: "DOT/USD", name: "Polkadot", binance: "DOTUSDT", coinbase: "DOT-USD", kraken: "DOTUSD" },
  { id: "ltc", symbol: "LTC/USD", name: "Litecoin", binance: "LTCUSDT", coinbase: "LTC-USD", kraken: "LTCUSD" },
  { id: "bch", symbol: "BCH/USD", name: "Bitcoin Cash", binance: "BCHUSDT", coinbase: "BCH-USD", kraken: "BCHUSD" },
];

const PREMIUM_EXCHANGES = [
  { id: "binance", name: "Binance", load: fetchBinancePair },
  { id: "coinbase", name: "Coinbase", load: fetchCoinbasePair },
  { id: "kraken", name: "Kraken", load: fetchKrakenPair },
];

export async function loadPremiumPairMarkets() {
  const settled = await Promise.allSettled(PREMIUM_PAIRS.map(loadPairMarket));
  const pairs = [];
  const failures = [];

  settled.forEach((result, index) => {
    const pair = PREMIUM_PAIRS[index];

    if (result.status === "fulfilled") {
      pairs.push(result.value);
      return;
    }

    failures.push({
      id: pair.id,
      name: pair.symbol,
      message: result.reason instanceof Error ? result.reason.message : String(result.reason),
    });
  });

  return {
    pairs,
    failures,
    fetchedAt: new Date().toISOString(),
  };
}

async function loadPairMarket(pair) {
  const settled = await Promise.allSettled(
    PREMIUM_EXCHANGES.map((exchange) => exchange.load(pair)),
  );
  const quotes = [];
  const failures = [];

  settled.forEach((result, index) => {
    const exchange = PREMIUM_EXCHANGES[index];

    if (result.status === "fulfilled") {
      quotes.push(result.value);
      return;
    }

    failures.push({
      id: exchange.id,
      name: exchange.name,
      message: result.reason instanceof Error ? result.reason.message : String(result.reason),
    });
  });

  quotes.sort((left, right) => left.name.localeCompare(right.name));

  if (quotes.length < 2) {
    return {
      ...pair,
      quotes,
      failures,
      sourceCount: quotes.length,
      signal: { key: "no-trade", label: "Thin market" },
    };
  }

  const route = findBestCrossExchangeRoute(quotes);

  if (!route) {
    return {
      ...pair,
      quotes,
      failures,
      sourceCount: quotes.length,
      signal: { key: "no-trade", label: "No route" },
    };
  }

  const grossSpreadUsd = route.sellExchange.bid - route.buyExchange.ask;
  const grossSpreadPct = (grossSpreadUsd / route.buyExchange.ask) * 100;

  return {
    ...pair,
    quotes,
    failures,
    sourceCount: quotes.length,
    buyExchange: route.buyExchange,
    sellExchange: route.sellExchange,
    buyPrice: route.buyExchange.ask,
    sellPrice: route.sellExchange.bid,
    grossSpreadUsd,
    grossSpreadPct,
    signal: getPairSignal(grossSpreadPct),
  };
}

function findBestCrossExchangeRoute(quotes) {
  let bestRoute = null;

  quotes.forEach((buyExchange) => {
    quotes.forEach((sellExchange) => {
      if (buyExchange.id === sellExchange.id) {
        return;
      }

      const grossSpreadUsd = sellExchange.bid - buyExchange.ask;

      if (!bestRoute || grossSpreadUsd > bestRoute.grossSpreadUsd) {
        bestRoute = {
          buyExchange,
          sellExchange,
          grossSpreadUsd,
        };
      }
    });
  });

  return bestRoute;
}

async function fetchBinancePair(pair) {
  const payload = await fetchFirstJson([
    `https://api.binance.com/api/v3/ticker/bookTicker?symbol=${pair.binance}`,
    `https://api.binance.us/api/v3/ticker/bookTicker?symbol=${pair.binance}`,
  ], "Binance");
  return normalizeQuote(pair, "binance", "Binance", Number(payload.bidPrice), Number(payload.askPrice));
}

async function fetchCoinbasePair(pair) {
  const { payload, type } = await fetchFirstTypedJson([
    { url: `https://api.exchange.coinbase.com/products/${pair.coinbase}/ticker`, type: "ticker" },
    { url: `https://api.coinbase.com/v2/prices/${pair.coinbase}/spot`, type: "spot" },
  ], "Coinbase");
  const last = type === "spot" ? Number(payload.data?.amount) : Number(payload.price);
  return normalizeQuote(pair, "coinbase", "Coinbase", Number(payload.bid ?? last), Number(payload.ask ?? last));
}

async function fetchKrakenPair(pair) {
  const payload = await fetchFirstJson([
    `https://api.kraken.com/0/public/Ticker?pair=${pair.kraken}`,
  ], "Kraken");

  if (Array.isArray(payload.error) && payload.error.length > 0) {
    throw new Error(`Kraken returned ${payload.error.join(", ")}`);
  }

  const ticker = Object.values(payload.result ?? {})[0];
  return normalizeQuote(pair, "kraken", "Kraken", Number(ticker?.b?.[0]), Number(ticker?.a?.[0]));
}

function normalizeQuote(pair, id, name, bid, ask) {
  if (!Number.isFinite(bid) || !Number.isFinite(ask)) {
    throw new Error(`${name} response did not include usable ${pair.symbol} bid and ask prices.`);
  }

  return {
    id,
    name,
    pair: pair.symbol,
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

async function fetchFirstTypedJson(endpoints, label) {
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

function getPairSignal(grossSpreadPct) {
  if (grossSpreadPct >= 0.35) {
    return {
      key: "actionable",
      label: "Wide spread",
    };
  }

  if (grossSpreadPct > 0) {
    return {
      key: "watch",
      label: "Watch",
    };
  }

  return {
    key: "no-trade",
    label: "No edge",
  };
}
