#!/usr/bin/env node
/**
 * es 标记词表【反向自检】—— 总调度的要求，比"列 40 个同形词"强得多
 *
 * ⭐ 为什么需要它（总调度的原话）：
 *   「你的 EN_MARKERS 是「英文标记词」清单 —— 这个设计本身对 es 就是危险的，
 *    因为英语和西语的同源词是**成体系的**（-al/-ble/-ción/-ar 家族），不是零星几个。
 *    你列了 40+，但**你没法穷举它**。」
 *   「别拿"我列了 40 个"当完成 —— 拿"**喂干净西语进去它闭嘴**"当完成。」
 *
 * ⭐ 这跟我自己那条规矩是一对：
 *   「匹配不上的要吼出来」  ← 防漏报（检查只报告它找到的）
 *   「匹配上的也得能被证伪」← 防误报（本文件）
 *
 * 用法：
 *   node scripts/es-marker-selftest.mjs            用 pt 的 EN_MARKERS 跑（演示它会炸成什么样）
 *   node scripts/es-marker-selftest.mjs --markers <文件>   用候选 es 标记词表跑
 *
 * 判定：**任何一条命中 = 假阳性 = 清单还没清干净。合格 = 0。**
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/* ── 语料：【墨西哥西语】——分两块，出处必须写清 ─────────────────────────
 *
 * 🔴 总调度点破的（我该自己想到）：**我原来 31 条语料是我自己写的 = 自己出题自己打分**，
 *    正是我一路在抓的那个形状。
 *
 * 🔴 而他建议的「亚马逊墨西哥」**必须否掉，证据是硬的**：
 *    亚马逊 MX 上卖同类货的 **STARGEAR**，它的文案在**我们自己的 702 号正文里出现 4 次**；
 *    我们的 666/668 正是它卖的那种 SPX→RJ45 Gen 2 转接头。
 *    → **亚马逊 MX 不是独立来源，它就是我们数据的来源本身。**
 *    → 而且那些 listing 是中国卖家的机翻（`plato rectangular` = dish 字面直译、`Acessories` 拼错）。
 *    → **拿它当"干净的墨西哥西语"= 用同一个污染源验证它自己 = 我量了自己的倒影，只是绕了一圈。**
 *
 * ✅ 【块 A】外部真语料 —— 真的墨西哥人写给墨西哥人的（2026-07-16 实测抓取）
 *    来源 1：**coppel.com**（墨西哥本土零售商，~1600 家门店）
 *    来源 2：**gob.mx**（墨西哥政府）
 *    ⚠️ Starlink 官方站抓不到 —— 全站 SPA（curl 剥标签后只有 863 字符 "JavaScript must be enabled"）
 *
 *    ⭐ 这两个源同时坐实了三条**事实**（不是我的判断）：
 *      tú vs usted : coppel `tu/tus` 5 次、`su/sus` **0 次**；gob.mx `tu Beca`/`tu búsqueda`、`su` **0 次**
 *                    → **连政府站（最正式语域）都用 tú。`tú` 是可查的事实。**
 *      数字格式    : coppel 小数点 `6.85` **40 次**、小数逗号 **0 次**；逗号千分位 `1,400` 28 次
 *                    → **`25.6"` / `1,200 Mbps` 坐实**
 *      chrome 用词 : `MENÚ` `Iniciar sesión` `Crear cuenta` `Carrito` `Pedidos y devoluciones` `Precio de contado`
 *
 * ⚠️ 【块 B】本产品域的句子 —— **我写的，没有外部来源**
 *    Starlink 配件这个品类，**我拿不到可信的墨西哥语料**（官方站 SPA、亚马逊是污染源）。
 *    → **块 B 如实标为"我写的"，不假装它是证据。** 它仍有用（覆盖 cable/red/router 等核心词），
 *      但**它证明的是"我的西语里没有英文标记词"，不是"墨西哥人的西语里没有"**。
 *    → 若日后拿到真商品语料，**块 B 应被替换而不是补充**。
 *
 * 墨西哥特征（与泛拉美默认的差异，全部体现在下面）：
 *   人称   tú（不是 usted）→ 动词是 `conecta`/`alimenta`/`usa`，不是 `conecte`/`alimente`/`use`
 *   车     carro（不是 auto）· 皮卡 camioneta · 卡车 camión
 *   小船   lancha（墨西哥最常用）
 *   电脑   computadora（不是 ordenador）· 手机 celular（不是 móvil）· 开车 manejar（不是 conducir）
 *   笔电   laptop  ·  收纳 estuche
 *   数字   25.6"（小数点，同美国）· 1,200 Mbps（逗号千分位）—— **不是** 25,6"
 * ⚠️ 这些句子全部是合法墨西哥西语，一条泄漏都没有。scanner 报出任何一条都是它的错。 */
