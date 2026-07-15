# i18n 泄漏【基线快照】—— 冻结

> ⚠️ **这是验收标尺，不要手改。** 只有 `SCANNER_VERSION` bump 时才可用
> `node scripts/pt-leak-baseline.mjs --write && node scripts/pt-leak-baseline-md.mjs` 重出，
> 并**必须在下方【白名单变更记录】留痕 + 知会总调度**。
> 改白名单 = 改考卷；不留痕 = 自己给自己打分。

| 项 | 值 |
|---|---|
| scanner 版本 | **v1.0.0** |
| 基线 commit | **836f341f** (`836f341fa18babc3fa7f3de796fed92d8283a6ab`) |
| 扫描范围 | `pt/**/*.html` — **90** 个页面 |
| 机读版 | `scripts/pt-leak-baseline.json`（含全量逐条 finding） |

## 总数

- **N = 547**
- ⭐ **翻译泄漏 = 501** ← **验收看这个数**（a+b+d+e）

### 为什么验收不是 N
`c_galleryAltFilename`(46) 排除在外：这些 alt 直接写的是**图片文件名**
（如 `Starlink Performance Adapter Gen 3 cable-images (1).jpg - tejoy`），**英文站的 alt 一模一样** →
属既有数据质量问题、与翻译无关、**R2 也不会自动修**。计入会让"逼近 0"**永远达不到**，
反而遮住"生成器到底有没有做对"。它跟类③（图片里烧死的英文像素）一起挂"图片/数据质量"档。

## 按类

| 类 | 数量 | 归谁修 |
|---|---|---|
| **a_cardTitles** 列表/分类页产品卡英文标题 | 199 | **R2 生成器**（从 `i18n[locale]` 渲卡片） |
| **b_altSuffix** `"- tejoy Products"` 模板串 | 256 | **chrome catalog key** |
| **c_galleryAltFilename** alt=图片文件名 | 46 | ⚠️既有数据问题，不计入验收 |
| **d_otherText** 其余可见文本 | 11 | 已逐个核实=**真型号名**，无需修 |
| **e_links** 该指 pt 却指英文 | 35 | **R1 `localizeUrl`** |

### d_otherText 逐条核实结论（不是漏译）
- `Gen 3 Mesh Router` — Starlink 真型号
- `Starlink 2M Router Cable` — 该行就是规格表的「Nome do modelo」字段值
- `Internet Kit Satellite` — 型号短语
- `Case` — 巴西通用外来词，且与 chrome 术语「Cases e Proteção」一致

### e_links = dev 实测的那 7 页（我的检查独立复现，且**全站无第 8 处**）
`pt/about` `pt/compatibility` `pt/contact` `pt/marine` `pt/mounts` `pt/power` `pt/rv-off-grid`
——每页同样 5 条页脚机型链：`/standard-circular/ /standard-actuated/ /performance-gen-1/ /performance-gen-3/ /enterprise/`

**根因**：这些页脚在 Phase 1 上线时**是对的**（那时这 5 个分类还没 pt 版，链英文正确）；是 **Phase 2 建了 pt 分类页之后变陈旧的**，
而 Phase 2 的漏斗 rewire 只覆盖了 pt/products、pt/mini、pt/standard、pt/index。
**"写时对、后来错"** = 人工 sweep 结构上杀不死、`localizeUrl(path, locale)` 由构造能杀的一类。

## 按页（共 79 页；全量见 JSON）

