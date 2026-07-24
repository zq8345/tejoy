#!/usr/bin/env node
/**
 * es-MX 灌入 data/chrome.json —— **一次性迁移脚本**（跑完即历史，保留是为了留痕出处）
 *
 * ⭐ 为什么是【文本插入】而不是 JSON 往返：
 *   JSON.parse→stringify 往返后与原文差 341 字符 ——「往返不等于原文」意味着我一旦这么写，
 *   diff 会变成"整个文件重写"，**review 不了，而且可能悄悄动了转义**
 *   （chrome.json 的 _doc 明确警告：值是 HTML-ESCAPED，& 必须写 &amp;）。
 *   → 只插入新行，en / pt-BR 一个字节都不碰。写完**逐键对账**验证，不是"看着像对的"。
 *
 * ⭐ 出处纪律（总工的第 4 条）：每条标出处。
 *     绿 = Starlink MX / coppel / gob.mx 真语料有据       → reason 写死证据原文
 *     黄 = 我的判断（语法确定，但没有墨西哥语料背书）      → reason 以「判断:」开头
 *     红 = 无证据且已知有争议                             → reason 以「🔴 无证据:」开头，**不放行**
 *   「Starlink MX 就这么写的」= 证据；「我认为墨西哥人这么说」= 判断。
 *
 * 🔴 两个 key 【不翻】—— 不是"还没翻"，是【这个 key 的语义在三语下不成立】，见 §切换器。
 */
import fs from 'fs';

/* ── 语料出处简写 ───────────────────────────────────────────────────────── */
const SL = '证据 Starlink MX'; // 审计窗真机渲染 /mx/residential · /mx/roam · /mx/specifications/4
const CP = '证据 coppel.com';  // 多语言窗 curl，墨西哥本土零售 ~1600 门店
const J = '判断:';             // 我的判断，无墨西哥语料背书
const FB = 'fallback: ';       // 品牌 / 型号 / 代码值 —— 保持英文，先例见 pt-BR 同值

