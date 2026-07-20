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
import { baselineJson, baselineFiles, baselineExists } from "./_baseline.mjs";

const WRITE = process.argv.includes("--write");
const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));

// ⭐ 一条 catalog 记录有【多个 locale】,不止 pt。第一版把新共享 key 写死成 `{ en, "pt-BR" }`,
//    于是 16 组里多语言已交的 es 译文被静默丢掉 —— catalog-dupe 照样报 0,因为它只看 en。
//    「手写的 locale 清单」就是那个 bug:locale 从数据自己发现,明天加一门语言这里不用改。
const localesOf = (v) => Object.keys(v).filter((k) => k !== "en" && !k.startsWith("reason."));

// 收敛一组时,存活的是一个【变体(整行 i18n)】,不是一条 pt 字符串。
// ⚠️ 顺序是硬的:pt-survivor-decisions --apply 会把组内 pt 抹平成一个值,那一刻
//    「哪个 es 跟着这条 pt」的信息就没了。所以映射必须从【基线】取(git show HEAD:),
//    不是从我刚写过的工作区取 —— 这是第五次因为量自己的输出出事。
const BASE_ROWS = new Map();   // en -> [ row ... ](基线上该 en 的所有记录)
// ⚠️ baselineFiles 数的是【当前被跟踪】的文件,不是基线上存在的文件 —— 本分支新增的
//    data/pages/list.json 就在前者里、不在后者里,直接读会炸。存在性也要走基线。
for (const f of ["data/chrome.json",
  ...baselineFiles(/^data\/pages\/.*\.json$/).filter((x) => !x.endsWith("home-tiles.json"))]
  .filter((x) => baselineExists(x))) {
  for (const [k, v] of Object.entries(baselineJson(f))) {
    if (k.startsWith("_") || !v || v.en === undefined) continue;
    (BASE_ROWS.get(v.en) || BASE_ROWS.set(v.en, []).get(v.en)).push(v);
  }
}
// 给定 en 和已定的 pt survivor,把【基线上带这条 pt 的记录】的其他 locale 取出来。
// 唯一 → 那就是多语言自己的裁决顺着传下来的值,我不做判断;不唯一/没有 → 返回 null,组被拒。
function rowFor(en, ptSurvivor, loc) {
  const rows = (BASE_ROWS.get(en) || []).filter((r) => r["pt-BR"] === ptSurvivor);
  const vals = new Set(rows.map((r) => r[loc]));
  return vals.size === 1 ? [...vals][0] : null;
}

const chrome = readJson("data/chrome.json");
const chromeByEn = new Map();                 // en -> 第一个 chrome key
for (const [k, v] of Object.entries(chrome)) if (!k.startsWith("_") && v && v.en !== undefined && !chromeByEn.has(v.en)) chromeByEn.set(v.en, k);

const pageFiles = fs.readdirSync("data/pages").filter((f) => f.endsWith(".json") && f !== "home-tiles.json");
const pages = new Map(pageFiles.map((f) => [f, readJson(`data/pages/${f}`)]));

// 收集重复组(chrome + pages 全局,和 catalog-dupe-check 同口径)
const byEn = new Map();
for (const [k, v] of Object.entries(chrome)) if (!k.startsWith("_") && v && v.en !== undefined && !v["reason.dupe"]) {
  (byEn.get(v.en) || byEn.set(v.en, []).get(v.en)).push({ file: "chrome", key: k, pt: v["pt-BR"], v, isChrome: true });
}
for (const [f, j] of pages) for (const [k, v] of Object.entries(j)) if (!k.startsWith("_") && v && v.en !== undefined && !v["reason.dupe"]) {
  (byEn.get(v.en) || byEn.set(v.en, []).get(v.en)).push({ file: f, key: k, pt: v["pt-BR"], v, isChrome: false });
}
const dupes = [...byEn.entries()].filter(([, ks]) => ks.length > 1);

const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
const slug = (s) => "shared." + s.toLowerCase().replace(/&amp;|&/g, "and").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);

// 计划:每个组 → { canonical, survivorPt, redirect:[{file,key}], newKey?, skip? }
const plan = [];
const SHARED = {};                            // 新共享 key 的 catalog
const usedSlugs = new Set();

// 组收敛后活下来的是【整行 i18n】。pt survivor 定了以后,其他 locale 的取法只有两种,
// 两种都不需要我判断:①组内该 locale 本来就一致 → 就是它;②不一致 → 去基线查「带这条
// pt 的记录」的该 locale 值,唯一才算数(= 多语言选的那个变体整行跟着活)。
// 都不成立 → 【拒绝这一组】,原样留着让 catalog-dupe 继续报红。
// ⛔ 不允许"pt 定了就写盘、别的 locale 缺就算了" —— 那正是上一轮丢掉 16 条 es 的写法,
//    而 catalog-dupe 只看 en,红灯不会亮,谁都发现不了。
function buildRow(en, ptSurvivor, ks) {
  const locs = [...new Set(ks.flatMap((x) => localesOf(x.v)))];
  const row = { en }, unresolved = [];
  for (const loc of locs) {
    if (loc === "pt-BR") { row[loc] = ptSurvivor; continue; }
    const vals = new Set(ks.map((x) => x.v[loc]));
    const val = vals.size === 1 ? [...vals][0] : rowFor(en, ptSurvivor, loc);
    if (val === null || val === undefined) unresolved.push(loc); else row[loc] = val;
  }
  return { row, unresolved };
}

