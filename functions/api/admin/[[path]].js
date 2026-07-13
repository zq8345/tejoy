// Admin API — every /api/admin/* is gated by a verified Cloudflare Access JWT.
// Hard gate acceptance: `curl https://tejoy.com/api/admin/...` with no Access token => 401.
// Read routes are live now; write/publish (GitHub API + regen) land in the next increment.
import { verifyAccessJwt, deny } from "../../_lib/access-jwt.js";
import { render, genRelated, resolveImg } from "../../_lib/render.js";
import { ghConfig, commitFiles, readFile } from "../../_lib/github.js";

const CATEGORIES = ["mini", "standard", "standard-actuated", "standard-circular", "performance-gen-1", "performance-gen-3", "enterprise"];

// Validate + normalize an admin-submitted product. Returns {prod} or {error}.
function validateProduct(body, id) {
  if (!body || typeof body !== "object") return { error: "body must be an object" };
  if (Number(body.id) !== id) return { error: "id mismatch" };
  if (!CATEGORIES.includes(body.category)) return { error: "invalid category" };
  const en = body.i18n && body.i18n.en;
  if (!en || typeof en.title !== "string" || !en.title.trim()) return { error: "title required" };
  if (typeof en.description_html !== "string") return { error: "description_html required" };
  if (!Array.isArray(body.images)) return { error: "images must be an array" };
  for (const im of body.images) {
    if (!im || (typeof im.key !== "string" && typeof im.src !== "string")) return { error: "each image needs key or src" };
  }
  // Whitelist the shape we persist — ignore any extra client-sent fields.
  const prod = {
    id, category: body.category, form: body.form ?? null, robots: body.robots ?? null,
    i18n: { en: {
      title: en.title, summary_html: en.summary_html || "", description_html: en.description_html,
      keywords: en.keywords || "", meta_title: en.meta_title || en.title, meta_description: en.meta_description || "",
    } },
    images: body.images.map((im) => (im.key !== undefined ? { key: im.key, alt: im.alt || "" } : { src: im.src, alt: im.alt || "" })),
    jsonld_product: body.jsonld_product ?? null, jsonld_breadcrumb: body.jsonld_breadcrumb ?? null,
  };
  return { prod };
}

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

  // POST /api/admin/upload?name=foo.jpg  (raw image body) -> { key } stored in R2 (tejoy-images).
  // The returned key is what a product image entry stores; it resolves via site.json img_base
  // (which becomes https://img.tejoy.com/ once R2 + the custom domain are live).
  if (method === "POST" && path[0] === "upload" && path.length === 1) {
    if (!env.TEJOY_IMAGES) return json({ error: "R2 not bound (env.TEJOY_IMAGES)" }, 503);
    const url = new URL(request.url);
    const ct = request.headers.get("content-type") || "application/octet-stream";
    const name = url.searchParams.get("name") || "image";
    const ext = (name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return json({ error: "unsupported image type" }, 400);
    const buf = await request.arrayBuffer();
    if (!buf.byteLength) return json({ error: "empty body" }, 400);
    if (buf.byteLength > 8 * 1024 * 1024) return json({ error: "image exceeds 8MB" }, 413);
    const key = `u_file/uploads/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.${ext}`;
    await env.TEJOY_IMAGES.put(key, buf, { httpMetadata: { contentType: ct } });
    return json({ ok: true, key });
  }

  // PUT /api/admin/products/:id  -> validate, regenerate detail page, commit (JSON+HTML+manifest)
  if (method === "PUT" && path[0] === "products" && path.length === 2) {
    const id = Number(path[1].replace(/\D/g, ""));
    if (!id) return json({ error: "bad id" }, 400);
    const cfg = ghConfig(env);
    if (!cfg) return json({ error: "GitHub not configured" }, 503);

    let body;
    try { body = await request.json(); } catch { return json({ error: "bad json body" }, 400); }
    const v = validateProduct(body, id);
    if (v.error) return json({ error: v.error }, 400);
    const prod = v.prod;

    // Read template/config/manifest straight from the repo (GitHub), NOT via env.ASSETS:
    // ASSETS serves HTML with the CF-Pages-Analytics beacon injected, which would get baked
    // into the regenerated page. GitHub gives the raw committed file + the freshest branch state.
    const [template, siteRaw, manRaw] = await Promise.all([
      readFile(env, cfg, "data/templates/product.html"),
      readFile(env, cfg, "data/site.json"),
      readFile(env, cfg, "data/products-index.json"),
    ]);
    if (!template || !siteRaw) return json({ error: "template/config missing" }, 500);
    const site = JSON.parse(siteRaw);
    let manifest = manRaw ? JSON.parse(manRaw) : [];

    // Update this product's manifest entry, then regenerate its detail page.
    const thumb = prod.images[0] ? resolveImg(prod.images[0], site.img_base) : "";
    const entry = { id: prod.id, category: prod.category, form: prod.form, title: prod.i18n.en.title, thumb };
    manifest = manifest.filter((e) => e.id !== prod.id).concat(entry)
      .sort((a, b) => a.category.localeCompare(b.category) || a.id - b.id);
    const html = render(prod, { template, imgBase: site.img_base, related: genRelated(entry, manifest) });

    const files = [
      { path: `data/products/${prod.id}.json`, content: JSON.stringify(prod, null, 2) },
      { path: `${prod.category}/${prod.id}.html`, content: html },
      { path: `data/products-index.json`, content: JSON.stringify(manifest, null, 2) },
    ];
    try {
      const result = await commitFiles(env, cfg, files, `admin: update product ${prod.id} (${auth.email})`);
      // NOTE: only this product's detail page is regenerated. Category/hub list cards + NEW
      // products are a follow-up (list templates); an existing edit stays reachable via its page.
      return json({ ok: true, ...result, note: "detail page regenerated + committed; deploys in ~1 min" });
    } catch (e) {
      return json({ error: "commit failed", detail: String(e).slice(0, 300) }, 502);
    }
  }

  return json({ error: "not found" }, 404);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
