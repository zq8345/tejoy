#!/usr/bin/env node
/**
 * 切换器 catalog —— 三语化的【新 key】。一次性迁移脚本。
 *
 * ⭐ 约定由多语言窗定（总工 2026-07-17 指派，dev 拒绝猜——对，它是屏幕阅读器读出来的可见文案）：
 *
 *   ══ 约定 A：**aria-label 用【读者的语言】= 该页面 <html lang> 的语言。** ══
 *
 * ── 为什么不是「用目标语言」（那条约定【真的存在】，我没有假装它不存在）──────────
 *
 *   「用目标语言写」有真实先例：维基百科的语言列表就是 Español / Português ——
 *   因为**找那个语言的人认得那个词**。这不是个坏主意，dev 说「这是约定不是措辞」是对的。
 *
 *   ⭐ 但它在【我们这里】不成立，理由是实测出来的，不是偏好：
 *
 *   ① **现状根本不是「另一条约定」，是一个正在乱码的 bug。**
 *      屏幕阅读器读 aria-label，用的是元素的 `lang`；而 aria-label 自身无法携带语言标注
 *      （它是属性值，不是元素内容）。要让「目标语言」合法，`<a>` 必须带 lang="pt-BR"。
 *      **实测：全站 52 个切换器链接，带独立 lang 的 = 0。**
 *          <a href="/pt/about/" class="lang-switch__link" hreflang="pt-BR" aria-label="Ver esta página em português">
 *      只有 `hreflang` —— 那描述【目标文档】的语言，不是【本元素内容】的语言。
 *      → en 页 <html lang="en"> 上写着葡语 aria-label = **英语语音引擎在读葡语，现在，线上。**
 *      ⚠️ 我差点没查出来：`grep 'lang="'` 命中了 `hreflang="pt-BR"` 的【子串】，报"有 lang"。
 *         **验证工具自己给了假阳性** —— 又是那个形状：量到的不是你以为的那个东西。
 *
 *   ② **约定 B 会静默降级。** 漏一个 lang → 乱码，**没有任何检查能抓到**。
 *      而我们刚证明了 52/52 全漏 —— 这不是假想的风险，这是已经发生的事实。
 *
 *   ③ ⭐⭐ **约定 B 会逼我给 es 尺子开白名单。**
 *      es 页上会出现葡语和英语的 aria-label → es-leak-scan 必然报警 → 我只能开白名单。
 *      **而白名单不是「这里不会错」，是「这里我放弃观察」。**（我在 e8cca86b 上栽过这一跤：
 *      我把切换器整个 whitelist 掉，R1 恰好在那里打坏了它，**我造的盲区正好是 bug 落地的地方**。）
 *      → **约定 A 让尺子能守它；约定 B 让尺子必须闭眼。这是决定性的一条。**
 *
 *   ④ 「让找自己语言的人认出来」这个职责，**已经由可见的 PT / ES / EN 承担了** ——
 *      而且它们是国际代码，不需要懂任何一种语言。
 *      **aria-label 的职责是【解释这个链接是干嘛的】，说给当前这一页的读者听。**
 *
 * ── 结构：key 按【目标】分，值按【读者】分 ──────────────────────────────────
 *   这正是二元坍塌的解：旧 key 存的是「对面那个语言」，所以「对面」一多它就装不下。
 *   新结构里「目标」是一个【维度】而不是一个【隐含常量】—— 加第四种语言 = 加一行，不改结构。
 *
 *   📌 旧 key 名 `header.ver_esta_p_gina_em_portugu_s` 把【葡萄牙语】焊进了 key 名（化石）。
 *      新命名 `switcher.aria.to_*` 不含语种。
 *
 * ⚠️ **只加新 key，不删旧的** —— dev 改完模板后旧 key 自动没人引用，guard 会把它们
 *    列进「无人使用的 key(可能已腐烂)」。
 *
 * 🔴 **但我上面这句原本写的是「guard 会主动吼」—— 那是错的，我当场踩中才发现**：
 *      const fail = gaps.length > 0 || orphans.length > 0;   // ← unused **不在里面**
 *    `unused` **不进 fail，连 --strict 都不挡**，而且它后面还会打印
 *      「✅ 无缺失、无孤儿 token。」
 *    —— **一条 ⚠️ 后面跟一个大绿的 ✅，而 ✅ 是最后一行。**
 *
 *    ⭐ 我是怎么发现的：我用 `tail -2` 看 guard 输出，**只看到 ✅ 就以为没报**。
 *      **我不是推理出这个洞的，我是踩进去的。** guard 自己的注释写着
 *      「假警报会训练人略过告警，然后真的那条也没人读」——
 *      **它防住了假警报，没防住【真警报被 ✅ 盖住】。**
 *
 *    → 所以「旧 key 会被 guard 提醒删掉」**只成立一半**：它会被【列出来】，
 *      但没有任何东西【强制】，而且列在一个以 ✅ 结尾的报告里。
 *      **已上报总工，建议：有 unused 时不许打 ✅**（不改 fail 语义，只是别撒谎）。
 *      在那之前，**删旧 key 这件事仍然依赖有人记得 —— 这正是我想避免的**。
 */
import { seedLocale } from './es-seed-lib.mjs';
import fs from 'fs';

