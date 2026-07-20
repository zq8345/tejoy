// Admin API — every /api/admin/* is gated by a verified Cloudflare Access JWT.
// Hard gate acceptance: `curl https://tejoy.com/api/admin/...` with no Access token => 401.
// Read routes are live now; write/publish (GitHub API + regen) land in the next increment.
import { verifyAccessJwt, deny } from "../../_lib/access-jwt.js";
import { render, genRelated, resolveImg, regenListPage, excerptOf } from "../../_lib/render.js";
import { ghConfig, commitFiles, readFile } from "../../_lib/github.js";

const LIST_CAT = null; // /products/ uses no category filter

// Read the render inputs (template + config + manifest) straight from the repo.
//
// ⚠️ chrome.json / locales.json 以前【没读】—— 于是 render() 和 regenListPage() 都拿不到
//    catalog。后果不是"少点东西",是两种不同的坏:
//      · render()      → 在第一个 {{t.}} token 上抛错 → Joe 点保存直接 500(实测过)
//      · regenListPage → 【不抛】,altOf 静默回落到硬编码的 "- tejoy Products",
//                        把略微错误的卡片 alt commit 进仓库,没有任何门会红
//    两个入口现在都要求 catalog(缺就抛),所以这里必须把它们读进来。
async function loadCtx(env, cfg) {
  const [template, siteRaw, manRaw, chromeRaw, localesRaw] = await Promise.all([
    readFile(env, cfg, "data/templates/product.html"),
    readFile(env, cfg, "data/site.json"),
    readFile(env, cfg, "data/products-index.json"),
    readFile(env, cfg, "data/chrome.json"),
    readFile(env, cfg, "data/locales.json"),
  ]);
  if (!template || !siteRaw || !chromeRaw || !localesRaw) return null;
  return {
    template, site: JSON.parse(siteRaw), manifest: manRaw ? JSON.parse(manRaw) : [],
    catalog: JSON.parse(chromeRaw), modelDisplay: JSON.parse(localesRaw).model_display,
  };
}

// 后台只发英文页(它写 `${category}/${id}.html`,不写 pt/ 和 es/),所以 locale 恒为 en,
// urlOf 对 en 就是原样返回 —— 这不是"简化",是默认语种的正确行为(不加前缀)。
// ⚠️ 由此有一个【已知的、这一笔不修】的洞:Joe 改一个产品,pt/ 和 es/ 的对应页不会重生成,
//    会静默变旧。已单独报总工,不在这一笔里夹带。
const EN_URL_OF = (p) => p;

// Persist a product: update manifest, regenerate its detail page + the affected list pages
// (/products/ + new category + old category if it moved), commit everything in one commit.
// ⭐ 渲染部分抽成【纯函数】,IO 留在 publishProduct 里。
//
// 理由不是"好看":这个 P0 活下来,就是因为没人真跑过这条路径 —— 而它跑不了,
// 因为它和 GitHub API 长在一起。抽出来之后,scripts/admin-publish-check.mjs 调用的是
// **生产真正调用的这一个函数**,不是我照着理解手写的等价物。
// ⚠️ 我第一版的门就栽在这儿:我在文件开头写了"手写等价调用只能证明我以为的签名",
//    然后第②节自己就那么干了 —— 攻击(把 render 调用还原成 P0)时,②照样全绿。
//    尺子必须量原件,不是量我的副本。
// readPage(rel) 由调用者注入:线上是 GitHub API,测试里是磁盘。渲染逻辑两边完全同一份。
export async function buildProductFiles(ctx, prod, { oldCategory, readPage }) {
  const { template, site, catalog, modelDisplay } = ctx;
  const thumb = prod.images[0] ? resolveImg(prod.images[0], site.img_base) : "";
  const entry = { id: prod.id, category: prod.category, form: prod.form, title: prod.i18n.en.title, thumb, excerpt: excerptOf(prod) };
  const manifest = ctx.manifest.filter((e) => e.id !== prod.id).concat(entry)
    .sort((a, b) => a.category.localeCompare(b.category) || a.id - b.id);
  const detailHtml = render(prod, { template, imgBase: site.img_base,
    related: genRelated(entry, manifest, "en", catalog, EN_URL_OF),
    locale: "en", catalog, modelDisplay, urlOf: EN_URL_OF });
  const files = [
    { path: `data/products/${prod.id}.json`, content: JSON.stringify(prod, null, 2) },
    { path: `${prod.category}/${prod.id}.html`, content: detailHtml },
    { path: `data/products-index.json`, content: JSON.stringify(manifest, null, 2) },
  ];
  const cats = new Set([LIST_CAT, prod.category]);
  if (oldCategory && oldCategory !== prod.category) cats.add(oldCategory);
  for (const cat of cats) {
    const rel = cat ? `${cat}/index.html` : "products/index.html";
    const h = await readPage(rel);
    if (h) files.push({ path: rel, content: regenListPage(h, manifest, cat, { locale: "en", catalog, urlOf: EN_URL_OF }) });
  }
  return files;
}

