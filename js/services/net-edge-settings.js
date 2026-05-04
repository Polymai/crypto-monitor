const SETTINGS_KEY = "crypto-monitor-net-edge-settings-v1";

export const DEFAULT_NET_EDGE_SETTINGS = Object.freeze({
  tradeFeePercent: 0.12,
  slippagePercent: 0.08,
  transferFeePercent: 0.015,
  networkFeeUsd: 8.5,
  actionThresholdUsd: 25,
});

const SETTING_LIMITS = {
  tradeFeePercent: { min: 0, max: 2 },
  slippagePercent: { min: 0, max: 2 },
  transferFeePercent: { min: 0, max: 1 },
  networkFeeUsd: { min: 0, max: 500 },
  actionThresholdUsd: { min: 0, max: 1000 },
};

export function loadNetEdgeSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return { ...DEFAULT_NET_EDGE_SETTINGS };
    }
    return normalizeNetEdgeSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_NET_EDGE_SETTINGS };
  }
}

export function persistNetEdgeSettings(settings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalizeNetEdgeSettings(settings)));
  } catch {
    return false;
  }
  return true;
}

export function resetNetEdgeSettings() {
  try {
    window.localStorage.removeItem(SETTINGS_KEY);
  } catch {
    return false;
  }
  return true;
}

export function normalizeNetEdgeSettings(settings = {}) {
  return Object.fromEntries(
    Object.entries(DEFAULT_NET_EDGE_SETTINGS).map(([key, defaultValue]) => {
      const value = Number(settings[key]);
      const limits = SETTING_LIMITS[key];
      const nextValue = Number.isFinite(value) ? value : defaultValue;
      return [key, clamp(nextValue, limits.min, limits.max)];
    }),
  );
}

export function toArbitrageCosts(settings) {
  const normalized = normalizeNetEdgeSettings(settings);
  return {
    tradeFeeRate: normalized.tradeFeePercent / 100,
    slippageRate: normalized.slippagePercent / 100,
    transferFeeRate: normalized.transferFeePercent / 100,
    networkFeeUsd: normalized.networkFeeUsd,
    actionThresholdUsd: normalized.actionThresholdUsd,
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
