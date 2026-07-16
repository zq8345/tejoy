#!/usr/bin/env node
/**
 * 第三方品牌残留扫描 —— 按【字段归属】分类
 *
 * 用途：**Joe 审完 64 个产品后跑这个**，一眼看出哪些派生物没跟着干净。
 *   Joe 的地盘（后台能改）  ：title / description_html / summary_html / images[].alt
 *   我们的地盘（后台改不到）：meta_title / meta_description / keywords / jsonld_product
 *
 * ⚠️ 关键事实（2026-07-16 实测）：我们那侧的字段**大多是 Joe 那侧的机械派生物**：
 *   meta_title = {title} + "-{分类}-Tejoy | Premium Starlink Accessories…"（5/5 产品吻合）
 *   keywords   = {title} + …（4/5，702 例外）
 *   meta_description / jsonld_product.description = description_html 的截断
 *   → **Joe 改完 title / 正文，这些应当自动干净。跑本脚本验证；若没归零 = 派生链断了。**
 *   → 另：dev 的 R2 里 render.js 明写
 *      "meta_title is deliberately NOT read from data here — it is DERIVED"
 *      所以 meta_title 更不该手改（我手改 title 污染过派生的 meta_title，产出半英半葡）。
 *
 * ⭐ 对账原则：每个品牌「整个 JSON 里出现的总数」必须 = 各字段之和。
 *   差额报成「⚠️未归类字段」—— **匹配不上的要吼出来，不是悄悄跳过。**
 *   （来自四次教训：!src 跳过 177 张 CDN 图 / ?v= 判错 656 / <img/> 空标签 / 文件存在+200=好图）
 *
 * 用法：node scripts/brand-residue-scan.mjs
 */
import fs from 'fs';
const BRANDS = ['XLinkShop', 'XLinkCore', 'STARGEAR', 'linkoostar', 'DaierTek', 'starlingkshop', 'Dbilida', 'TP-Link', 'TP Link'];
const OURS = ['meta_title', 'meta_description', 'keywords'];        // 后台改不到 = 我们的
const JOES = ['title', 'description_html', 'summary_html'];          // 后台能改 = Joe 的
const rx = (b) => new RegExp(b.replace(/[-\s]/g, '[-\\s]?'), 'gi');
const count = (s, b) => (String(s || '').match(rx(b)) || []).length;

const rows = [];
for (const f of fs.readdirSync('data/products').filter((x) => x.endsWith('.json')).sort()) {
  const id = f.replace('.json', '');
  const p = JSON.parse(fs.readFileSync('data/products/' + f, 'utf8'));
  for (const b of BRANDS) {
    // 我们的字段
    for (const loc of Object.keys(p.i18n || {})) {
      for (const fld of OURS) {
        const n = count(p.i18n[loc][fld], b);
        if (n) rows.push({ id, brand: b, field: `i18n.${loc}.${fld}`, n, own: 'OURS' });
      }
    }
    // 顶层：jsonld
    for (const fld of ['jsonld_product', 'jsonld_breadcrumb']) {
      const n = count(p[fld], b);
      if (n) rows.push({ id, brand: b, field: fld, n, own: 'OURS' });
    }
    // Joe 的字段（只统计，不动）
    for (const loc of Object.keys(p.i18n || {})) {
      for (const fld of JOES) {
        const n = count(p.i18n[loc][fld], b);
        if (n) rows.push({ id, brand: b, field: `i18n.${loc}.${fld}`, n, own: 'JOE' });
      }
    }
    const altN = (p.images || []).reduce((s, im) => s + count(im.alt, b), 0);
    if (altN) rows.push({ id, brand: b, field: 'images[].alt', n: altN, own: 'JOE' });
    // ⚠️ 兜底：整个 JSON 里的总数，用来对账有没有漏字段
    const total = count(JSON.stringify(p), b);
    const accounted = rows.filter((r) => r.id === id && r.brand === b).reduce((s, r) => s + r.n, 0);
    if (total !== accounted) rows.push({ id, brand: b, field: '⚠️未归类字段', n: total - accounted, own: '???' });
  }
}

const ours = rows.filter((r) => r.own === 'OURS');
const joes = rows.filter((r) => r.own === 'JOE');
const unk = rows.filter((r) => r.own === '???');

console.log('=== ✅ 我们的（后台改不到）===');
ours.forEach((r) => console.log(`  ${r.id.padEnd(5)} ${r.field.padEnd(28)} ${r.brand.padEnd(14)} ×${r.n}`));
console.log(`  小计 ${ours.reduce((s, r) => s + r.n, 0)} 处 / ${ours.length} 个字段位`);
console.log('\n=== ⛔ Joe 的（后台能改，不碰）===');
joes.forEach((r) => console.log(`  ${r.id.padEnd(5)} ${r.field.padEnd(28)} ${r.brand.padEnd(14)} ×${r.n}`));
console.log(`  小计 ${joes.reduce((s, r) => s + r.n, 0)} 处`);
if (unk.length) {
  console.log('\n=== ⚠️ 对账差额（有字段我没归类到！）===');
  unk.forEach((r) => console.log(`  ${r.id} ${r.brand} 差 ${r.n} 处`));
} else console.log('\n✅ 对账平：每一处都归到了具体字段，无遗漏');