/* ═══ 语料 = 100% 外部真语料。**一条自编的都没有。** ═══
 *
 * 🔴 审计窗的结构性批评，我反驳不了，所以把自编那块整个删了：
 *   「**在自编语料上做反向自检，只能证明"这份词表不会误伤【同一个作者写得出的句子】"。**
 *     **作者的西语盲区 = 语料的盲区 → 测试通过、真站照样翻车。**
 *     **该工具在结构上无法发现作者不知道的东西。**」
 *   → 对。我原来那 31 条是我写的，**它只能证明我的西语里没有英文标记词，
 *      不能证明墨西哥人的西语里没有。** 已全部删除，不是"标注一下继续用"。
 *
 * ⭐ 审计自己也栽了同一个坑，值得记：它用自制正则词表数 tú/usted，
 *   **结果报 tu_count:0 —— 全错**，因为词表漏了 `Disfruta/Olvídate/Regístrate/necesitas`(tú)
 *   和 `Pruebe/Obtenga/Reciba/Visite`(usted)。**只有逐字读原文才抓到真相。**
 *   → 它把我的教训推广成了规则：**「任何『我列了 N 个 X』的自检工具，都不能用作通过依据；
 *      必须用真实语料全文比对。」** —— **这条也管我这个工具本身。**
 */

/* 【源 A】Starlink 官方墨西哥站 —— 同产品领域 · 母语 · 真人写
 * 采集：Tejoy-审计窗 2026-07-14，**浏览器真机渲染**（该站纯 JS，我 curl 只拿到 863 字符空壳）
 * 页面：/mx/residential · /mx/roam · /mx/specifications/4   （站点声明 lang=`es-419`）*/
const STARLINK_MX = [
  // tú 形式
  'Disfruta de streaming en 4K sin interrupciones',
  'Olvídate del internet de velocidad baja',
  'Lleva tu internet contigo mientras viajas',
  'Acampa en las zonas más remotas del mundo',
  'Conéctate en aguas territoriales y aguas continentales',
  'lo que te permite personalizar tu servicio según tus necesidades',
  'viaja a cualquier lugar dentro de tu país de origen',
  'El kit Starlink llega con todo lo que necesitas para conectarte en minutos',
  'Al hacer clic en Regístrate, aceptas nuestra Política de privacidad.',
  // usted 形式（⚠️ 同页并存 —— Starlink 自己不一致，见规范 §二之〇之一）
  'Obtenga datos ilimitados de baja velocidad después de usar todos sus datos itinerantes.',
  'Trabaje y diviértase en destinos remotos',
  'Navegue, transmita y manténgase en línea fácilmente',
  'Manténgase conectado con internet de alta velocidad en su bote',
  'Pruebe Starlink durante 30 días y obtenga un reembolso completo si su experiencia no es satisfactoria.',
  'Reciba novedades de Starlink por correo electrónico',
  'Starlink es una división de SpaceX. Visite spacex.com',
  // 硬件 / 规格（⭐ 这几条同时是 router / kit / CC / 数字格式的证据）
  'un router wifi integrado', 'un router integrado', 'Incluye Router 3',
  'un kit compacto y portátil', 'El kit Starlink', 'Contenido del kit',
  'entrada de alimentación de CC', 'Guía de accesorios', 'Especificaciones del producto',
  'Starlink Cable 15 m (49.2 ft)', 'AC Cable 1.5 m (4.92 ft)', 'Power Supply 1.5 m (4.92 ft)',
  'Hasta 200 Mb/s', 'velocidades de hasta 400+ Mbps',
  // 场景词（⭐ vehículo / bote / carretera —— 而 carro/auto/coche 全站 0 次）
  'siempre tenía miedo de quedarme varado si mi vehículo se rompía',
  'Esencial para viajar en autocaravanas',
  'recorridos por carretera', 'viaje por carretera',
  'explore Starlink Marítimo',
];

