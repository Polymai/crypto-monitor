const HISTORY_KEY = "crypto-monitor-premium-history-v1";
const MAX_HISTORY_ITEMS = 60;
const PREMIUM_ROUTE_LIMIT = 3;
const APP_SCHEMA = "app667_crypto";
const SNAPSHOTS_TABLE = "premium_snapshots";

export function loadPremiumHistory() {
  const raw = window.localStorage.getItem(HISTORY_KEY);
  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Stored history is not a list.");
  }

  return parsed
    .filter((item) => item && item.id && item.capturedAt)
    .sort((left, right) => new Date(right.capturedAt) - new Date(left.capturedAt));
}

export function savePremiumSnapshot(snapshot) {
  const history = loadPremiumHistory();
  const nextHistory = [snapshot, ...history].slice(0, MAX_HISTORY_ITEMS);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
  return nextHistory;
}

export function clearPremiumHistory() {
  window.localStorage.removeItem(HISTORY_KEY);
  return [];
}

export function createPremiumSnapshot(state) {
  const best = state.opportunities[0];
  if (!best) {
    return null;
  }

  return {
    id: globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    capturedAt: new Date().toISOString(),
    plan: state.plan,
    buyExchange: best.buyExchange.name,
    sellExchange: best.sellExchange.name,
    pair: `${best.buyExchange.pair} -> ${best.sellExchange.pair}`,
    buyPrice: roundMoney(best.buyPrice),
    sellPrice: roundMoney(best.sellPrice),
    grossSpreadPct: roundPercent(best.grossSpreadPct),
    netProfitUsd: roundMoney(best.netProfitUsd),
    netProfitPct: roundPercent(best.netProfitPct),
    signal: best.signal.label,
    topRoutes: state.opportunities.slice(0, PREMIUM_ROUTE_LIMIT).map((opportunity) => ({
      buyExchange: opportunity.buyExchange.name,
      sellExchange: opportunity.sellExchange.name,
      netProfitUsd: roundMoney(opportunity.netProfitUsd),
      netProfitPct: roundPercent(opportunity.netProfitPct),
      signal: opportunity.signal.label,
    })),
  };
}

export async function syncPremiumSnapshot(config, snapshot) {
  if (!config?.url || !config?.anonKey || !snapshot) {
    return {
      ok: false,
      message: "Supabase runtime config is unavailable.",
    };
  }

  const response = await fetch(`${config.url}/rest/v1/${SNAPSHOTS_TABLE}`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      "Content-Type": "application/json",
      "Content-Profile": APP_SCHEMA,
      "Accept-Profile": APP_SCHEMA,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(toRemoteRecord(snapshot)),
  });

  if (!response.ok) {
    throw new Error(`Supabase snapshot sync returned HTTP ${response.status}.`);
  }

  return {
    ok: true,
    message: "Snapshot synced.",
  };
}

function toRemoteRecord(snapshot) {
  return {
    captured_at: snapshot.capturedAt,
    plan: snapshot.plan,
    buy_exchange: snapshot.buyExchange,
    sell_exchange: snapshot.sellExchange,
    pair: snapshot.pair,
    buy_price: snapshot.buyPrice,
    sell_price: snapshot.sellPrice,
    gross_spread_pct: snapshot.grossSpreadPct,
    net_profit_usd: snapshot.netProfitUsd,
    net_profit_pct: snapshot.netProfitPct,
    signal: snapshot.signal,
    raw_snapshot: snapshot,
  };
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function roundPercent(value) {
  return Math.round(value * 10000) / 10000;
}
