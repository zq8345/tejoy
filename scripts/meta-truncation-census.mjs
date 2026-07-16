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

/* 实体解码: 命名 + 数字(十进制/十六进制)。
   ⚠️ v1 只解码了 4 个命名实体, 漏了数字实体 -> 700 的正文里是 `&#12304;`(【) 而 meta 里是已解码的 `【`
      -> 对不上 -> 误判为「独立撰写」。 */
const decode = (s) => String(s || '')
  .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&amp;/g, '&');                                   // &amp; 必须最后, 否则 &amp;#39; 会被二次解码

const stripTags = (h) => decode(String(h || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

/* ⭐ 归一化到「纯字母数字流」—— 这是 v1 → v2 的关键修复。
   v1 用 `body.startsWith(meta前60字)`, 被**它自己要检测的那两个 bug 绊倒**:
     4207: meta 里是 `RV &amp; Starlink`(实体未解码), 正文是 `RV & Starlink`     -> bug2 绊的
     651 : meta 是 `Data TransferExperience`(剥标签黏连), 正文是 `Data Transfer | Experience` -> bug1 绊的
     677 : 正文以 `[Perfect craftsmanship]: ` 开头, meta 生成器把这个前缀丢了 -> startsWith 失效
     700 : 数字实体, 见上
   剥掉全部非字母数字 -> 黏连/分隔符/实体/标点差异**一次全消**;
   再用「meta 前 60 字出现在正文前 200 字内」(而非 startsWith) -> 容忍被丢弃的前缀。

   ⭐ 结果 = **61 派生 / 3 真人文案**, 与总调度和 dev 的 56/8 **不一致**。逐条真看后确认 v2 对:
      他们判为「真人文案」的 8 条里, 有 5 条(4199/4202/4206/675/678)的线上 meta **此刻就带着
      bug1 黏连** —— `Solutio(nTh)is` / `Gen 3(Th)is` / `Connecto(rSt)arlink` / `Overvie(wDe)signed`
      (678 有三处)。**正是那个黏连让朴素字符串匹配失败, 于是被误判成「真人写的」。**
      -> 他俩数字一致不是互相印证, 是**共享同一个盲区**(总调度自己的原话:
         「数字一模一样反而可能是互相抄的」)。
      -> **数据的缺陷, 骗过了检测那个缺陷的检测器。** 我 v1 也栽在同一处(52/12), 只是错向不同。
      真人文案只有 3 条: 4201 / 703 / 704 (meta 与正文开头完全不同, 确为独立撰写)。*/
const norm = (s) => stripTags(s).toLowerCase().replace(/[^a-z0-9]/g, '');

const files = fs.readdirSync('data/products').filter((f) => f.endsWith('.json')).sort();
const truncated = [], authored = [], empty = [];

for (const f of files) {
  const p = JSON.parse(fs.readFileSync('data/products/' + f, 'utf8'));
  const id = f.replace('.json', '');
  const md = (p.i18n.en.meta_description || '').trim();
  if (!md) { empty.push({ id }); continue; }
  const nMd = norm(md), nBody = norm(p.i18n.en.description_html);
  const probe = nMd.slice(0, 60);
  const at = nBody.slice(0, 200).indexOf(probe);
  const rec = { id, cat: p.category, len: md.length, at, title: p.i18n.en.title };
  if (probe && at >= 0) truncated.push(rec); else authored.push(rec);
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
