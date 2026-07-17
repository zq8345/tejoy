#!/usr/bin/env node
// R3 一次性抽取器:把一个手写页就地 token 化成 模板 + 散文目录。
//
//   node scripts/page-extract.migration.mjs --i-know-this-is-migration-only <slug> [slug…]
//
// 闸门是有意的(同 chrome-seed.migration.mjs):它【重写模板】。误跑一次会把一个已经 token 化的
// 页面再抽一遍,把 {{t.*}} 当成散文抽进目录。一次性的东西就该长得像一次性的。
//
// 方法(R3(a) 验过的):
//   1. 先【证明】en/pt 骨架逐字节对齐 —— 不对齐就停。按位置配对是这个证明的推论,不是假设:
//      结构差一个节点,后面全体偏移一格,葡语文案就安到了错误的 key 上,而页面看起来完全正常。
//   2. 枚举按【可见性】,并【对着页面总量对账】—— 不是"我抓到 N 个"就算 N 个。
//   3. 模板不是手写的,是页面本身把文本换成 token → markup 由构造保证同构。
//   4. 验收 = 生成回来 wsNorm 内容零回归,且字节差异逐处证明只是空白。
import fs from "fs";

const ATTRS = ["alt", "title", "aria-label", "placeholder"];
const strip = (s) => s.replace(/<script[\s\S]*?<\/script>/g, (m) => " ".repeat(m.length))
  .replace(/<style[\s\S]*?<\/style>/g, (m) => " ".repeat(m.length))
  .replace(/<!--[\s\S]*?-->/g, (m) => " ".repeat(m.length));

const skel = (s) => {
  let x = s.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<!--[\s\S]*?-->/g, "");
  for (const a of ATTRS) x = x.replace(new RegExp(`${a}="[^"]*"`, "g"), `${a}="§"`);
  x = x.replace(/\b(href|src)="[^"]*"/g, '$1="§"');
  x = x.replace(/>([^<>]+)</g, (m, t) => (t.trim() ? ">§<" : m));
  return x.replace(/\s+/g, " ").trim();
};

// 可见散文节点:任意 `>文本<`,不要求前面是【开】标签。
//
// ⚠️ 第一版写成 `<tag …>text<`,于是紧跟在【闭】标签后面的文本被整个漏掉 —— `</label>Name` 这种。
// R1 里我栽过一模一样的:seeder 匹配 >X< 抓到了 sr-only 的孪生副本、漏掉了 </label>Name,
// 而【我漏掉的那一半正是会显示出来的那一半】。contact / oem-odm 恰恰都是表单页,差额 5 和 7 全在这。
// 是对账门抓到的,不是我看出来的 —— 这就是为什么枚举必须对着总量对账,而不是数自己抓到了几个。
//
// 一条规则代替一串特例:不含字母 = 装饰或数据,语言无关(→ × • 纯数字…)。
// 导出的一等公民,不是埋在脚本里的私有逻辑 —— 这样它才测得到。
// 总工:「它复发了,说明第一次只修了实例、没修类。」上一次(R1 的 seeder)我只改了那处调用,
// 规则本身没被钉住,于是 R3(b) 的 contact / oem-odm 又栽在同一个地方。scripts/render.test.mjs 钉它。
export const visibleText = (html) => nodes(html, 0).map((n) => n.text.trim());

