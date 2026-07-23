#!/usr/bin/env node
/**
 * es 14 组重复串 survivor 裁决 —— 多语言窗签字
 *
 * ⚠️ 总工只报了 1 组(Bulk Ordering)。**实测 es 侧有 14 组分歧**,dev 会一路撞上去。
 *   其中第 1 组(公司简介 ×18)有 **17 种写法** —— 几乎每页各译一份。
 *
 * ⭐ 与 pt 那轮同一个设计:只声明「取含判别子串的那个变体」,**整条值从仓库取,不经我的手转录**。
 *   判别子串命中 0 个或 2 个 → 报错退出;14 条决策必须恰好覆盖 14 组。
 *
 * ⚠️ 三组【两个变体都不对】,我给了列表外的值(override),每条写明理由。
 */
import fs from 'fs';

const D = [
  { en: 'Wanew is a leading manufacturer', pick: 'adaptadores de energía, cables y estuches protectores. Más de 15',
    why: '【查,不是判】18 处竟有 17 种写法。逐轴按已签/最高频定:①power adapter→`energía`(全站 22 次最高,且与我签的 chrome header.power=`Energía` 一致) ②protective cases→`estuches protectores`(形容词,直接对应 en) ③15+ years→`Más de 15 años`(自然西语)。三轴同时满足的只有这一条。' },

  { en: 'How to Set Up Starlink Mini for RV Camping', pick: 'para acampar',
    why: 'en「for RV Camping」。`acampar`(动词)是自然西语;`camping` 是英语借词。⚠️ 不拿 pt 推 es —— pt 我选了保留 camping,那是葡语的理由。' },

  { en: 'Global shipping and logistics guide', pick: 'Opciones de flete exprés',
    why: 'en「Express, air, sea freight」—— freight 统辖三者,`flete exprés, aéreo y marítimo` 保住这个结构;另一变体把 exprés 拆给 mensajería,只有 aéreo/marítimo 归 flete。' },

  { en: 'Complete quality control standards', pick: 'para los accesorios Starlink de Wanew',
    why: '两轴都占:①en 是 standards FOR accessories → `para`,不是 `de` ②另一变体留了英文缩写 `QC` 未译,本条展开成 `control de calidad`。' },

  { en: 'Custom Starlink Accessory Manufacturing', pick: 'personalizados',
    why: 'OEM/ODM 语境下墨西哥商务标准说法是 productos personalizados;`a la medida` 偏定制裁缝义。⚠️ pt 我选了 sob medida,不拿它推 es。' },

  { en: 'Bulk Ordering Guide: MOQ, Lead Time', pick: null,
    override: 'Guía de pedidos al mayoreo: MOQ, tiempo de entrega y precios para soportes Starlink',
    why: '🔴【两变体各对一半,给第三值】①bulk→`al mayoreo`(见下方术语决定) ②en「Pricing FOR Starlink Mounts」中 for 统辖 MOQ/交期/价格三项 → `precios para soportes`;另一变体的 `precios de soportes` 只把 soportes 挂给 precios。' +
         ' ✅ 两个变体的 lead time 都译对了(`tiempo de entrega`=交付总时间),没重蹈 pt 那轮 prazo de produção 的覆辙。' },

  { en: 'Complete bulk ordering guide', pick: 'al mayoreo',
    why: 'bulk→`al mayoreo`,与上一组同一个术语决定。' },

  { en: 'News', pick: 'Noticias',
    why: '`Noticias` 是 News 的直接对应词。`Novedades` 在西语电商里指「新品上架」,而这个侧栏挂的是指南类文章。与 pt 同一条推理,但依据是 es 自身语义,不是从 pt 搬。' },

  { en: 'Starlink Junction Box Installation', pick: 'el manejo de',
    why: 'en「Cable Management」→ `manejo de cables`(管理);另一变体 `organizar`(整理)弱化了。' },

  { en: 'Installation guide for Wanew Outdoor Junction Box', pick: 'Caja IP66',
    why: '产品本身叫 caja de conexiones(junction box),外壳沿用 `Caja` 与产品名一致;`Gabinete` 在墨西哥多指机柜,尺寸感不符。' },

  { en: 'Guide to installing Starlink without drilling', pick: 'bases con contrapeso',
    why: 'en「weighted bases」= 靠配重稳定 → `contrapeso` 是标准说法;`bases con peso` 只说"有重量"。' },

  { en: 'Comprehensive comparison of Starlink wall mount', pick: null,
    override: null,
    overrideFrom: { has: 'para Starlink en casa', replace: ['en casa', 'para uso doméstico'] },
    why: '🔴【合规问题,两变体都不能直接用】另一变体写 `el soporte de pared y el soporte de techo **de Starlink**` —— 所有格 `de Starlink` 读作「Starlink 的支架」,' +
         '**而我们整个 brand-affiliation 页在声明不隶属 SpaceX/Starlink**,产品是第三方兼容件。所以必须用 `para Starlink`(本变体)。' +
         '但本变体的 `en casa` 弱于 en 的「for home use」→ 取本变体并把 `en casa` 换成 `para uso doméstico`。' },

  { en: 'Buyer guide for Starlink power adapters', pick: 'adaptadores de energía',
    why: '【查,不是判】与第 1 组同一个锚:全站 `energía` 22 次最高 + 我签的 chrome `header.power`=`Energía`。' },

  { en: 'Complete step-by-step guide to setting up Starlink Mini', pick: null,
    overrideFrom: { has: 'para camping en casa rodante', replace: ['para camping', 'para acampar'] },
    why: '🔴【为与第 2 组一致,给第三值】en 是「for RV camping」→ 本变体的 `camping` 对(另一变体写成 `viajes`=旅行,丢了 camping);' +
         '但第 2 组已定 `acampar`,**同一个词全站必须一种写法** → 取本变体并把 `camping` 换成 `acampar`。' },
];