// 新共享 key 只在这里诞生 —— 三条路径(②/③More/③case)都得从这道门过,
// 没有哪条路径能"自己写一下 SHARED[nk]"绕开 locale 检查。返回 false = 这组被拒。
function share(en, ptSurvivor, ks, cat, fixedKey, note) {
  const { row, unresolved } = buildRow(en, ptSurvivor, ks);
  if (unresolved.length) {
    plan.push({ cat: "⏸locale", en, redirect: ks, unresolved, ptSurvivor });
    return false;
  }
  let nk = fixedKey || slug(en);
  while (usedSlugs.has(nk) || chrome[nk]) nk += "_2";
  usedSlugs.add(nk);
  SHARED[nk] = row;
  plan.push({ cat, en, canonical: nk, newKey: nk, redirect: ks, note });
  return true;
}
for (const [en, ks] of dupes) {
  const chromeK = ks.find((x) => x.isChrome);
  const pagePt = new Set(ks.filter((x) => !x.isChrome).map((x) => x.pt));
  if (chromeK) {
    // ① 重定向到 chrome key;删所有页面副本
    plan.push({ cat: "①chrome", en, canonical: chromeK.key, redirect: ks.filter((x) => !x.isChrome) });
  } else if (pagePt.size === 1) {
    // ② pt 一致 → 新共享 key
    if (!share(en, [...pagePt][0], ks, "②shared")) continue;
  } else if (en === "More") {
    if (!share(en, "Leia mais", ks, "③More", "shared.common.more")) continue;  // pt 多语言已裁
  } else if (new Set([...pagePt].map(norm)).size === 1) {
    // 纯大小写差异 → sentence-case(多语言定的葡语正字法规则)。取归一化后首字母大写、其余按第一个变体的大小写?
    // 规则:sentence-case = 只首字母大写。选变体里【非全大写起头单词最少】的那个(最接近 sentence-case)。
    const variants = [...pagePt];
    const sc = variants.slice().sort((a, b) => (a.match(/\b[A-ZÀ-Ý]/g) || []).length - (b.match(/\b[A-ZÀ-Ý]/g) || []).length)[0];
    if (!share(en, sc, ks, "③case", null, `sentence-case: ${JSON.stringify(sc.slice(0, 40))}`)) continue;
  } else {
    plan.push({ cat: "⏸semantic", en, redirect: ks, pts: [...pagePt] });  // 不碰
  }
}

const determinate = plan.filter((p) => !p.cat.startsWith("⏸"));
const skipped = plan.filter((p) => p.cat === "⏸semantic");
const blocked = plan.filter((p) => p.cat === "⏸locale");
const byCat = (c) => determinate.filter((p) => p.cat === c);
console.log(`\n=== pages 去重计划 ===`);
console.log(`重复组 ${dupes.length}  |  确定执行 ${determinate.length}  |  ⏸语义漂移(归多语言)${skipped.length}`);
for (const c of ["①chrome", "②shared", "③More", "③case"]) {
  const g = byCat(c); if (!g.length) continue;
  const refs = g.reduce((n, p) => n + p.redirect.length, 0);
  console.log(`  ${c.padEnd(10)} ${g.length} 组 / ${refs} 处重定向  ${c === "③case" ? "→ " + g.map((p) => p.note).join(" ; ") : ""}`);
}
console.log(`  新增共享 key: ${Object.keys(SHARED).length}`);
console.log(`\n⏸ ${skipped.length} 语义漂移组(pt 未裁,归母语方):`);
for (const p of skipped) console.log(`   ×${p.redirect.length}  ${JSON.stringify(p.en.slice(0, 56))}`);
console.log(`\n⏸ ${blocked.length} 组【pt 已裁但另一门语言定不下来】—— 拒绝收敛(收敛=丢译文):`);
for (const p of blocked) {
  console.log(`   ×${p.redirect.length}  ${JSON.stringify(p.en.slice(0, 56))}   定不下来的 locale: ${p.unresolved.join(", ")}`);
  for (const loc of p.unresolved) {
    const vals = new Set(p.redirect.map((x) => x.v[loc]).filter((x) => x !== undefined));
    console.log(`      ${loc}: ${p.redirect.length} 个 key / ${vals.size} 个不同值 → 需要母语方给 survivor`);
  }
}

if (!WRITE) { console.log(`\n(干跑。加 --write 执行)`); process.exit(0); }

// ---- 执行 ----
// 1) 新共享 key 并进【pages map 里的 shared.json 条目】,由下面那个统一的写循环落盘。
//
// ⚠️ 第一版单独 writeFileSync 写 shared.json,然后结尾的 `for (const [f,j] of pages) write(...)`
//    又用【加载时的旧内容】把它覆盖回去 —— 16 个新 key 被静默抹掉,下一次 regen 才炸出来。
//    根因:shared.json 既是输入(在 pages map 里参与分组,这是对的)又是输出,两条写路径打架。
//    ⭐ 同一个文件有两条写路径,迟早有一条赢、另一条的结果消失。合成一条。
// ⛔ 写盘前断言:新共享 key 覆盖的 locale 不能比它替掉的那些 key 少。
//    上一轮就是在这里失守的 —— 少了 es,而 catalog-dupe 只看 en,红灯永远不会亮,
//    要等有人去数 shared.json 才发现。所以这道门必须在【执行器里】,不在验收脚本里。
for (const p of determinate.filter((x) => x.newKey)) {
  const want = new Set(p.redirect.flatMap((x) => localesOf(x.v)));
  const got = new Set(localesOf(SHARED[p.newKey]));
  const lost = [...want].filter((l) => !got.has(l));
  if (lost.length) {
    console.log(`\n🔴 ${p.newKey} 丢了 locale: ${lost.join(", ")} —— 拒绝写盘`);
    process.exit(1);
  }
}
if (!pages.has("shared.json")) pages.set("shared.json", {});
Object.assign(pages.get("shared.json"), SHARED);
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