/* 【源 B】coppel.com（墨西哥本土零售，~1600 门店）+ gob.mx（墨西哥政府）
 * 采集：多语言窗 2026-07-16，curl 静态 HTML（两站均非 SPA）*/
const COPPEL_GOB = [
  // coppel.com chrome —— 墨西哥团队写给墨西哥人（不是卖家机翻）
  'MENÚ', 'Iniciar sesión', 'Crear cuenta', 'Carrito', 'Pedidos y devoluciones',
  'Precio de contado', 'Productos Sustentables',
  // coppel.com —— tú（整站 su/sus 出现 0 次）
  'tu vida', 'tu ciudad', 'tus finanzas', 'tu crédito',
  // gob.mx —— **连政府站（最正式语域）也用 tú**
  'tu búsqueda', 'Tu acceso', 'tu Beca',
];

const CLEAN_ES = [...STARLINK_MX, ...COPPEL_GOB];

/* ── 取标记词表 ──────────────────────────────────────────────────────── */
const arg = process.argv.indexOf('--markers');
let markers, source;
if (arg > 0) {
  const raw = fs.readFileSync(process.argv[arg + 1], 'utf8');
  markers = new Set([...raw.matchAll(/'([a-zà-ÿñ-]+)'/gi)].map((m) => m[1].toLowerCase()));
  source = process.argv[arg + 1];
} else {
  const raw = fs.readFileSync(path.join(HERE, 'pt-leak-scan.mjs'), 'utf8');
  const m = raw.match(/const EN_MARKERS = new Set\(\[([\s\S]*?)\]\);/);
  markers = new Set([...m[1].matchAll(/'([a-z-]+)'/g)].map((x) => x[1]));
  source = 'pt-leak-scan.mjs 的 EN_MARKERS（演示：它对 es 会炸成什么样）';
}

/* ⚠️ 词边界必须含重音字母 **和 ñ** —— 否则 año / diseño / pequeño 被切断，
   señal 切成 "se"+"al"（"al" 恰好是英语词！）→ 假阳性从天而降。
   这正是 pt 那个 "transferência → transfer" bug 的西语版，只是更严重。 */
const WORD_RE = /[a-zà-ÿñ][a-zà-ÿñ'-]*/gi;

let hits = 0;
const byWord = {};
console.log(`\n【es 标记词表 反向自检】`);
console.log(`标记词来源：${source}（${markers.size} 个词）`);
console.log(`语料：${CLEAN_ES.length} 条【已知干净的西语】—— 一条泄漏都没有\n`);

for (const line of CLEAN_ES) {
  const words = line.toLowerCase().match(WORD_RE) || [];
  const bad = words.filter((w) => markers.has(w));
  if (bad.length) {
    hits += bad.length;
    bad.forEach((w) => (byWord[w] = (byWord[w] || 0) + 1));
    console.log(`  ❌ {${[...new Set(bad)].join(',')}}  ${line.slice(0, 62)}`);
  }
}

console.log('');
if (hits === 0) {
  console.log('✅ 合格：喂干净西语进去，它闭嘴了。标记词表可用。');
  process.exit(0);
}
console.log(`❌ 不合格：${hits} 处假阳性 / ${CLEAN_ES.length} 条干净西语`);
console.log(`   涉及 ${Object.keys(byWord).length} 个词（按命中次数）：`);
Object.entries(byWord).sort((a, b) => b[1] - a[1]).forEach(([w, n]) => console.log(`     ${String(n).padStart(2)}×  ${w}`));
console.log('');
console.log('⭐ 这就是「列 40 个同形词」不等于「清单干净了」的证据。');
console.log('   合格线不是"我想到了多少"，是"喂干净西语进去它报 0"。');
process.exit(1);
