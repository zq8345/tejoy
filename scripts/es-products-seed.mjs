#!/usr/bin/env node
/**
 * es-MX 注入 data/products/*.json —— 数据/逻辑分离的注入管线
 *
 * ⭐ 译文在 data/es-product-translations.json（我分批填）,注入逻辑在这里。
 *   为什么分离:64 个产品 ~14 万字符,一次填不完。分离 → 每次跑注入【已填的】,
 *   过尺子,commit。已 commit 的不怕 compaction。译文是数据,不是代码。
 *
 * ⭐ 只镜像 en 的 title / summary_html / description_html / meta_description。
 *   **meta_title 不注入** —— 它是派生值(render.js metaTitleOf: `${title}-${model}-Tejoy${suffix}`),
 *   es 的 meta.title.suffix 已在 chrome.json 签过。存派生值 = 标题一改就静默漂。
 *   (pt-BR 存了 meta_title 是 phase2-convert 的历史遗留,mergeI18n 根本不读它。)
 *
 * ⛔ 扣留名单 —— **这 6 个不注入,es 回退英文**。源头规格有【物理安全】问题,
 *   翻了 = 用西语复制一份会伤人的声明。等 Joe/供应商给正确物理参数。
 *     679  标题 12V-48V vs 正文 12V-24V   → 48V 买家照标题下单直接烧
 *     4206 18AWG 线 + 15A 保险丝           → 保险丝额定高于线载流 = 保护失效 = 起火路径
 *     695  标题 Waterproof vs 规格表 IP60  → 第二位 0 = 对水零防护
 *     678  标题 POE,实为无源直流           → 插标准 POE 交换机烧设备
 *     691  屋顶件抗飓风/承重 500lbs 无依据  → 1.25kg 件砸人
 *     704  ⚠️【我加的】页内自相矛盾:小标题要 100W+,正文说 65W 够,又写电压不够会不停重启
 *          → 与那 5 个【同性质】(单页内规格自打脸,买家照错数买受损)。总工名单没有它,
 *            我保守扣着 + 报总工二次确认。不对称风险:回退英文无损,翻错有害。
 *
 * ⚠️ 跨页矛盾类(703/4204/4205/4200/4207/656/692/693 的 Mini 伏数/功率三套说法)【不扣】:
 *   审计原文「每一页内部都自洽」→ 翻译不放大风险(墨西哥买家读到的和英文买家一样自洽),
 *   且扣了可能扣掉【对的】那页。照翻,报告里标注,真源待 Joe 拿实物定。
 */
import fs from 'fs';

/* ⭐ 从【单一真源】读,不再在这里硬编码一份。
 *   原来这里有一份写死的 id 清单,靠注释说明理由 —— **同一个事实两个来源,迟早漂,
 *   而且注释不会报红**。理由现在和 id 一起存在 data/es-hold.json,
 *   由 scripts/es-hold-check.mjs 双向强制(列了必须没 es / 没 es 必须列)。 */
const BLOCKED = new Set(JSON.parse(fs.readFileSync('data/es-hold.json', 'utf8')).hold.map((h) => String(h.id)));
const FIELDS = ['title', 'summary_html', 'description_html', 'meta_description']; // 镜像 en,不含 meta_title
const TR_PATH = 'data/es-product-translations.json';
const DIR = 'data/products';

const translations = JSON.parse(fs.readFileSync(TR_PATH, 'utf8'));

/* 括号配对:从 openIdx('{') 找匹配的 '}',跳过字符串(含转义)。产品 JSON 的值可能含 { } —— 不能用 [^{}]*。 */
function matchBrace(s, openIdx) {
  let depth = 0, inStr = false, esc = false;
  for (let i = openIdx; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else {
      if (c === '"') inStr = true;
      else if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return i; }
    }
  }
  return -1;
}

const results = { seeded: [], blocked: [], noTranslation: [], errors: [] };