// Persist a product: update manifest, regenerate its detail page + the affected list pages
// (/products/ + new category + old category if it moved), commit everything in one commit.
async function publishProduct(env, cfg, ctx, prod, { isNew, oldCategory, email }) {
  const files = await buildProductFiles(ctx, prod, { oldCategory, readPage: (rel) => readFile(env, cfg, rel) });
  return commitFiles(env, cfg, files, `admin: ${isNew ? "create" : "update"} product ${prod.id} (${email})`);
}

// Delete a product: remove its JSON + detail page, drop it from the manifest, and
// regenerate the affected list pages (/products/ + its category) — one atomic commit.
async function unpublishProduct(env, cfg, ctx, id, { email }) {
  const { catalog } = ctx;          // ⚠️ 漏了它 = 下面那行 regenListPage 直接 ReferenceError
  const existing = ctx.manifest.find((e) => e.id === id);
  if (!existing) return { notFound: true };
  const category = existing.category;
  const manifest = ctx.manifest.filter((e) => e.id !== id);
  const files = [
    { path: `data/products/${id}.json`, delete: true },
    { path: `${category}/${id}.html`, delete: true },
    { path: `data/products-index.json`, content: JSON.stringify(manifest, null, 2) },
  ];
  for (const cat of new Set([LIST_CAT, category])) {
    const rel = cat ? `${cat}/index.html` : "products/index.html";
    const h = await readFile(env, cfg, rel);
    if (h) files.push({ path: rel, content: regenListPage(h, manifest, cat, { locale: "en", catalog, urlOf: EN_URL_OF }) });
  }
  return commitFiles(env, cfg, files, `admin: delete product ${id} (${email})`);
}

const CATEGORIES = ["mini", "standard", "standard-actuated", "standard-circular", "performance-gen-1", "performance-gen-3", "enterprise"];
const FORMS = ["Cables", "Mounts & Brackets", "Power & Charging", "Networking", "Cases & Protection"];

