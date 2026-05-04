const APP_SCHEMA = "app667_crypto";
const PROFILES_TABLE = "profiles";

export async function loadOrCreateProfile(config, token) {
  const user = getUser(token);
  const existing = await fetchProfile(config, token, user.id);

  if (existing) {
    return normalizeProfile(existing);
  }

  return saveProfile(config, token, {
    user_id: user.id,
    email: user.email ?? "",
    premium_access: false,
    subscription_status: "free",
  });
}

export async function activatePremiumProfile(config, token, checkoutSession) {
  const user = getUser(token);

  return saveProfile(config, token, {
    user_id: user.id,
    email: user.email ?? "",
    premium_access: true,
    subscription_status: "active",
    stripe_checkout_session_id: checkoutSession?.sessionId ?? null,
    premium_started_at: new Date().toISOString(),
  });
}

export function hasPremiumAccess(profile) {
  return Boolean(profile?.premiumAccess && profile?.subscriptionStatus === "active");
}

async function fetchProfile(config, token, userId) {
  const response = await fetch(
    `${config.url}/rest/v1/${PROFILES_TABLE}?select=*&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
    {
      headers: restHeaders(config, token),
    },
  );

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(payload?.message || `Supabase profile load returned HTTP ${response.status}.`);
  }

  return Array.isArray(payload) ? payload[0] : null;
}

async function saveProfile(config, token, record) {
  const response = await fetch(`${config.url}/rest/v1/${PROFILES_TABLE}?on_conflict=user_id`, {
    method: "POST",
    headers: {
      ...restHeaders(config, token),
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify({
      ...record,
      updated_at: new Date().toISOString(),
    }),
  });

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(payload?.message || `Supabase profile save returned HTTP ${response.status}.`);
  }

  return normalizeProfile(Array.isArray(payload) ? payload[0] : payload);
}

function restHeaders(config, token) {
  if (!config?.url || !config?.anonKey) {
    throw new Error("Supabase profile runtime config is unavailable.");
  }

  if (!token?.access_token) {
    throw new Error("Sign in before saving Premium access.");
  }

  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${token.access_token}`,
    "Content-Type": "application/json",
    "Content-Profile": APP_SCHEMA,
    "Accept-Profile": APP_SCHEMA,
  };
}

function getUser(token) {
  if (!token?.access_token || !token?.user?.id) {
    throw new Error("Sign in before saving Premium access.");
  }

  return token.user;
}

function normalizeProfile(row) {
  return {
    userId: row?.user_id ?? "",
    email: row?.email ?? "",
    premiumAccess: Boolean(row?.premium_access),
    subscriptionStatus: row?.subscription_status ?? "free",
    stripeCheckoutSessionId: row?.stripe_checkout_session_id ?? "",
    premiumStartedAt: row?.premium_started_at ?? "",
    updatedAt: row?.updated_at ?? "",
  };
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
