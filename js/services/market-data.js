import { fetchBinanceTicker } from "../exchanges/binance.js";
import { fetchBitstampTicker } from "../exchanges/bitstamp.js";
import { fetchCoinbaseTicker } from "../exchanges/coinbase.js";
import { fetchGeminiTicker } from "../exchanges/gemini.js";
import { fetchKrakenTicker } from "../exchanges/kraken.js";

const EXCHANGES = [
  { id: "binance", name: "Binance", load: fetchBinanceTicker },
  { id: "bitstamp", name: "Bitstamp", load: fetchBitstampTicker },
  { id: "coinbase", name: "Coinbase", load: fetchCoinbaseTicker },
  { id: "gemini", name: "Gemini", load: fetchGeminiTicker },
  { id: "kraken", name: "Kraken", load: fetchKrakenTicker },
];

export async function loadMarketData() {
  const settled = await Promise.allSettled(EXCHANGES.map((exchange) => exchange.load()));
  const prices = [];
  const failures = [];

  settled.forEach((result, index) => {
    const exchange = EXCHANGES[index];

    if (result.status === "fulfilled") {
      prices.push(result.value);
      return;
    }

    failures.push({
      id: exchange.id,
      name: exchange.name,
      message: result.reason instanceof Error ? result.reason.message : String(result.reason),
    });
  });

  prices.sort((left, right) => left.name.localeCompare(right.name));

  return {
    prices,
    failures,
    fetchedAt: new Date().toISOString(),
  };
}
