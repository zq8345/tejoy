// Cloudflare Access JWT verification for origin Functions.
// Hard gate: a request WITHOUT a valid Cf-Access-Jwt-Assertion (verified signature +
// aud + email allowlist) is rejected. Anonymous requests have no header => rejected,
// so `anonymous curl /api/admin/* -> 401/403` holds even before the Access app exists.
//
// Env (set by Joe in CF Pages dashboard once the Access app is created):
//   ACCESS_TEAM_DOMAIN  e.g. "wanew.cloudflareaccess.com"  (JWKS = https://<domain>/cdn-cgi/access/certs)
//   ACCESS_AUD          the Application Audience (AUD) tag of the Access application
//   ADMIN_EMAILS        comma-separated allowlist, e.g. "zq8345@gmail.com"

function b64urlToBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64urlToJson(s) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));
}

let _jwksCache = null; // { url, keys, exp }
async function getJwks(jwksUrl) {
  const now = Date.now();
  if (_jwksCache && _jwksCache.url === jwksUrl && _jwksCache.exp > now) return _jwksCache.keys;
  const res = await fetch(jwksUrl, { cf: { cacheTtl: 3600 } });
  if (!res.ok) throw new Error("jwks fetch failed " + res.status);
  const { keys } = await res.json();
  _jwksCache = { url: jwksUrl, keys, exp: now + 3600_000 };
  return keys;
}

async function importRsaKey(jwk) {
  return crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

// Returns { ok: true, email } or { ok: false, status, reason }.
export async function verifyAccessJwt(request, env) {
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return { ok: false, status: 401, reason: "no Access token" };

  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, status: 401, reason: "malformed token" };

  const teamDomain = env.ACCESS_TEAM_DOMAIN;
  const aud = env.ACCESS_AUD;
  if (!teamDomain || !aud) return { ok: false, status: 503, reason: "Access not configured" };

  let header, payload;
  try {
    header = b64urlToJson(parts[0]);
    payload = b64urlToJson(parts[1]);
  } catch {
    return { ok: false, status: 401, reason: "unparseable token" };
  }

  // Claims: aud (must include our app), exp, iss (must be our team), email.
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) return { ok: false, status: 401, reason: "expired" };
  const audOk = Array.isArray(payload.aud) ? payload.aud.includes(aud) : payload.aud === aud;
  if (!audOk) return { ok: false, status: 403, reason: "aud mismatch" };
  const iss = `https://${teamDomain}`;
  if (payload.iss && payload.iss !== iss) return { ok: false, status: 403, reason: "iss mismatch" };

  // Verify signature against the team JWKS (by kid).
  let keys;
  try {
    keys = await getJwks(`${iss}/cdn-cgi/access/certs`);
  } catch {
    return { ok: false, status: 503, reason: "jwks unavailable" };
  }
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) return { ok: false, status: 401, reason: "unknown kid" };

  let valid = false;
  try {
    const key = await importRsaKey(jwk);
    const data = new TextEncoder().encode(parts[0] + "." + parts[1]);
    valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlToBytes(parts[2]), data);
  } catch {
    return { ok: false, status: 401, reason: "verify error" };
  }
  if (!valid) return { ok: false, status: 401, reason: "bad signature" };

  // Email allowlist — fail CLOSED: an unset/empty allowlist denies everyone
  // (don't rely on CF Access alone; require an explicit ADMIN_EMAILS list).
  const allow = (env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!allow.length) return { ok: false, status: 503, reason: "ADMIN_EMAILS not configured" };
  const email = (payload.email || "").toLowerCase();
  if (!allow.includes(email)) return { ok: false, status: 403, reason: "email not allowed" };

  return { ok: true, email };
}

export function deny(v) {
  return new Response(JSON.stringify({ error: v.reason || "forbidden" }), {
    status: v.status || 403,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