const PATH = 'data/chrome.json';
const raw = fs.readFileSync(PATH, 'utf8');
if (raw.includes('"switcher.aria.to_en"')) { console.log('已灌过，跳过。'); process.exit(0); }

/* ⚪ = 该格子【不会被渲染】（页面不指向自己），但**给值**：
 *    留空 = guard 红 = 假警报，而假警报会训练人忽略 guard。 */
const KEYS = {
  'switcher.aria.to_en': {
    en: 'View this page in English',            // ⚪
    'pt-BR': 'Ver esta página em inglês',       // ✅ 现有值，逐字保留
    'es-MX': 'Ver esta página en inglés',
  },
  'switcher.aria.to_pt': {
    en: 'View this page in Portuguese',         // 🔴 替换现在那个【葡语】值 —— 它正在 en 页上乱码
    'pt-BR': 'Ver esta página em português',    // ⚪
    'es-MX': 'Ver esta página en portugués',
  },
  'switcher.aria.to_es': {
    en: 'View this page in Spanish',
    'pt-BR': 'Ver esta página em espanhol',
    'es-MX': 'Ver esta página en español',      // ⚪
  },
  /* 可见文本 —— 国际语言代码。三个 locale 同值 = 同形词：
     按 _fallback_doc，同形词给【显式值 + reason】，**不进 locales.json 白名单**
     （白名单会自动放行未来每一种语言，静默继承英文）。 */
  'switcher.code.en': { en: 'EN', 'pt-BR': 'EN', 'es-MX': 'EN' },
  'switcher.code.pt': { en: 'PT', 'pt-BR': 'PT', 'es-MX': 'PT' },
  'switcher.code.es': { en: 'ES', 'pt-BR': 'ES', 'es-MX': 'ES' },
};

const REASONS = {
  'switcher.aria.to_en': '约定 A：aria-label 用读者的语言（= 该页 <html lang>）。见 es-switcher-seed.migration.mjs',
  'switcher.aria.to_pt': '约定 A。en 值【替换】了原 header.ver_esta_p_gina_em_portugu_s 的葡语值 —— 实测 52/52 切换器链接无独立 lang，那个值在 en 页上正被英语语音引擎读',
  'switcher.aria.to_es': '约定 A',
  'switcher.code.en': '同形词：国际语言代码，三语同值。显式给值而非白名单 —— 白名单会自动放行未来每种语言',
  'switcher.code.pt': '同形词：国际语言代码',
  'switcher.code.es': '同形词：国际语言代码',
};

/* 手工构造 —— seedLocale 是给「已有 en/pt-BR、补 es-MX」用的；这里是【全新 key】。
   ⚠️ 同样只做文本插入：JSON 往返实测与原文差 341 字符，会把 diff 变成整文件重写。 */
const anchor = '  "card.alt.suffix": {';
if (!raw.includes(anchor)) { console.error('❌ 锚点 card.alt.suffix 找不到 —— chrome.json 结构变了，停下来看，不要猜'); process.exit(1); }

const block = Object.entries(KEYS).map(([k, v]) =>
  `  ${JSON.stringify(k)}: {\n` +
  `    "en": ${JSON.stringify(v.en)},\n` +
  `    "pt-BR": ${JSON.stringify(v['pt-BR'])},\n` +
  `    "es-MX": ${JSON.stringify(v['es-MX'])},\n` +
  `    "reason": ${JSON.stringify(REASONS[k])}\n` +
  `  },`
).join('\n') + '\n';

const out = raw.replace(anchor, block + anchor);

/* ── 对账：不是"看着像对的" ── */
const beforeObj = JSON.parse(raw);
let afterObj;
try { afterObj = JSON.parse(out); } catch (e) { console.error('❌ 不是合法 JSON：' + e.message); process.exit(1); }

const errs = [];
for (const [k, v] of Object.entries(beforeObj)) {
  if (k.startsWith('_')) continue;
  for (const loc of ['en', 'pt-BR', 'es-MX']) {
    if (JSON.stringify(afterObj[k]?.[loc]) !== JSON.stringify(v[loc])) errs.push(`既有 key ${k}.${loc} 被改动了`);
  }
}
const added = Object.keys(afterObj).filter((k) => !(k in beforeObj));
if (added.length !== 6) errs.push(`应新增 6 个 key，实际 ${added.length}: ${added.join(', ')}`);
for (const k of added) for (const loc of ['en', 'pt-BR', 'es-MX']) if (!afterObj[k][loc]) errs.push(`新 key ${k} 缺 ${loc}`);
if (errs.length) { console.error('\n❌ 对账不过，不落盘：\n  ' + errs.join('\n  ')); process.exit(1); }

fs.writeFileSync(PATH, out);
console.log('\n【切换器 catalog 三语化】');
console.log(`  新增 ${added.length} 个 key，每个 3 个 locale 全齐：`);
for (const k of added) console.log(`    ${k.padEnd(24)} en:${JSON.stringify(afterObj[k].en).slice(0, 30)}`);
console.log('\n✅ 对账通过（既有 key 一字节未变 · 新 key 三语齐全）');
console.log('⚠️ 旧 key header.pt / header.ver_esta_p_gina_em_portugu_s **故意不删** ——');
console.log('   dev 改完模板后它们自动变孤儿，guard 的孤儿检查会主动吼。不靠谁"记得删"。');
