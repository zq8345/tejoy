#!/usr/bin/env node
// chrome-sync — THE resident generator: data/chrome.json + data/templates/_chrome.html -> HTML.
//
//   node scripts/chrome-sync.mjs            dry run: report what would change, write nothing
//   node scripts/chrome-sync.mjs --write     apply
//   node scripts/chrome-sync.mjs --only <p>  restrict to paths containing <p> (sampling)
//
// This is the ONLY thing that should ever write chrome into a page.
//   ✅ change nav/footer copy, or add a language -> edit data/chrome.json, run this.
//   ⛔ never hand-edit chrome inside .html — the next run overwrites it.
//   ⛔ scripts/chrome-seed.migration.mjs ran the dataflow BACKWARDS once, to bootstrap. Not a syncer.
import fs from "fs";
import path from "path";

const WRITE = process.argv.includes("--write");
const ONLY = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;

const catalog = JSON.parse(fs.readFileSync("data/chrome.json", "utf8"));
const locales = JSON.parse(fs.readFileSync("data/locales.json", "utf8"));
const partial = fs.readFileSync("data/templates/_chrome.html", "utf8").replace(/\r/g, "");
const manifest = JSON.parse(fs.readFileSync("data/products-index.json", "utf8"));

// ---- blocks ----
const block = (name) => {
  const m = partial.match(new RegExp(`<!-- #block:${name} -->\\n([\\s\\S]*?)\\n<!-- #endblock -->`));
  if (!m) throw new Error(`partial 缺 #block:${name}`);
  return m[1];
};
const BLOCKS = { header: block("header"), switcher: block("switcher"), footer: block("footer"), mobilenav: block("mobilenav") };

