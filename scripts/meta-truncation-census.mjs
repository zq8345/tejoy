#!/usr/bin/env node
/**
 * 【口径钉死】哪些产品的 meta_description 是「正文前 N 字截断」?
 *
 * ⚠️ 为什么单独成文件: 我用 `node -e` 内联跑过两次, 得到 54 和 52 —— 因为 bash 双引号里
 *    `$` 被转义, 两次的判定正则实际不同。**自建度量的口径必须钉死在文件里, 不能写在命令行里。**
 *    (同一个病: 数字漂 -> 验收者没法判断是真变了还是我又调了一次判定)
 *
 * 判定: meta_description 去掉尾部省略号后, 其前 60 字符是否为正文(剥标签后)的开头。
 * 用法: node scripts/meta-truncation-census.mjs [--json]
 */
import fs from 'fs';

const strip = (h) => String(h || '')
  .replace(/<\/li>/g, ' | ')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

const files = fs.readdirSync('data/products').filter((f) => f.endsWith('.json')).sort();
const truncated = [], authored = [], empty = [];

for (const f of files) {
  const p = JSON.parse(fs.readFileSync('data/products/' + f, 'utf8'));
  const id = f.replace('.json', '');
  const md = (p.i18n.en.meta_description || '').trim();
  const body = strip(p.i18n.en.description_html);
  if (!md) { empty.push({ id }); continue; }
  const core = md.replace(/[.…]+$/, '').trim();       // 去尾部省略号
  const probe = core.slice(0, Math.min(60, core.length));
  const rec = { id, cat: p.category, len: md.length, title: p.i18n.en.title };
  if (body.startsWith(probe)) truncated.push(rec); else authored.push(rec);
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ truncated, authored, empty }, null, 2));
} else {
  console.log(`产品总数 ${files.length}`);
  console.log(`  截断式 meta_description : ${truncated.length}   ← 【3】重写的范围`);
  console.log(`  独立撰写                 : ${authored.length}   ← 不动`);
  console.log(`  空                       : ${empty.length}`);
  console.log('');
  console.log('截断式清单 (id / 分类 / 长度):');
  truncated.forEach((r) => console.log(`  ${r.id.padEnd(6)} ${String(r.cat).padEnd(20)} ${String(r.len).padStart(3)}字`));
  if (authored.length) {
    console.log('\n独立撰写(不动):');
    authored.forEach((r) => console.log(`  ${r.id.padEnd(6)} ${String(r.cat).padEnd(20)} ${String(r.len).padStart(3)}字`));
  }
}
