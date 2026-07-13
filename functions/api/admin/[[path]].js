// Admin API — every /api/admin/* is gated by a verified Cloudflare Access JWT.
// Hard gate acceptance: `curl https://tejoy.com/api/admin/...` with no Access token => 401.
// Read routes are live now; write/publish (GitHub API + regen) land in the next increment.
import { verifyAccessJwt, deny } from "../../_lib/access-jwt.js";

export async function onRequest(context) {
  const { request, env, params } = context;

  // ---- HARD GATE ----
  const auth = await verifyAccessJwt(request, env);
  if (!auth.ok) return deny(auth);

  const path = Array.isArray(params.path) ? params.path : params.path ? [params.path] : [];
  const method = request.method;
  const asset = (p) => env.ASSETS.fetch(new Request(new URL(p, request.url).toString()));

  // GET /api/admin/whoami
  if (method === "GET" && path[0] === "whoami" && path.length === 1) {
    return json({ email: auth.email });
  }

  // GET /api/admin/products  -> lightweight list (from build-time manifest)
  if (method === "GET" && path[0] === "products" && path.length === 1) {
    const res = await asset("/data/products-index.json");
    const list = res.ok ? await res.json() : [];
    return json({ products: list, count: list.length, admin: auth.email });
  }

  // GET /api/admin/products/:id  -> full product JSON
  if (method === "GET" && path[0] === "products" && path.length === 2) {
    const id = path[1].replace(/[^0-9]/g, "");
    if (!id) return json({ error: "bad id" }, 400);
    const res = await asset(`/data/products/${id}.json`);
    if (!res.ok) return json({ error: "not found" }, 404);
    return json(await res.json());
  }

  // Write/publish routes (PUT/POST) — stub until GitHub-API wiring lands.
  if (method === "PUT" || method === "POST") {
    return json({ error: "not implemented yet", admin: auth.email }, 501);
  }

  return json({ error: "not found" }, 404);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