const ES = {
  /* ── header ─────────────────────────────────────────────────────────── */
  'header.home': ['Inicio', J + '西语站首页词的事实标准。coppel 首页用 logo 不用文字，拿不到直接语料'],
  'header.products': ['Productos', SL + '「Especificaciones del producto」—— producto 坐实，复数为语法'],
  'header.mounts_brackets': ['Soportes y Bases', J + 'mount=soporte / bracket=base。配件领域无官方西语标尺（见规范）'],
  'header.power_charging': ['Energía y Carga', SL + '「entrada de alimentación de CC」—— 电力域坐实；分类名选 Energía 是判断'],
  'header.cables': ['Cables', '⚠️同形词（es=en 拼写相同）。分类名「cables」是【真西语词】，' + SL + '「Starlink Cable 15 m」那个 Cable 是【部件名】，两回事 —— 见 §同形词'],
  'header.networking': ['Redes', SL + '「un router wifi integrado」—— 网络域坐实；Redes 为分类名判断'],
  'header.cases_protection': ['Estuches y Protección', '🔴 无证据: Estuche 已在规范标红 —— 亚马逊 MX 被否（它是我们数据的来源本身），Starlink MX 配件 PDF 是英文。**该词无官方西语标尺,标红上线**'],
  'header.all_products': ['Todos los productos', J + '语法确定'],
  'header.shop_by_starlink_model': ['Comprar por modelo Starlink', J + '语法确定'],
  'header.guides': ['Guías', SL + '「Guía de accesorios」—— ✅ 直接命中'],
  'header.marine': ['Marítimo', SL + '「explore Starlink Marítimo」—— ✅✅ Starlink 自己的品类名,逐字采用'],
  'header.rv_off_grid': ['Casa rodante / Sin red', '⚠️冲突: ' + SL + '写「autocaravanas」,但 autocaravana 是【西班牙】用语,墨西哥说 casa rodante。**这里我判墨西哥用法而不抄 Starlink** —— 理由同 tú/usted:Starlink MX 自己混欧西语,那是它的缺点不是榜样'],
  'header.mounts': ['Soportes', J + 'mount=soporte'],
  'header.industrial': ['Industrial', '⚠️同形词(es=en 拼写相同)。这是【真译文】不是英文残留 —— 按 _fallback_doc,同形词给显式值+reason,不进 locales 白名单'],
  'header.power': ['Energía', SL + '「entrada de alimentación de CC」—— 电力域;分类名 Energía 为判断'],
  'header.industry_hub': ['Centro por Sector', J + '语法确定'],
  'header.support': ['Ayuda', '⭐避撞: support 和 mount 在西语里【同词 soporte】—— 导航里会出现「Soportes」(支架) 和「Soporte」(客服),只差一个 s。**pt 也撞了(Suportes/Suporte)但已上线;es 现在就能躲开** → 客服用 Ayuda'],
  'header.faq': ['Preguntas frecuentes', J + '⚠️pt 保留了「FAQ」,但【不能拿 pt 推 es】(我自己立的规矩)。西语站惯例是展开;墨西哥语料未直接抓到,标黄'],
  'header.video': ['Videos', '⭐墨西哥特征: video【不带重音】(西班牙写 vídeo)。这是 es-MX 与 es-ES 的可见分叉点之一'],
  'header.compatibility_guide': ['Guía de Compatibilidad', SL + '「Guía de accesorios」—— Guía 坐实'],
  'header.company': ['Empresa', CP + '「Precio de contado」页脚企业信息区用 Empresa'],
  'header.about': ['Acerca de', J + '语法确定'],
  'header.contact': ['Contacto', J + '语法确定'],
  'header.certifications_testing': ['Certificaciones y Pruebas', SL + '「Pruebe Starlink durante 30 días」—— prueba 坐实'],
  'header.oem_odm_manufacturing': ['Fabricación OEM/ODM', J + '语法确定;OEM/ODM 是行业代码值,不译'],
  'header.patents_manufacturing_capacity': ['Patentes y Capacidad de Fabricación', J + '语法确定'],
  'header.brand_affiliation_faq': ['Marca y Afiliación (FAQ)', J + '与 header.faq 绑定:此处 FAQ 作括号缩写保留,与 pt 同构'],
  /* 🔴 header.pt / header.ver_esta_p_gina_em_portugu_s —— 【故意不给值】,见文件末 §切换器 */
  'header.wanew_premium_starlink_accessories': ['Wanew | Accesorios Premium para Starlink', SL + '「Guía de accesorios」—— accesorios 坐实。长度与 pt 同构(截短版)'],

  /* ── mobilenav ──────────────────────────────────────────────────────── */
  'mobilenav.hello_wanew_com': ['hello@wanew.com', FB + 'e-mail 地址 / 代码值'],
  'mobilenav.logo_image': ['Inicio', J + '⭐这是 alt 文本。en 的「logo image」是个废 alt(描述了图片是什么,没说它去哪);pt 已改成「Página inicial」= 有用的 alt。es 同构'],

  /* ── footer ─────────────────────────────────────────────────────────── */
  'footer.other_menus': ['Otros menús', J + '语法确定'],
  'footer.standard_circular': ['Standard Circular', FB + '型号名(locales.json model_display 单一真源)'],
  'footer.standard_actuated': ['Standard Actuated', FB + '型号名'],
  'footer.standard': ['Standard', FB + '型号名'],
  'footer.mini': ['Mini', FB + '型号名'],
  'footer.performance_gen_1': ['Performance (Gen 1)', FB + '型号名'],
  'footer.performance_gen_3': ['Performance (Gen 3)', FB + '型号名'],
  'footer.enterprise': ['Enterprise', FB + '型号名'],
  'footer.wanew_starlink_accessories_limited': ['Wanew Starlink Accessories', FB + '注册法律实体名'],
  'footer.address_no_62_baotian_1st_road_xix': [
    'Dirección: No. 62, Baotian 1st Road, Xixiang Street, Baoan District, Shenzhen, Guangdong, China',
    J + '⭐只译标签「Address:」,地址本体【保持英文】—— 它是投递用的物理地址,译了没人能用。pt 同此处理',
  ],
  'footer.e_mail_hello_wanew_com': ['Correo: hello@wanew.com', SL + '「Reciba novedades de Starlink por correo electrónico」—— ⭐correo 坐实,**不是 Email**'],
  'footer.about_us': ['- Acerca de nosotros', J + '语法确定'],
  'footer.products': ['- Productos', SL + 'producto 坐实'],
  'footer.industry': ['- Sectores', J + 'industry(行业板块)= sector;与 header.industry_hub 一致'],
  'footer.guides': ['- Guías', SL + '「Guía de accesorios」'],
  'footer.faq': ['- Preguntas frecuentes', J + '与 header.faq 绑定'],
  'footer.video': ['- Videos', '⭐墨西哥特征: 无重音,与 header.video 一致'],
  'footer.contact_us': ['- Contacto', J + '语法确定'],
  'footer.copyright_2026_wanew_starlink_acce': [
    'Copyright  ©  2026 Wanew Starlink Accessories. Todos los derechos reservados.\nWanew fabrica accesorios de terceros compatibles con Starlink. No está afiliada a SpaceX ni a Starlink.',
    '⭐免责声明 —— ' + SL + '「Starlink es una división de SpaceX」句式;accesorios 坐实。**这条是合规文案,含义不能漂**:third-party=de terceros / compatible=compatibles con / not affiliated=no está afiliada',
  ],
  'footer.xml': ['XML', FB + '格式名 / 代码值'],

  /* ── card / meta ────────────────────────────────────────────────────── */
  'card.alt.suffix': ['- Productos Wanew', J + '与 pt 同构(catalog key,不是每页一份的字符串)'],
  'card.alt.category': ['- categoría de producto wanew', J + '与 pt 同构'],
  'card.lang_badge': ['en inglés', J + '⭐es 卡片指向 en 正文时的语言标注。措辞遵循我签 pt 时的同一条:小写、不加括号、不喊叫 ——「它是一句提示,不是一个警告」。由 renderPage 按存在性【派生】,绝不写死'],
  'meta.title.suffix': [' | Accesorios Premium para Starlink, Soportes y Soluciones de Energía', SL + 'accesorios 坐实;派生 meta_title 用,不存 64 份'],

  /* ── body ───────────────────────────────────────────────────────────── */
  'body.banner.title': ['Productos', SL + 'producto 坐实'],
  'body.banner.subtitle': ['Accesorios compatibles con Starlink para todas las generaciones de terminal.', SL + 'accesorios + compatibles con 坐实'],
  'body.contact_now': ['Contáctanos ahora', '⭐tú 形式(规范 §二之〇之一:' + CP + ' su/sus 0 次 + gob.mx su 0 次)'],
  'body.back': ['Volver', J + '语法确定'],
  'body.send_inquiry': ['Envía una consulta', '⭐tú 形式。⚠️inquiry=consulta 而【不是 cotización】—— cotización 是"报价单",承诺了我们给不了的东西'],
  'body.inquiry_blurb': ['¿Te interesa este producto? Déjanos un mensaje y te responderemos lo antes posible.', '⭐tú 形式(te/déjanos),' + SL + '「lo que te permite personalizar tu servicio」同人称'],
  'body.category_label': ['Categoría: ', J + '语法确定;尾随空格与 en/pt 一致(它是拼接前缀)'],
  'body.related_products': ['Productos relacionados', SL + 'producto 坐实'],
  'body.form.company': ['Nombre de la empresa', J + '语法确定'],
  'body.form.name': ['Nombre', J + '语法确定'],
  'body.form.phone': ['Teléfono', J + '语法确定'],
  'body.form.email': ['Correo electrónico', SL + '「Reciba novedades de Starlink por correo electrónico」—— ✅✅ 逐字命中,**不是「Email」**'],
  'body.form.message': ['Mensaje', J + '语法确定'],
  'body.form.submit': ['Enviar', CP + '表单动作词;语法确定'],
  'body.ph.name': ['Tu nombre', '⭐tú 形式(' + CP + '「tu vida」「tu crédito」)'],
  'body.ph.phone': ['Tu teléfono', '⭐tú 形式'],
  'body.ph.email': ['Tu correo electrónico', '⭐tú 形式 + ' + SL + 'correo electrónico'],
  'body.ph.message': ['Tu mensaje', '⭐tú 形式'],
};