| 页面 | 合计 | 卡片标题 | alt后缀 | 图库alt | 其它文本 | 链接 |
|---|---|---|---|---|---|---|
| pt/products/index.html | 130 | 130 | 0 | 0 | 0 | 0 |
| pt/performance-gen-3/42.html | 20 | 0 | 4 | 16 | 0 | 0 |
| pt/performance-gen-3/43.html | 20 | 0 | 4 | 16 | 0 | 0 |
| pt/standard-actuated/index.html | 19 | 19 | 0 | 0 | 0 | 0 |
| pt/mini/44.html | 18 | 0 | 4 | 14 | 0 | 0 |
| pt/enterprise/index.html | 16 | 16 | 0 | 0 | 0 | 0 |
| pt/performance-gen-3/index.html | 16 | 16 | 0 | 0 | 0 | 0 |
| pt/standard/672.html | 9 | 0 | 4 | 0 | 5 | 0 |
| pt/standard-circular/index.html | 7 | 7 | 0 | 0 | 0 | 0 |
| pt/mini/4205.html | 7 | 0 | 4 | 0 | 3 | 0 |
| pt/index.html | 6 | 6 | 0 | 0 | 0 | 0 |
| pt/enterprise/657.html | 5 | 0 | 4 | 0 | 1 | 0 |
| pt/mini/680.html | 5 | 0 | 4 | 0 | 1 | 0 |
| pt/mini/702.html | 5 | 0 | 4 | 0 | 1 | 0 |
| pt/about/index.html | 5 | 0 | 0 | 0 | 0 | 5 |
| pt/compatibility/index.html | 5 | 0 | 0 | 0 | 0 | 5 |
| pt/contact/index.html | 5 | 0 | 0 | 0 | 0 | 5 |
| pt/marine/index.html | 5 | 0 | 0 | 0 | 0 | 5 |
| pt/mounts/index.html | 5 | 0 | 0 | 0 | 0 | 5 |
| pt/power/index.html | 5 | 0 | 0 | 0 | 0 | 5 |
| pt/rv-off-grid/index.html | 5 | 0 | 0 | 0 | 0 | 5 |
| pt/performance-gen-1/index.html | 4 | 4 | 0 | 0 | 0 | 0 |
| pt/enterprise/650.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/enterprise/658.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/enterprise/669.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/enterprise/675.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/4199.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/4200.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/4201.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/4203.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/4204.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/4206.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/4207.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/656.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/663.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/676.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/678.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/679.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/681.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/682.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/683.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/684.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/685.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/686.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/687.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/688.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/689.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/690.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/691.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/692.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/693.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/694.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/695.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/703.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/performance-gen-1/654.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/performance-gen-3/4202.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/performance-gen-3/697.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/performance-gen-3/700.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/standard/651.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/standard/652.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/standard/660.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/standard/661.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/standard/662.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/standard/671.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/standard/673.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/standard/674.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/standard/677.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/standard/696.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/standard/701.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/standard/704.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/standard-actuated/659.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/standard-actuated/665.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/standard-actuated/666.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/standard-actuated/667.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/standard-actuated/668.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/standard-actuated/670.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/standard-circular/655.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/standard-circular/664.html | 4 | 0 | 4 | 0 | 0 | 0 |
| pt/mini/index.html | 1 | 1 | 0 | 0 | 0 | 0 |

## 两类检查的定义（scanner v1.0.0）

1. **类①可见文本**：标签间文字 + `placeholder`/`alt`/`title`/`aria-label`。
   跳过 `<script>`/`<style>`/注释/JSON-LD/`class`/`href`/`src`。
2. **类②英文链接**：pt 页里 `<a href="/{path}">` 且 `/pt/{path}` **存在** → 泄漏。
   **白名单掉**：切换器 EN 链（设计如此该指英文）、无 pt 版的页（指南文章/遗留编号页，链英文是**正确**的防软404）。
3. **类③**（图片里烧死的英文像素）：**扫不到**，需重做图，不在本基线内。

任一类非零 → `exit 1`（可挂 CI / pre-push）。

## 验收口径

> R1+R2 落完，用**同版本 scanner** 重跑：**translationLeaks 应从 501 逼近 0**。
> 若期间 bump 了 scanner 版本 → 必须重出基线 + 在下方留痕，否则前后数字不可比。

---

## 白名单快照（= 考卷原文，自动从 `scripts/pt-leak-scan.mjs` 抽取）

