// chrome-extract — one-time dev tool: mechanically derive the chrome partial + locale catalog
// from the EXISTING en/pt chrome pair, so both directions are byte-faithful BY CONSTRUCTION.
//
// Method (enumeration-driven, NOT diff-driven):
//   1. enumerate EVERY user-visible text unit in the chrome (text nodes + visible attrs)
//   2. every unit becomes a catalog key — key set is decided by VISIBILITY, never by
//      "was it already translated" (that circular rule would freeze existing leaks)
//   3. the aligned pt chrome only SEEDS values:
//        en != pt              -> translated, take both (free seed)
//        en == pt + whitelist  -> fallback key (allowed to stay English, needs a reason)
//        en == pt + otherwise  -> key with pt-BR MISSING -> guard reports it (forced verdict)
//   Routing (href/lang/hreflang) is NEVER a catalog key — derived from route+locale.
//
// Run: node scripts/chrome-extract.mjs        (prints the derivation report; writes nothing)
import fs from "fs";

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

// A unit is user-visible text. Numbers-only units are dynamic counts (token, not catalog).
// Pure entities/punctuation are structural.
const IS_COUNT = (t) => /^\d+$/.test(t);
const IS_STRUCTURAL = (t) => /^(&[a-z]+;|[\s\-–—·|/]+)$/i.test(t);

export function enumUnits(html) {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, "<script></script>").replace(/<style[\s\S]*?<\/style>/gi, "<style></style>");
  const units = [];
  const re = />([^<]+)</g; let m;
  while ((m = re.exec(clean))) {
    const t = m[1].trim();
    if (!t) continue;
    units.push({ kind: "text", value: t });
  }
  for (const a of ["placeholder", "aria-label", "title", "alt"]) {
    const ar = new RegExp(`${a}="([^"]*)"`, "g"); let am;
    while ((am = ar.exec(clean))) { const v = am[1].trim(); if (v) units.push({ kind: `attr:${a}`, value: v }); }
  }
  return units;
}

// classify one aligned pair -> {cls, en, pt}
export function classify(enVal, ptVal, whitelist) {
  if (IS_COUNT(enVal)) return { cls: "count" };            // -> {{count.*}} token
  if (IS_STRUCTURAL(enVal)) return { cls: "structural" };   // -> static partial text
  if (enVal !== ptVal) return { cls: "translated", en: enVal, pt: ptVal };
  const w = whitelist.find((x) => x.value === enVal);
  if (w) return { cls: "fallback", en: enVal, pt: enVal, reason: w.reason };
  return { cls: "NEEDS_VERDICT", en: enVal, pt: null };     // -> catalog key, pt missing -> guard reports
}

// Run the derivation report when invoked directly (`node scripts/chrome-extract.mjs --report`).
// NB: don't gate on import.meta.url — this repo lives under a non-ASCII path, which gets
// percent-encoded in import.meta.url but not in process.argv[1], so that comparison never matches.
if (process.argv.includes("--report")) {
  const WL = JSON.parse(fs.readFileSync("data/locales.json", "utf8")).fallback || [];
  const en = chromeBlocks(fs.readFileSync("products/index.html", "utf8").replace(/\r/g, ""));
  const pt = chromeBlocks(fs.readFileSync("pt/products/index.html", "utf8").replace(/\r/g, ""));
  for (const blk of ["header", "mobilenav"]) {
    const ue = enumUnits(en[blk]), up = enumUnits(pt[blk]);
    console.log(`\n=== ${blk}: en ${ue.length} 单元 / pt ${up.length} 单元 — 对齐 ${ue.length === up.length ? "OK" : "FAIL"} ===`);
    if (ue.length !== up.length) { console.log("  ⚠️ 单元数不等,先定位结构差异再继续"); continue; }
    const tally = {};
    for (let i = 0; i < ue.length; i++) {
      const c = classify(ue[i].value, up[i].value, WL);
      tally[c.cls] = (tally[c.cls] || 0) + 1;
      if (c.cls === "NEEDS_VERDICT") console.log(`  🔴 待裁决: "${c.en}"`);
      if (c.cls === "fallback") console.log(`  ⚪ 白名单(${c.reason}): "${c.en}"`);
    }
    console.log("  统计:", JSON.stringify(tally));
  }
}