/* ── 值从真实数据取 ── */
const files = fs.readdirSync('data/pages').filter((f) => f.endsWith('.json') && f !== 'home-tiles.json').map((f) => `data/pages/${f}`);
const groups = new Map();
for (const file of files) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [k, v] of Object.entries(j)) {
    if (k.startsWith('_') || !v || typeof v !== 'object' || v.en === undefined || v['reason.dupe']) continue;
    const s = String(v.en);
    if (!groups.has(s)) groups.set(s, []);
    groups.get(s).push({ file, key: k, es: String(v['es-MX']) });
  }
}
const esSplit = [...groups.entries()].filter(([, a]) => new Set(a.map((x) => x.es)).size > 1);

const APPLY = process.argv.includes('--apply');
const problems = [], plan = [];

for (const d of D) {
  const hit = esSplit.filter(([en]) => en.startsWith(d.en));
  if (hit.length !== 1) { problems.push(`「${d.en}」匹配到 ${hit.length} 组,应为 1`); continue; }
  const [en, arr] = hit[0];
  const variants = [...new Set(arr.map((x) => x.es))];
  let survivor;
  if (d.override) survivor = d.override;
  else if (d.overrideFrom) {
    const base = variants.filter((v) => v.includes(d.overrideFrom.has));
    if (base.length !== 1) { problems.push(`「${d.en}」override 基底命中 ${base.length} 个变体`); continue; }
    const [from, to] = d.overrideFrom.replace;
    if (!base[0].includes(from)) { problems.push(`「${d.en}」基底里找不到要替换的 ${from}`); continue; }
    survivor = base[0].replace(from, to);
  } else {
    const m = variants.filter((v) => v.includes(d.pick));
    if (m.length !== 1) { problems.push(`「${d.en}」判别子串命中 ${m.length} 个变体,应为 1`); continue; }
    survivor = m[0];
  }
  plan.push({ en, arr, variants, survivor, why: d.why, isOverride: !!(d.override || d.overrideFrom) });
}

console.log(`\n【es survivor 裁决】解析 ${plan.length}/${D.length} 组,仓库里 es 分歧组 ${esSplit.length} 个`);
if (problems.length) { console.log('\n❌ 判别失败:'); problems.forEach((p) => console.log('   ' + p)); process.exit(1); }
if (plan.length !== esSplit.length) { console.log(`\n❌ 裁了 ${plan.length} 组,但有 ${esSplit.length} 组分歧 —— 有组没被裁到。`); process.exit(1); }

for (const p of plan) {
  console.log(`\n${'─'.repeat(66)}\nen: ${p.en.slice(0, 62)}   (${p.variants.length} 种)`);
  console.log(`${p.isOverride ? '🔴 列表外的值' : '✅ survivor'}: ${p.survivor.slice(0, 104)}`);
  console.log(`   依据: ${p.why.slice(0, 200)}`);
}

if (!APPLY) { console.log(`\n\n(只读。加 --apply 才写盘。)`); process.exit(0); }

let changed = 0;
const touched = new Map();
for (const p of plan) {
  for (const item of p.arr) {
    if (item.es === p.survivor) continue;
    if (!touched.has(item.file)) touched.set(item.file, JSON.parse(fs.readFileSync(item.file, 'utf8')));
    const j = touched.get(item.file);
    const before = { en: j[item.key].en, pt: j[item.key]['pt-BR'] };
    j[item.key]['es-MX'] = p.survivor;
    if (j[item.key].en !== before.en || j[item.key]['pt-BR'] !== before.pt) { console.log('❌ en/pt 被动'); process.exit(1); }
    changed++;
  }
}
for (const [file, j] of touched) fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
console.log(`\n✅ 已写盘:${changed} 处 es 值收敛,${touched.size} 个文件。en/pt-BR 未动。`);
