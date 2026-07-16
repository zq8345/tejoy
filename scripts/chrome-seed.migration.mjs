// ⛔⛔ ONE-TIME MIGRATION TOOL — DO NOT RUN TO "SYNC" ⛔⛔
//
// After R1 the dataflow is:   data/chrome.json  ──generate──>  HTML
// This script runs it BACKWARDS (HTML ──extract──> catalog). That was correct exactly once: to
// bootstrap the catalog out of the hand-written chrome. From that moment the HTML is a GENERATED
// ARTIFACT, so re-extracting from it feeds generated output back in as if it were source — noise
// at best; at worst it fossilises a generation bug as "the original" and nothing can tell you.
//
//   ✅ Changing nav/footer copy, or adding a language?
//        edit data/chrome.json  ->  node scripts/chrome-sync.mjs   (the resident generator)
//   ⛔ Do NOT edit chrome inside the .html files — the next sync overwrites it.
//   ⛔ Do NOT re-run this to "pick up" an HTML edit — that reverses the dataflow.
//
// --write is gated behind an explicit --i-know-this-is-migration-only flag, because a comment is
// a suggestion and a barrier is a rule. Existing catalog entries are also merge-preserved, so even
// a mistaken run cannot clobber human translations — belt and braces.
//
// Run (migration only):
//   node scripts/chrome-seed.migration.mjs                                          # dry report
//   node scripts/chrome-seed.migration.mjs --write --i-know-this-is-migration-only
//
// Why this shape:
//  - the pt footer is used as the STRUCTURAL template because it is complete; the en footer's
//    Products/Guides <ul>s are empty in HTML and filled at runtime by FOOTER_LANGS. Baking them
//    is required before the script can be deleted (see r1-findings.md §3).
//  - en values for those baked items come from FOOTER_LANGS.en itself (free, no retranslation).
//  - key set is decided by VISIBILITY (every visible unit becomes a key), never by "was it
//    already translated" — that circular rule would freeze existing leaks (r1-findings.md).
//  - hrefs/lang/hreflang are NEVER catalog keys: they are derived from route+locale.
import fs from "fs";

const EN_PAGE = "products/index.html";
const PT_PAGE = "pt/products/index.html";

export const sliceBetween = (s, a, b, inc) => {
  const i = s.indexOf(a); if (i < 0) return null;
  const j = s.indexOf(b, i + a.length); if (j < 0) return null;
  return s.slice(i, inc ? j + b.length : j);
};
export const chromeBlocks = (html) => ({
  header: sliceBetween(html, '<header class="main-header clearfix">', "</header>", true),
  footer: sliceBetween(html, '<footer class="site-footer">', "</footer>", true),
  mobilenav: sliceBetween(html, '<div class="mobile-nav__wrapper">', '<a href="#" data-target="html" class="scroll-to-target scroll-to-top">', false),
});

// ---- FOOTER_LANGS.en: the en values for the items the script injects (r1-findings.md §4) ----
export function readFooterLangsEn(html) {
  const i = html.indexOf("var FOOTER_LANGS");
  if (i < 0) return null;
  const start = html.indexOf("{", i);
  // brace-match to the end of the object literal
  let depth = 0, end = -1;
  for (let k = start; k < html.length; k++) {
    if (html[k] === "{") depth++;
    else if (html[k] === "}") { depth--; if (depth === 0) { end = k + 1; break; } }
  }
  const obj = JSON.parse(html.slice(start, end));
  return obj.en;
}

const slug = (s) => s.toLowerCase().replace(/&[a-z]+;/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 34) || "x";

