export function consumeStripeReturnStatus() {
  const url = new URL(window.location.href);
  const result = url.searchParams.get("stripeCheckout");
  const sessionId = url.searchParams.get("session_id");

  if (result !== "success" && result !== "cancelled") {
    return { status: "none", message: "" };
  }

  url.searchParams.delete("stripeCheckout");
  url.searchParams.delete("session_id");
  window.history.replaceState({}, "", url.toString());

  if (result === "success") {
    return {
      status: "success",
      sessionId,
      message: "Stripe checkout completed. Verifying Premium access.",
    };
  }

  return {
    status: "cancelled",
    sessionId: null,
    message: "Stripe checkout was cancelled. Premium remains locked.",
  };
}

export async function verifyPremiumCheckout({ supabaseConfig, stripeConfig, sessionId, authToken }) {
  if (!sessionId || sessionId === "{CHECKOUT_SESSION_ID}") {
    throw new Error("Stripe checkout session id is missing.");
  }

  if (!supabaseConfig?.functionsBaseUrl || !supabaseConfig?.anonKey) {
    throw new Error("Supabase Functions runtime config is unavailable.");
  }

  const functionName = stripeConfig?.verifyFunctionName || "app667-crypto-monitor-create-checkout-session";
  const response = await fetch(`${supabaseConfig.functionsBaseUrl}/${functionName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken?.access_token || supabaseConfig.anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sessionId }),
  });

  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload?.error || `Stripe verification returned HTTP ${response.status}.`);
  }

  if (!payload?.active) {
    throw new Error("Stripe checkout is not marked as paid.");
  }

  return payload;
}

export async function redirectToPremiumCheckout({ supabaseConfig, stripeConfig, authToken }) {
  if (!supabaseConfig?.functionsBaseUrl || !supabaseConfig?.anonKey) {
    throw new Error("Supabase Functions runtime config is unavailable.");
  }

  const functionName = stripeConfig?.checkoutFunctionName || "app667-crypto-monitor-create-checkout-session";
  const response = await fetch(`${supabaseConfig.functionsBaseUrl}/${functionName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken?.access_token || supabaseConfig.anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildCheckoutPayload(authToken)),
  });

  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload?.error || `Stripe checkout returned HTTP ${response.status}.`);
  }

  if (!payload?.url) {
    throw new Error("Stripe checkout did not return a redirect URL.");
  }

  window.location.assign(payload.url);
}

function buildCheckoutPayload(authToken) {
  const successUrl = new URL(window.location.href);
  successUrl.searchParams.set("stripeCheckout", "success");
  successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");

  const cancelUrl = new URL(window.location.href);
  cancelUrl.searchParams.set("stripeCheckout", "cancelled");

  return {
    successUrl: successUrl.toString().replace("%7BCHECKOUT_SESSION_ID%7D", "{CHECKOUT_SESSION_ID}"),
    cancelUrl: cancelUrl.toString(),
    appUserId: authToken?.user?.id ?? "",
    email: authToken?.user?.email ?? "",
  };
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
