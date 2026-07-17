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
import { execSync } from "child_process";
import { baseline } from "./_baseline.mjs";

// ⛔ 抽取永远读【基线】,不读工作区 —— 读法和四次事故的账都在 scripts/_baseline.mjs 里。
// 它现在是一个共享函数,不是一条我要在每个新脚本里重新想起来的纪律(第 4 次证明了我记不住)。

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
// 是不是散文 —— 决定它要不要一个 key。
//
// 我原来的规则是「不含字母 = 不是散文」,想用一条规则代替一串特例(→ × • 数字…)。方向对,
// 【边界画错了】:数字【是】随语种变的。pt/about 写 "400.000–600.000"(葡语千位分隔符是点),
// en 写 "400,000–600,000" —— 我的规则把它判成装饰、不给 key,于是模板拿 en 的那份盖掉了 pt。
// 数字不是装饰,只有【纯符号】才是。
//
// 所以:含字母 → 散文;或含数字且带分隔符/单位 → 散文(它有本地化形态);其余(→ × • 单个数字)
// → 装饰。一条规则代替特例是对的,但规则得画在真实的分界上,不是画在我第一眼觉得顺手的地方。
export const isProse = (s) => {
  const t = (s || "").trim();
  if (!t) return false;
  if (/\p{L}/u.test(t)) return true;                    // 有字母 = 文案
  return /\d[\d.,  ]*[.,  ]\d/.test(t);       // 带千位/小数分隔符的数字 = 有本地化形态
};

export const visibleText = (html) => nodes(html, 0).map((n) => n.text.trim());