// Replace ONLY the trimmed text inside each text node, leaving the surrounding raw whitespace
// byte-for-byte untouched. This is what makes 总工's hard condition structurally guaranteed:
// inline spacing (`<a>A</a> <a>B</a>`) can never be added or dropped, because we never write
// into the gaps between tags — only into the text itself.
export function tokenizeText(html, decide) {
  let out = "", last = 0;
  const re = />([^<]+)</g; let m;
  while ((m = re.exec(html))) {
    const raw = m[1], t = raw.trim();
    if (!t) continue;
    const token = decide(t);
    if (!token) continue;                       // structural -> leave verbatim
    const idx = m.index + 1 + raw.indexOf(t);   // start of the trimmed text
    out += html.slice(last, idx) + token;
    last = idx + t.length;
  }
  return out + html.slice(last);
}

// Same treatment for visible attributes (placeholder/aria-label/title/alt).
export function tokenizeAttrs(html, decide) {
  return html.replace(/(placeholder|aria-label|title|alt)="([^"]*)"/g, (full, a, v) => {
    const t = v.trim();
    if (!t) return full;
    const token = decide(t);
    return token ? `${a}="${token}"` : full;
  });
}

// Internal hrefs become routing tokens — resolved from route+locale, never catalog keys.
export function tokenizeHrefs(html) {
  // Absolute same-site URLs must tokenize too, or the locale never gets a say: the en logo links
  // to https://tejoy.com/ while the pt logo links to /pt/. Keep the ORIGINAL form inside the
  // token — rewriting it to "/" is the same destination but a different byte, and "en zero
  // content regression" is the evidence this refactor changed nothing. Equivalent != identical.
  html = html.replace(/href="(https?:\/\/(?:www\.)?tejoy\.com\/[^"]*)"/g, (full, u) => `href="{{url.${u}}}"`);
  return html.replace(/href="(\/[^"]*)"/g, (full, path) => `href="{{url.${path}}}"`);
}

// The pt page's chrome is the structural template; walk it and the en page's chrome in parallel.
const enHtml = fs.readFileSync(EN_PAGE, "utf8").replace(/\r/g, "");
const ptHtml = fs.readFileSync(PT_PAGE, "utf8").replace(/\r/g, "");
const en = chromeBlocks(enHtml), pt = chromeBlocks(ptHtml);
const flEn = readFooterLangsEn(enHtml);

const cfg = JSON.parse(fs.readFileSync("data/locales.json", "utf8"));
const WL = cfg.fallback || [];
const isCount = (t) => /^\d+$/.test(t);
const isStructural = (t) => /^(&[a-z]+;|[\s\-–—·|/]+)$/i.test(t);
const wlHit = (t) => WL.find((x) => x.value === t);

// ---- enumerate + align (header / mobilenav align 1:1; footer is handled after baking) ----
function textUnits(html) {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, "<script></script>");
  const out = []; const re = />([^<]+)</g; let m;
  while ((m = re.exec(clean))) { const t = m[1].trim(); if (t) out.push(t); }
  return out;
}
// User-visible ATTRIBUTES are user-visible text too: a screen-reader user hears aria-label the
// way a sighted user reads a heading. Leaving them out of the enumeration is the same leak,
// aimed at the people least able to route around it. (§8.9 — this capability lived only in
// chrome-extract.mjs, which I deleted as "redundant" without checking what it uniquely did.)
const VIS_ATTRS = ["aria-label", "alt", "title", "placeholder"];
function attrUnits(html) {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, "<script></script>");
  const out = [];
  const re = new RegExp(`(${VIS_ATTRS.join("|")})="([^"]*)"`, "g"); let m;
  while ((m = re.exec(clean))) { const v = m[2].trim(); if (v) out.push(v); }
  return out;
}
const allUnits = (html) => [...textUnits(html), ...attrUnits(html)];

