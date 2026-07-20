#!/usr/bin/env node
/**
 * pt:把「我方第三方配件」从 Starlink 名下摘出来 —— 一次性修复脚本
 *
 * ⭐ 问题:`suportes de teto da Starlink Mini` 读作「Starlink Mini 的支架」,
 *   而我们整站(尤其 brand-affiliation 页)在声明:产品是**第三方兼容件,不隶属 SpaceX/Starlink**。
 *   所有格把我们自己的货挂到了对方名下。
 *
 * ⚠️ 逐条对着 en 核过意图,**不整批替换** —— 有一条必须【保留】所有格:
 *     brand-affiliation-faq.h3.1
 *       en: "Are Tejoy products official Starlink accessories?"
 *       pt: "…são acessórios oficiais da Starlink?"
 *     **这句是我们【设问并否认】的那句,所有格正是它要表达的意思。改了反而毁掉合规文案。**
 *
 * ⚠️ 检测正则里 `da` 前必须有空格 —— 否则 esca|da| / entra|da| 的词尾会被当成 `da`。
 *   总工不加词边界那次,16 处里 4 处是 `Suporte de Escada Starlink`。
 *
 * ⚠️ 本脚本只动 `pt-BR`。en 与 es-MX 逐键比对证明未变。
 */
import fs from 'fs';

const FIX = [
  { file: 'data/pages/rv-off-grid.json', key: 'rv-off-grid.blog-sidebar-text.3',
    from: 'suportes de teto da Starlink Mini', to: 'suportes de teto para Starlink Mini',
    en: 'cable management guide for Starlink Mini RV roof mounts —— 支架是我们的' },
  { file: 'data/pages/rv-off-grid.json', key: 'rv-off-grid.a.9',
    from: 'suporte de tubo da Starlink Mini', to: 'suporte de tubo para Starlink Mini',
    en: 'Starlink Mini Pipe Mount Installation Guide —— 支架是我们的' },
  { file: 'data/pages/rv-off-grid.json', key: 'rv-off-grid.a.11',
    from: 'acessórios da Starlink Mini', to: 'acessórios para Starlink Mini',
    en: 'Best Starlink Mini Accessories —— 配件是我们的(第三方)' },
  { file: 'data/pages/rv-off-grid.json', key: 'rv-off-grid.blog-sidebar-text.6',
    from: 'acessórios da Starlink Mini', to: 'acessórios para Starlink Mini',
    en: 'best Starlink Mini accessories —— 同上' },
  { file: 'data/pages/rv-off-grid.json', key: 'rv-off-grid.a.15',
    from: 'compatibilidade da Starlink', to: 'compatibilidade com Starlink',
    en: 'Starlink RV 12V Accessories and Compatibility —— 是「与 Starlink 的兼容性」,不是「Starlink 的兼容性」;这条用 com 不是 para' },
  { file: 'data/pages/rv-off-grid.json', key: 'rv-off-grid.blog-sidebar-text.8',
    from: 'acessórios 12V da Starlink', to: 'acessórios 12V para Starlink',
    en: 'our guide to Starlink RV 12V accessories —— 与我刚修的 es 那条是同一句的两个语种' },
  { file: 'data/pages/shared.json', key: 'shared.best_starlink_mini_cable_management_for_',
    from: 'gestão de cabos da Starlink Mini', to: 'gestão de cabos para Starlink Mini',
    en: 'Best Starlink Mini Cable Management for RV Roof Mounts' },
];

/* 明确【不动】的,写进代码而不是留在脑子里 */
const KEEP = [
  { key: 'brand-affiliation-faq.h3.1', why: 'en「Are Tejoy products official Starlink accessories?」—— 这是我们设问并【否认】的那句,所有格是它的本意。改了会毁掉合规文案本身。' },
];

const APPLY = process.argv.includes('--apply');
const byFile = new Map();
const done = [], errs = [];

for (const f of FIX) {
  if (!byFile.has(f.file)) byFile.set(f.file, { raw: fs.readFileSync(f.file, 'utf8'), obj: JSON.parse(fs.readFileSync(f.file, 'utf8')) });
  const { obj } = byFile.get(f.file);
  const e = obj[f.key];
  if (!e) { errs.push(`${f.key}: key 不存在`); continue; }
  const before = String(e['pt-BR']);
  if (!before.includes(f.from)) { errs.push(`${f.key}: 找不到待替换串「${f.from}」—— 数据变了,停下来看,不要猜`); continue; }
  e['pt-BR'] = before.replace(f.from, f.to);
  done.push(f);
}

/* 不变量:en 与 es-MX 一个字节都不许动 */
for (const [file, { raw, obj }] of byFile) {
  const orig = JSON.parse(raw);
  for (const k of Object.keys(orig)) {
    if (k.startsWith('_')) continue;
    for (const loc of ['en', 'es-MX']) {
      if (JSON.stringify(orig[k]?.[loc]) !== JSON.stringify(obj[k]?.[loc])) errs.push(`${file}:${k}.${loc} 被改动了`);
    }
  }
}

console.log(`\n【pt 所有格修正】${APPLY ? '已写盘' : 'dry-run（未写盘）'}`);
console.log(`  改动 ${done.length} 条 / ${byFile.size} 个文件`);
done.forEach((f) => console.log(`    ${f.key}\n       ${f.from}  →  ${f.to}\n       依据: ${f.en}`));
console.log(`\n  ⛔ 明确【不动】${KEEP.length} 条:`);
KEEP.forEach((k) => console.log(`    ${k.key}\n       ${k.why}`));

if (errs.length) { console.log(`\n❌ ${errs.length} 处,不落盘:`); errs.forEach((e) => console.log('   ' + e)); process.exit(1); }
console.log(`\n  ✅ 不变量:en 与 es-MX 逐键比对未变`);
if (!APPLY) { console.log(`\n  加 --apply 才写盘。`); process.exit(0); }
for (const [file, { obj }] of byFile) fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n');
console.log(`\n✅ 已落盘。`);
