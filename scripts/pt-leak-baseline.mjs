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
import { classify, CLASS_KEYS as KEYS, translationLeaksOf } from './pt-leak-classify.mjs';

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

/* 分类口径的单一真源 = scripts/pt-leak-classify.mjs (基线与验收比对共用, 抄两份会漂) */
const cls = classify(r);

const perPage = {};
const bump = (file, k) => { (perPage[file] ||= Object.fromEntries([...KEYS.map((x) => [x, 0]), ['total', 0]])); perPage[file][k]++; perPage[file].total++; };
for (const k of KEYS) for (const f of cls[k]) bump(f.file, k);

const total = r.leaks + r.linkLeaks;
const translationLeaks = translationLeaksOf(cls);
const snapshot = {
  frozenAt: 'BASELINE — do not hand-edit. Regenerate only when SCANNER_VERSION bumps, and tell the orchestrator (changing the whitelist = changing the exam).',
  scannerVersion: r.scannerVersion,
  commit, commitShort,
  ptPagesScanned: r.scanned,
  total,
  translationLeaks,
  byClass: {
    'a_cardTitles — 列表/分类页产品卡英文标题 → R2 生成器域': cls.a_cardTitles.length,
    'b_altSuffix — "- wanew Products" 模板串 → chrome catalog key': cls.b_altSuffix.length,
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
  /* ⚠️ 挂账明细: c 类虽不计入验收, 但必须逐条留档、不许消失 —— 它是"图片/数据质量"档的待办,
     alt 直接写成图片文件名对 SEO 和无障碍都是实伤, 内容侧要据此逐张改. e 类同样逐条留档,
     因为它是 R1 localizeUrl 的验收靶子. */
  ledger: {
    c_galleryAltFilename: cls.c_galleryAltFilename.map((f) => ({ file: f.file, line: f.line, alt: f.text })),
    e_links: cls.e_links.map((f) => ({ file: f.file, line: f.line, href: f.href, should: f.should })),
  },
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
