#!/usr/bin/env node
// i18n-check — turns "did we translate everything?" from a human eyeball into a build status.
//
//   node scripts/i18n-check.mjs --report   list gaps, ALWAYS exit 0  (does not block anyone)
//   node scripts/i18n-check.mjs --strict   any gap -> exit 1         (wire to pre-push later)
//
// Dual mode is deliberate: R1 ships in --report while the surfaced gaps are still being
// translated, so a red guard never blocks dev/i18n/push. Flip to --strict once the list is
// cleared — from then on nothing can leak in.
//
// Design notes (see r1-findings.md):
//  - The key set is decided by VISIBILITY (chrome-build enumerates every visible unit), never
//    by "was it already translated" — that circular rule would freeze existing leaks invisibly.
//  - A missing locale value is a GAP, on purpose. "Not translated yet" is never silenced.
//  - The whitelist in locales.json is the only escape hatch, every entry needs a `reason`, and
//    its size is reported so quiet growth is visible.
import fs from "fs";

const MODE = process.argv.includes("--strict") ? "strict" : "report";
const locales = JSON.parse(fs.readFileSync("data/locales.json", "utf8"));
const catalog = JSON.parse(fs.readFileSync("data/chrome.json", "utf8"));
const enabled = locales.enabled;

// `_`-prefixed entries are file-level docs/metadata, not translatable keys.
const entries = Object.entries(catalog).filter(([k]) => !k.startsWith("_"));

const gaps = [];
for (const [key, entry] of entries) {
  for (const loc of enabled) {
    const v = entry[loc];
    if (v === undefined || v === null || String(v).trim() === "") gaps.push({ key, loc, en: entry.en });
  }
}

// Orphan tokens: every {{t.KEY}} used by the partial must exist in the catalog.
const orphans = [];
// Every template that consumes tokens — not just the chrome partial. product.html gained
// {{t.body.*}} tokens in R1 item 7, and a guard that only knew about _chrome.html reported all 21
// of them as "unused, possibly rotten". A false alarm from the guard is not harmless: it trains
// people to ignore it, and then the real one goes unread too.
const TEMPLATES = ["data/templates/_chrome.html", "data/templates/product.html"];
const PARTIAL = TEMPLATES[0];
const allTpl = TEMPLATES.filter((f) => fs.existsSync(f)).map((f) => fs.readFileSync(f, "utf8")).join("\n");
for (const m of allTpl.matchAll(/\{\{t\.([a-z0-9_.]+)\}\}/gi)) if (!catalog[m[1]]) orphans.push(m[1]);
// Unused keys: in the catalog but referenced nowhere (rot).
const unused = [];
for (const [key] of entries) if (!allTpl.includes(`{{t.${key}}}`)) unused.push(key);

const wl = locales.fallback || [];
console.log(`i18n-check [${MODE}]  locales=${enabled.join(",")}  keys=${entries.length}  whitelist=${wl.length}`);
if (gaps.length) {
  console.log(`\n🔴 缺失 ${gaps.length} 处(未翻译 / 待裁决):`);
  for (const g of gaps) console.log(`   [${g.loc}] ${g.key}  en="${g.en}"`);
}
if (orphans.length) console.log(`\n⚠️ 孤儿 token(partial 用了但 catalog 没有) ${orphans.length}: ${[...new Set(orphans)].join(", ")}`);
if (unused.length) console.log(`\n⚠️ 无人使用的 key(可能已腐烂) ${unused.length}: ${unused.slice(0, 12).join(", ")}${unused.length > 12 ? " …" : ""}`);
if (!gaps.length && !orphans.length) console.log("\n✅ 无缺失、无孤儿 token。");

const fail = gaps.length > 0 || orphans.length > 0;
if (MODE === "strict" && fail) { console.error(`\nFAIL: ${gaps.length} 处缺失 / ${orphans.length} 个孤儿 token(--strict)`); process.exit(1); }
if (fail) console.log(`\n(--report 模式:不阻塞,exit 0。清空后切 --strict 接 pre-push。)`);