### 合法保持英文（WHITELIST）
```js
const WHITELIST = [
  // ⚠️ 多词条目必须排在单词之前, 否则单词条目(如 \bStarlink\b)会先把中间词剔掉, 多词就再也匹配不上
  // 法定公司名 (注册名必须英文)
  /\bTEJOY\s+STARLINK\s+ACCESSORIES\s+LIMITED\b/gi, /\bTejoy\s+Starlink\s+Accessories\s+Limited\b/gi,
  // 机型 / 产品线 (多词在前)
  /\bStandard\s+Actuated\b/gi, /\bStandard\s+Circular\b/gi, /\bFlat\s+High[-\s]Performance\b/gi,
  /\bHigh[-\s]Performance\b/gi, /\bPerformance\s*\(?\s*Gen\s*\d\s*\)?/gi, /\bGen\s*\d\b/gi,
  /\bRectangular\s+Satellite\b/gi, /\bMesh\s+Router\b/gi, /\bInternet\s+Kit\b/gi,  // Starlink 型号名
  // 技术全称 (缩写的展开式 = 合法英文技术术语)
  /\bPower\s+over\s+Ethernet\b/gi, /\bPower\s+Delivery\b/gi,
  /\bStarlink\s+Mini\b/gi, /\bStarlink\b/gi, /\bMini\b/gi, /\bStandard\b/gi, /\bEnterprise\b/gi,
  /\bPerformance\b/gi, /\bActuated\b/gi, /\bCircular\b/gi, /\bDishy\b/gi, /\bV[23]\b/g,
  // 品牌 / 站名
  /\bTejoy\b/gi, /\bSpaceX\b/gi, /\bSTARGEAR\b/gi, /\bXLinkShop\b/gi, /\bstarlingkshop\b/gi,
  /\bDaierTek\b/gi, /\bTheLAShop\b/gi, /\bZinweyton\b/gi, /\blinkoostar\b/gi, /\bStar\s?Link\b/gi,
  // 规格 / 技术 token
  /\bRJ\s?45\b/gi, /\bIP\s?6\d\b/gi, /\bIP\d0\b/gi, /\bPoE\b/gi, /\bPOE\b/g,
  /\bType[-\s]?C\b/gi, /\bUSB[-\s]?[AC]?\b/gi, /\bDC\b/g, /\bAC\b/g, /\bPD\b/g,
  /\bCat\s?\d[A-Z]?\b/gi, /\bCAT5E\b/gi, /\bT568B\b/gi, /\bCM[XR]\b/g, /\bEthernet\b/gi,
  /\bSPX\b/gi, /\bE-?MARKER\b/gi, /\bDC\d{4}\b/gi, /\bUL\d+\b/gi, /\bLED\b/gi,
  // 认证 / 商务缩写
  /\b(OEM|ODM|MOQ|DDP|ISO|RoHS|CE|FCC|QC|XML|FAQ|DHL|FedEx|SKU|CIF|FOB|EXW)\b/g,
  /\bISO\s?\d+\b/gi, /\bP&amp;D\b/gi, /\bP&D\b/gi,
  // 数值 + 单位 (含尺寸/长度/功率)
  /\b\d+(?:[.,]\d+)?\s*(?:W|V|A|mA|mAh|Wh|Hz|K|Mbps|Gbps|MB|GB|FT|ft|M|m|mm|cm|in|inch|polegadas|AWG|Lbs|lbs|kg|g|°C|%)\b/gi,
  /\b\d+\s*[x×*]\s*\d+(?:[.,]\d+)?\s*(?:mm|cm|m)?\b/gi, /\b\d+\/\d+\b/g, /\b\d+(?:[.,]\d+)?\b/g,
  // pt-BR 通用外来词 / 已入乡随俗 (多词在前)
  /\bpower\s?bank\b/gi, /\bplug[-\s]and[-\s]play\b/gi, /\bplug[-\s]?&[-\s]?play\b/gi,
  /\boff[-\s]grid\b/gi, /\boff[-\s]road\b/gi, /\bnotebook\b/gi, /\bdesign\b/gi, /\bkit\b/gi,
  /\bcamping\b/gi, /\bmotorhome\b/gi, /\bvan(s)?\b/gi, /\bbooster\b/gi, /\bboost\b/gi,
  /\bupgrade\b/gi, /\bdock\b/gi,
  /\bdisplay\b/gi, /\bonline\b/gi, /\bsite\b/gi, /\be-?mail\b/gi, /\blink\b/gi, /\bshop\b/gi,
  /\bhome[-\s]?offices?\b/gi, /\bslim\b/gi, /\bflat\b/gi, /\bpack\b/gi, /\bsetup\b/gi, /\bhub\b/gi,
  /\bcases?\b/gi,   // pt-BR 通用外来词, 且与我的 chrome 术语 "Cases e Proteção" 一致
  /\bstatus\b/gi, /\bcheck[-\s]?list\b/gi, /\bmarketing\b/gi, /\bweb\b/gi,
  // HTML 实体 / 符号
  /&[a-z]+;/gi, /&#\d+;/g,
];
```

