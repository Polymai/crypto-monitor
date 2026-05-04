const PLAN_KEY = "crypto-monitor-plan-v1";
const PREMIUM_ACCESS_KEY = "crypto-monitor-premium-access-v1";

const initialState = {
  authToken: null,
  authStatus: "signed-out",
  authMessage: "",
  profile: null,
  plan: "free",
  netEdgeSettings: {},
  prices: [],
  opportunities: [],
  failures: [],
  marketStatus: "idle",
  marketError: "",
  lastUpdated: null,
  premiumPairs: [],
  premiumPairsStatus: "idle",
  premiumPairsError: "",
  premiumPairsUpdatedAt: null,
  premiumPairFailures: [],
  history: [],
  historyStatus: "loading",
  historyError: "",
  historyMessage: "",
  supabaseConfigured: false,
  premiumAccess: false,
  checkoutStatus: "idle",
  checkoutMessage: "",
  syncStatus: "idle",
  syncMessage: "",
};

let state = { ...initialState };
const subscribers = new Set();

export function getStoredPlan() {
  try {
    const stored = window.localStorage.getItem(PLAN_KEY);
    return stored === "premium" ? "premium" : "free";
  } catch {
    return "free";
  }
}

export function persistPlan(plan) {
  try {
    window.localStorage.setItem(PLAN_KEY, plan);
  } catch {
    return false;
  }
  return true;
}

export function getStoredPremiumAccess() {
  try {
    return window.localStorage.getItem(PREMIUM_ACCESS_KEY) === "active";
  } catch {
    return false;
  }
}

export function persistPremiumAccess(isActive) {
  try {
    if (isActive) {
      window.localStorage.setItem(PREMIUM_ACCESS_KEY, "active");
    } else {
      window.localStorage.removeItem(PREMIUM_ACCESS_KEY);
    }
  } catch {
    return false;
  }
  return true;
}

export function initializeState(patch = {}) {
  state = { ...initialState, ...patch };
  notify();
}

export function getState() {
  return state;
}

export function subscribe(callback) {
  subscribers.add(callback);
  callback(state);
  return () => subscribers.delete(callback);
}

export function setState(patch) {
  state = { ...state, ...patch };
  notify();
  return state;
}

export function setPlan(plan) {
  return setState({ plan });
}

export function setAuthLoading(message = "Checking account.") {
  return setState({
    authStatus: "loading",
    authMessage: message,
  });
}

export function setSignedIn(authToken, profile, message = "") {
  return setState({
    authToken,
    profile,
    authStatus: "signed-in",
    authMessage: message,
  });
}

export function setSignedOut(message = "") {
  return setState({
    authToken: null,
    profile: null,
    authStatus: "signed-out",
    authMessage: message,
  });
}

export function setAuthError(error) {
  return setState({
    authStatus: "error",
    authMessage: error instanceof Error ? error.message : String(error),
  });
}

export function setNetEdgeSettings(netEdgeSettings) {
  return setState({ netEdgeSettings });
}

export function setPremiumAccess(premiumAccess) {
  return setState({ premiumAccess });
}

export function setCheckoutStatus(checkoutStatus, checkoutMessage = "") {
  return setState({ checkoutStatus, checkoutMessage });
}

export function setMarketLoading() {
  return setState({
    marketStatus: "loading",
    marketError: "",
    syncMessage: "",
  });
}

export function setMarketResult({ prices, opportunities, failures, fetchedAt }) {
  const status = failures.length > 0 ? "partial" : "ready";
  return setState({
    prices,
    opportunities,
    failures,
    marketStatus: prices.length > 0 ? status : "error",
    marketError: prices.length > 0 ? "" : "No exchange quotes were available.",
    lastUpdated: fetchedAt,
  });
}

export function setMarketError(error, failures = []) {
  return setState({
    prices: [],
    opportunities: [],
    failures,
    marketStatus: "error",
    marketError: error instanceof Error ? error.message : String(error),
    lastUpdated: new Date().toISOString(),
  });
}

export function setPremiumPairsLoading() {
  return setState({
    premiumPairsStatus: "loading",
    premiumPairsError: "",
    premiumPairFailures: [],
  });
}

export function setPremiumPairsReady({ pairs, failures = [], fetchedAt }) {
  return setState({
    premiumPairs: pairs,
    premiumPairFailures: failures,
    premiumPairsStatus: pairs.length > 0 ? "ready" : "empty",
    premiumPairsError: "",
    premiumPairsUpdatedAt: fetchedAt,
  });
}

export function setPremiumPairsIdle() {
  return setState({
    premiumPairs: [],
    premiumPairFailures: [],
    premiumPairsStatus: "idle",
    premiumPairsError: "",
    premiumPairsUpdatedAt: null,
  });
}

export function setPremiumPairsError(error) {
  return setState({
    premiumPairs: [],
    premiumPairFailures: [],
    premiumPairsStatus: "error",
    premiumPairsError: error instanceof Error ? error.message : String(error),
    premiumPairsUpdatedAt: new Date().toISOString(),
  });
}

export function setHistoryLoading() {
  return setState({
    historyStatus: "loading",
    historyError: "",
    historyMessage: "",
  });
}

export function setHistoryReady(history, message = "") {
  return setState({
    history,
    historyStatus: history.length > 0 ? "ready" : "empty",
    historyError: "",
    historyMessage: message,
  });
}

export function setHistoryError(error) {
  return setState({
    historyStatus: "error",
    historyError: error instanceof Error ? error.message : String(error),
  });
}

export function setSyncStatus(syncStatus, syncMessage = "") {
  return setState({ syncStatus, syncMessage });
}

function notify() {
  subscribers.forEach((callback) => callback(state));
}
