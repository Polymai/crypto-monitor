const PREMIUM_ROUTE_LIMIT = 3;

export function renderOpportunities(state) {
  renderStatus(state);
  renderAuth(state);
  renderPlan(state);
  renderBilling(state);
  renderNetEdgeSettings(state.netEdgeSettings);
  renderPrices(state);
  renderFailures(state.failures);
  renderBestOpportunity(state);
  renderPremiumOpportunities(state);
  renderMetrics(state.opportunities[0]);
}

function renderAuth(state) {
  const accountEmail = document.getElementById("accountEmail");
  const accountStatus = document.getElementById("accountStatus");
  const authFields = document.getElementById("authFields");
  const logoutButton = document.getElementById("logoutButton");
  const signInButton = document.getElementById("signInButton");
  const signUpButton = document.getElementById("signUpButton");
  const isBusy = state.authStatus === "loading";
  const isSignedIn = state.authStatus === "signed-in";

  accountEmail.textContent = isSignedIn
    ? state.profile?.email || state.authToken?.user?.email || "Signed in"
    : "Not signed in";
  accountStatus.textContent = state.authMessage || (isSignedIn
    ? "Premium access is saved to this account."
    : "Log in before checkout so Premium is saved to your account.");
  accountStatus.className = `account-card__status ${state.authStatus === "error" ? "account-card__status--bad" : ""}`;
  authFields.hidden = isSignedIn;
  logoutButton.hidden = !isSignedIn;
  signInButton.disabled = isBusy;
  signUpButton.disabled = isBusy;
}

function renderNetEdgeSettings(settings) {
  setInputValue("tradeFeeInput", settings.tradeFeePercent, 3);
  setInputValue("slippageInput", settings.slippagePercent, 3);
  setInputValue("transferFeeInput", settings.transferFeePercent, 4);
  setInputValue("networkFeeInput", settings.networkFeeUsd, 2);
  setInputValue("actionThresholdInput", settings.actionThresholdUsd, 2);
}

function renderStatus(state) {
  const marketStatus = document.getElementById("marketStatus");
  const lastUpdated = document.getElementById("lastUpdated");
  const refreshButton = document.getElementById("refreshButton");
  const supabaseStatus = document.getElementById("supabaseStatus");

  const statusCopy = {
    idle: "Idle",
    loading: "Refreshing",
    ready: "Live",
    partial: "Partial",
    error: "Error",
  };

  marketStatus.textContent = statusCopy[state.marketStatus] ?? "Idle";
  marketStatus.className = `status-pill ${statusClass(state.marketStatus)}`;
  lastUpdated.textContent = state.lastUpdated ? `Updated ${formatTime(state.lastUpdated)}` : "No refresh yet";
  refreshButton.disabled = state.marketStatus === "loading";
  refreshButton.classList.toggle("is-loading", state.marketStatus === "loading");
  refreshButton.textContent = state.marketStatus === "loading" ? "Refreshing" : "Refresh prices";

  if (!state.supabaseConfigured) {
    supabaseStatus.textContent = "Runtime config unavailable";
    supabaseStatus.className = "status-pill status-pill--bad";
    return;
  }

  if (state.syncStatus === "synced") {
    supabaseStatus.textContent = "Supabase sync ready";
    supabaseStatus.className = "status-pill status-pill--good";
    return;
  }

  if (state.syncStatus === "failed") {
    supabaseStatus.textContent = "Local history active";
    supabaseStatus.className = "status-pill status-pill--warn";
    return;
  }

  supabaseStatus.textContent = "Runtime config ready";
  supabaseStatus.className = "status-pill status-pill--good";
}

