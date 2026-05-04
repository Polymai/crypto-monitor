export function renderPremiumPairs(state) {
  const panel = document.getElementById("premiumPairsPanel");
  const list = document.getElementById("premiumPairsList");
  const status = document.getElementById("premiumPairsStatus");
  const updatedAt = document.getElementById("premiumPairsUpdatedAt");

  panel.classList.toggle("is-muted", !state.premiumAccess || state.plan !== "premium");

  if (!state.premiumAccess) {
    status.innerHTML = stateMessage(
      "10 extra crypto pairs locked",
      "Log in and upgrade to Premium to scan gross pre-fee spreads for ETH, SOL, XRP, ADA, DOGE, AVAX, LINK, DOT, LTC, and BCH.",
    );
    updatedAt.textContent = "Premium locked";
    list.innerHTML = "";
    return;
  }

  if (state.plan !== "premium") {
    status.innerHTML = stateMessage(
      "Premium pairs paused",
      "Switch to Premium mode to compare buy ask vs sell bid across Binance, Coinbase, and Kraken.",
    );
    updatedAt.textContent = "Premium ready";
    list.innerHTML = "";
    return;
  }

  if (state.premiumPairsStatus === "loading" && state.premiumPairs.length === 0) {
    status.innerHTML = "";
    updatedAt.textContent = "Scanning pairs";
    list.innerHTML = skeletonCards(4);
    return;
  }

  if (state.premiumPairsStatus === "error") {
    status.innerHTML = stateMessage("Premium pairs unavailable", state.premiumPairsError, true);
    updatedAt.textContent = "Error";
    list.innerHTML = "";
    return;
  }

  if (state.premiumPairs.length === 0) {
    status.innerHTML = stateMessage("No extra pair data", "Refresh prices to load premium pair breadth.");
    updatedAt.textContent = "Awaiting refresh";
    list.innerHTML = "";
    return;
  }

  status.innerHTML = state.premiumPairFailures.length > 0
    ? stateMessage("Partial pair scan", `${state.premiumPairFailures.length} pair groups returned partial data.`)
    : "";
  updatedAt.textContent = state.premiumPairsUpdatedAt
    ? `Updated ${formatTime(state.premiumPairsUpdatedAt)}`
    : "Live scan";
  list.innerHTML = state.premiumPairs.map(renderPairCard).join("");
}

function renderPairCard(pair) {
  const hasRoute = pair.buyExchange && pair.sellExchange;
  const route = hasRoute
    ? `Buy ask on ${pair.buyExchange.name} -> sell bid on ${pair.sellExchange.name}`
    : "Needs two different live exchanges";
  const spread = hasRoute ? formatPercent(pair.grossSpreadPct) : "--";
  const buyPrice = hasRoute ? formatMoney(pair.buyPrice) : "--";
  const sellPrice = hasRoute ? formatMoney(pair.sellPrice) : "--";
  const signal = pair.signal ?? { key: "no-trade", label: "No edge" };

  return `
    <article class="pair-card">
      <div class="pair-card__top">
        <div>
          <strong>${escapeHtml(pair.symbol)}</strong>
          <span>${escapeHtml(pair.name)} - ${pair.sourceCount} live sources</span>
        </div>
        <span class="signal-badge signal-badge--${signal.key}">${escapeHtml(signal.label)}</span>
      </div>
      <div class="pair-card__route">${escapeHtml(route)}</div>
      <div class="pair-card__grid">
        <div class="stat-box">
          <span>Buy ask</span>
          <strong>${buyPrice}</strong>
        </div>
        <div class="stat-box">
          <span>Sell bid</span>
          <strong>${sellPrice}</strong>
        </div>
        <div class="stat-box">
          <span>Gross spread before fees</span>
          <strong>${spread}</strong>
        </div>
      </div>
    </article>
  `;
}

function skeletonCards(count) {
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

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 2 : 5,
  }).format(value);
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