/* ── 写入：文本插入，en / pt-BR 一个字节都不碰 ──────────────────────────── */
const PATH = 'data/chrome.json';
const before = fs.readFileSync(PATH, 'utf8');
const beforeObj = JSON.parse(before);
let out = before;
let done = 0;
const missing = [];

for (const [key, [value, reason]] of Object.entries(ES)) {
  // 定位该 key 的块，在块内最后一个 "pt-BR": ... 行之后插入
  const keyRe = new RegExp(`("${key.replace(/\./g, '\\.')}"\\s*:\\s*\\{[\\s\\S]*?)("pt-BR"\\s*:\\s*)("(?:[^"\\\\]|\\\\.)*")`, '');
  const m = out.match(keyRe);
  if (!m) { missing.push(key); continue; }
  const esLine = `,\n    "es-MX": ${JSON.stringify(value)},\n    "reason.es-MX": ${JSON.stringify(reason)}`;
  out = out.replace(keyRe, (_, head, ptKey, ptVal) => `${head}${ptKey}${ptVal}${esLine}`);
  done++;
}

if (missing.length) { console.error('❌ 这些 key 在 chrome.json 里没找到，中止：\n  ' + missing.join('\n  ')); process.exit(1); }

/* ── 对账：不是"看着像对的" ─────────────────────────────────────────────── */
let afterObj;
try { afterObj = JSON.parse(out); }
catch (e) { console.error('❌ 写出来的不是合法 JSON，中止不落盘：' + e.message); process.exit(1); }