// Validate + normalize an admin-submitted product. Returns {prod} or {error}.
function validateProduct(body, id) {
  if (!body || typeof body !== "object") return { error: "body must be an object" };
  // id is authoritative from the caller (URL id for edit, assigned id for create) — not body.
  if (!CATEGORIES.includes(body.category)) return { error: "invalid category" };
  // form-factor is optional (null/empty = unset); if present it must be a known enum.
  const form = body.form ? String(body.form) : null;
  if (form !== null && !FORMS.includes(form)) return { error: "invalid form" };
  const en = body.i18n && body.i18n.en;
  if (!en || typeof en.title !== "string" || !en.title.trim()) return { error: "title required" };
  if (typeof en.description_html !== "string") return { error: "description_html required" };
  if (!Array.isArray(body.images)) return { error: "images must be an array" };
  for (const im of body.images) {
    if (!im || (typeof im.key !== "string" && typeof im.src !== "string")) return { error: "each image needs key or src" };
  }
  // Whitelist the shape we persist — ignore any extra client-sent fields.
  const prod = {
    id, category: body.category, form, robots: body.robots ?? null,
    i18n: { en: {
      title: en.title, summary_html: en.summary_html || "", description_html: en.description_html,
      // ⛔ 不再持久化 meta_title:它是【派生值】(metaTitleOf 从 title + model_display + 品牌后缀算),
      //    64 个产品里存的那份已经被删干净。后台每存一次就写回一份 = 把刚清掉的化石重新种回去,
      //    而且它一旦和 title 不一致,漂移是看不见的(半英半葡就是这么上线的)。
      meta_description: en.meta_description || "",
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

  // POST /api/admin/products  -> create a new product (assign next id), regen detail + lists.
  if (method === "POST" && path[0] === "products" && path.length === 1) {
    const cfg = ghConfig(env);
    if (!cfg) return json({ error: "GitHub not configured" }, 503);
    let body;
    try { body = await request.json(); } catch { return json({ error: "bad json body" }, 400); }
    const ctx = await loadCtx(env, cfg);
    if (!ctx) return json({ error: "template/config missing" }, 500);
    const newId = ctx.manifest.reduce((m, e) => Math.max(m, e.id), 0) + 1;
    const v = validateProduct(body, newId);
    if (v.error) return json({ error: v.error }, 400);
    try {
      const r = await publishProduct(env, cfg, ctx, v.prod, { isNew: true, email: auth.email });
      return json({ ok: true, id: newId, ...r, note: "new product created + lists regenerated; deploys in ~1 min" });
    } catch (e) {
      return json({ error: "commit failed", detail: String(e).slice(0, 300) }, 502);
    }
  }

  // PUT /api/admin/products/:id  -> edit an existing product, regen detail + affected lists.
  if (method === "PUT" && path[0] === "products" && path.length === 2) {
    const id = Number(path[1].replace(/\D/g, ""));
    if (!id) return json({ error: "bad id" }, 400);
    const cfg = ghConfig(env);
    if (!cfg) return json({ error: "GitHub not configured" }, 503);
    let body;
    try { body = await request.json(); } catch { return json({ error: "bad json body" }, 400); }
    const v = validateProduct(body, id);
    if (v.error) return json({ error: v.error }, 400);
    const ctx = await loadCtx(env, cfg);
    if (!ctx) return json({ error: "template/config missing" }, 500);
    const oldCategory = (ctx.manifest.find((e) => e.id === id) || {}).category;
    try {
      const r = await publishProduct(env, cfg, ctx, v.prod, { isNew: false, oldCategory, email: auth.email });
      return json({ ok: true, ...r, note: "detail + affected lists regenerated; deploys in ~1 min" });
    } catch (e) {
      return json({ error: "commit failed", detail: String(e).slice(0, 300) }, 502);
    }
  }

  // DELETE /api/admin/products/:id  -> remove product, detail page + regen lists.
  if (method === "DELETE" && path[0] === "products" && path.length === 2) {
    const id = Number(path[1].replace(/\D/g, ""));
    if (!id) return json({ error: "bad id" }, 400);
    const cfg = ghConfig(env);
    if (!cfg) return json({ error: "GitHub not configured" }, 503);
    const ctx = await loadCtx(env, cfg);
    if (!ctx) return json({ error: "template/config missing" }, 500);
    try {
      const r = await unpublishProduct(env, cfg, ctx, id, { email: auth.email });
      if (r.notFound) return json({ error: "not found" }, 404);
      return json({ ok: true, ...r, note: "product deleted + lists regenerated; deploys in ~1 min" });
    } catch (e) {
      return json({ error: "delete failed", detail: String(e).slice(0, 300) }, 502);
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
