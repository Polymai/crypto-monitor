// Polymai runtime Supabase config.
// Frontend-safe only: Project URL, publishable API key, and public Functions base URL.
// Never add secret API keys, service role keys, DB passwords, or connection strings here.
(function () {
  const config = Object.freeze({
    url: "https://pfnlebwkbhblytpvaokd.supabase.co",
    anonKey: "sb_publishable_O8CemBWuZAjQDC6gSkNq9Q_wAmDtHiv",
    functionsBaseUrl: "https://pfnlebwkbhblytpvaokd.supabase.co/functions/v1",
  });
  window.__POLYMAI_SUPABASE_CONFIG__ = config;
  window.__SUPABASE_CONFIG__ = config;
})();
