export function renderHistory(state) {
  const historyBody = document.getElementById("historyBody");
  const historyState = document.getElementById("historyState");
  const historyCount = document.getElementById("historyCount");
  const clearHistoryButton = document.getElementById("clearHistoryButton");
  const downloadCsvButton = document.getElementById("downloadCsvButton");

  if (!state.premiumAccess) {
    historyCount.textContent = "0";
    clearHistoryButton.disabled = true;
    downloadCsvButton.disabled = true;
    historyState.innerHTML = stateMessage("Premium history locked", "Log in and upgrade to Premium to unlock local browser history.");
    historyBody.innerHTML = "";
    return;
  }

  historyCount.textContent = String(state.history.length);
  clearHistoryButton.disabled = state.history.length === 0;
  downloadCsvButton.disabled = state.history.length === 0;

  if (state.historyStatus === "loading") {
    historyState.innerHTML = stateMessage("Loading history", "Checking local premium snapshots.");
    historyBody.innerHTML = "";
    return;
  }

  if (state.historyStatus === "error") {
    historyState.innerHTML = stateMessage("History unavailable", state.historyError, true);
    historyBody.innerHTML = "";
    return;
  }

  if (state.history.length === 0) {
    historyState.innerHTML = stateMessage("No premium snapshots", "Premium refreshes will be stored in this browser.");
    historyBody.innerHTML = "";
    return;
  }

  historyState.innerHTML = state.historyMessage
    ? stateMessage("History updated", state.historyMessage)
    : "";
  historyBody.innerHTML = state.history.map(renderHistoryRow).join("");
}

function renderHistoryRow(item) {
  const signalKey = signalClass(item.signal);

  return `
    <tr>
      <td>
        <strong>${formatDate(item.capturedAt)}</strong>
        <div class="muted">${formatTime(item.capturedAt)}</div>
      </td>
      <td>${escapeHtml(item.buyExchange)}<div class="muted">${formatMoney(item.buyPrice)}</div></td>
      <td>${escapeHtml(item.sellExchange)}<div class="muted">${formatMoney(item.sellPrice)}</div></td>
      <td>${formatSignedMoney(item.netProfitUsd)}<div class="muted">${formatPercent(item.netProfitPct)}</div></td>
      <td><span class="signal-badge signal-badge--${signalKey}">${escapeHtml(item.signal)}</span></td>
    </tr>
  `;
}

function stateMessage(title, message, isError = false) {
  return `
    <div class="state-message ${isError ? "state-message--error" : ""}">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
}

function signalClass(signal) {
  if (signal === "Actionable") {
    return "actionable";
  }
  if (signal === "Watch") {
    return "watch";
  }
  return "no-trade";
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
  return `${value >= 0 ? "+" : ""}${Number(value).toFixed(3)}%`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatTime(value) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
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