const nodes = (body, off) => {
  const killed = strip(body);
  const out = [];
  // ⛔ 任意 `>文本<`,【不】要求前面是开标签 —— `</label>Name` 里的 Name 就在闭标签后面,
  // 而它正是用户读的那半。写成 `<tag …>text<` 会把它整个漏掉。
  for (const m of killed.matchAll(/>([^<>]+)(?=<)/g)) {
    const t = m[1];
    if (!t.trim() || !/\p{L}/u.test(t)) continue;
    const start = m.index + 1;
    // 往回找最近的标签,只为取个命名线索;取不到也不影响正确性
    const before = killed.slice(Math.max(0, start - 400), start);
    const tagM = [...before.matchAll(/<([a-z0-9]+)([^>]*)>/gi)].pop();
    const tag = tagM ? tagM[1] : "t";
    const cls = tagM ? ((tagM[2].match(/class="([^"]*)"/) || [])[1] || "").split(" ")[0] : "";
    out.push({ start: start + off, end: start + t.length + off, text: t, tag, cls });
  }
  return out;
};

const leaves = (o, path = "") => {
  if (typeof o === "string") return [[path, o]];
  if (Array.isArray(o)) return o.flatMap((v, i) => leaves(v, `${path}[${i}]`));
  if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  return [];
};
// 这些叶子随语种变是【预期的】,由 renderPage 派生,不进目录 —— URL/lang 的差异不是翻译。
const DERIVED = ["url", "@id", "inLanguage", "sameAs", "logo", "image"];
// ⭐ breadcrumb 的 item 曾在 DERIVED 里 —— 于是它被整个跳过、留着 en 的字面量,而 en 的字面量
// 是【错的】:en/faq 的 position 2 指向首页而不是 /faq/(pt 那份是对的)。
// 总工划的线:改变页面【说什么】= 内容改动,要签字;让页面【把同一件事说对】、且正确答案
// 可计算 = 结构修复,免费,就该在重构里做。breadcrumb 指向哪 = 由 route 算出来的,跟 canonical
// 一模一样,它没有"内容"可言,只有对和错 —— 而 pt 已经证明了正确答案存在。
// 我当初拿"别把内容改动夹带进重构"挡了它,是把该做的判成了不该做的。
const BREADCRUMB = { 0: "{{HOME_URL}}", 1: "{{CANONICAL}}" };
const SLOTS = [
  ["meta.title", /(<title>)([^<]*)(<\/title>)/],
  ["meta.title", /(<meta property="og:title" content=")([^"]*)(")/],
  ["meta.title", /(<meta name="twitter:title" content=")([^"]*)(")/],
  ["meta.site_name", /(<meta property="og:site_name" content=")([^"]*)(")/],
  ["meta.desc", /(<meta name="description" content=")([^"]*)(")/],
  ["meta.desc", /(<meta property="og:description" content=")([^"]*)(")/],
  ["meta.desc", /(<meta name="twitter:description" content=")([^"]*)(")/],
  ["meta.keywords", /(<meta name="keywords" content=")([^"]*)(")/],
];

// 闸门在【主流程】里,不在模块顶层 —— 顶层的话,测试一 import 它就退出了。
// 但闸门本身不能弱化:它保护的是"这个脚本会重写模板",误跑一次会把已 token 化的页再抽一遍、
// 把 {{t.*}} 当散文抽进目录。一次性的东西就该长得像一次性的。
const SLUGS = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (SLUGS.length && !process.argv.includes("--i-know-this-is-migration-only")) {
  console.error("refusing: 这个脚本会重写模板。确认后加 --i-know-this-is-migration-only");
  process.exit(2);
}

for (const slug of SLUGS) {
  const enF = `${slug}/index.html`, ptF = `pt/${slug}/index.html`;
  if (!fs.existsSync(enF)) { console.log(`🔴 ${slug}: en 页不存在 — 跳过`); continue; }
  const hasPt = fs.existsSync(ptF);
  const enRaw = fs.readFileSync(enF, "utf8").replace(/\r\n/g, "\n");
  const ptRaw = hasPt ? fs.readFileSync(ptF, "utf8").replace(/\r\n/g, "\n") : null;
  const ha = enRaw.indexOf("</header>"), fb = enRaw.indexOf("<footer");

  // ① 证明骨架对齐 —— 按位置配对是这个证明的推论,不是假设
  if (hasPt) {
    const se = skel(enRaw.slice(ha, fb)), sp = skel(ptRaw.slice(ptRaw.indexOf("</header>"), ptRaw.indexOf("<footer")));
    if (se !== sp) {
      let i = 0; while (i < Math.min(se.length, sp.length) && se[i] === sp[i]) i++;
      console.log(`🔴 ${slug}: 骨架不对齐 @${i} — 按位置配对会把葡语文案安到错误的 key 上。停。\n   en: …${se.slice(Math.max(0, i - 60), i + 80)}\n   pt: …${sp.slice(Math.max(0, i - 60), i + 80)}`);
      continue;
    }
  }
  const eN = nodes(enRaw.slice(ha, fb), ha);
  const pN = hasPt ? nodes(ptRaw.slice(ptRaw.indexOf("</header>"), ptRaw.indexOf("<footer")), ptRaw.indexOf("</header>")) : [];
  if (hasPt && eN.length !== pN.length) { console.log(`🔴 ${slug}: 骨架齐但节点数 ${eN.length} vs ${pN.length} — 停`); continue; }

  // ② 对着页面总量对账 —— 不是"我抓到 N 个"就算 N 个(R3(a) 那次我抓 40、真值 50,
  //    而 en40==pt40 让它看起来是对的:两把同样坏的尺子互相印证)
  const audit = [...strip(enRaw.slice(ha, fb)).matchAll(/>([^<>]+)</g)].map((m) => m[1]).filter((t) => /\p{L}/u.test(t)).length;
  if (audit !== eN.length) { console.log(`🔴 ${slug}: 提取 ${eN.length} 条,独立数法 ${audit} 条 — 差额 ${audit - eN.length},枚举不完整,停`); continue; }

  const cat = {};
  const seq = {};
  const keyOf = (n) => { const b = n.cls || n.tag; seq[b] = (seq[b] || 0) + 1; return `${slug}.${b}.${seq[b]}`; };
  const keys = eN.map(keyOf);
  eN.forEach((n, i) => { cat[keys[i]] = { en: n.text.trim(), ...(hasPt ? { "pt-BR": pN[i].text.trim() } : {}) }; });

  // ③ 模板 = 页面本身,文本换 token(从后往前,前面的偏移才不失效)
  let tpl = enRaw;
  for (let i = eN.length - 1; i >= 0; i--) {
    const n = eN[i];
    tpl = tpl.slice(0, n.start) + n.text.match(/^\s*/)[0] + `{{t.${keys[i]}}}` + n.text.match(/\s*$/)[0] + tpl.slice(n.end);
  }
  // body 内链 -> {{url.X}}(存在性规则,不进目录)
  {
    const a2 = tpl.indexOf("</header>"), b2 = tpl.indexOf("<footer");
    tpl = tpl.slice(0, a2) + tpl.slice(a2, b2).replace(/href="(\/[^"#][^"]*)"/g, (m, p) => `href="{{url.${p}}}"`) + tpl.slice(b2);
  }

  // head 槽位 —— 按槽位替换,不按字符串:en 的 <title> 可能恰好等于 og:site_name,
  // 字符串替换会把它一起吞掉,而 en 正是这个区别不可见的那一侧
  const headEnd = tpl.indexOf("</head>");
  let head = tpl.slice(0, headEnd), rest = tpl.slice(headEnd);
  const enH = enRaw.slice(0, enRaw.indexOf("</head>")), ptH = hasPt ? ptRaw.slice(0, ptRaw.indexOf("</head>")) : "";
  // 合并是【核出来的】,不是设出来的:两个槽位共用一个 key,当且仅当它们的 en 逐字节相同。
  // 首页那次 <title> == og:title == twitter:title 成立,于是同一句话只译一次。但另有页面的
  // og:description 与 meta description 【本来就不是同一句话】—— 那就给它自己的 key,不是跳过。
  // 跳过 = 那个槽位留着 en 硬编码 = pt 泄漏。合我验证过的,不合看着像的;不同就分开,不是放弃。
  // ⚠️ 逐【出现位置】处理,不是「取第一个、替换全部」。
  // 16 个页有【重复的 meta 标签】,14 个两份值还互相矛盾(Codex 审计报的那项 —— 根确实存在,
  // 就在手写页里)。取第一个再全局替换,会让第二个印出第一个的值 —— 那是我在悄悄改内容。
  //
  // 我【不】顺手去重:R3(b) 的任务是模板化 + 零内容回归。多语言自己写过那条 ——「把一个内容改动
  // 夹带进重构,会把重构的验收信号一起毁掉」。所以忠实地把重复也模板化(各给各的 key),
  // 去重留给单独一次改动、单独验、单独裁。
  const slotSeq = {};
  for (const [name, re] of SLOTS) {
    const g = new RegExp(re.source, "g");
    const eM = [...enH.matchAll(g)], pM = hasPt ? [...ptH.matchAll(new RegExp(re.source, "g"))] : [];
    if (!eM.length) continue;                             // 该页没有这个 meta,正常
    if (hasPt && eM.length !== pM.length) { console.log(`🔴 ${slug}: ${name} 在 en 出现 ${eM.length} 次、pt ${pM.length} 次 — 结构不对齐,停`); continue; }
    for (let k = 0; k < eM.length; k++) {
      const e = eM[k][2], p = hasPt ? pM[k][2] : undefined;
      let key = `${slug}.${name}`;
      // 合并当且仅当【逐字节相同】—— 核出来的,不是设出来的
      if (cat[key] && cat[key].en !== e.trim()) { slotSeq[name] = (slotSeq[name] || 1) + 1; key = `${slug}.${name}.${slotSeq[name]}`; }
      cat[key] = { en: e.trim(), ...(p !== undefined ? { "pt-BR": p.trim() } : {}) };
      head = head.replace(eM[k][0], `${eM[k][1]}{{t.${key}}}${eM[k][3]}`);   // 只替这一处
    }
  }

  // JSON-LD:它是 JSON,就当 JSON 走 —— 逐路径比,不同的才要 key,相同的是字面量
  const ldRe = /(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g;
  const eB = [...enH.matchAll(ldRe)], pB = hasPt ? [...ptH.matchAll(ldRe)] : [];
  const REUSE = {};
  for (const k of [`${slug}.meta.title`, `${slug}.meta.desc`]) if (cat[k]) REUSE[cat[k].en] = k;
  let ldOK = true;
  const patches = [];
  for (let b = 0; b < eB.length && hasPt; b++) {
    if (!pB[b]) { console.log(`🔴 ${slug}: JSON-LD 块数 en ${eB.length} / pt ${pB.length} — 停`); ldOK = false; break; }
    let raw = eB[b][2];
    let cursor = 0;                          // breadcrumb 按【出现顺序】替,不按值 —— 两个 item 可能相等
    const done = new Map();
    let E, P;
    try { E = leaves(JSON.parse(eB[b][2])); P = leaves(JSON.parse(pB[b][2])); }
    catch { console.log(`🔴 ${slug}: JSON-LD 块${b} 解析失败 — 停`); ldOK = false; break; }
    if (E.length !== P.length) { console.log(`🔴 ${slug}: JSON-LD 块${b} 叶子数 ${E.length} vs ${P.length} — 停`); ldOK = false; break; }
    for (let i = 0; i < E.length && ldOK; i++) {
      const [pa, e] = E[i], [pa2, v] = P[i];
      if (pa !== pa2) { console.log(`🔴 ${slug}: JSON-LD 路径错位 ${pa} vs ${pa2} — 停`); ldOK = false; break; }
      // breadcrumb 的 item 先判:按【位置】派生(position 1 = 首页,position 2 = 本页)。
      // en/pt 相同时也要替 —— en 那份本身就是错的,「两边相同」只说明两边一样错。
      //
      // ⚠️ 必须按【出现顺序】用游标替,不能 split/join 值:en/faq 的 position 1 和 2 值完全相同
      // (都是 https://tejoy.com,正是那个 bug),split 会把两处都替成 position 1 的 token。
      // 这是「重复不可见的那一侧」第三次找上门了 —— 前两次是 og:site_name==title、
      // 和首页的 HOME_URL==CANONICAL。凡是两个东西恰好相等的地方,按值操作就会把它们合并掉。
      const bc = pa.match(/^itemListElement\[(\d+)\]\.item$/);
      if (bc && BREADCRUMB[bc[1]]) {
        const needle = `"item": ${JSON.stringify(e)}`;
        const at = raw.indexOf(needle, cursor);
        if (at < 0) { console.log(`🔴 ${slug}: breadcrumb item[${bc[1]}] 在原文里找不到 — 替换会静默失败,停`); ldOK = false; break; }
        const repl = `"item": ${JSON.stringify(BREADCRUMB[bc[1]])}`;
        raw = raw.slice(0, at) + repl + raw.slice(at + needle.length);
        cursor = at + repl.length;
        continue;
      }
      if (e === v) continue;
      const last = pa.split(".").pop().replace(/\[\d+\]$/, "");
      if (DERIVED.includes(last)) continue;
      let key = REUSE[e];
      if (!key) {
        const base = `${slug}.ld.${last}`;
        if (cat[base] && cat[base].en !== e) { seq[base] = (seq[base] || 1) + 1; key = `${base}.${seq[base]}`; }
        else key = base;
        cat[key] = { en: e, "pt-BR": v };
      }
      if (done.has(e)) { if (done.get(e) !== key) { console.log(`🔴 ${slug}: 同一值映射到两个 key — 替换有歧义,停`); ldOK = false; break; } continue; }
      done.set(e, key);
      const q = JSON.stringify(e);
      if (raw.split(q).length - 1 === 0) { console.log(`🔴 ${slug}: JSON-LD 值在原文里找不到(编码不一致)— 替换会静默失败,停`); ldOK = false; break; }
      raw = raw.split(q).join(JSON.stringify(`{{t.${key}}}`));
    }
    patches.push([eB[b][0], eB[b][1] + raw + eB[b][3]]);
  }
  if (!ldOK) continue;
  for (const [from, to] of patches) {
    // m[0] 是整个匹配,m[1..3] 才是组 —— 拼回去必须真的发生,否则 token 从没进模板、pt 照印英文
    if (!head.includes(from)) { console.log(`🔴 ${slug}: JSON-LD 拼不回 head — 停`); ldOK = false; break; }
    head = head.split(from).join(to);
  }
  if (!ldOK) continue;

  head = head.replace(/<html lang="en">/, '<html lang="{{HTML_LANG}}">')
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="{{CANONICAL}}" />`)
    .replace(/og:url" content="[^"]*"/, 'og:url" content="{{CANONICAL}}"')
    .replace(/"inLanguage": "en"/, '"inLanguage": "{{HTML_LANG}}"')
    // breadcrumb position 1 指首页,position 2 才指本页 —— 两件不同的东西,别合成一个 token
    .replace(/"item": "https:\/\/tejoy\.com"/g, '"item": "{{HOME_URL}}"')
    .replace(/(<meta property="og:type"[^>]*>)/, "$1{{OG_LOCALE}}");
  tpl = head + rest;

  const gaps = Object.values(cat).filter((v) => v["pt-BR"] === undefined).length;
  fs.mkdirSync("data/pages", { recursive: true });
  fs.writeFileSync(`data/pages/${slug}.json`, JSON.stringify(cat, null, 2) + "\n");
  fs.writeFileSync(`data/templates/page-${slug}.html`, tpl);
  console.log(`  ${slug.padEnd(32)} ✅ ${String(Object.keys(cat).length).padStart(3)} key | 对账 ${eN.length}=${audit} | pt ${gaps ? `🔴 缺 ${gaps} 条(guard 会红,等多语言签)` : "全部白捡"}`);
}
