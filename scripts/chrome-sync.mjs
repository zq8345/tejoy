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
//
// #52 批2：注入核心抽到 functions/_lib/chrome.js（makeChrome/applyChrome）——admin-worker 运行时
// regen 的双步第二段 import 同一份（单真源，W1b 铁律）。本脚本保留：walk/报告/WRITE/CRLF 处理。
// 抽取等价闸 = 重构后 dry run 全站「变更 0」（当前产物已同步态下，字节级无损证明）。
import fs from "fs";
import path from "path";
import { localeDirs } from "./locale-dirs.mjs";
import { makeChrome, wsNorm } from "../functions/_lib/chrome.js";

const WRITE = process.argv.includes("--write");
const ONLY = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;

const catalog = JSON.parse(fs.readFileSync("data/chrome.json", "utf8"));
const locales = JSON.parse(fs.readFileSync("data/locales.json", "utf8"));
const partial = fs.readFileSync("data/templates/_chrome.html", "utf8");
const manifest = JSON.parse(fs.readFileSync("data/products-index.json", "utf8"));

const existsCache = new Map();
const pageExists = (rel) => {
  if (!existsCache.has(rel)) existsCache.set(rel, fs.existsSync(rel));
  return existsCache.get(rel);
};

const { applyChrome } = makeChrome({
  catalog, locales, partial, manifest, pageExists, locDir: localeDirs(locales),
});

// ---- page walk ----
const SKIP = new Set([".git", "node_modules", "skin", "static", "data", "scripts", "functions", "admin", "admin-worker"]);
function walk(dir, out = []) {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    if (d.name.startsWith(".") || SKIP.has(d.name)) continue;
    const p = path.join(dir, d.name);
    if (d.isDirectory()) walk(p, out); else if (d.name.endsWith(".html")) out.push(p.replace(/\\/g, "/"));
  }
  return out;
}

const pages = walk(".").filter((p) => !ONLY || p.includes(ONLY));
let changed = 0, identical = 0, wsOnly = 0; const report = [], errors = [];
for (const p of pages) {
  const raw = fs.readFileSync(p, "utf8");
  const crlf = raw.includes("\r\n");
  const html0 = raw.replace(/\r/g, "");
  const { html, errors: pageErrors } = applyChrome(html0, p);
  errors.push(...pageErrors);

  if (html === html0) { identical++; continue; }
  changed++;
  if (wsNorm(html0) === wsNorm(html)) { wsOnly++; report.push({ p, kind: "ws-only" }); }
  else report.push({ p, kind: "content", d: html.length - html0.length });
  if (WRITE) fs.writeFileSync(p, crlf ? html.replace(/\n/g, "\r\n") : html);
}

// #52 批2：维护全站页面清单（admin-worker 的 pageExists 数据源——Worker 无 fs，applyChrome 的
// 存在性规则靠它。与产物同源同 commit：walk 是清单的唯一真源，人手不维护）。
if (WRITE) {
  const list = pages.slice().sort();
  fs.writeFileSync("data/pages-list.json", JSON.stringify(list) + "\n");
}

console.log(`chrome-sync [${WRITE ? "WRITE" : "dry"}]  页面 ${pages.length}  |  字节不变 ${identical}  |  变更 ${changed}(其中纯空白 ${wsOnly})`);
if (errors.length) { console.log(`\n🔴 错误 ${errors.length}:`); for (const e of errors.slice(0, 10)) console.log("   " + e); }
const contentChanged = report.filter((r) => r.kind === "content");
console.log(`\n内容有变更的页 ${contentChanged.length}(预期:删 FOOTER_LANGS 14KB + footer 烘焙 + 括号(N))`);
for (const r of contentChanged.slice(0, 6)) console.log(`   ${r.p}  Δ${r.d}`);
if (wsOnly) { console.log(`\n仅空白归一的页 ${wsOnly}:`); for (const r of report.filter((r) => r.kind === "ws-only").slice(0, 8)) console.log("   " + r.p); }
if (errors.length) process.exit(1);