function renderPlan(state) {
  const { plan, premiumAccess, checkoutStatus } = state;
  const label = document.getElementById("planLabel");
  const freePlanButton = document.getElementById("freePlanButton");
  const premiumPlanButton = document.getElementById("premiumPlanButton");

  label.textContent = plan === "premium" ? "Premium scan" : "Free scan";
  premiumPlanButton.textContent = premiumAccess ? "Premium" : "Premium $5";
  premiumPlanButton.disabled = checkoutStatus === "loading";
  freePlanButton.classList.toggle("is-active", plan === "free");
  premiumPlanButton.classList.toggle("is-active", plan === "premium");
  freePlanButton.setAttribute("aria-pressed", String(plan === "free"));
  premiumPlanButton.setAttribute("aria-pressed", String(plan === "premium"));
}

function renderBilling(state) {
  const checkoutButton = document.getElementById("premiumCheckoutButton");
  const billingStatus = document.getElementById("billingStatus");
  const isSignedIn = state.authStatus === "signed-in";

  if (state.premiumAccess) {
    checkoutButton.textContent = "Premium active";
    checkoutButton.disabled = true;
    billingStatus.textContent = state.checkoutMessage || "Premium scan is saved to your account.";
    billingStatus.className = "billing-card__status billing-card__status--good";
    return;
  }

  checkoutButton.disabled = state.checkoutStatus === "loading" || !isSignedIn;
  checkoutButton.textContent = state.checkoutStatus === "loading" ? "Opening Stripe" : "Subscribe with Stripe";

  if (!isSignedIn) {
    billingStatus.textContent = "Log in first so Stripe Premium can be saved to Supabase.";
    billingStatus.className = "billing-card__status billing-card__status--warn";
    return;
  }

  if (state.checkoutStatus === "error") {
    billingStatus.textContent = state.checkoutMessage;
    billingStatus.className = "billing-card__status billing-card__status--bad";
    return;
  }

  if (state.checkoutStatus === "cancelled") {
    billingStatus.textContent = state.checkoutMessage;
    billingStatus.className = "billing-card__status billing-card__status--warn";
    return;
  }

  billingStatus.textContent = "Stripe checkout required for Premium.";
  billingStatus.className = "billing-card__status";
}

function renderPrices(state) {
  const priceList = document.getElementById("priceList");

  if (state.marketStatus === "loading" && state.prices.length === 0) {
    priceList.innerHTML = skeletonRows(3);
    return;
  }

  if (state.marketStatus === "error") {
    priceList.innerHTML = stateMessage("No live quotes", state.marketError, true);
    return;
  }

  if (state.prices.length === 0) {
    priceList.innerHTML = stateMessage("Awaiting refresh", "BTC exchange quotes will appear here.");
    return;
  }

  priceList.innerHTML = state.prices.map(renderExchangeRow).join("");
}

function renderExchangeRow(price) {
  return `
    <article class="exchange-row">
      <div class="exchange-row__name">
        <strong>${escapeHtml(price.name)}</strong>
        <span>${escapeHtml(price.pair)}</span>
      </div>
      <div class="price-cell">
        <span class="cell-label">Bid</span>
        <strong>${formatMoney(price.bid)}</strong>
      </div>
      <div class="price-cell">
        <span class="cell-label">Ask</span>
        <strong>${formatMoney(price.ask)}</strong>
      </div>
      <div class="price-cell">
        <span class="cell-label">Mid</span>
        <strong>${formatMoney(price.mid)}</strong>
      </div>
    </article>
  `;
}

function renderFailures(failures) {
  const failureList = document.getElementById("failureList");
  if (!failures.length) {
    failureList.innerHTML = "";
    return;
  }

  failureList.innerHTML = failures
    .map((failure) => `
      <div class="failure-item">
        <strong>${escapeHtml(failure.name)}</strong>
        <span>${escapeHtml(failure.message)}</span>
      </div>
    `)
    .join("");
}

function renderBestOpportunity(state) {
  const container = document.getElementById("bestOpportunity");
  const best = state.opportunities[0];

  if (state.marketStatus === "loading" && !best) {
    container.innerHTML = skeletonRows(1);
    return;
  }

  if (!best) {
    container.innerHTML = stateMessage("No route yet", "At least two exchange quotes are required.");
    return;
  }

  container.innerHTML = renderOpportunityCard(best, true);
}

