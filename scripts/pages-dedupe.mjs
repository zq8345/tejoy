#!/usr/bin/env node
// pages 去重执行器 —— 落地 pages-dedupe-design.md。
//   node scripts/pages-dedupe.mjs          干跑:只出计划,不写
//   node scripts/pages-dedupe.mjs --write  执行
//
// 只碰【确定的】组,绝不替母语方签 pt:
//   ① chrome 已有同 en 的 key → 重定向到 chrome key(canonical),删页面副本。
//      pt 侧:25 组页面 pt == chrome pt(零变化);2 组(FAQ/tejoy_premium)漂了,多语言已裁"按 chrome 收敛"。
//   ② pages 内 pt 【一致】→ 新建共享 key,pt = 那个一致值(零决策)。
//   ③ pt 漂移:只处理 More(→Leia mais,多语言已裁)和【纯大小写】组(sentence-case,多语言定的规则)。
//      真语义漂移的 18 组【不碰】—— survivor 是最终 pt 决定,归多语言。
import fs from "fs";
import { execSync } from "child_process";

const WRITE = process.argv.includes("--write");
const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));

const chrome = readJson("data/chrome.json");
const chromeByEn = new Map();                 // en -> 第一个 chrome key
for (const [k, v] of Object.entries(chrome)) if (!k.startsWith("_") && v && v.en !== undefined && !chromeByEn.has(v.en)) chromeByEn.set(v.en, k);

const pageFiles = fs.readdirSync("data/pages").filter((f) => f.endsWith(".json") && f !== "home-tiles.json");
const pages = new Map(pageFiles.map((f) => [f, readJson(`data/pages/${f}`)]));

// 收集重复组(chrome + pages 全局,和 catalog-dupe-check 同口径)
const byEn = new Map();
for (const [k, v] of Object.entries(chrome)) if (!k.startsWith("_") && v && v.en !== undefined && !v["reason.dupe"]) {
  (byEn.get(v.en) || byEn.set(v.en, []).get(v.en)).push({ file: "chrome", key: k, pt: v["pt-BR"], isChrome: true });
}
for (const [f, j] of pages) for (const [k, v] of Object.entries(j)) if (!k.startsWith("_") && v && v.en !== undefined && !v["reason.dupe"]) {
  (byEn.get(v.en) || byEn.set(v.en, []).get(v.en)).push({ file: f, key: k, pt: v["pt-BR"], isChrome: false });
}
const dupes = [...byEn.entries()].filter(([, ks]) => ks.length > 1);

const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
const slug = (s) => "shared." + s.toLowerCase().replace(/&amp;|&/g, "and").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);

// 计划:每个组 → { canonical, survivorPt, redirect:[{file,key}], newKey?, skip? }
const plan = [];
const SHARED = {};                            // 新共享 key 的 catalog
const usedSlugs = new Set();
for (const [en, ks] of dupes) {
  const chromeK = ks.find((x) => x.isChrome);
  const pagePt = new Set(ks.filter((x) => !x.isChrome).map((x) => x.pt));
  if (chromeK) {
    // ① 重定向到 chrome key;删所有页面副本
    plan.push({ cat: "①chrome", en, canonical: chromeK.key, redirect: ks.filter((x) => !x.isChrome) });
  } else if (pagePt.size === 1) {
    // ② pt 一致 → 新共享 key
    let nk = slug(en); while (usedSlugs.has(nk) || chrome[nk]) nk += "_2"; usedSlugs.add(nk);
    SHARED[nk] = { en, "pt-BR": [...pagePt][0] };
    plan.push({ cat: "②shared", en, canonical: nk, newKey: nk, redirect: ks });
  } else if (en === "More") {
    let nk = "shared.common.more"; usedSlugs.add(nk);
    SHARED[nk] = { en, "pt-BR": "Leia mais" };  // 多语言已裁
    plan.push({ cat: "③More", en, canonical: nk, newKey: nk, redirect: ks });
  } else if (new Set([...pagePt].map(norm)).size === 1) {
    // 纯大小写差异 → sentence-case(多语言定的葡语正字法规则)。取归一化后首字母大写、其余按第一个变体的大小写?
    // 规则:sentence-case = 只首字母大写。选变体里【非全大写起头单词最少】的那个(最接近 sentence-case)。
    const variants = [...pagePt];
    const sc = variants.slice().sort((a, b) => (a.match(/\b[A-ZÀ-Ý]/g) || []).length - (b.match(/\b[A-ZÀ-Ý]/g) || []).length)[0];
    let nk = slug(en); while (usedSlugs.has(nk) || chrome[nk]) nk += "_2"; usedSlugs.add(nk);
    SHARED[nk] = { en, "pt-BR": sc };
    plan.push({ cat: "③case", en, canonical: nk, newKey: nk, redirect: ks, note: `sentence-case: ${JSON.stringify(sc.slice(0, 40))}` });
  } else {
    plan.push({ cat: "⏸semantic", en, redirect: ks, pts: [...pagePt] });  // 不碰
  }
}