### 无歧义英文标记词（EN_MARKERS）
> 刻意排除与葡语同形的词（`use`=usar祈使、`data`=日期、`ideal`、`complete`、`total`、
> `a/o/e/as/do/no/para/de/com/mais` …），否则全是噪音。
```js
const EN_MARKERS = new Set([
  // 功能词
  'the', 'and', 'with', 'your', 'yours', 'our', 'ours', 'this', 'that', 'these', 'those',
  'of', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'from', 'they', 'them', 'their', 'theirs', 'there', 'here', 'we', 'you', 'it', 'its',
  'which', 'what', 'when', 'where', 'why', 'who', 'whom', 'whose', 'how',
  'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must',
  'have', 'has', 'had', 'having', 'does', 'did', 'doing',
  'into', 'onto', 'over', 'under', 'above', 'below', 'after', 'before', 'while', 'about',
  'between', 'through', 'during', 'without', 'within', 'upon', 'against', 'across', 'along',
  'each', 'every', 'both', 'another', 'such', 'only', 'just', 'very', 'much', 'many', 'few',
  'more', 'most', 'any', 'some', 'all', 'also', 'than', 'then', 'because', 'however',
  'first', 'second', 'last', 'next', 'other', 'others', 'same', 'own',
  'but', 'nor', 'yet', 'though', 'although', 'unless', 'until', 'whether',
  // 常见内容词 (英文营销文案里高频, 且非葡语)
  'best', 'better', 'good', 'great', 'new', 'old', 'high', 'low', 'long', 'short', 'small',
  'large', 'wide', 'easy', 'easily', 'simple', 'simply', 'quick', 'quickly', 'fast', 'strong',
  'safe', 'safely', 'secure', 'reliable', 'durable', 'sturdy', 'lightweight', 'heavy',
  // ⚠️ 已剔除与葡语同形: use(usar祈使) ideal complete(completar祈使) data(日期) total normal
  'perfect', 'ready', 'free', 'full', 'quality',
  'get', 'got', 'make', 'makes', 'made', 'uses', 'used', 'using', 'need', 'needs',
  'want', 'help', 'helps', 'allow', 'allows', 'keep', 'keeps', 'stay', 'stays',
  'work', 'works', 'working', 'provide', 'provides', 'ensure', 'ensures', 'include',
  'includes', 'including', 'feature', 'features', 'featuring', 'designed', 'built',
  'support', 'supports', 'supported', 'install', 'installed', 'installing', 'installation',
  'connect', 'connects', 'connected', 'connection', 'charge', 'charging', 'charger',
  'cable', 'cables', 'wire', 'wires', 'power', 'adapter', 'adapters', 'mount', 'mounts',
  'mounting', 'bracket', 'brackets', 'waterproof', 'weatherproof', 'extension', 'replacement',
  'connector', 'connectors', 'coupler', 'device', 'devices', 'product', 'products',
  'solution', 'solutions', 'accessory', 'accessories', 'package', 'contents', 'specification',
  'specifications', 'warranty', 'shipping', 'delivery', 'order', 'orders', 'buy', 'price',
  'guide', 'guides', 'guarantee', 'customer', 'customers', 'service', 'services',
  'seamless', 'upgrade', 'experience', 'enhance', 'elevate', 'transform', 'boost', 'expand',
  'outdoor', 'indoor', 'weather', 'speed', 'transfer', 'network', 'networking',
  'router', 'routers', 'laptop', 'satellite', 'dish', 'roof', 'wall', 'pole', 'car', 'truck',
  'boat', 'yacht', 'home', 'office', 'travel', 'read', 'more', 'back', 'send', 'submit',
  'inquiry', 'message', 'name', 'email', 'phone', 'company', 'contact', 'related',
  'description', 'category', 'model', 'type', 'brand', 'about', 'video', 'videos',
]);
```

### 调优时抓到的 3 个真 bug（否则报告全是噪音／漏报）
1. **词边界必须含重音字母** — 否则 `transferência` 被切成 `transfer` → 假阳性。
2. **多词白名单必须排在单词之前** — 否则 `\bStarlink\b` 先吃掉中间词，
   `TEJOY STARLINK ACCESSORIES LIMITED`（法定公司名）永远匹配不上（假阳性 212→29）。
3. **类②盲区**（dev 结构分析发现）— 可见文本扫不到 href；死链检查也放行（英文页真实存在）→ 补了类②。

---

## 【白名单变更记录】（改白名单 = 改考卷，必须留痕）

| 日期 | scanner 版本 | 改了什么 | 为什么 | 对基线的影响 |
|---|---|---|---|---|
| 2026-07-14 | v1.0.0 | 初版冻结 | — | 基线 N=547 / translationLeaks=501 @ 836f341f |