for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith('.json'))) {
  const id = f.replace('.json', '');
  const path = `${DIR}/${f}`;
  const before = fs.readFileSync(path, 'utf8');
  const beforeObj = JSON.parse(before);

  if (BLOCKED.has(id)) { results.blocked.push(id); continue; }
  if (beforeObj.i18n['es-MX']) { results.seeded.push(id + '(已存)'); continue; }
  const tr = translations[id];
  if (!tr) { results.noTranslation.push(id); continue; }

  const en = beforeObj.i18n.en;

  /* 构造 es-MX 块:镜像 en 有值的字段。en 空的字段(如多数 summary_html)→ es 也不给,渲染时回退 en(即空)。 */
  const esObj = {};
  for (const field of FIELDS) {
    const enVal = en[field];
    if (enVal === undefined || String(enVal).trim() === '') continue; // en 本身空 → 跳过
    if (tr[field] === undefined || String(tr[field]).trim() === '') { results.errors.push(`${id}.${field}: en 有值但译文缺`); continue; }
    esObj[field] = tr[field];
  }
  if (Object.keys(esObj).length === 0) { results.errors.push(`${id}: 译文一个字段都没有`); continue; }

  /* 文本插入:pt-BR 块之后加 es-MX。en/pt-BR 一个字节不碰。 */
  const ptIdx = before.indexOf('"pt-BR"', before.indexOf('"i18n"'));
  if (ptIdx < 0) { results.errors.push(`${id}: 找不到 pt-BR 块`); continue; }
  const ptBrace = before.indexOf('{', ptIdx);
  const ptEnd = matchBrace(before, ptBrace);
  if (ptEnd < 0) { results.errors.push(`${id}: pt-BR 块括号不配对`); continue; }

  // es-MX 块用 pt-BR 的缩进（6 空格字段 / 4 空格块）
  const esLines = FIELDS.filter((k) => esObj[k] !== undefined).map((k) => `      ${JSON.stringify(k)}: ${JSON.stringify(esObj[k])}`).join(',\n');
  const insert = `,\n    "es-MX": {\n${esLines}\n    }`;
  const out = before.slice(0, ptEnd + 1) + insert + before.slice(ptEnd + 1);

  /* ── 对账:不是"看着像对的" ── */
  let afterObj;
  try { afterObj = JSON.parse(out); } catch (e) { results.errors.push(`${id}: 写出非法 JSON — ${e.message}`); continue; }
  const errs = [];
  if (JSON.stringify(afterObj.i18n.en) !== JSON.stringify(beforeObj.i18n.en)) errs.push('en 被改动');
  if (JSON.stringify(afterObj.i18n['pt-BR']) !== JSON.stringify(beforeObj.i18n['pt-BR'])) errs.push('pt-BR 被改动');
  if (afterObj.i18n['es-MX'].meta_title !== undefined) errs.push('es 混入了 meta_title(应派生)');
  for (const k of Object.keys(esObj)) if (afterObj.i18n['es-MX'][k] !== esObj[k]) errs.push(`es.${k} 落盘不符`);
  if (errs.length) { results.errors.push(`${id}: ${errs.join(' / ')}`); continue; }

  fs.writeFileSync(path, out);
  results.seeded.push(id);
}

/* ── 报告 + 总数对账 ── */
console.log('\n【es-MX 注入产品】');
console.log(`  ✅ 注入        : ${results.seeded.length}  ${results.seeded.slice(0, 20).join(' ')}${results.seeded.length > 20 ? ' …' : ''}`);
console.log(`  ⛔ 扣留(不翻)  : ${results.blocked.length}  ${results.blocked.join(' ')}`);
console.log(`  ⏳ 待填译文    : ${results.noTranslation.length}  ${results.noTranslation.slice(0, 20).join(' ')}${results.noTranslation.length > 20 ? ' …' : ''}`);
const totalFiles = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).length;
const accounted = results.seeded.length + results.blocked.length + results.noTranslation.length + results.errors.length;
console.log(`  ── 对账: ${results.seeded.length}+${results.blocked.length}+${results.noTranslation.length}+${results.errors.length} = ${accounted} / ${totalFiles} ${accounted === totalFiles ? '✅' : '❌ 对不上!'}`);

if (results.errors.length) {
  console.log(`\n❌ ${results.errors.length} 个错误:`);
  for (const e of results.errors) console.log(`   ${e}`);
  process.exit(1);
}
console.log('\n✅ 注入完成,对账通过(en/pt-BR 未变 · meta_title 未混入 · 扣留名单跳过)。');