// ---- routing: derived from route+locale, never a catalog key (r1-findings.md 洞②) ----
//
// ONE rule: prefix the link IF the localized page actually exists, otherwise leave it in the
// default locale. Existence is the rule — there is no list to maintain.
//
// I first ported phase2-convert.js's PRODUCT_DIRS/HUB_ONLY arrays verbatim and it was already
// WRONG: those were written when Phase 1 had 7 pt hubs, and Phase 2.6 has since added 10 more
// (faq, industrial, service, video, hangye, brand-affiliation-faq, certifications-testing,
// oem-odm-manufacturing, patents-manufacturing, starlink-compatible-accessories). The hardcoded
// list had silently drifted from reality, and copying it would have sent pt users to the English
// version of all ten. A hand-maintained list that quietly diverges from the truth is precisely
// the disease this foundation exists to cure — so it does not get to live in the cure.
//
// This also subsumes the "guide article pages stay English" rule for free: /marine/4382 has no
// pt/marine/4382.html, so it is not prefixed — no soft-404, no special case, nothing to update
// when Phase 3 finally translates those articles (they get prefixed the moment they exist).
const LOC_DIR = { en: "", "pt-BR": "pt" };
const existsCache = new Map();
const pageExists = (rel) => {
  if (!existsCache.has(rel)) existsCache.set(rel, fs.existsSync(rel));
  return existsCache.get(rel);
};
export function localizeUrl(p, locale) {
  const dir = LOC_DIR[locale] ?? "";
  // Default locale: return VERBATIM, absolute URLs included. The en logo really does use
  // https://tejoy.com/ ; normalising it to "/" is the same destination but a different byte, and
  // byte-identity is the gate that proves this refactor changed nothing. Equivalent != identical.
  if (!dir) return p;
  const abs = p.match(/^https?:\/\/(?:www\.)?tejoy\.com(\/.*)$/);   // absolute same-site -> localize the path
  if (abs) p = abs[1];
  if (p.startsWith(`/${dir}/`)) return p;                   // already localized
  const m = p.match(/^(\/[^#?]*)([#?].*)?$/);
  if (!m) return p;
  const [, route, frag = ""] = m;
  const target = `${dir}${route}`;                          // e.g. pt/marine/  |  pt/mini/4200
  const file = route.endsWith("/") ? `${target}index.html` : `${target}.html`;
  return pageExists(file) ? `/${target}${frag}` : p;
}

// ---- counts: from the manifest, never hard-coded ----
const FORM_KEY = { "Cables": "cables", "Mounts & Brackets": "mounts", "Power & Charging": "power", "Networking": "networking", "Cases & Protection": "cases" };
const counts = { all: manifest.length };
for (const [form, key] of Object.entries(FORM_KEY)) counts[key] = manifest.filter((e) => e.form === form).length;

// ---- render one block for a locale ----
function renderBlock(src, locale, vars) {
  let out = src.replace(/\{\{t\.([a-z0-9_.]+)\}\}/gi, (m, key) => {
    const e = catalog[key];
    if (!e) throw new Error(`partial 引用了 catalog 没有的 key: ${key}`);
    const v = e[locale];
    if (v === undefined || v === null || v === "") throw new Error(`catalog ${key} 缺 ${locale} — guard 应该先拦住这个`);
    return v;
  });
  out = out.replace(/\{\{count\.([a-z]+)\}\}/g, (m, k) => { if (counts[k] === undefined) throw new Error(`未知计数 ${k}`); return counts[k]; });
  out = out.replace(/\{\{url\.([^}]+)\}\}/g, (m, p) => localizeUrl(p, locale));
  out = out.replace(/\{\{switcher\}\}/g, vars.switcher ?? "");
  out = out.replace(/\{\{var\.([a-z_]+)\}\}/g, (m, k) => vars[k] ?? "");
  return out;
}

// ---- page walk ----
const SKIP = new Set([".git", "node_modules", "skin", "static", "data", "scripts", "functions", "admin"]);
function walk(dir, out = []) {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    if (d.name.startsWith(".") || SKIP.has(d.name)) continue;
    const p = path.join(dir, d.name);
    if (d.isDirectory()) walk(p, out); else if (d.name.endsWith(".html")) out.push(p.replace(/\\/g, "/"));
  }
  return out;
}
const sliceBetween = (s, a, b, inc) => {
  const i = s.indexOf(a); if (i < 0) return null;
  const j = s.indexOf(b, i + a.length); if (j < 0) return null;
  return { start: i, end: inc ? j + b.length : j, text: s.slice(i, inc ? j + b.length : j) };
};
function deleteScriptWith(html, marker) {
  const m = html.indexOf(marker); if (m < 0) return html;
  const s = html.lastIndexOf("<script", m), e = html.indexOf("</script>", m);
  if (s < 0 || e < 0) return html;
  return html.slice(0, s) + html.slice(e + 9);
}
const ORPHAN_COMMENTS = [
  "<!-- 多语言页脚数据：所有语言的 Products 和 Service 子分类 -->",
  "<!-- 多语言Home/首页客户端翻译（放在body尾部确保DOM已就绪） -->",
];
// content equality ignoring whitespace — the approved acceptance criterion
export const wsNorm = (s) => s.replace(/>\s+</g, "><").replace(/\s+/g, " ").trim();

const ANCHORS = [
  ["header", '<header class="main-header clearfix">', "</header>", true],
  ["footer", '<footer class="site-footer">', "</footer>", true],
  ["mobilenav", '<div class="mobile-nav__wrapper">', '<a href="#" data-target="html" class="scroll-to-target scroll-to-top">', false],
];

const pages = walk(".").filter((p) => !ONLY || p.includes(ONLY));
let changed = 0, identical = 0, wsOnly = 0; const report = [], errors = [];
for (const p of pages) {
  const raw = fs.readFileSync(p, "utf8");
  const crlf = raw.includes("\r\n");
  const html0 = raw.replace(/\r/g, "");
  const isPt = p.startsWith("pt/");
  const locale = isPt ? "pt-BR" : "en";
  const enPath = "/" + (isPt ? p.slice(3) : p).replace(/index\.html$/, "").replace(/\.html$/, "");
  const ptPath = "/pt" + enPath;
  const hasPt = isPt || fs.existsSync("pt/" + p);
  // switcher: only when a counterpart exists (68 en pages legitimately have none — verified)
  const swVars = isPt ? { href: enPath, hreflang: "en", label: "EN" } : { href: ptPath, hreflang: "pt-BR", label: "PT" };
  const switcher = hasPt ? renderBlock(BLOCKS.switcher, locale, swVars).replace(/\{\{sw\.([a-z]+)\}\}/g, (m, k) => swVars[k]) : "";

  let html = html0;
  for (const [name, a, b, inc] of ANCHORS) {
    const found = sliceBetween(html, a, b, inc);
    if (!found) { errors.push(`${p}: 找不到锚点 ${name}`); continue; }
    let rendered;
    try { rendered = renderBlock(BLOCKS[name], locale, { switcher }); }
    catch (e) { errors.push(`${p} ${name}: ${e.message}`); continue; }
    html = html.slice(0, found.start) + rendered + html.slice(found.end);
  }
  html = deleteScriptWith(html, "var FOOTER_LANGS");
  html = deleteScriptWith(html, "function getCookie");
  for (const c of ORPHAN_COMMENTS) html = html.split(c).join("");

  if (html === html0) { identical++; continue; }
  changed++;
  if (wsNorm(html0) === wsNorm(html)) { wsOnly++; report.push({ p, kind: "ws-only" }); }
  else report.push({ p, kind: "content", d: html.length - html0.length });
  if (WRITE) fs.writeFileSync(p, crlf ? html.replace(/\n/g, "\r\n") : html);
}

console.log(`chrome-sync [${WRITE ? "WRITE" : "dry"}]  页面 ${pages.length}  |  字节不变 ${identical}  |  变更 ${changed}(其中纯空白 ${wsOnly})`);
if (errors.length) { console.log(`\n🔴 错误 ${errors.length}:`); for (const e of errors.slice(0, 10)) console.log("   " + e); }
const contentChanged = report.filter((r) => r.kind === "content");
console.log(`\n内容有变更的页 ${contentChanged.length}(预期:删 FOOTER_LANGS 14KB + footer 烘焙 + 括号(N))`);
for (const r of contentChanged.slice(0, 6)) console.log(`   ${r.p}  Δ${r.d}`);
if (wsOnly) { console.log(`\n仅空白归一的页 ${wsOnly}:`); for (const r of report.filter((r) => r.kind === "ws-only").slice(0, 8)) console.log("   " + r.p); }
if (errors.length) process.exit(1);
