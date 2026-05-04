import {
  getState,
  getStoredPlan,
  initializeState,
  persistPremiumAccess,
  persistPlan,
  setAuthError,
  setAuthLoading,
  setCheckoutStatus,
  setHistoryError,
  setHistoryLoading,
  setHistoryReady,
  setMarketError,
  setMarketLoading,
  setMarketResult,
  setNetEdgeSettings,
  setPremiumPairsError,
  setPremiumPairsIdle,
  setPremiumPairsLoading,
  setPremiumPairsReady,
  setPlan,
  setPremiumAccess,
  setSignedIn,
  setSignedOut,
  setSyncStatus,
  subscribe,
} from "./state.js";
import {
  getStoredAuthToken,
  persistAuthToken,
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from "./services/auth.js";
import {
  activatePremiumProfile,
  hasPremiumAccess,
  loadOrCreateProfile,
} from "./services/profile.js";
import { loadMarketData } from "./services/market-data.js";
import { loadPremiumPairMarkets } from "./services/pair-market.js";
import { calculateArbitrageOpportunities } from "./services/arbitrage.js";
import {
  DEFAULT_NET_EDGE_SETTINGS,
  loadNetEdgeSettings,
  normalizeNetEdgeSettings,
  persistNetEdgeSettings,
  resetNetEdgeSettings,
  toArbitrageCosts,
} from "./services/net-edge-settings.js";
import {
  clearPremiumHistory,
  createPremiumSnapshot,
  loadPremiumHistory,
  savePremiumSnapshot,
  syncPremiumSnapshot,
} from "./services/history-store.js";
import { downloadHistoryCsv } from "./services/csv-export.js";
import {
  consumeStripeReturnStatus,
  redirectToPremiumCheckout,
  verifyPremiumCheckout,
} from "./services/stripe-checkout.js";
import { wireControls } from "./ui/controls.js";
import { renderOpportunities } from "./ui/opportunities-view.js";
import { renderPremiumPairs } from "./ui/premium-pairs-view.js";
import { renderHistory } from "./ui/history-view.js";

const runtimeConfig = window.__POLYMAI_SUPABASE_CONFIG__ ?? null;
const stripeConfig = window.__POLYMAI_STRIPE_CONFIG__ ?? null;

initApp();

function initApp() {
  const stripeReturn = consumeStripeReturnStatus();
  const authToken = getStoredAuthToken();

  initializeState({
    authToken,
    authStatus: authToken ? "loading" : "signed-out",
    authMessage: authToken
      ? "Restoring account and Premium access."
      : "Log in before checkout so Premium is saved to your account.",
    plan: "free",
    netEdgeSettings: loadNetEdgeSettings(),
    supabaseConfigured: Boolean(runtimeConfig?.url && runtimeConfig?.anonKey),
    premiumAccess: false,
    checkoutStatus: stripeReturn.status === "success"
      ? "loading"
      : stripeReturn.status === "cancelled"
        ? "cancelled"
        : "idle",
    checkoutMessage: stripeReturn.message,
  });

  subscribe(renderOpportunities);
  subscribe(renderPremiumPairs);
  subscribe(renderHistory);

  wireControls({
    onRefresh: refreshMarket,
    onPlanChange: handlePlanChange,
    onPremiumCheckout: handlePremiumCheckout,
    onSignIn: handleSignIn,
    onSignUp: handleSignUp,
    onSignOut: handleSignOut,
    onNetEdgeSettingsChange: handleNetEdgeSettingsChange,
    onResetNetEdgeSettings: handleResetNetEdgeSettings,
    onClearHistory: handleClearHistory,
    onDownloadCsv: handleDownloadCsv,
  });

  hydrateHistory();
  refreshMarket();

  restoreAccount(authToken, stripeReturn);
}

async function restoreAccount(authToken, stripeReturn) {
  if (authToken) {
    await hydrateAccount(authToken, "Account restored. Premium access is read from Supabase.");
  } else {
    persistPremiumAccess(false);
    persistPlan("free");
  }

  if (stripeReturn.status === "success") {
    verifyStripeReturn(stripeReturn.sessionId);
  }
}

function hydrateHistory() {
  setHistoryLoading();

  try {
    setHistoryReady(loadPremiumHistory());
  } catch (error) {
    setHistoryError(error);
  }
}

async function hydrateAccount(authToken, message = "Signed in.") {
  if (!authToken?.access_token) {
    setSignedOut("Log in before checkout so Premium is saved to your account.");
    setPremiumAccess(false);
    setPlan("free");
    persistPremiumAccess(false);
    persistPlan("free");
    setPremiumPairsIdle();
    return null;
  }

  setAuthLoading("Loading account and Premium status.");

  try {
    const profile = await loadOrCreateProfile(runtimeConfig, authToken);
    const premiumAccess = hasPremiumAccess(profile);
    const plan = premiumAccess && getStoredPlan() === "premium" ? "premium" : "free";

    persistPremiumAccess(premiumAccess);
    persistPlan(plan);
    setPremiumAccess(premiumAccess);
    setPlan(plan);
    setSignedIn(authToken, profile, message);

    if (premiumAccess && plan === "premium") {
      refreshPremiumPairs();
    } else {
      setPremiumPairsIdle();
    }

    return profile;
  } catch (error) {
    setAuthError(error);
    setPremiumAccess(false);
    setPlan("free");
    persistPremiumAccess(false);
    persistPlan("free");
    setPremiumPairsIdle();
    return null;
  }
}

async function handleSignIn(credentials) {
  setAuthLoading("Signing in.");

  try {
    const authToken = await signInWithPassword(runtimeConfig, credentials);
    await hydrateAccount(authToken, "Signed in. Premium access is saved to this account.");
  } catch (error) {
    setAuthError(error);
  }
}

async function handleSignUp(credentials) {
  setAuthLoading("Creating account.");

  try {
    const authToken = await signUpWithPassword(runtimeConfig, credentials);

    if (!authToken?.access_token) {
      setSignedOut("Account created. Check your email if confirmation is required, then log in.");
      return;
    }

    await hydrateAccount(authToken, "Account created. Premium access will be saved here.");
  } catch (error) {
    setAuthError(error);
  }
}

async function handleSignOut() {
  setAuthLoading("Signing out.");

  try {
    await signOut(runtimeConfig, getState().authToken?.access_token);
  } catch {
    // Local sign-out should still clear access if the remote session has already expired.
  }

  persistAuthToken(null);
  persistPremiumAccess(false);
  persistPlan("free");
  setPremiumAccess(false);
  setPlan("free");
  setPremiumPairsIdle();
  setSignedOut("Signed out. Log in before checkout so Premium can be saved.");
}

async function refreshMarket() {
  setMarketLoading();

  try {
    const marketData = await loadMarketData();
    const opportunities = calculateArbitrageOpportunities(
      marketData.prices,
      toArbitrageCosts(getState().netEdgeSettings),
    );
    setMarketResult({ ...marketData, opportunities });

    if (getState().premiumAccess && getState().plan === "premium") {
      persistCurrentPremiumSnapshot();
      refreshPremiumPairs();
    }
  } catch (error) {
    setMarketError(error);
  }
}

async function refreshPremiumPairs() {
  if (!getState().premiumAccess || getState().plan !== "premium") {
    setPremiumPairsIdle();
    return;
  }

  setPremiumPairsLoading();

  try {
    setPremiumPairsReady(await loadPremiumPairMarkets());
  } catch (error) {
    setPremiumPairsError(error);
  }
}

function handleNetEdgeSettingsChange(settings) {
  const netEdgeSettings = normalizeNetEdgeSettings(settings);
  setNetEdgeSettings(netEdgeSettings);
  persistNetEdgeSettings(netEdgeSettings);
  recalculateCurrentOpportunities();
}

function handleResetNetEdgeSettings() {
  resetNetEdgeSettings();
  setNetEdgeSettings({ ...DEFAULT_NET_EDGE_SETTINGS });
  persistNetEdgeSettings(DEFAULT_NET_EDGE_SETTINGS);
  recalculateCurrentOpportunities();
}

function recalculateCurrentOpportunities() {
  const state = getState();

  if (state.prices.length === 0) {
    return;
  }

  const opportunities = calculateArbitrageOpportunities(
    state.prices,
    toArbitrageCosts(state.netEdgeSettings),
  );

  setMarketResult({
    prices: state.prices,
    opportunities,
    failures: state.failures,
    fetchedAt: state.lastUpdated ?? new Date().toISOString(),
  });
}

function handlePlanChange(plan) {
  if (plan === "premium" && !getState().premiumAccess) {
    handlePremiumCheckout();
    return;
  }

  setPlan(plan);
  persistPlan(plan);

  if (plan === "premium" && getState().premiumAccess) {
    if (getState().opportunities.length > 0) {
      persistCurrentPremiumSnapshot();
    }
    refreshPremiumPairs();
    return;
  }

  setPremiumPairsIdle();
}

async function handlePremiumCheckout() {
  const state = getState();

  if (state.premiumAccess) {
    setPlan("premium");
    persistPlan("premium");
    setCheckoutStatus("active", "Premium is already active on this account.");
    return;
  }

  if (state.authStatus !== "signed-in" || !state.authToken?.access_token) {
    setCheckoutStatus("error", "Log in before checkout so Premium can be saved to Supabase.");
    return;
  }

  setCheckoutStatus("loading", "Opening Stripe Checkout.");

  try {
    await redirectToPremiumCheckout({
      supabaseConfig: runtimeConfig,
      stripeConfig,
      authToken: state.authToken,
    });
  } catch (error) {
    setCheckoutStatus("error", error instanceof Error ? error.message : String(error));
  }
}

async function verifyStripeReturn(sessionId) {
  setCheckoutStatus("loading", "Verifying Stripe Checkout.");

  try {
    const state = getState();

    if (state.authStatus !== "signed-in" || !state.authToken?.access_token) {
      throw new Error("Log in before verifying checkout so Premium can be saved.");
    }

    await verifyPremiumCheckout({
      supabaseConfig: runtimeConfig,
      stripeConfig,
      sessionId,
      authToken: state.authToken,
    });
    const profile = await activatePremiumProfile(runtimeConfig, state.authToken, { sessionId });

    persistPremiumAccess(true);
    persistPlan("premium");
    setPremiumAccess(true);
    setPlan("premium");
    setSignedIn(state.authToken, profile, "Premium is active and saved to this account.");
    setCheckoutStatus("active", "Stripe checkout verified. Premium is saved to your account.");

    if (getState().opportunities.length > 0) {
      persistCurrentPremiumSnapshot();
    }

    refreshPremiumPairs();
  } catch (error) {
    persistPremiumAccess(false);
    setPremiumAccess(false);
    setPlan("free");
    persistPlan("free");
    setPremiumPairsIdle();
    setCheckoutStatus("error", error instanceof Error ? error.message : String(error));
  }
}

function handleClearHistory() {
  try {
    setHistoryReady(clearPremiumHistory(), "Premium history cleared.");
  } catch (error) {
    setHistoryError(error);
  }
}

function handleDownloadCsv() {
  const { history } = getState();

  if (history.length === 0) {
    setHistoryReady(history, "No snapshots available for CSV export.");
    return;
  }

  const filename = downloadHistoryCsv(history);
  setHistoryReady(history, `Downloaded ${filename}.`);
}

function persistCurrentPremiumSnapshot() {
  if (!getState().premiumAccess) {
    return;
  }

  const snapshot = createPremiumSnapshot(getState());

  if (!snapshot) {
    return;
  }

  try {
    const history = savePremiumSnapshot(snapshot);
    setHistoryReady(history, "Saved the latest premium snapshot locally.");
    syncSnapshot(snapshot);
  } catch (error) {
    setHistoryError(error);
  }
}

async function syncSnapshot(snapshot) {
  if (!runtimeConfig?.url || !runtimeConfig?.anonKey) {
    setSyncStatus("failed", "Supabase runtime config unavailable.");
    return;
  }

  setSyncStatus("syncing", "Syncing latest premium snapshot.");

  try {
    await syncPremiumSnapshot(runtimeConfig, snapshot);
    setSyncStatus("synced", "Snapshot synced to Supabase.");
  } catch (error) {
    setSyncStatus("failed", error instanceof Error ? error.message : String(error));
  }
}
