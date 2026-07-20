#!/usr/bin/env node
/**
 * 扣留产品 双向闸 —— 让「故意不翻」和「漏翻」在机器眼里不一样
 *
 * ⭐ 单一真源 = data/es-hold.json。本文件是它的【强制器】,不是它的副本。
 *
 * ⭐⭐ 双向,缺一不可:
 *   ① 列在 es-hold 里的产品,必须【没有】es-MX   → 防「有人把扣留的翻了」
 *   ② 没有 es-MX 的产品,必须【列在】es-hold 里   → 防「漏翻伪装成扣留」
 *
 *   **②比①重要。** 少了②,`679 没翻` 和 `我忘了翻 680` 在数据上一模一样 ——
 *   而前者是安全决定,后者是事故。**一个只查①的闸,会把事故当成决定放行。**
 *   这跟 seedLocale 的 allowMissing、catalog 的 reason.dupe 是同一条规矩:
 *   **「我忘了」和「我故意」不能长得一样。**
 *
 * ⚠️ 为什么不写进 locales.json 的 fallback(dev 原计划):
 *   实测 i18n-check.mjs:153-154 —— `fallback` 只被 `whitelist=${wl.length}` 数了一下,
 *   **gap 判定里零引用,一个 gap 都豁免不了**。而 locales.json 的 _fallback_doc 自称
 *   「唯一能让 guard 闭嘴的逃生门」。**自称在把关、实际什么都没把** —— 与 chrome-verify
 *   拿 HEAD 当基线、我的 variants 照不到整类,是同一个家族。安全决定不能登记在装饰字段里。
 */
import fs from 'fs';

const HOLD = JSON.parse(fs.readFileSync('data/es-hold.json', 'utf8'));
const held = new Map(HOLD.hold.map((h) => [String(h.id), h]));
const DIR = 'data/products';

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json'));
const withoutEs = [], withEs = [];
for (const f of files) {
  const id = f.replace('.json', '');
  const j = JSON.parse(fs.readFileSync(`${DIR}/${f}`, 'utf8'));
  (j.i18n && j.i18n['es-MX'] ? withEs : withoutEs).push(id);
}

const errs = [];
// ① 扣留的不该有 es
for (const [id, h] of held) {
  if (!files.includes(`${id}.json`)) { errs.push(`es-hold 列了 ${id},但 data/products/${id}.json 不存在`); continue; }
  if (withEs.includes(id)) errs.push(`⛔ ${id} 被扣留却已有 es-MX 译文 —— 扣留理由:${h.why.slice(0, 46)}…`);
}
// ② 没 es 的必须被列名 —— 这一条才是防「漏翻伪装成扣留」的
for (const id of withoutEs) {
  if (!held.has(id)) errs.push(`❓ ${id} 没有 es-MX,也没在 es-hold 里声明 —— 是漏翻,还是想扣留? 数据上分不出来,请显式写清`);
}
// ⚠️ 对账:「凡是"匹配到才算"的检查,都要同时数一遍总数」
const accounted = withEs.length + withoutEs.length;

console.log(`\n【扣留产品 双向闸】`);
console.log(`  产品总数 ${files.length}  |  有 es ${withEs.length}  |  无 es ${withoutEs.length}  |  声明扣留 ${held.size}`);
console.log(`  对账: ${withEs.length}+${withoutEs.length} = ${accounted} / ${files.length} ${accounted === files.length ? '✅' : '❌'}`);

if (errs.length) {
  console.log(`\n❌ ${errs.length} 处:`);
  errs.forEach((e) => console.log(`   ${e}`));
  process.exit(1);
}
console.log(`  ✅ ① 扣留的 ${held.size} 个都没有 es-MX`);
console.log(`  ✅ ② 无 es 的 ${withoutEs.length} 个都已显式声明理由`);
console.log(`\n✅ 「故意不翻」与「漏翻」在数据上可区分。`);
