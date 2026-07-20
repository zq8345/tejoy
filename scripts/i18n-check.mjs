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

// ⛔ guard 读【自己的配置】的那些文件,不可能同时是它的【检查对象】—— 那是循环:
//    一把尺子把自己的刻度当成了待测物。所以这不是"记得排除一个文件名",是结构性的:
//    同一个常量,读配置用它,排除也用它。加一个配置源 = 改这一行,两处自动一致。
//
// ⚠️ 这个洞是我自己这轮挖的:我往 locales.json 加了 locale_label = {en:"EN","pt-BR":"PT"} ——
//    它和真目录条目【形状完全相同】,于是 isCatalog() 认出了整个 locales.json,把 enabled /
//    default / fallback / model_display 全判成了待翻文案,还报"缺失 8 处"、值是 "undefined"。
//    ⭐ 形状分不开它们:目录条目是「这个 key 在各语种下的文本」,locale_label 是「各语种自己的
//    名字」—— 同构,反义。分得开的是【角色】:配置源 vs 检查对象。
//    (而且那 8 条永远修不好 —— 你没法给 enabled 一个 pt-BR 译文。它会一直红,直到把人训练到
//     略过告警为止 —— 那句话是我自己写的。)
const CONFIG_SOURCES = ["data/locales.json"];
const locales = JSON.parse(fs.readFileSync(CONFIG_SOURCES[0], "utf8"));
const enabled = locales.enabled;

// ⛔ guard 【自己发现】所有可翻译的数据源,不读一张清单。
//
// 这条我修了三次实例、每次都往清单里加一个名字,而清单本身就是那个 bug。第四次它咬得最狠:
//   只扫 _chrome.html(21 条假警报)→ 只数 token 消费者(3 条)→ TEMPLATES 硬编码(281 条)
//   → 【整个 data/products/ 不在视野里:320 个值,64 产品 × 5 字段】
// 而 guard 一路对总工报"无缺失"—— 它没在说谎,它只是【只报告它找到的】。
// 总工拿着 980 这个数跟 Joe 汇报了,那是尺子自己的数,不是真数。
//
// 所以不加第五个目录名。改成:递归扫 data/ 下每一个 JSON,认出它的形状;
// ⭐【认不出、但看起来含 i18n 结构的,一律报错】—— 让"漏掉一个目录"变得不可能,
// 而不是"这次记得加上"。这跟总工那条否定式 token 保护是同一条:让它认不出的东西也炸。
const allJson = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? allJson(`${d}/${e.name}`) : e.name.endsWith(".json") ? [`${d}/${e.name}`] : []);

// 形状①:扁平目录 { "some.key": { en: "...", "pt-BR": "..." } }
const isCatalog = (o) => o && typeof o === "object" && !Array.isArray(o) &&
  Object.entries(o).some(([k, v]) => !k.startsWith("_") && v && typeof v === "object" && !Array.isArray(v) && "en" in v);
// 形状②:产品 { i18n: { en: {...}, "pt-BR": {...} } }
const isProduct = (o) => o && o.i18n && typeof o.i18n === "object" && "en" in o.i18n;