// 可见单元 = 文本节点 ∪ 可见属性。按【可见性】枚举,不按"en/pt 是否不同" ——
// 后者是 R1 洞①:用"是否已翻译"决定 key 集,会把两边都是英文的现存泄漏【永久冻结】,
// 而且冻得无声无息。可见 = 要 key,不管它今天碰巧是什么语言。
//
// ⚠️ 属性这一路我第一版【整个漏了】:ATTRS 只用在骨架比较里,抽取里从没用过 —— 于是
// pt/video 会印 alt="Factory showcase - tejoy video"。这是 R1 那条教训第三次复发
// (「属性枚举漏掉 → pt 静默退回英文」)。在一个函数里列出来,不等于在另一个函数里处理了。
const nodes = (body, off, all = false) => {
  const killed = strip(body);
  const out = [];
  // ① 文本节点:任意 `>文本<`,【不】要求前面是开标签 —— `</label>Name` 里的 Name 就在闭标签
  //    后面,而它正是用户读的那半。写成 `<tag …>text<` 会把它整个漏掉(R1 的 seeder / contact / oem-odm)。
  for (const m of killed.matchAll(/>([^<>]+)(?=<)/g)) {
    const t = m[1];
    if (!all && !isProse(t)) continue;
    if (all && !t.trim()) continue;
    const start = m.index + 1;
    const before = killed.slice(Math.max(0, start - 400), start);
    const tagM = [...before.matchAll(/<([a-z0-9]+)([^>]*)>/gi)].pop();
    const tag = tagM ? tagM[1] : "t";
    const cls = tagM ? ((tagM[2].match(/class="([^"]*)"/) || [])[1] || "").split(" ")[0] : "";
    out.push({ start: start + off, end: start + t.length + off, text: t, tag, cls, kind: "text" });
  }
  // ② 可见属性:屏幕阅读器读它们,它们和正文一样是文案
  for (const a of ATTRS) {
    for (const m of killed.matchAll(new RegExp(`\\b${a}="([^"]*)"`, "g"))) {
      const v = m[1];
      if (all ? !v.trim() : !isProse(v)) continue;           // alt="" 是有意的装饰,不是文案
      const start = m.index + m[0].length - 1 - v.length;
      out.push({ start: start + off, end: start + v.length + off, text: v, tag: `@${a}`, cls: "", kind: "attr" });
    }
  }
  return out.sort((x, y) => x.start - y.start);              // 按文档顺序,en/pt 才配得上
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
// 重复 description 留哪一份 —— 总工逐页读了两条值的全文后裁的 7 条,不是我总结的规律。
//   contact                          [2]  第 1 条是首页通稿(pt/contact 只有一条,就是第 2 条)
//   certifications-testing           [2]  第 2 条具体(multi-stage testing / weather resistance)
//   compatibility                    [2]  第 2 条点名 Mini/Standard/Performance/Enterprise = 真实搜索词
//   oem-odm-manufacturing            [2]  第 2 条多 "MOQ 100+ pieces" = 真实 B2B 限定词
//   patents-manufacturing            [2]  第 2 条信息密度更高
//   starlink-compatible-accessories  [1]  ⚠️唯一反例:第 1 条同时点名配件类型+机型
//   video                            [1]  两条完全相同(都是首页通稿)→ 取任一。⚠️它根本没有属于
//                                         自己的 description = 内容缺口,归 Joe,我不自己造。
const KEEP_DESC = {
  contact: { "meta.desc": 1 }, "certifications-testing": { "meta.desc": 1 }, compatibility: { "meta.desc": 1 },
  "oem-odm-manufacturing": { "meta.desc": 1 }, "patents-manufacturing": { "meta.desc": 1 },
  "starlink-compatible-accessories": { "meta.desc": 0 }, video: { "meta.desc": 0 },
};
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
  const enRaw = baseline(enF);                    // ⛔ 读 HEAD,不读工作区 —— 见文件顶部
  const ptRaw = hasPt ? baseline(ptF) : null;
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
  // ⭐「是不是散文」是关于这个【节点】的,而节点有两侧 —— 所以两侧一起判,一侧说是就是。
  //
  // 我一直在【从 en 一侧】判,于是漏了 ISO 日期:en 写 "2026-07-04"(无字母、无千位分隔符 →
  // 判成装饰),pt 写 "4 de jul. de 2026"(有字母 → 散文)。同一个节点,一边给 key 一边不给,
  // 枚举于是 24 vs 31、配对崩掉。而 "2026-07-04" 【本来就是】随语种变的:它是格式化日期。
  // 从 en 看它像数据,从 pt 看一眼就知道是日期 —— ⭐ en 又是那个「区别不可见」的一侧,第六次。
  // 结构已证明逐标签相同(86=86 / 31=31 文本节点),所以按位置合判是安全的。
  const eAll = nodes(enRaw.slice(ha, fb), ha, true);
  const pAll = hasPt ? nodes(ptRaw.slice(ptRaw.indexOf("</header>"), ptRaw.indexOf("<footer")), ptRaw.indexOf("</header>"), true) : [];
  if (hasPt && eAll.length !== pAll.length) { console.log(`🔴 ${slug}: 骨架齐但【全部】节点数 ${eAll.length} vs ${pAll.length} — 结构真的不对齐,停`); continue; }
  const keepIdx = eAll.map((n, i) => isProse(n.text) || (hasPt && isProse(pAll[i].text)));
  const eN = eAll.filter((_, i) => keepIdx[i]);
  const pN = pAll.filter((_, i) => keepIdx[i]);
  const bothSided = eAll.filter((n, i) => keepIdx[i] && !isProse(n.text)).length;
  if (bothSided) console.log(`   ${slug}: ${bothSided} 个节点【只有 pt 那侧看得出是文案】(ISO 日期等)— 已按两侧合判纳入`);

  // ② 对着页面总量对账 —— 不是"我抓到 N 个"就算 N 个(R3(a) 那次我抓 40、真值 50,
  //    而 en40==pt40 让它看起来是对的:两把同样坏的尺子互相印证)。
  //    ⚠️ 对账必须【和枚举同范围】:只对文本对账,会一边说"26=26 ✅"、一边对属性一无所知 ——
  //    那正是最会骗人的一种绿。范围不一致的对账,只是换个方式自证。
  const body0 = strip(enRaw.slice(ha, fb));
  // 对账必须用【同一个】isProse —— 两边各写一套判据,就又是两把尺子互相印证了
  const auditText = [...body0.matchAll(/>([^<>]+)</g)].map((m) => m[1]).filter(isProse).length;
  const auditAttr = ATTRS.reduce((n, a) => n + [...body0.matchAll(new RegExp(`\\b${a}="([^"]*)"`, "g"))].filter((m) => isProse(m[1])).length, 0);
  const audit = eAll.filter((_, i) => keepIdx[i]).length;   // 和枚举【同范围、同判据】:两侧合判后的数
  if (audit !== eN.length) { console.log(`🔴 ${slug}: 提取 ${eN.length} 条,独立数法 ${audit} 条(文本 ${auditText} + 属性 ${auditAttr})— 差额 ${audit - eN.length},枚举不完整,停`); continue; }

  const cat = {};
  const seq = {};
  // key 名只用 [a-z0-9_.-] —— 和 token 正则同一个字符集。
  // 我第一版把属性命名成 `@alt`,`@` 不在正则里 → token 解析不到 → {{t.about.@alt.1}} 会原样印在页上。
  // ⭐ 而这次是【否定式保护】当场抓住的(「输出里还剩任何 {{...}} 就炸」)—— 老那版
  // 「匹配得到但解析不了才炸」根本不认识它,会让它安静地发出去。总工那条改动立刻就付了回报。
  const slugify = (s) => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "t";
  const keyOf = (n) => { const b = slugify(n.cls || n.tag); seq[b] = (seq[b] || 0) + 1; return `${slug}.${b}.${seq[b]}`; };
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
  // 内联 <script> 里【显示给用户】的字符串。strip() 把 script 整个抹掉,所以这一类从没进过枚举 ——
  // pt/contact 于是会印 'Sending…' 而不是 'Enviando…',那是用户按下提交后真的会看到的字。
  //
  // ⚠️ 这里【不】能改成"只 key en/pt 有差异的" —— 那是 R1 洞①:按"是否已翻译"决定 key 集,
  // 会把两边都是英文的现存泄漏永久冻结。JS 里的"可见性"同样是可计算的:
  //   ⭐ 赋给 textContent / innerHTML 的字符串,按定义就是显示给用户的。
  // 这是可见性规则,不是差异规则。选择器、类名、URL 不会被它碰到。
  {
    const VIS = /(\.(?:textContent|innerHTML)\s*=\s*)(["'])((?:(?!\2)[^\\]|\\.)*)(\2)/g;
    const grabVis = (s) => [...s.matchAll(VIS)].map((m) => m[3]);
    const eV = grabVis(enRaw), pV = hasPt ? grabVis(ptRaw) : [];
    if (eV.length && hasPt && eV.length !== pV.length) console.log(`   ⚠️ ${slug}: textContent 赋值 en ${eV.length} / pt ${pV.length} — 数量不符,跳过这一类`);
    else if (eV.length) {
      let k = 0;
      const before = tpl;
      tpl = tpl.replace(VIS, (m, lhs, q, v, q2) => {
        if (!isProse(v)) return m;
        const key = `${slug}.js.${++k}`;
        cat[key] = { en: v, ...(hasPt ? { "pt-BR": pV[k - 1] } : {}) };
        return `${lhs}${q}{{t.${key}}}${q2}`;
      });
      if (k) {
        // 插入必须【在产物里找得到】—— 断言产物,不是断言函数返回了(总工:沉默的成功 = 最贵的失败)
        if (before === tpl) { console.log(`   🔴 ${slug}: textContent token 没进模板 — 停`); continue; }
        console.log(`   ${slug}: 内联 JS 里显示给用户的字符串 ${k} 条 → 进目录(pt 不再被 en 覆盖)`);
      }
    }
  }

  // JS 在运行时构造的 JSON-LD:`script.textContent = JSON.stringify({…})`,单引号写的,
  // 所以它【不是】 <script type="application/ld+json">,上面那套 JSON 遍历完全看不见它。
  // 只有 faq 一个页有。它的 name/description 是随语种变的真文案(pt 侧是葡语的,不派生就会被
  // en 覆盖);@id 由 route 算 —— 顺带修掉 en 侧一个存量 bug:它写的是 https://tejoy.com/?faq/,
  // 那个 `?` 本来就在源文件里(不是这条流水线造的,我一度错记在自己账上)。pt 侧是对的。
  {
    const at = tpl.indexOf("script.textContent = JSON.stringify(");
    if (at >= 0) {
      const end = tpl.indexOf("</script>", at);
      let seg = tpl.slice(at, end);
      const eAt = enRaw.indexOf("script.textContent = JSON.stringify(");
      const eSeg = enRaw.slice(eAt, enRaw.indexOf("</script>", eAt));
      const pAt = hasPt ? ptRaw.indexOf("script.textContent = JSON.stringify(") : -1;
      const pSeg = pAt >= 0 ? ptRaw.slice(pAt, ptRaw.indexOf("</script>", pAt)) : "";
      for (const field of ["name", "description"]) {
        const re = new RegExp(`('${field}':\\s*')([^']*)(')`);
        const e = (eSeg.match(re) || [])[2], p = pSeg ? (pSeg.match(re) || [])[2] : undefined;
        if (e === undefined) continue;
        const key = `${slug}.jsonld.${field}`;
        cat[key] = { en: e, ...(p !== undefined ? { "pt-BR": p } : {}) };
        seg = seg.replace(re, `$1{{t.${key}}}$3`);
      }
      seg = seg.replace(/('@id':\s*')[^']*(#[^']*')/, "$1{{CANONICAL}}$2");
      tpl = tpl.slice(0, at) + seg + tpl.slice(end);
      console.log(`   ${slug}: JS 构造的 JSON-LD → name/description 进目录,@id 由 route 派生(en 存量 bug 'tejoy.com/?faq/' 顺带修好)`);
    }
  }

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
    let eM = [...enH.matchAll(g)], pM = hasPt ? [...ptH.matchAll(new RegExp(re.source, "g"))] : [];
    if (!eM.length) continue;                             // 该页没有这个 meta,正常
    // ③ 重复 meta 去重(总工裁,他把 6 个页的两条值都看过了):
    //   规则 = 取【更专属于本页】的那条;两条都专属时取第一条 —— 浏览器和 Google 本来就取第一条,
    //   所以那是零行为变化。DROP_KEEP 是点名的例外,不是"我记得":contact 的第 1 条是【首页通稿】
    //   ("Tejoy is a leading manufacturer…"),第 2 条才是 contact 自己的 —— 默认规则在这里恰好
    //   保留烂的那条。而这个答案不是我选的:pt/contact 只有一条 description,就是第 2 条。
    //   ⚠️ 同一个动作也修好了 ②:那条通稿正好坐在 <meta charset> 前面,丢掉它 head 顺序就对了。
    // 总工逐页读了两条值的全文才裁的,7 条写死在表里 —— 他点名「别做成通用规则」:
    // [2] 几乎总是更好的那条(像是后来补 SEO 时加的、补的人没删旧的),但 slc-accessories 是反例。
    // 规律不等于规则。表里是裁决,不是我总结的模式。
    const keep = (KEEP_DESC[slug] || {})[name] ?? 0;
    // ⚠️ 丢就丢【整个标签】。槽位正则只捕到结束引号为止(`<meta … content="V"`),
    // 直接 replace(d[0], "") 会把标签体删掉、把闭合的 `>` 留在原地 —— contact 于是生成出
    // `<head> >`,about 的 head 更是整段崩掉。删一半的标签比不删更糟。
    const dropTag = (h, m) => {
      const at = h.indexOf(m[0]);
      if (at < 0) return h;
      const end = h.indexOf(">", at + m[0].length) + 1;
      if (end <= 0) return h;
      let a = at; while (a > 0 && /[ \t]/.test(h[a - 1])) a--;
      let b = end; while (b < h.length && /[ \t]/.test(h[b])) b++;
      if (h[b] === "\n") b++;
      return h.slice(0, a) + h.slice(b);
    };
    if (eM.length > 1) {
      const dropped = eM.filter((_, i) => i !== keep);
      for (const d of dropped) head = dropTag(head, d);
      console.log(`   ${slug}: ${name} 重复 ${eM.length} 份 → 留第 ${keep + 1} 份${keep ? " ⭐(点名例外)" : ""},丢 ${dropped.length} 份`);
      eM = [eM[keep]];
      // pt 侧逐个对,不假设它的顺序跟 en 一样(总工点名要求)
      if (hasPt && pM.length > 1) { pM = [pM[keep]]; }
    }
    if (hasPt && pM.length && eM.length !== pM.length) { console.log(`🔴 ${slug}: ${name} 去重后 en ${eM.length} / pt ${pM.length} — 停`); continue; }
    for (let k = 0; k < eM.length; k++) {
      const e = eM[k][2], p = hasPt && pM[k] ? pM[k][2] : undefined;
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

  // hreflang → 由 route 派生。en 侧【时有时无】(en/about 根本没有),pt 侧齐全 —— 又是 pt 对、
  // en 残缺,和 breadcrumb 同一个形状。而 hreflang 三条链接完全由 route 算出来:自己、对语种、
  // x-default。按总工那条线,它是【结构修复】不是内容改动 —— 正确答案可计算,那就该算,免费。
  // 模板从 en 出,不派生的话 pt 会丢掉它已有的 hreflang(真 SEO 回归);而派生顺带把 en 缺的补上。
  head = head.replace(/[ \t]*<!--\s*hreflang alternates[^>]*-->\s*\n?/g, "")
    .replace(/(?:[ \t]*<link rel="alternate" hreflang="[^"]*" href="[^"]*"\s*\/?>\s*\n?)+/g, "{{HREFLANG}}\n");
  if (!/\{\{HREFLANG\}\}/.test(head)) console.log(`   ⚠️ ${slug}: 没找到 hreflang 块 — 该页 en/pt 都没有?`);

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
