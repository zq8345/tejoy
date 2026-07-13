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

// Manifest entries drive related-generation, the admin list, AND list-page regen.
const entries = Object.values(prods).map((p) => ({
  id: p.id, category: p.category, form: p.form, title: p.i18n.en.title,
  thumb: p.images[0] ? resolveImg(p.images[0], cfg.img_base) : "",
  excerpt: excerptOf(p),
}));

const only = process.argv.slice(2).map(Number);
const targets = only.length ? only : Object.keys(prods).map(Number);

let written = 0, imbalanced = 0;
for (const id of targets) {
  const prod = prods[id];
  if (!prod) { console.error("missing product", id); continue; }
  const entry = entries.find((e) => e.id === id);
  const related = genRelated(entry, entries);
  const html = render(prod, { template: tpl, imgBase: cfg.img_base, related });
  const opens = (html.match(/<div\b/g) || []).length;
  const closes = (html.match(/<\/div>/g) || []).length;
  if (opens !== closes) { imbalanced++; console.error(`  ⚠️ div imbalance ${prod.category}/${id}: ${opens}/${closes}`); }
  fs.writeFileSync(path.join(REPO, prod.category, `${id}.html`), html);
  written++;
}
console.log(`regen: wrote ${written} pages | div-imbalanced ${imbalanced} | related fallback OK`);

const manifest = entries.sort((a, b) => a.category.localeCompare(b.category) || a.id - b.id);
fs.writeFileSync(path.join(REPO, "data", "products-index.json"), JSON.stringify(manifest, null, 2));
console.log(`manifest: data/products-index.json (${manifest.length} products, with thumb)`);

// Regenerate list pages (card grid + chip counts) from the manifest — so a new/edited
// product shows up on /products/ and its category page. /for/X hubs stay hand-curated.
const CATS = ["mini", "standard", "standard-actuated", "standard-circular", "performance-gen-1", "performance-gen-3", "enterprise"];
let lists = 0;
for (const [rel, cat] of [["products/index.html", null], ...CATS.map((c) => [`${c}/index.html`, c])]) {
  const p = path.join(REPO, rel);
  if (!fs.existsSync(p)) continue;
  const h0 = fs.readFileSync(p, "utf8");
  const h1 = regenListPage(h0, manifest, cat);
  if (h1 !== h0) { fs.writeFileSync(p, h1); lists++; }
}
console.log(`list pages regenerated: ${lists} changed`);