// data/chrome.json is HUMAN-OWNED once it exists: translations and homograph verdicts live
// there. The builder only SEEDS missing keys — it must never clobber a human's work, or a
// rebuild would silently destroy translations (and re-open leaks we had already closed).
const existing = fs.existsSync("data/chrome.json") ? JSON.parse(fs.readFileSync("data/chrome.json", "utf8")) : {};
const catalog = {};   // key -> {en, "pt-BR"?, reason?}
const verdicts = [];  // keys left RED for a human call
let preserved = 0;
// One key per unique EN string, site-wide — NOT per block. The same words ("Products",
// "Industrial") appear in both the nav and the footer and translate identically, so block-scoped
// keys would mint duplicates: one gets used by the partial, the twin rots unused, and every future
// language pays to translate the same string twice. Dedupe by value; the first block to claim a
// string names the key.
const byValue = {};
function addKey(block, enVal, ptVal) {
  if (byValue[enVal]) return byValue[enVal];
  const key = `${block}.${slug(enVal)}`;
  byValue[enVal] = key;
  if (catalog[key]) return key;
  if (key.startsWith("_")) return key;
  if (existing[key]) { catalog[key] = existing[key]; preserved++; return key; }   // human wins
  if (enVal !== ptVal) { catalog[key] = { en: enVal, "pt-BR": ptVal }; return key; }
  const w = wlHit(enVal);
  if (w) { catalog[key] = { en: enVal, "pt-BR": enVal, reason: `fallback: ${w.reason}` }; return key; }
  catalog[key] = { en: enVal };                                  // pt-BR MISSING -> guard reports
  verdicts.push({ key, value: enVal, block });
  return key;
}

for (const blk of ["header", "mobilenav"]) {
  const ue = allUnits(en[blk]), up = allUnits(pt[blk]);
  if (ue.length !== up.length) { console.log(`⚠️ ${blk} 单元数不等 ${ue.length}/${up.length} — 跳过,需先定位结构差异`); continue; }
  for (let i = 0; i < ue.length; i++) {
    if (isCount(ue[i]) || isStructural(ue[i])) continue;
    addKey(blk, ue[i], up[i]);
  }
}

