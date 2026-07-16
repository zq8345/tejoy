#!/usr/bin/env node
/**
 * 图片普查 + 【可复现的分层随机抽样】
 *
 * ⚠️ 这个脚本存在的理由 = 我在这件事上连错两次:
 *   错1「静默跳过」: 检查写成 `if(!src) return;` -> images[] 有两种形态
 *        ({src:本地路径} / {key:R2 CDN}), 177 张 CDN 图被**静默跳过**,
 *        算出 377+7 ≠ 561, 数字对不上账。**一个会静默跳过的检查, 比没有检查更危险**
 *        —— 它给你一个看起来完整的数字。
 *   错2「修一个漏, 顺手带进一个新错」: 补 177 张 CDN 的同一笔改动里, 忘了剥 `?v=` 查询串
 *        -> `fs.existsSync('.'+'/x.png?v=123')` 恒 false -> 把 656 的 2 张好图判成坏图。
 *        (实测: 剥掉后本地存在; 线上带不带 ?v= 都 HTTP 200)
 *        **改了要重验, 不是"改了就更准了"。**
 *
 * 抽样为什么必须可复现: 总调度要拿这个数去跟 Joe 要设计预算。
 *   用 Math.random 抽 -> 他没法复核我抽的是不是"挑好看的"。
 *   -> 用**内容哈希**排序取前 N: 确定性、可复现、且与"图好不好"无关(不可能被我挑)。
 *
 * 用法:
 *   node scripts/image-census.mjs              普查
 *   node scripts/image-census.mjs --sample     出分层抽样工作单 (image-sample.json)
 */
import fs from 'fs';

const R2_BASE = 'https://img.tejoy.com/';
const stripQuery = (s) => String(s).split('?')[0];          // ⚠️ 错2 的修复点

/** 收集全部图片, 零静默跳过 —— 每一张都必须落进某一类 */
export function collect() {
  const out = [];
  for (const f of fs.readdirSync('data/products').filter((x) => x.endsWith('.json')).sort()) {
    const p = JSON.parse(fs.readFileSync('data/products/' + f, 'utf8'));
    const id = f.replace('.json', '');

    (p.images || []).forEach((im, i) => {
      if (im.key !== undefined) {
        out.push({ id, cat: p.category, kind: 'gallery', pos: i, stratum: i === 0 ? 'hero' : 'rest', where: 'cdn', url: R2_BASE + im.key, alt: im.alt });
      } else if (im.src) {
        const local = stripQuery(im.src);
        out.push({ id, cat: p.category, kind: 'gallery', pos: i, stratum: i === 0 ? 'hero' : 'rest', where: 'local', path: '.' + local, url: 'https://tejoy.com' + local, alt: im.alt });
      } else {
        out.push({ id, cat: p.category, kind: 'gallery', pos: i, stratum: 'rest', where: 'NO_SRC', alt: im.alt });   // 绝不静默跳过
      }
    });

    let i = 0;
    for (const m of String(p.i18n.en.description_html || '').matchAll(/<img[^>]*src="([^"]*)"/g)) {
      const raw = m[1];
      if (/^https?:/.test(raw)) out.push({ id, cat: p.category, kind: 'inline', pos: i++, stratum: 'inline', where: 'external', url: raw });
      else {
        const local = stripQuery(raw);
        out.push({ id, cat: p.category, kind: 'inline', pos: i++, stratum: 'inline', where: 'local', path: '.' + local, url: 'https://tejoy.com' + local, raw });
      }
    }
  }
  return out;
}

export function classify(all) {
  for (const im of all) {
    if (im.where === 'cdn') { im.viewable = true; continue; }       // 实测 HTTP 200
    if (im.where === 'NO_SRC' || im.where === 'external') { im.viewable = false; continue; }
    im.viewable = fs.existsSync(im.path);
  }
  return all;
}

/** 确定性哈希 —— 用来做可复现的伪随机排序 */
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

const all = classify(collect());
const viewable = all.filter((x) => x.viewable);
const broken = all.filter((x) => !x.viewable);

if (!process.argv.includes('--sample')) {
  const by = (k) => all.filter((x) => x.stratum === k).length;
  console.log(`总图片 ${all.length}  (图库 ${all.filter((x) => x.kind === 'gallery').length} + 内联 ${all.filter((x) => x.kind === 'inline').length})`);
  console.log(`  ✅ 可看 ${viewable.length}   ❌ 不可看 ${broken.length}`);
  console.log('');
  console.log('分层(用于抽样):');
  console.log(`  hero   首图(gallery pos=0) : ${by('hero')}`);
  console.log(`  rest   后位图(gallery pos>0): ${by('rest')}`);
  console.log(`  inline 正文内联            : ${by('inline')}`);
  console.log('');
  console.log(`不可看的 ${broken.length} 张:`);
  for (const b of broken) console.log(`  ${b.id.padEnd(5)} ${b.kind.padEnd(8)} ${b.where.padEnd(9)} ${String(b.path || b.url || '').slice(0, 62)}`);
} else {
  const N = { hero: 20, rest: 20, inline: 10 };
  const sample = [];
  for (const [s, n] of Object.entries(N)) {
    const pool = viewable.filter((x) => x.stratum === s)
      .sort((a, b) => hash(a.url) - hash(b.url));      // 确定性伪随机, 与"图好不好"无关
    sample.push(...pool.slice(0, n).map((x) => ({ ...x, verdict: null })));
    console.log(`  ${s.padEnd(6)} 池 ${String(pool.length).padStart(3)} → 抽 ${Math.min(n, pool.length)}`);
  }
  fs.writeFileSync('image-sample.json', JSON.stringify({
    note: '确定性抽样(内容哈希排序取前N), 可复现: 重跑本脚本得到同一批。verdict 待逐张真看后填。',
    strata: N, total: sample.length, sample,
  }, null, 2) + '\n');
  console.log(`\n已写 image-sample.json —— ${sample.length} 张待逐张真看`);
}
