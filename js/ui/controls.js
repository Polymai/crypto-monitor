export function wireControls(handlers) {
  const refreshButton = document.getElementById("refreshButton");
  const freePlanButton = document.getElementById("freePlanButton");
  const premiumPlanButton = document.getElementById("premiumPlanButton");
  const premiumCheckoutButton = document.getElementById("premiumCheckoutButton");
  const clearHistoryButton = document.getElementById("clearHistoryButton");
  const downloadCsvButton = document.getElementById("downloadCsvButton");
  const netEdgeSettingsForm = document.getElementById("netEdgeSettingsForm");
  const resetNetEdgeButton = document.getElementById("resetNetEdgeButton");
  const authForm = document.getElementById("authForm");
  const signUpButton = document.getElementById("signUpButton");
  const logoutButton = document.getElementById("logoutButton");

  refreshButton.addEventListener("click", handlers.onRefresh);
  freePlanButton.addEventListener("click", () => handlers.onPlanChange("free"));
  premiumPlanButton.addEventListener("click", () => handlers.onPlanChange("premium"));
  premiumCheckoutButton.addEventListener("click", handlers.onPremiumCheckout);
  clearHistoryButton.addEventListener("click", handlers.onClearHistory);
  downloadCsvButton.addEventListener("click", handlers.onDownloadCsv);
  netEdgeSettingsForm.addEventListener("input", () => {
    handlers.onNetEdgeSettingsChange(readNetEdgeSettingsForm(netEdgeSettingsForm));
  });
  resetNetEdgeButton.addEventListener("click", handlers.onResetNetEdgeSettings);
  authForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handlers.onSignIn(readAuthForm(authForm));
  });
  signUpButton.addEventListener("click", () => handlers.onSignUp(readAuthForm(authForm)));
  logoutButton.addEventListener("click", handlers.onSignOut);
}

function readNetEdgeSettingsForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function readAuthForm(form) {
  const fields = Object.fromEntries(new FormData(form).entries());
  return {
    email: String(fields.email ?? "").trim(),
    password: String(fields.password ?? ""),
  };
}