const errs = [];
// ① en / pt-BR 必须一字节未变
for (const [k, v] of Object.entries(beforeObj)) {
  if (k.startsWith('_')) continue;
  for (const loc of ['en', 'pt-BR']) {
    if (JSON.stringify(afterObj[k]?.[loc]) !== JSON.stringify(v[loc])) errs.push(`${k}.${loc} 被改动了！`);
  }
}
// ② key 集合必须不增不减
const kb = Object.keys(beforeObj).join('|'), ka = Object.keys(afterObj).join('|');
if (kb !== ka) errs.push('顶层 key 集合变了');
// ③ 总数对账 —— 「凡是"匹配到才算"的检查，都要同时数一遍"总共有几个"」
const translatable = Object.keys(beforeObj).filter((k) => !k.startsWith('_'));
const withEs = translatable.filter((k) => afterObj[k]['es-MX'] !== undefined);
const withoutEs = translatable.filter((k) => afterObj[k]['es-MX'] === undefined);
if (withEs.length !== done) errs.push(`插入 ${done} 条，但文件里只有 ${withEs.length} 条有 es-MX`);

console.log(`\n【es-MX 灌入 chrome.json】`);
console.log(`  可译 key 总数 : ${translatable.length}`);
console.log(`  已给 es-MX    : ${withEs.length}`);
console.log(`  故意留空      : ${withoutEs.length}  → ${withoutEs.join(', ') || '（无）'}`);

if (errs.length) { console.error('\n❌ 对账不过，不落盘：\n  ' + errs.join('\n  ')); process.exit(1); }

fs.writeFileSync(PATH, out);
console.log('\n✅ 对账通过（en/pt-BR 一字节未变 · key 集合未变 · 总数吻合），已落盘。');
console.log('⚠️ 故意留空的两条不是"忘了"，是【结构问题】—— guard 会为它们亮红，这正是我要的。');

/* ═══════════════════════════════════════════════════════════════════════
 * §切换器 —— 🔴 我翻不了这两个 key，因为**它们的语义在三语下不成立**
 *
 *   data/templates/_chrome.html:73  切换器是【一个 <a>】：
 *       <a href="{{sw.href}}" hreflang="{{sw.hreflang}}"
 *          aria-label="{{t.header.ver_esta_p_gina_em_portugu_s}}"><span>{{t.header.pt}}</span></a>
 *
 *   而这两个 key 存的**不是"这个词"，是"对面那个语言"**：
 *       header.pt                  = { en:"PT",                          pt-BR:"EN" }
 *       header.ver_esta_p_gina_...= { en:"Ver esta página em português", pt-BR:"Ver esta página em inglês" }
 *
 *   ⭐ 二元下「对面」唯一，所以一个 key 装得下。**三元下「对面」有两个，它就装不下了**：
 *       · es 页上 {{t.header.pt}} 该显示什么？"EN"？"PT"？两个都要？—— **无解，不是选词问题**
 *       · 而且 **en 页也一起坏了**：它现在只能指向一个地方，加了 es 之后它得同时给出 PT 和 ES
 *       · 连 key 名 `header.pt` 本身都是二元假设的化石
 *
 *   → **这是 dev 的结构改动（切换器要从"单链"变成"语言列表"），不是我的翻译缺口。**
 *     我给它填任何值都是在给一个坏结构刷漆。**留空 = guard 红 = 它会一直吼到有人真修。**
 *
 *   ⚠️ 附带：`locales.json.enabled` 里【故意不加 es-MX】—— 加了会立刻让 guard 为 1300 条全红，
 *      而译文还没进去；更要紧的是我没验证过 enabled 会不会立刻【生成 es 页面】。
 *      开关时机 = 译文齐了 + 切换器修了，由总工拍。
 * ═══════════════════════════════════════════════════════════════════════ */