const catalog = {};
const sources = { catalog: [], product: [], data: [] };
const unknown = [];
for (const f of allJson("data")) {
  // 配置源先判,在任何形状判定【之前】—— 角色优先于形状
  if (CONFIG_SOURCES.includes(f)) { sources.data.push(f); continue; }
  const o = JSON.parse(fs.readFileSync(f, "utf8"));
  if (isProduct(o)) {
    sources.product.push(f);
    // 产品走同一条 pt ?? en 契约:en 有的字段,每个 enabled locale 都该有
    for (const [field, en] of Object.entries(o.i18n.en)) {
      if (typeof en !== "string" || !en.trim()) continue;
      catalog[`product.${o.id}.${field}`] = Object.fromEntries(
        enabled.map((loc) => [loc, loc === locales.default ? en : (o.i18n[loc] || {})[field]]));
    }
  } else if (isCatalog(o)) {
    sources.catalog.push(f);
    for (const [k, v] of Object.entries(o)) if (!k.startsWith("_")) catalog[k] = v;
  } else if (f === "data/locales.json" || /home-tiles|products-index|site\.json|es-glossary\.json|es-hold\.json/.test(f)) {
    sources.data.push(f);                                  // 已知的【非文案】数据,点名放行
    // ⭐ es-glossary.json = 术语表(出处单一真源),不是文案目录:顶层是 forbidden/terms/… ,无 en 字段,
    //    isCatalog() 已正确判它不是目录。点名放行是【它本就不是文案】,不是"guard 少认一种形状"——
    //    我核过两者的区别(node -e 跑了 isCatalog),没盲目加白名单。这正是 guard 26f9dd64 那条要逼出的判断。
    // ⭐ es-hold.json 同理:扣留产品清单(id + why),无 en 字段,不是文案。由 es-hold-check 双向强制。
    // ⚠️ 留档:这道形状闸同时逮到了 data/es-product-translations.json —— 而那个我【没有放行,直接删了】。
    //    它是已耗尽的迁移输入(只覆盖 2/58,另 56 个是批量直灌),更要命的是
    //    **seed 会跳过已有 es 的产品,所以编辑它不会有任何效果,还不报错** —— 一根没接线的杆,
    //    比一份重复真源更坏。放行它等于把这根杆永久留在树上。**闸报的东西不一定该放行,也可能该删掉。**
  } else {
    unknown.push(f);                                       // 认不出 -> 吼,绝不静默跳过
  }
}
if (unknown.length) {
  console.error(`🔴 guard 认不出这些 data JSON 的形状 —— 它们可能含有没人在看的译文:`);
  unknown.forEach((f) => console.error(`   ${f}`));
  console.error(`   (要么它们不是文案数据 → 加进上面那条点名放行;要么 guard 少认一种形状 → 补上。别静默跳过。)`);
  process.exit(2);
}

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
// ⛔ 每一个读 catalog 的东西都得在这里。chrome-sync 漏了 —— 而它是【常驻的那个生成器】,
// 全站 chrome 都是它写的。第四次同一个形状:漏一类消费者 = 一批活 key 被报成"已腐烂"。
// (这次没咬到,只因为 locales.json 被误判成目录时把 locale_label 一起带进来了 —— 一个 bug
//  恰好遮住了另一个 bug。修好前一个,后一个就会露出来。)
const CODE = ["functions/_lib/render.js", "scripts/regen.mjs", "scripts/chrome-sync.mjs"];
const allCode = CODE.filter((f) => fs.existsSync(f)).map((f) => fs.readFileSync(f, "utf8")).join("\n");
// 第三类消费者:产品字段。它们既不是 {{t.key}} token,也不是 catalog["key"] —— render.js 的
// mergeI18n 直接读 prod.i18n[locale][field]。不认这一类,320 个活值会被报成"已腐烂"(第五次假警报)。
// ⭐ 但这一类【不能】整类放行:mergeI18n 返回哪些字段,是可以从源码算出来的。
//    算出来才发现 meta_title 【真的】没人读 —— 它是派生的(metaTitleOf),存在数据里是死的。
//    整类放行会把这个真发现一起盖掉:一个太宽的白名单,和一个太窄的枚举一样会骗人。
const mergeSrc = (allCode.match(/export function mergeI18n[\s\S]*?\n\}/) || [""])[0];
const PRODUCT_FIELDS = new Set([...mergeSrc.matchAll(/^\s{4}(\w+):/gm)].map((m) => m[1]));
const used = (key) => {
  const p = key.match(/^product\.\d+\.(\w+)$/);
  if (p) return PRODUCT_FIELDS.has(p[1]);
  return allTpl.includes(`{{t.${key}}}`) || allCode.includes(`"${key}"`) || allCode.includes(`'${key}'`);
};
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
// ⛔ 有【任何】告警时,最后一行不许是绿的。
//
// 老写法 `if (!gaps.length && !orphans.length) console.log("✅ 无缺失、无孤儿 token。")` ——
// unused 不在条件里,于是它能列出 6 条真警报、然后打一个绿勾收尾。多语言【踩进去了】:
// 「我用 tail -2 看输出,只看到 ✅,以为它没报。」
//
// ⭐ 我这个文件里写着「假警报会训练人略过告警,然后真的那条也没人读」——
//    我防住了假警报,没防住【真警报被自己的 ✅ 盖住】。噪音会淹掉信号,而一句结论性的绿字
//    会直接【覆盖】它:读报告的人看最后一行,那是他唯一保证会读的一行。
//
// fail 的语义不动(unused 仍不阻塞 —— 它是"可能腐烂",不是"这个语种缺东西")。
// 变的只是:结论行必须诚实地描述整份报告,而不是描述我挑出来的那两类。
const warns = [gaps.length && `缺失 ${gaps.length}`, orphans.length && `孤儿 ${orphans.length}`,
  unused.length && `无人使用 ${unused.length}`].filter(Boolean);
const fail = gaps.length > 0 || orphans.length > 0;
if (MODE === "strict" && fail) {
  console.error(`\nFAIL: ${gaps.length} 处缺失 / ${orphans.length} 个孤儿 token(--strict)`);
  process.exit(1);
}
// ⛔ 结论行【必须是最后一行】,而且它必须描述整份报告。
//
// 我第一版把它放在了 `(--report 模式:不阻塞,exit 0)` 那句【前面】—— 于是有真缺口时,
// tail -2 看到的是"不阻塞,exit 0"这句【安抚的话】,告警被挤出了视野。
// 攻击复现了多语言踩进去的那个动作(它就是用 tail -2 看的),当场抓到。
// ⭐ 修好"绿勾盖住告警"之后,同一个病立刻从下一行冒出来:任何排在结论后面的话,
//    都会变成新的最后一行 —— 而最后一行是读报告的人【唯一保证会读】的那行。
console.log(warns.length
  ? `\n⚠️ 本次报告有 ${warns.length} 类告警:${warns.join(" · ")}` +
    (fail ? `\n   (--report 模式不阻塞,exit 0;清空后切 --strict 接 pre-push —— 但它【不是】干净的。)`
          : `\n   (均不阻塞 —— 但都不是空的。别只看最后一行。)`)
  : "\n✅ 无缺失、无孤儿、无腐烂 key。");
