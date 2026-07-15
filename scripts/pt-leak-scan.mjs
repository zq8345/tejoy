#!/usr/bin/env node
/**
 * pt-leak-scan — 扫 pt/**\/*.html 的「可见文本」里残留的英文, 发现即 exit 1 (可当 CI / pre-push).
 *
 * 只扫用户可见的东西:
 *   - 标签之间的文字节点
 *   - 可见属性: placeholder / alt / title / aria-label
 * 不扫: <script>/<style>/注释 / class / href / src / id / data-* / JSON-LD(在 script 内)
 *
 * 判定思路: 先剔除「合法保持英文」的白名单(机型名/规格token/品牌/pt通用外来词/单位数值),
 * 再看剩下的词里有没有「无歧义英文标记词」(刻意避开与葡语同形的 a/o/e/as/do/no/para/de/com/mais/total…).
 *
 * 用法: node scripts/pt-leak-scan.mjs [--json] [--max N]
 * 退出: 0 = 无泄漏; 1 = 有泄漏
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const PT_DIR = path.join(ROOT, 'pt');
const AS_JSON = process.argv.includes('--json');
const MAX_IX = process.argv.indexOf('--max');
const MAX = MAX_IX >= 0 ? Number(process.argv[MAX_IX + 1]) : Infinity;

/* ─────────── 白名单: 合法保持英文 (多词优先, 顺序=先长后短) ─────────── */
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

/* ─────────── 无歧义英文标记词 (确定不是葡语) ─────────── */
/* 刻意排除与 pt 同形/近形: a, o, e, as, os, do, da, no, na, em, de, com, por, se, ou,
   mais, so, ate, total, normal, industrial, material, natural, digital, original, final,
   central, radio, ideal, principal, local, real, social, legal, animal, capital … */
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

/* ─────────── 工具 ─────────── */
function blankNonVisible(html) {
  // 等长空格替换, 保留偏移 → 行号准确
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, (m) => ' '.repeat(m.length))
    .replace(/<style[\s\S]*?<\/style>/gi, (m) => ' '.repeat(m.length))
    .replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length));
}
function lineOf(html, idx) {
  let n = 1;
  for (let i = 0; i < idx && i < html.length; i++) if (html[i] === '\n') n++;
  return n;
}
function stripWhitelist(text) {
  let t = ' ' + text + ' ';
  for (const re of WHITELIST) t = t.replace(re, ' ');
  return t;
}
function englishHits(text) {
  const stripped = stripWhitelist(text).toLowerCase();
  // ⚠️ 词边界必须含重音字母, 否则 "transferência" 会被切成 "transfer"+"ência" → 假阳性
  const words = stripped.match(/[a-zà-ÿ][a-zà-ÿ'-]*/g) || [];
  const hits = words.filter((w) => EN_MARKERS.has(w.replace(/[''-]+$/, '')));
  return [...new Set(hits)];
}
function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

/* ─────────── 扫描 ─────────── */
const findings = [];
const files = walk(PT_DIR);
for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  const vis = blankNonVisible(raw);
  const rel = path.relative(ROOT, file).split(path.sep).join('/');

  // 1) 标签之间的文字节点
  for (const m of vis.matchAll(/>([^<>]+)</g)) {
    const text = m[1].replace(/\s+/g, ' ').trim();
    if (!text || text.length < 3) continue;
    const hits = englishHits(text);
    if (hits.length) findings.push({ file: rel, line: lineOf(raw, m.index), kind: 'text', hits, text: text.slice(0, 120) });
  }
  // 2) 可见属性
  for (const m of vis.matchAll(/\b(placeholder|alt|title|aria-label)="([^"]+)"/gi)) {
    const attr = m[1].toLowerCase(), text = m[2].replace(/\s+/g, ' ').trim();
    if (!text || text.length < 3) continue;
    const hits = englishHits(text);
    if (hits.length) findings.push({ file: rel, line: lineOf(raw, m.index), kind: attr, hits, text: text.slice(0, 120) });
  }
}

/* ─────────── 输出 ─────────── */
if (AS_JSON) {
  console.log(JSON.stringify({ scanned: files.length, leaks: findings.length, findings: findings.slice(0, MAX) }, null, 2));
} else {
  console.log(`pt-leak-scan: 扫描 ${files.length} 个 pt 页`);
  if (!findings.length) {
    console.log('✅ 未发现英文残留 (可见文本)');
  } else {
    const byFile = {};
    for (const f of findings) (byFile[f.file] ||= []).push(f);
    let shown = 0;
    for (const [file, list] of Object.entries(byFile)) {
      if (shown >= MAX) break;
      console.log(`\n❌ ${file}  (${list.length})`);
      for (const f of list) {
        if (shown++ >= MAX) break;
        console.log(`   L${f.line} [${f.kind}] {${f.hits.join(',')}}  ${f.text}`);
      }
    }
    console.log(`\n泄漏总数: ${findings.length} / 涉及 ${Object.keys(byFile).length} 个文件`);
  }
}
process.exit(findings.length ? 1 : 0);
