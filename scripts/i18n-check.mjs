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
// R3 起,页面散文也有目录(data/pages/*.json)。guard 必须一起看 —— 它守的是「这个语种还差什么」,
// 而不是「chrome 还差什么」。漏掉页面目录,西语开进来时 47 条首页文案会静默回退成英文而无人吼。
// 从目录读,不是列一张会腐烂的清单:新加一桶(信息页/hub/指南)自动进 guard,没人需要记得。
const PAGES = fs.existsSync("data/pages")
  ? fs.readdirSync("data/pages").filter((f) => f.endsWith(".json") && f !== "home-tiles.json")
  : [];
const catalog = Object.assign({}, JSON.parse(fs.readFileSync("data/chrome.json", "utf8")),
  ...PAGES.map((f) => JSON.parse(fs.readFileSync(`data/pages/${f}`, "utf8"))));
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
// ⛔ 按目录读,不列清单 —— 和上面的 data/pages 一样。
//
// 这条假警报我已经修过两次实例、没修过类,于是它第三次复发:
//   第一次:只扫 _chrome.html            → 21 个活 key 被报"可能已腐烂"
//   第二次:只数 {{t.key}} token 消费者   → 3 个被【代码】读的 key 被误报
//   第三次:硬编码三个模板名,page-*.html 不在里面 → 281 条
// 每次我都补一个名字进清单,而清单本身就是那个 bug。⭐ 一张需要人记得去更新的清单,
// 就是一个迟早会红成噪音的 guard —— 而我自己写过:假警报会训练人略过告警,然后真的那条也没人读。
const TEMPLATES = fs.existsSync("data/templates")
  ? fs.readdirSync("data/templates").filter((f) => f.endsWith(".html")).map((f) => `data/templates/${f}`)
  : [];
const PARTIAL = "data/templates/_chrome.html";
const allTpl = TEMPLATES.filter((f) => fs.existsSync(f)).map((f) => fs.readFileSync(f, "utf8")).join("\n");
for (const m of allTpl.matchAll(/\{\{t\.([a-z0-9_.]+)\}\}/gi)) if (!catalog[m[1]]) orphans.push(m[1]);
// A key has TWO kinds of consumer: a {{t.key}} token in a template, and code in render.js reading
// catalog["key"] directly (meta.title.suffix, card.alt.suffix, card.alt.category — the derived
// ones, which by design never appear as a token). Counting only the first kind reported all three
// as "possibly rotten" — the same false alarm as when this guard only scanned _chrome.html and
// cried about 21 live keys. A guard that cries wolf teaches people to skip its output, and then
// the one real warning goes unread too. So: enumerate every consumer, not the convenient one.
// Every consumer, not just the obvious one: render.js reads catalog["key"], and regen.mjs names
// keys in its LIST_PAGES table via {t:key}. body.banner.title happens to ALSO be a template token
// today, so leaving regen.mjs out would not have alarmed yet — it would have waited for the first
// key that is only ever named there. A gap that is currently masked is still a gap.
const CODE = ["functions/_lib/render.js", "scripts/regen.mjs"];
const allCode = CODE.filter((f) => fs.existsSync(f)).map((f) => fs.readFileSync(f, "utf8")).join("\n");
const used = (key) => allTpl.includes(`{{t.${key}}}`) || allCode.includes(`"${key}"`) || allCode.includes(`'${key}'`);
// Unused keys: in the catalog but referenced by neither a template nor code (rot).
const unused = [];
for (const [key] of entries) if (!used(key)) unused.push(key);

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
