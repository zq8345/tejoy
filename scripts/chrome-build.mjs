// chrome-build — derive data/templates/_chrome.html + data/chrome.json from the EXISTING
// en/pt chrome, mechanically. Run: node scripts/chrome-build.mjs --write
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

// data/chrome.json is HUMAN-OWNED once it exists: translations and homograph verdicts live
// there. The builder only SEEDS missing keys — it must never clobber a human's work, or a
// rebuild would silently destroy translations (and re-open leaks we had already closed).
const existing = fs.existsSync("data/chrome.json") ? JSON.parse(fs.readFileSync("data/chrome.json", "utf8")) : {};
const catalog = {};   // key -> {en, "pt-BR"?, reason?}
const verdicts = [];  // keys left RED for a human call
let preserved = 0;
function addKey(block, enVal, ptVal) {
  const key = `${block}.${slug(enVal)}`;
  if (catalog[key]) return key;                                  // identical text -> one key (DRY)
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
  const ue = textUnits(en[blk]), up = textUnits(pt[blk]);
  if (ue.length !== up.length) { console.log(`⚠️ ${blk} 单元数不等 ${ue.length}/${up.length} — 跳过,需先定位结构差异`); continue; }
  for (let i = 0; i < ue.length; i++) {
    if (isCount(ue[i]) || isStructural(ue[i])) continue;
    addKey(blk, ue[i], up[i]);
  }
}

// ---- footer: pt is the structural template; en values come from FOOTER_LANGS.en ----
addKey("footer", flEn.products_title, sliceBetween(pt.footer, 'id="footer-products-title">', "<", false));
addKey("footer", flEn.service_title, sliceBetween(pt.footer, 'id="footer-service-title">', "<", false));
addKey("footer", flEn.other_title, sliceBetween(pt.footer, 'id="footer-other-title">', "<", false));
const ptLi = (listId) => {
  const ul = sliceBetween(pt.footer, `id="${listId}">`, "</ul>", false) || "";
  return [...ul.matchAll(/<a href="[^"]*">([^<]*)<\/a>/g)].map((m) => m[1].replace(/^-\s*/, ""));
};
const ptProducts = ptLi("footer-products-list"), ptService = ptLi("footer-service-list");
console.log(`footer 烘焙对齐: products en ${flEn.products.length} / pt ${ptProducts.length} · service en ${flEn.service.length} / pt ${ptService.length}`);
flEn.products.forEach(([, label], i) => addKey("footer", label, ptProducts[i]));
flEn.service.forEach(([, label], i) => addKey("footer", label, ptService[i]));
// remaining static footer text (company/address/copyright...) aligns 1:1 outside the two lists
const enFooterStatic = textUnits(en.footer).filter((t) => !isCount(t) && !isStructural(t));
const ptFooterStatic = textUnits(pt.footer).filter((t) => !isCount(t) && !isStructural(t));

console.log("\n=== catalog 汇总 ===");
console.log("  key 总数:", Object.keys(catalog).length);
console.log("  沿用已有(人工译文/裁决,未被覆盖):", preserved);
console.log("  新种子(本次白捡):", Object.keys(catalog).length - preserved);
console.log("  🔴 待裁决(pt-BR 缺失 → guard 报):", verdicts.length);
for (const v of verdicts) console.log(`     ${v.key}  "${v.value}"`);

if (process.argv.includes("--write")) {
  const doc = existing._doc || [
    "Chrome locale catalog. Values are HTML-ESCAPED text exactly as it appears in the markup:",
    "if a string contains & < > you MUST write the entity (&amp; &lt; &gt;), e.g. \"Mounts &amp; Brackets\".",
    "Writing a literal & here produces broken markup, and the guard cannot catch it — so mind this when adding a language.",
    "A key with a missing locale value is a GAP on purpose: the guard reports it. 'Not translated yet' is never silenced.",
    "A homograph (correct translation happens to equal the English) gets an EXPLICIT value + reason here — NOT a locales.json whitelist entry.",
    "Whitelisting would auto-pass every future language and silently inherit English; an explicit value makes the guard go red for the next language, forcing a real verdict."
  ];
  const out = { _doc: doc, ...catalog };
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync("data/chrome.json", JSON.stringify(out, null, 2) + "\n");
  console.log("\n已写 data/chrome.json");
}