const determinate = plan.filter((p) => p.cat !== "⏸semantic");
const skipped = plan.filter((p) => p.cat === "⏸semantic");
const byCat = (c) => determinate.filter((p) => p.cat === c);
console.log(`\n=== pages 去重计划 ===`);
console.log(`重复组 ${dupes.length}  |  确定执行 ${determinate.length}  |  ⏸语义漂移(归多语言)${skipped.length}`);
for (const c of ["①chrome", "②shared", "③More", "③case"]) {
  const g = byCat(c); if (!g.length) continue;
  const refs = g.reduce((n, p) => n + p.redirect.length, 0);
  console.log(`  ${c.padEnd(10)} ${g.length} 组 / ${refs} 处重定向  ${c === "③case" ? "→ " + g.map((p) => p.note).join(" ; ") : ""}`);
}
console.log(`  新增共享 key: ${Object.keys(SHARED).length}`);
console.log(`\n⏸ 18 语义漂移组(不碰,报总工):`);
for (const p of skipped) console.log(`   ×${p.redirect.length}  ${JSON.stringify(p.en.slice(0, 56))}`);

if (!WRITE) { console.log(`\n(干跑。加 --write 执行)`); process.exit(0); }

// ---- 执行 ----
// 1) 写 shared.json
if (Object.keys(SHARED).length) {
  const shared = fs.existsSync("data/pages/shared.json") ? readJson("data/pages/shared.json") : {};
  Object.assign(shared, SHARED);
  fs.writeFileSync("data/pages/shared.json", JSON.stringify(shared, null, 2) + "\n");
}
// 2) 重写【所有】模板的 token —— 不假设 page 键只在 page-<file>.html 里(home 走 home.html,
//    我第一版假设了路径,删了 home.meta.title 的 key 却没改 home.html 的 token,当场炸)。
const tplFiles = fs.readdirSync("data/templates").filter((f) => f.endsWith(".html")).map((f) => `data/templates/${f}`);
const tpl = new Map(tplFiles.map((f) => [f, fs.readFileSync(f, "utf8")]));
let retargets = 0;
for (const p of determinate) for (const m of p.redirect) {
  for (const [f, t] of tpl) {
    const nt = t.split(`{{t.${m.key}}}`).join(`{{t.${p.canonical}}}`);
    if (nt !== t) { tpl.set(f, nt); retargets++; }
  }
}
// ⛔ 删 key 前断言:它的 token 在任何模板里都不该再出现。删一个 token 还在的 key = 下次渲染必炸。
const toDelete = determinate.flatMap((p) => p.redirect.map((m) => ({ file: m.file, key: m.key })));
const allTpl = [...tpl.values()].join("\n");
const stillReferenced = toDelete.filter((d) => allTpl.includes(`{{t.${d.key}}}`));
if (stillReferenced.length) {
  console.log(`\n🔴 ${stillReferenced.length} 个 key 的 token 没被重定向干净,拒绝删(否则渲染必炸):`);
  stillReferenced.slice(0, 8).forEach((d) => console.log(`   ${d.file}:${d.key}`));
  process.exit(1);
}
for (const [f, t] of tpl) fs.writeFileSync(f, t);
let deleted = 0;
for (const d of toDelete) { const j = pages.get(d.file); if (j && j[d.key]) { delete j[d.key]; deleted++; } }
for (const [f, j] of pages) fs.writeFileSync(`data/pages/${f}`, JSON.stringify(j, null, 2) + "\n");
console.log(`\n✅ 写入:${retargets} 处 token 重定向 · 删 ${deleted} 个页面 key · +${Object.keys(SHARED).length} 共享 key`);
console.log(`   下一步:node scripts/regen.mjs && node scripts/chrome-sync.mjs --write,再验字节`);
