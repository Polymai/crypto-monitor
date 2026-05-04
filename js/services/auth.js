const AUTH_TOKEN_KEY = "crypto-monitor-auth-token-v1";

export function getStoredAuthToken() {
  try {
    const raw = window.localStorage.getItem(AUTH_TOKEN_KEY);
    const token = raw ? JSON.parse(raw) : null;
    return isUsableToken(token) ? token : null;
  } catch {
    return null;
  }
}

export function persistAuthToken(token) {
  try {
    if (token) {
      window.localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(token));
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    }
    return true;
  } catch {
    return false;
  }
}

export async function signInWithPassword(config, { email, password }) {
  validateCredentials(email, password);
  const payload = await authRequest(config, "/token?grant_type=password", {
    email: email.trim(),
    password,
  });
  persistAuthToken(payload);
  return payload;
}

export async function signUpWithPassword(config, { email, password }) {
  validateCredentials(email, password);
  const payload = await authRequest(config, "/signup", {
    email: email.trim(),
    password,
  });
  if (isUsableToken(payload)) {
    persistAuthToken(payload);
  }
  return payload;
}

export async function signOut(config, accessToken = getStoredAuthToken()?.access_token) {
  if (!accessToken) {
    persistAuthToken(null);
    return { ok: true };
  }

  await authRequest(config, "/logout", {}, {
    Authorization: `Bearer ${accessToken}`,
  });
  persistAuthToken(null);
  return { ok: true };
}

export function getTokenUser(token) {
  return token?.user ?? null;
}

async function authRequest(config, path, body, extraHeaders = {}) {
  if (!config?.url || !config?.anonKey) {
    throw new Error("Supabase auth runtime config is unavailable.");
  }

  const response = await fetch(`${config.url}/auth/v1${path}`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(payload?.error_description || payload?.msg || payload?.error || `Supabase auth returned HTTP ${response.status}.`);
  }

  return payload;
}

function validateCredentials(email, password) {
  if (!email || !email.includes("@")) {
    throw new Error("Enter a valid email address.");
  }

  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }
}

function isUsableToken(token) {
  return Boolean(token?.access_token && token?.user?.id);
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
