// Local regeneration runner: git-JSON + template -> product detail pages + admin manifest.
// Run: node scripts/regen.mjs [id ...]   (no args = all)
// Reuses functions/_lib/render.js — the SAME render the CF Pages Function uses at publish.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { render, genRelated, resolveImg, regenListPage, excerptOf } from "../functions/_lib/render.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(fs.readFileSync(path.join(REPO, "data", "site.json"), "utf8"));
const tpl = fs.readFileSync(path.join(REPO, "data", "templates", "product.html"), "utf8");

const prods = {};
const pdir = path.join(REPO, "data", "products");
for (const f of fs.readdirSync(pdir)) {
  if (!f.endsWith(".json")) continue;
  const d = JSON.parse(fs.readFileSync(path.join(pdir, f), "utf8"));
  prods[d.id] = d;
}

const locales = JSON.parse(fs.readFileSync(path.join(REPO, "data", "locales.json"), "utf8"));
const catalog = JSON.parse(fs.readFileSync(path.join(REPO, "data", "chrome.json"), "utf8"));
const MODEL = locales.model_display;
const LOCALES = locales.enabled;
const DEFAULT = locales.default;
const dirOf = (loc) => (loc === DEFAULT ? "" : "pt");          // pt-BR -> /pt
const pageOf = (loc, rel) => path.join(REPO, dirOf(loc), rel);
// Same rule chrome-sync uses: prefix IF the localized page exists. Existence is the rule; there
// is no list to keep in sync, so it cannot go stale (r1-report.md §5).
const urlOf = (p, loc) => {
  const d = dirOf(loc);
  if (!d) return p;
  const file = p.endsWith("/") ? `${d}${p}index.html` : `${d}${p}.html`;
  return fs.existsSync(path.join(REPO, file)) ? `/${d}${p}` : p;
};

// Manifest entries drive related-generation, the admin list, AND list-page regen. They stay
// self-sufficient on purpose — publish-time regen reads only this, not all 64 product JSONs — so
// the localized title/excerpt has to live here too, or the admin Function would need 64 file
// reads to render one pt list page. title/excerpt stay English so the admin UI is untouched.
const entries = Object.values(prods).map((p) => {
  const e = { id: p.id, category: p.category, form: p.form, title: p.i18n.en.title,
    thumb: p.images[0] ? resolveImg(p.images[0], cfg.img_base) : "", excerpt: excerptOf(p) };
  for (const loc of LOCALES) {
    if (loc === DEFAULT) continue;
    const t = p.i18n[loc] && p.i18n[loc].title;
    const x = excerptOf(p, loc);                                // derived, never stored by hand
    if (t || x !== e.excerpt) (e.i18n ??= {})[loc] = { ...(t ? { title: t } : {}), ...(x ? { excerpt: x } : {}) };
  }
  return e;
});

const only = process.argv.slice(2).map(Number);
const targets = only.length ? only : Object.keys(prods).map(Number);

let written = 0, imbalanced = 0;
for (const id of targets) {
  const prod = prods[id];
  if (!prod) { console.error("missing product", id); continue; }
  const entry = entries.find((e) => e.id === id);
  for (const locale of LOCALES) {
    const out = pageOf(locale, path.join(prod.category, `${id}.html`));
    // Only emit a locale's page where one already exists — regen renders content, it does not
    // decide the site map. Creating pt pages that nothing links to is a different decision.
    if (locale !== DEFAULT && !fs.existsSync(out)) continue;
    const related = genRelated(entry, entries, locale, catalog);
    const html = render(prod, { template: tpl, imgBase: cfg.img_base, related, locale, modelDisplay: MODEL, catalog });
    const opens = (html.match(/<div\b/g) || []).length;
    const closes = (html.match(/<\/div>/g) || []).length;
    if (opens !== closes) { imbalanced++; console.error(`  ⚠️ div imbalance ${locale} ${prod.category}/${id}: ${opens}/${closes}`); }
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, html);
    written++;
  }
}
console.log(`regen: wrote ${written} pages (${LOCALES.join("+")}) | div-imbalanced ${imbalanced}`);
// ⚠️ regen emits the TEMPLATE's chrome, which is the pre-R1 English one. The chrome lives in
// data/chrome.json now, so `node scripts/chrome-sync.mjs --write` MUST run after this or every
// regenerated page silently reverts R1. Content and chrome are separate layers, in that order.
console.log(`⚠️  next: node scripts/chrome-sync.mjs --write   (regen emits the template's chrome; R1's lives in the catalog)`);

const manifest = entries.sort((a, b) => a.category.localeCompare(b.category) || a.id - b.id);
fs.writeFileSync(path.join(REPO, "data", "products-index.json"), JSON.stringify(manifest, null, 2));
console.log(`manifest: data/products-index.json (${manifest.length} products, with thumb)`);

// Regenerate list pages (card grid + chip counts) from the manifest — so a new/edited
// product shows up on /products/ and its category page. /for/X hubs stay hand-curated.
const CATS = ["mini", "standard", "standard-actuated", "standard-circular", "performance-gen-1", "performance-gen-3", "enterprise"];
let lists = 0;
for (const [rel, cat] of [["products/index.html", null], ...CATS.map((c) => [`${c}/index.html`, c])]) {
 for (const locale of LOCALES) {
  const p = pageOf(locale, rel);
  if (!fs.existsSync(p)) continue;
  const h0 = fs.readFileSync(p, "utf8");
  const h1 = regenListPage(h0, manifest, cat, { locale, catalog, urlOf });
  if (h1 !== h0) { fs.writeFileSync(p, h1); lists++; }
 }
}
console.log(`list pages regenerated: ${lists} changed`);
