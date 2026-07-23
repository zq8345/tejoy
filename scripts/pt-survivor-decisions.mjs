#!/usr/bin/env node
/**
 * pt 16 组 survivor 裁决 —— 多语言窗签字
 *
 * ⭐ 为什么用「判别子串」而不是手抄整条字符串:
 *   这些值有 200+ 字符。手抄 = 引入转录错误的机会,而且错了没人看得出来。
 *   这里只声明「选含有 X 的那个变体」,由脚本从**真实数据**里取出整条 —— 值永远来自仓库,不来自我的手。
 *
 * ⚠️ 第 7 组是例外:**两个变体都有缺陷,我给了一条列表里没有的值**。原因见该组。
 *
 * 用法:
 *   node scripts/pt-survivor-decisions.mjs          打印每组选中的 survivor(供人核)
 *   node scripts/pt-survivor-decisions.mjs --apply  把所有非 survivor 的 pt 值改成 survivor
 */
import fs from 'fs';

/* 每组:用 en 前缀定位,pick = 选中变体的判别子串(必须唯一命中一个变体),why = 依据 */
const D = [
  { en: 'Wanew is a leading manufacturer', pick: 'Não é afiliada à SpaceX',
    why: '【查,不是判】chrome footer.copyright 我签过的合规原话就是「Não é afiliada à SpaceX nem à Starlink」。合规文案全站必须逐字一致。多数(×17)在这里无关。' },

  { en: 'How to Set Up Starlink Mini for RV Camping', pick: 'para camping em motorhome',
    why: 'en 是 for RV Camping。此变体保住了 camping;「acampar de motorhome」搭配不通,「no motorhome」把 camping 丢了。' },

  { en: 'Global shipping and logistics guide', pick: 'Opções de frete expresso, aéreo e marítimo',
    why: 'en「Express, air, sea freight」—— frete 统辖三者。另一变体「Opções de expresso, frete aéreo e marítimo」把 frete 只挂在 aéreo 上。' },

  { en: 'Complete quality control standards', pick: 'para os acessórios Starlink da Wanew',
    why: 'en 是 standards FOR Wanew accessories → para,不是 dos(所属)。' },

  { en: 'Custom Starlink Accessory Manufacturing', pick: 'sob medida: do protótipo à produção',
    why: '葡语正字法:标题用 sentence case,Title Case 是英语借来的写法。另一变体「Do Protótipo à Produção」是英式大写。' },

  { en: 'OEM/ODM manufacturing guide', pick: 'de uma fabricante com 15 anos',
    why: '【查,不是判】与全站 ×17 的「A Wanew é uma fabricante líder」性数一致(阴性)。另一变体用了阳性 um fabricante。' },

  { en: 'Bulk Ordering Guide: MOQ, Lead Time', pick: null,
    override: 'Guia de pedidos em grande volume: MOQ, prazo de entrega e preços para suportes Starlink',
    why: '🔴【两个变体都有缺陷,我给第三个值】Lead Time = 下单到交付的总时间 = prazo de entrega。' +
         'sentence-case 那个变体把它写成 prazo de produção(仅生产周期,不含发运)—— **这是对 B2B 买家的商业承诺错误,他们按 lead time 排产排货**。' +
         '而术语对的那个变体是 Title Case(英式大写)。→ 取「正确术语 + sentence case」,即本条。' },

  { en: 'Complete bulk ordering guide', pick: 'prazos de entrega, faixas de preço',
    why: '同上的 lead time 规则;这一组里恰好有一个变体是对的(prazos de entrega),另一个写成 prazos de produção。' },

  { en: 'News', pick: 'Notícias',
    why: 'Notícias 是 News 的直接对应词。Novidades 在葡语电商语境里指「新品上架」,而这个侧栏挂的是指南类文章,不是新品。' },

  { en: 'Safety Compliance Standards for Starlink Marine', pick: 'e diretrizes de segurança',
    why: '另一变体三宗罪:①Title Case ②**把 en 的「& Safety Guidelines」整段丢了** ③值里混进了转义残渣「\\|」(反斜杠竖线)。本条 sentence case、完整、干净。' },

  { en: 'Starlink Junction Box Installation', pick: 'em ambientes externos',
    why: 'en「Outdoor Cable Management」是技术语域;ao ar livre 偏「户外休闲」。建筑布线用 ambientes externos。' },

  { en: 'Installation guide for Wanew Outdoor Junction Box', pick: 'Invólucro à prova de intempéries',
    why: 'en「IP66 weatherproof enclosure」→ enclosure = invólucro(IP 等级外壳的固定说法);compartimento = 隔间。且与上一组的 ambientes externos 保持一致。' },

  { en: 'Guide to installing Starlink without drilling', pick: 'suportes para peitoril de janela',
    why: 'en「window sill mounts」—— 本条完整译出 de janela;另一变体只说 peitoril(窗台/门槛都可能)。' },

  { en: 'Comprehensive comparison of Starlink wall mount', pick: 'em uso residencial',
    why: 'en「for home use」→ uso residencial(用途),另一变体 em residências 说的是「在住宅里」。且本条用 certa 对应 en 的 right,另一变体用 ideal(拔高了)。' },

  { en: 'Buyer guide for Starlink power adapters', pick: 'instalações em veículos',
    why: '⚠️【这条是判断,不是查】受众是房车/车主,em veículos 是平实口语;veiculares 偏公文腔。两者都不算错,我取平实。' },

  { en: 'Complete step-by-step guide to setting up Starlink Mini', pick: 'no camping em motorhome',
    why: 'en「for RV camping」—— 本条保住 camping;另一变体写成 em viagens de motorhome(房车旅行),把 camping 换成了 viagens。' },
];

