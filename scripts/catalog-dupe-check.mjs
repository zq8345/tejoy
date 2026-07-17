#!/usr/bin/env node
/**
 * catalog 重复串守卫 —— **去重之后,防止它再长回来**
 *
 * ⭐ 可测的断言:**整个 catalog 里,任何两个 key 不许有相同的 en 值。**
 *   现在跑  = 报 76 个重复串（429 处引用）
 *   去重完  = 0
 *   之后任何人再复制一份 → **当场红**
 *
 * ⭐ 为什么需要它:906 条里 429 条是复印件,而 **pt 已经在 23 个串上漂出了多种译法**。
 *   「69 个 More 存在 69 个地方,没有任何机制让它们一致」—— 光去重一次不够,
 *   **半年后又有人复制粘贴,而且没有任何东西会告诉他。**
 *
 * ⚠️ 例外必须【显式】:两个 key 真该同 en(不同语境巧合同形)→ 加 "reason.dupe"。
 *   和 seedLocale 的 allowMissing 同一个道理:**「我忘了」和「我故意」不能长得一样。**
 */
import fs from 'fs';

const FILES = [['data/chrome.json', 'chrome']];
for (const f of fs.readdirSync('data/pages').filter((f) => f.endsWith('.json') && f !== 'home-tiles.json')) {
  FILES.push([`data/pages/${f}`, f.replace('.json', '')]);
}

const byEn = new Map();
let total = 0;
const exempt = [];

for (const [file, label] of FILES) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [k, v] of Object.entries(j)) {
    if (k.startsWith('_') || !v || typeof v !== 'object' || v.en === undefined) continue;
    total++;
    if (v['reason.dupe']) { exempt.push(`${label}:${k}`); continue; }
    const s = String(v.en);
    if (!byEn.has(s)) byEn.set(s, []);
    byEn.get(s).push(`${label}:${k}`);
  }
}

const dupes = [...byEn.entries()].filter(([, ks]) => ks.length > 1).sort((a, b) => b[1].length - a[1].length);
const instances = dupes.reduce((n, [, ks]) => n + ks.length, 0);

/* ⚠️ 对账 —— 「凡是"匹配到才算"的检查,都要同时数一遍"总共有几个"」 */
console.log(`\n【catalog 重复串守卫】`);
console.log(`  扫了 ${FILES.length} 个 catalog,${total} 个 key（显式豁免 ${exempt.length} 个）`);
console.log(`  不同的 en 串 : ${byEn.size}`);
console.log(`  重复的 en 串 : ${dupes.length}  →  ${instances} 处引用\n`);

for (const [s, ks] of dupes.slice(0, 15)) {
  console.log(`  ❌ ${String(ks.length).padStart(2)}×  ${JSON.stringify(s.slice(0, 56))}`);
  console.log(`        ${ks.slice(0, 3).join('  ')}${ks.length > 3 ? `  …+${ks.length - 3}` : ''}`);
}
if (dupes.length > 15) console.log(`  … 还有 ${dupes.length - 15} 个\n`);

if (dupes.length) {
  console.log(`\n❌ ${dupes.length} 个串被存了多份。**它们不该被翻译,它们不该存在。**`);
  console.log(`   见 pages-dedupe-design.md。真该同 en 的,加 "reason.dupe" 显式豁免。`);
  process.exit(1);
}
console.log('✅ 没有重复串 —— 每个 en 值只存在一处。');