// ---- footer: pt is the structural template; en values come from FOOTER_LANGS.en ----
// NB: sliceBetween keeps the opening anchor (it exists to lift whole blocks). Using it to pull
// the TEXT between markers stored `id="footer-other-title">Outros menus` as the translation —
// the anchor baked into the value, which the partial then emitted twice. Text extraction needs
// its own helper that skips the anchor.
const textAfter = (s, anchor) => {
  const i = s.indexOf(anchor); if (i < 0) return null;
  const from = i + anchor.length;
  const j = s.indexOf("<", from); if (j < 0) return null;
  return s.slice(from, j).trim();
};
addKey("footer", flEn.products_title, textAfter(pt.footer, 'id="footer-products-title">'));
addKey("footer", flEn.service_title, textAfter(pt.footer, 'id="footer-service-title">'));
addKey("footer", flEn.other_title, textAfter(pt.footer, 'id="footer-other-title">'));
const ptLi = (listId) => {
  const ul = sliceBetween(pt.footer, `id="${listId}">`, "</ul>", false) || "";
  return [...ul.matchAll(/<a href="[^"]*">([^<]*)<\/a>/g)].map((m) => m[1].replace(/^-\s*/, ""));
};
const ptProducts = ptLi("footer-products-list"), ptService = ptLi("footer-service-list");
console.log(`footer 烘焙对齐: products en ${flEn.products.length} / pt ${ptProducts.length} · service en ${flEn.service.length} / pt ${ptService.length}`);
flEn.products.forEach(([, label], i) => addKey("footer", label, ptProducts[i]));
flEn.service.forEach(([, label], i) => addKey("footer", label, ptService[i]));

// The footer's REMAINING visible text (company name, address, e-mail, the static "Other menus"
// items, copyright, XML) must be enumerated too — leaving it out is exactly the leak R1 exists to
// kill: it would stay hard-coded English inside the partial and no guard would ever mention it.
// en/pt only align once the en lists are baked, so bake first, then enumerate both.
// The two list <ul>s are already handled above (their labels are keys; the "- " bullet stays a
// literal in the template — a bullet is presentation, not something to translate). So enumerate
// the footer with both lists EMPTIED, or the enumeration mints a second, redundant key per item
// with the bullet baked into the value ("- Marine" alongside "Marine").
const emptyLists = (s) => s
  .replace(/(id="footer-products-list">)[\s\S]*?(<\/ul>)/, "$1$2")
  .replace(/(id="footer-service-list">)[\s\S]*?(<\/ul>)/, "$1$2");
const efs = allUnits(emptyLists(en.footer)).filter((t) => !isCount(t) && !isStructural(t));
const pfs = allUnits(emptyLists(pt.footer)).filter((t) => !isCount(t) && !isStructural(t));
if (efs.length !== pfs.length) {
  console.log(`⚠️ footer 烘焙后单元数仍不等 en ${efs.length} / pt ${pfs.length} — 逐项对齐不可靠,以下按值配对失败的会留红:`);
  console.log("   en:", efs.slice(0, 40).join(" | "));
  console.log("   pt:", pfs.slice(0, 40).join(" | "));
} else {
  for (let i = 0; i < efs.length; i++) addKey("footer", efs[i], pfs[i]);
}

console.log("\n=== catalog 汇总 ===");
console.log("  key 总数:", Object.keys(catalog).length);
console.log("  沿用已有(人工译文/裁决,未被覆盖):", preserved);
console.log("  新种子(本次白捡):", Object.keys(catalog).length - preserved);
console.log("  🔴 待裁决(pt-BR 缺失 → guard 报):", verdicts.length);
for (const v of verdicts) console.log(`     ${v.key}  "${v.value}"`);

// ---------------------------------------------------------------------------------------
// Emit data/templates/_chrome.html — the partial. Baselines are pinned in r1-findings.md:
//   §8.6 header/mobilenav/footer all take the EN block as the base (158 en vs 90 pt = least
//        churn). The footer's two empty <ul>s get the baked <li> string, with NO whitespace
//        between items — copying the DOM oracle's innerHTML shape exactly, so the rendered
//        DOM equals what the script injected, byte for byte.
//   §8.7 counts render as <span class="nav-dd__n">({{count.KEY}})</span> — parens INSIDE the
//        span, so we only ever write a text node and never touch the inline gap.
// ---------------------------------------------------------------------------------------
const keyOf = {};                       // en value -> catalog key
for (const [k, v] of Object.entries(catalog)) if (v && v.en && !keyOf[v.en]) keyOf[v.en] = k;
const tok = (t) => (keyOf[t] ? `{{t.${keyOf[t]}}}` : null);

function buildPartial() {
  // --- header: counts first (they are text nodes we must NOT hand to the generic tokenizer) ---
  let hdr = en.header;
  hdr = hdr.replace(/<a href="\/products\/#([a-z]+)">([\s\S]*?)<span class="nav-dd__n">\d+<\/span><\/a>/g,
    (m, filter, label) => `<a href="{{url./products/#${filter}}}">${label}<span class="nav-dd__n">({{count.${filter}}})</span></a>`);
  hdr = hdr.replace(/<a href="\/products\/">([\s\S]*?)<span class="nav-dd__n">\d+<\/span><\/a>/g,
    (m, label) => `<a href="{{url./products/}}">${label}<span class="nav-dd__n">({{count.all}})</span></a>`);
  // --- lift the switcher out into its own conditional block (per-page: only when hasPt) ---
  let switcher = "";
  hdr = hdr.replace(/(\s*)<div class="lang-switch" data-lang-switch>[\s\S]*?<\/div>/, (m, ws) => {
    switcher = m.trim();
    return `${ws}{{switcher}}`;
  });
  const finish = (s) => tokenizeHrefs(tokenizeAttrs(tokenizeText(s, tok), tok));

  // --- footer: bake the two JS-filled lists into the EN structure ---
  const liRun = (items, keyFn) => items.map(([href, label]) =>
    `<li><a href="{{url.${href}}}">- ${tok(label) || label}</a></li>`).join("");   // no gaps between <li>
  let ftr = en.footer;
  ftr = ftr.replace(/(<ul class="[^"]*" id="footer-products-list">)[\s\S]*?(<\/ul>)/, (m, o, c) => o + liRun(flEn.products) + c);
  ftr = ftr.replace(/(<ul class="[^"]*" id="footer-service-list">)[\s\S]*?(<\/ul>)/, (m, o, c) => o + liRun(flEn.service) + c);

  return [
    "<!-- GENERATED-SOURCE: data/templates/_chrome.html is the single chrome template.",
    "     Edit copy in data/chrome.json, then run: node scripts/chrome-sync.mjs",
    "     Do NOT edit chrome inside .html pages — the next sync overwrites it. -->",
    "<!-- #block:header -->", finish(hdr), "<!-- #endblock -->",
    "<!-- #block:switcher -->", finish(switcher), "<!-- #endblock -->",
    "<!-- #block:footer -->", finish(ftr), "<!-- #endblock -->",
    "<!-- #block:mobilenav -->", finish(en.mobilenav), "<!-- #endblock -->",
  ].join("\n");
}

if (process.argv.includes("--write") && !process.argv.includes("--i-know-this-is-migration-only")) {
  console.error("\n⛔ 拒绝写入。这是一次性迁移工具,不是同步器 —— 它把数据流跑反了(HTML→catalog)。");
  console.error("   R1 之后 catalog 是唯一真源、HTML 是生成物。改文案请编辑 data/chrome.json 后跑 chrome-sync.mjs。");
  console.error("   确实在做迁移才加: --write --i-know-this-is-migration-only");
  process.exit(2);
}
if (process.argv.includes("--write")) {
  const doc = existing._doc || [
    "Chrome locale catalog. Values are HTML-ESCAPED text exactly as it appears in the markup:",
    "if a string contains & < > you MUST write the entity (&amp; &lt; &gt;), e.g. \"Mounts &amp; Brackets\".",
    "Writing a literal & here produces broken markup, and the guard cannot catch it — so mind this when adding a language.",
    "A key with a missing locale value is a GAP on purpose: the guard reports it. 'Not translated yet' is never silenced.",
    "A homograph (correct translation happens to equal the English) gets an EXPLICIT value + reason here — NOT a locales.json whitelist entry.",
    "Whitelisting would auto-pass every future language and silently inherit English; an explicit value makes the guard go red for the next language, forcing a real verdict."
  ];
  // Preserve EVERY existing key, not just the ones this run happens to re-derive. Keys added by
  // hand (e.g. card.alt.suffix — a card-alt string, not a chrome unit, so the derivation never
  // yields it) would otherwise be silently dropped on rebuild. Same failure class as clobbering
  // values: the generator quietly destroying human work. Merge order: derived first, existing
  // wins, so human values/verdicts always take precedence.
  const humanOnly = Object.fromEntries(Object.entries(existing).filter(([k]) => !k.startsWith("_")));
  const out = { _doc: doc, ...catalog, ...humanOnly };
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync("data/chrome.json", JSON.stringify(out, null, 2) + "\n");
  console.log("\n已写 data/chrome.json");
  fs.mkdirSync("data/templates", { recursive: true });
  const partial = buildPartial();
  fs.writeFileSync("data/templates/_chrome.html", partial + "\n");
  console.log("已写 data/templates/_chrome.html —", partial.length, "字节");
  const leftovers = [...partial.matchAll(/>([^<{]+)</g)].map((m) => m[1].trim())
    .filter((t) => t && !/^[\s\-–—·|/()]+$/.test(t) && !/^&[a-z]+;$/.test(t));
  console.log(leftovers.length ? `⚠️ partial 里未 token 化的可见文本 ${leftovers.length}: ${leftovers.slice(0, 8).join(" | ")}` : "✅ partial 里无未 token 化的可见文本");
}
