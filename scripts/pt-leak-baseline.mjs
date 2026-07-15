#!/usr/bin/env node
/**
 * 生成【基线快照】: 用当前 scanner (白名单=考卷) 跑当前 main, 冻结成 scripts/pt-leak-baseline.json.
 * 以后 R1/R2 每次验收跟它比 —— 数字必须可比, 所以:
 *   ⚠️ scanner 的白名单/标记表一改, 必须 bump SCANNER_VERSION 并知会总调度, 再重出基线.
 * 用法: node scripts/pt-leak-baseline.mjs [--write]
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const WRITE = process.argv.includes('--write');
const OUT = path.join(ROOT, 'scripts', 'pt-leak-baseline.json');

// scanner 有泄漏时 exit 1 (设计如此) → execSync 会抛, 但 stdout 仍是我们要的 JSON
let raw;
try {
  raw = execSync('node scripts/pt-leak-scan.mjs --json --max 100000', { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  raw = e.stdout;
  if (!raw) throw e;
}
const r = JSON.parse(raw);

const commit = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
const commitShort = commit.slice(0, 8);

/* ── 分类 (每一类都要能解释归谁修, 否则「逼近0」的验收标准会失真) ──
 * a 卡片标题:   列表/分类页产品卡的英文标题/摘要        → R2 生成器(从 i18n[locale] 渲卡片)
 * b alt后缀:    "- tejoy Products" 模板串              → chrome catalog key
 * c 图库alt文件名: alt 直接用了图片文件名(.jpg等)        → ⚠️既有数据质量问题, 英文站同样如此,
 *                                                        不是翻译泄漏, R2 不会自动修 → 不该计入「应逼近0」
 * d 其它可见文本: 真正剩余的可见文本                     → 已逐个核实为真型号名
 * e 链接类:     该指 pt 却指英文                        → R1 localizeUrl
 */
const isAltSuffix = (f) => f.hits.length === 1 && f.hits[0] === 'products';
const isFilenameAlt = (f) => f.kind === 'alt' && /\.(jpg|jpeg|png|webp|gif)\b/i.test(f.text);
const isListPage = (f) => /\/index\.html$/.test(f.file);

const cls = { a_cardTitles: [], b_altSuffix: [], c_galleryAltFilename: [], d_otherText: [], e_links: r.linkFindings };
for (const f of r.findings) {
  if (isFilenameAlt(f)) cls.c_galleryAltFilename.push(f);
  else if (isAltSuffix(f)) cls.b_altSuffix.push(f);
  else if (isListPage(f)) cls.a_cardTitles.push(f);
  else cls.d_otherText.push(f);
}

const KEYS = ['a_cardTitles', 'b_altSuffix', 'c_galleryAltFilename', 'd_otherText', 'e_links'];
const perPage = {};
const bump = (file, k) => { (perPage[file] ||= Object.fromEntries([...KEYS.map((x) => [x, 0]), ['total', 0]])); perPage[file][k]++; perPage[file].total++; };
for (const k of KEYS) for (const f of cls[k]) bump(f.file, k);

const total = r.leaks + r.linkLeaks;
const translationLeaks = cls.a_cardTitles.length + cls.b_altSuffix.length + cls.d_otherText.length + cls.e_links.length;
const snapshot = {
  frozenAt: 'BASELINE — do not hand-edit. Regenerate only when SCANNER_VERSION bumps, and tell the orchestrator (changing the whitelist = changing the exam).',
  scannerVersion: r.scannerVersion,
  commit, commitShort,
  ptPagesScanned: r.scanned,
  total,
  translationLeaks,
  byClass: {
    'a_cardTitles — 列表/分类页产品卡英文标题 → R2 生成器域': cls.a_cardTitles.length,
    'b_altSuffix — "- tejoy Products" 模板串 → chrome catalog key': cls.b_altSuffix.length,
    'c_galleryAltFilename — 图库alt=图片文件名 ⚠️既有数据问题, 非翻译泄漏, 不计入"应逼近0"': cls.c_galleryAltFilename.length,
    'd_otherText — 其余可见文本 (已逐个核实为真型号名)': cls.d_otherText.length,
    'e_links — 该指pt却指英文 → R1 localizeUrl 域': cls.e_links.length,
  },
  acceptanceTarget: {
    '验收口径': 'R1+R2 落完后重跑同版本 scanner, translationLeaks (a+b+d+e) 应逼近 0',
    'translationLeaks 基线': translationLeaks,
    '不计入的 c_galleryAltFilename': cls.c_galleryAltFilename.length,
    '理由': 'c 类是 alt 直接写了图片文件名 (英文站同样如此) = 既有数据质量问题, 与翻译无关, R2 不会自动修; 计入会让"逼近0"永远达不到',
  },
  byPage: Object.fromEntries(Object.entries(perPage).sort((a, b) => b[1].total - a[1].total)),
  notes: [
    '类③(图片里烧死的英文像素) 扫不到, 需重做图, 不在本基线内',
    'd_otherText 剩余项已逐个核实: Gen 3 Mesh Router (真型号) / Starlink 2M Router Cable ("Nome do modelo"字段值) / Internet Kit Satellite (型号短语)',
    'meta_title 不在本基线口径内: R2 将由生成器派生 (本地化标题 + catalog 后缀 key), JSON 不再存',
  ],
};

if (WRITE) { fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 2) + '\n'); console.log('已写入', path.relative(ROOT, OUT)); }
console.log(`\n【基线快照】scanner v${snapshot.scannerVersion} @ ${commitShort} — 扫 ${snapshot.ptPagesScanned} 个 pt 页`);
console.log(`总数 N = ${total}   (其中翻译泄漏 = ${translationLeaks}, 验收看这个)`);
for (const [k, v] of Object.entries(snapshot.byClass)) console.log(`  ${String(v).padStart(4)}  ${k}`);
console.log(`\n按页 (Top 12 / 共 ${Object.keys(perPage).length} 页):`);
Object.entries(snapshot.byPage).slice(0, 12).forEach(([f, c]) =>
  console.log(`  ${String(c.total).padStart(4)}  ${f}   [卡片${c.a_cardTitles} alt后缀${c.b_altSuffix} 图库alt${c.c_galleryAltFilename} 文本${c.d_otherText} 链接${c.e_links}]`));