function renderPremiumOpportunities(state) {
  const panel = document.getElementById("premiumPanel");
  const container = document.getElementById("premiumOpportunityList");

  panel.classList.toggle("is-muted", state.plan !== "premium");

  if (!state.premiumAccess) {
    container.innerHTML = stateMessage("Premium scan locked", "$5/month via Stripe unlocks top 3 routes, 10 extra pairs, and history.");
    return;
  }

  if (state.plan !== "premium") {
    container.innerHTML = stateMessage("Premium scan paused", "Switch to Premium to show expanded routes and capture history.");
    return;
  }

  if (state.marketStatus === "loading" && state.opportunities.length === 0) {
    container.innerHTML = skeletonRows(3);
    return;
  }

  if (state.opportunities.length === 0) {
    container.innerHTML = stateMessage("No premium routes", "At least two exchange quotes are required.");
    return;
  }

  container.innerHTML = state.opportunities
    .slice(0, PREMIUM_ROUTE_LIMIT)
    .map((opportunity) => renderOpportunityCard(opportunity, false))
    .join("");
}

function renderOpportunityCard(opportunity, isBest) {
  const route = `${opportunity.buyExchange.name} -> ${opportunity.sellExchange.name}`;
  const className = isBest ? "opportunity-card opportunity-card--best" : "opportunity-card";

  return `
    <article class="${className}">
      <div class="opportunity-card__top">
        <div class="route-name">
          <strong>${escapeHtml(route)}</strong>
          <span>Buy ${escapeHtml(opportunity.buyExchange.pair)} and sell ${escapeHtml(opportunity.sellExchange.pair)}</span>
        </div>
        <span class="signal-badge signal-badge--${opportunity.signal.key}">${opportunity.signal.label}</span>
      </div>
      <div class="opportunity-card__grid">
        <div class="stat-box">
          <span>Buy ask</span>
          <strong>${formatMoney(opportunity.buyPrice)}</strong>
        </div>
        <div class="stat-box">
          <span>Sell bid</span>
          <strong>${formatMoney(opportunity.sellPrice)}</strong>
        </div>
        <div class="stat-box">
          <span>Net edge</span>
          <strong>${formatSignedMoney(opportunity.netProfitUsd)}</strong>
        </div>
        <div class="stat-box">
          <span>Costs</span>
          <strong>${formatMoney(opportunity.totalCostUsd)}</strong>
        </div>
      </div>
    </article>
  `;
}

function setInputValue(id, value, precision) {
  const input = document.getElementById(id);
  if (!input || document.activeElement === input || !Number.isFinite(Number(value))) {
    return;
  }
  input.value = Number(value).toFixed(precision).replace(/\.?0+$/, "");
}

function renderMetrics(best) {
  document.getElementById("spreadMetric").textContent = best ? `${formatPercent(best.grossSpreadPct)}` : "--";
  document.getElementById("netMetric").textContent = best ? formatSignedMoney(best.netProfitUsd) : "--";
  document.getElementById("signalMetric").textContent = best ? best.signal.label : "Idle";
}

function skeletonRows(count) {
  return Array.from({ length: count }, () => '<div class="skeleton" aria-hidden="true"></div>').join("");
}

function stateMessage(title, message, isError = false) {
  return `
    <div class="state-message ${isError ? "state-message--error" : ""}">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
}

function statusClass(status) {
  if (status === "ready") {
    return "status-pill--good";
  }
  if (status === "partial" || status === "loading") {
    return "status-pill--warn";
  }
  if (status === "error") {
    return "status-pill--bad";
  }
  return "status-pill--neutral";
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSignedMoney(value) {
  const formatted = formatMoney(Math.abs(value));
  return `${value >= 0 ? "+" : "-"}${formatted}`;
}

function formatPercent(value) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(3)}%`;
}

function formatTime(value) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