/* ── 从真实数据取值,不从我手里取 ── */
const files = [];
for (const f of fs.readdirSync('data/pages').filter((f) => f.endsWith('.json') && f !== 'home-tiles.json')) files.push(`data/pages/${f}`);

const groups = new Map();
for (const file of files) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [k, v] of Object.entries(j)) {
    if (k.startsWith('_') || !v || typeof v !== 'object' || v.en === undefined || v['reason.dupe']) continue;
    const s = String(v.en);
    if (!groups.has(s)) groups.set(s, []);
    groups.get(s).push({ file, key: k, pt: String(v['pt-BR']) });
  }
}
const dupGroups = [...groups.entries()].filter(([, a]) => a.length > 1);

const APPLY = process.argv.includes('--apply');
let resolved = 0;
const problems = [];
const plan = [];

for (const d of D) {
  const hit = dupGroups.filter(([en]) => en.startsWith(d.en));
  if (hit.length !== 1) { problems.push(`「${d.en}」匹配到 ${hit.length} 组,应为 1`); continue; }
  const [en, arr] = hit[0];
  const variants = [...new Set(arr.map((x) => x.pt))];

  let survivor;
  if (d.override) {
    survivor = d.override;
  } else {
    const matched = variants.filter((v) => v.includes(d.pick));
    if (matched.length !== 1) { problems.push(`「${d.en}」判别子串命中 ${matched.length} 个变体,应为 1`); continue; }
    survivor = matched[0];
  }
  resolved++;
  plan.push({ en, arr, variants, survivor, why: d.why, isOverride: !!d.override });
}

console.log(`\n【pt 16 组 survivor 裁决】解析 ${resolved}/${D.length} 组,重复组总数 ${dupGroups.length}`);
if (problems.length) { console.log('\n❌ 判别失败:'); problems.forEach((p) => console.log('   ' + p)); process.exit(1); }
if (resolved !== dupGroups.length) { console.log(`\n❌ 只裁了 ${resolved} 组,但仓库里有 ${dupGroups.length} 组重复 —— 有组没被裁到。`); process.exit(1); }

for (const p of plan) {
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`en: ${p.en.slice(0, 66)}`);
  console.log(`${p.isOverride ? '🔴 我给了列表外的值' : '✅ survivor'}: ${p.survivor.slice(0, 100)}`);
  if (p.variants.length > 1 || p.isOverride) {
    p.variants.filter((v) => v !== p.survivor).forEach((v) => console.log(`   ✗ 淘汰: ${v.slice(0, 96)}`));
  }
  console.log(`   依据: ${p.why}`);
}

if (!APPLY) { console.log(`\n\n(只读。加 --apply 才写盘。)`); process.exit(0); }

let changed = 0;
for (const p of plan) {
  for (const item of p.arr) {
    if (item.pt === p.survivor) continue;
    const j = JSON.parse(fs.readFileSync(item.file, 'utf8'));
    j[item.key]['pt-BR'] = p.survivor;
    fs.writeFileSync(item.file, JSON.stringify(j, null, 2) + '\n');
    changed++;
  }
}
console.log(`\n✅ 已写盘:${changed} 处 pt 值收敛到 survivor。`);
console.log(`⚠️ 写盘用 JSON.stringify 会重排文件格式 —— 请 dev 决定是否接受,或改用文本插入。`);
