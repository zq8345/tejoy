#!/usr/bin/env node
/**
 * 【1】验收: 拿冻结基线量 R1/R2 —— translationLeaks 应从 501 逼近 0
 *
 * 用法:  node scripts/pt-leak-vs-baseline.mjs --tree C:/开发/tejoy-r1-wt [--md 输出.md]
 *
 * ⚠️ 四道闸都是干跑时**真踩到的**, 不是假想。两次差点冤枉 dev:
 *
 *   坑1「分叉点旧」: 在 feat/render-locale 上裸跑得 1651 处, 是基线 547 的 3 倍。
 *        naive 读法 =「R2 让情况恶化 3 倍」→ 冤枉。真因: 该分支从 Phase 2.6 之前分叉,
 *        少 10 个 pt 页、pt 产品标题还没落 → 数字跟生成器做对没做对**无关**。
 *
 *   坑2「扫活树」: 在 dev 正在编辑的 worktree 上跑, 先后得到 a=251/d=139 和 a=199/d=11。
 *        同一脚本同一棵树, **数字不可复现** —— 因为 dev 的 HEAD 在我扫描期间连动三次
 *        (f0cdca88→3ffccbf3→ca6796d3)。我读到的很可能正是他自己随后抓掉的瞬时回归
 *        (他的 commit: "strict per-block verifier — and it immediately caught a 90-page pt regression")。
 *        → **拿一个瞬时状态去判一个人的活儿, 是不公正的**。必须钉在一个 commit 上。
 *
 * 所以: 不满足可比性时, 本脚本**拒绝出数**, 而不是出一个会被误读的数。
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { classify, CLASS_KEYS, EXCLUDED_FROM_ACCEPTANCE, translationLeaksOf } from './pt-leak-classify.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const SCANNER = path.join(HERE, 'pt-leak-scan.mjs');
const BASE = JSON.parse(fs.readFileSync(path.join(HERE, 'pt-leak-baseline.json'), 'utf8'));

const argOf = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const TREE = path.resolve(argOf('--tree') || REPO);
const MD = argOf('--md');

const fail = (msg, detail) => {
  console.error(`\n❌ 前置闸未过 —— 拒绝出数(出了也会被误读)\n\n   ${msg}\n${detail ? '\n' + detail + '\n' : ''}`);
  process.exit(2);
};

console.log(`\n【验收比对】被测树: ${TREE}`);
console.log(`基线: scanner v${BASE.scannerVersion} @ ${BASE.commitShort} — ${BASE.ptPagesScanned} 页, translationLeaks=${BASE.translationLeaks}\n`);

/* ── 闸 1: 被测树必须含基线测过的全部 pt 内容 ───────────────────────────── */
let head, branch;
try {
  head = execSync('git rev-parse HEAD', { cwd: TREE, encoding: 'utf8' }).trim();
  branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: TREE, encoding: 'utf8' }).trim();
} catch (e) { fail(`不是一个 git 树: ${TREE}`); }

/* ── 闸 0: 不许扫活树 —— 被测树必须干净, 且扫描期间 HEAD 不许动 ─────────── */
const dirty = execSync('git status --porcelain', { cwd: TREE, encoding: 'utf8' })
  .split('\n').filter((l) => l.trim() && !l.startsWith('??'));
if (dirty.length)
  fail(
    `被测树有未提交改动 (${dirty.length} 个文件) —— 拒绝扫活树。`,
    `   → 未提交的状态是瞬时的, 出的数字**不可复现、无法归因**。\n` +
    `   → 拿一个瞬时状态去判一个人的活儿是不公正的。\n` +
    `   → 处理: 等 dev commit 完, 或改扫一个钉死的 ref。\n\n` +
    dirty.slice(0, 8).map((l) => '     ' + l).join('\n')
  );

let containsBase = true;
try { execSync(`git merge-base --is-ancestor ${BASE.commit} ${head}`, { cwd: TREE }); }
catch { containsBase = false; }

if (!containsBase) {
  fail(
    `被测树 (${branch} @ ${head.slice(0, 8)}) **不含基线 commit ${BASE.commitShort}**。`,
    `   → 它从基线之前分叉, 缺少基线测过的部分 pt 内容。\n` +
    `   → 这时候的数字变化, 分不清是「生成器做对了」还是「本来就少了几页」。\n` +
    `   → 处理: 让 dev 先 rebase 到含 ${BASE.commitShort} 的 main, 再跑本脚本。`
  );
}

/* ── 跑 scanner (ROOT = cwd, 所以必须在被测树里跑) ──────────────────────── */
let raw;
try { raw = execSync(`node "${SCANNER}" --json --max 100000`, { cwd: TREE, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }
catch (e) { raw = e.stdout; if (!raw) fail('scanner 跑挂了', String(e.stderr || e.message).slice(0, 500)); }
const r = JSON.parse(raw);

/* 扫描期间 HEAD 动了 = 扫到的是半个状态 —— dev 的活树 HEAD 真的会连动 (见文件头 坑2) */
const headAfter = execSync('git rev-parse HEAD', { cwd: TREE, encoding: 'utf8' }).trim();
if (headAfter !== head)
  fail(
    `扫描期间被测树的 HEAD 动了: ${head.slice(0, 8)} → ${headAfter.slice(0, 8)}。`,
    `   → dev 正在这棵树上干活, 扫到的是**半个状态**, 数字不可复现。\n   → 处理: 等他停手, 或改扫钉死的 ref。`
  );

/* ── 闸 2: 考卷必须同版本 ──────────────────────────────────────────────── */
if (r.scannerVersion !== BASE.scannerVersion)
  fail(
    `scanner 版本不符: 被测 v${r.scannerVersion} vs 基线 v${BASE.scannerVersion}。`,
    `   → 改了判定口径 = 改了考卷 → 前后数字不可比。\n   → 处理: 重出基线并在 i18n-baseline.md 留痕, 再比。`
  );

/* ── 闸 3: 扫描范围必须同量 ────────────────────────────────────────────── */
if (r.scanned !== BASE.ptPagesScanned)
  fail(
    `扫描页数不符: 被测 ${r.scanned} 页 vs 基线 ${BASE.ptPagesScanned} 页。`,
    `   → 少 ${BASE.ptPagesScanned - r.scanned} 页会让 translationLeaks **自然变低**, 与生成器对不对无关。\n` +
    `   → 这正是「数字降了 ≠ 做对了」的经典陷阱。\n   → 处理: 查清页数差异来源, 消除后再比。`
  );

/* ── 三闸全过, 出数 ────────────────────────────────────────────────────── */
const cls = classify(r);
const now = translationLeaksOf(cls);
const baseByClass = {
  a_cardTitles: BASE.byClass['a_cardTitles — 列表/分类页产品卡英文标题 → R2 生成器域'],
  b_altSuffix: BASE.byClass['b_altSuffix — "- tejoy Products" 模板串 → chrome catalog key'],
  c_galleryAltFilename: BASE.byClass['c_galleryAltFilename — 图库alt=图片文件名 ⚠️既有数据问题, 非翻译泄漏, 不计入"应逼近0"'],
  d_otherText: BASE.byClass['d_otherText — 其余可见文本 (已逐个核实为真型号名)'],
  e_links: BASE.byClass['e_links — 该指pt却指英文 → R1 localizeUrl 域'],
};
const OWNER = {
  a_cardTitles: 'R2 生成器(从 i18n[locale] 渲卡片)',
  b_altSuffix: 'chrome catalog key',
  c_galleryAltFilename: '⚠️不计入验收(既有数据问题)',
  d_otherText: '已核实=真型号名, 无需修',
  e_links: 'R1 localizeUrl',
};

console.log(`✅ 四道前置闸全过 —— 数字可比 (被测: ${branch} @ ${head.slice(0, 8)}, 树干净, 扫描期间未变)\n`);
const rows = CLASS_KEYS.map((k) => {
  const b = baseByClass[k], n = cls[k].length, d = n - b;
  const excl = EXCLUDED_FROM_ACCEPTANCE.includes(k);
  return { k, b, n, d, excl, mark: excl ? '—' : d < 0 ? '✅降' : d > 0 ? '❌升' : '⚠️没动' };
});
console.log('类                       基线    现在    变化   判定   归谁修');
for (const x of rows)
  console.log(
    `${x.k.padEnd(24)}${String(x.b).padStart(4)}${String(x.n).padStart(8)}${String(x.d > 0 ? '+' + x.d : x.d).padStart(8)}   ${x.mark.padEnd(5)}  ${OWNER[x.k]}`
  );

const pct = BASE.translationLeaks ? Math.round((1 - now / BASE.translationLeaks) * 100) : 0;
console.log(`\n⭐ translationLeaks: ${BASE.translationLeaks} → ${now}  (降 ${pct}%)`);
const verdict = now === 0 ? '✅ 归零' : now <= BASE.translationLeaks * 0.05 ? '✅ 逼近 0 (≤5%)' : now < BASE.translationLeaks ? '⚠️ 降了但未逼近 0' : '❌ 未降';
console.log(`   判定: ${verdict}\n`);

if (now > 0) {
  console.log('剩余未清的(按类):');
  for (const x of rows) {
    if (x.excl || !cls[x.k].length) continue;
    console.log(`  ${x.k} 剩 ${cls[x.k].length}:`);
    cls[x.k].slice(0, 5).forEach((f) => console.log(`     ${f.file}:${f.line}  ${JSON.stringify((f.text || f.href || '').slice(0, 60))}`));
    if (cls[x.k].length > 5) console.log(`     ... 另 ${cls[x.k].length - 5} 条`);
  }
}

if (MD) {
  const md = `# scanner vs 基线 —— 验收结果

| 项 | 值 |
|---|---|
| 被测树 | \`${TREE}\` |
| 被测分支 | \`${branch}\` @ \`${head.slice(0, 8)}\` |
| 基线 | scanner v${BASE.scannerVersion} @ \`${BASE.commitShort}\` |
| 前置闸 | ✅ 含基线commit / ✅ scanner同版本 / ✅ 页数同为 ${r.scanned} |

## ⭐ translationLeaks: **${BASE.translationLeaks} → ${now}** (降 ${pct}%) — ${verdict}

| 类 | 基线 | 现在 | 变化 | 归谁修 |
|---|---|---|---|---|
${rows.map((x) => `| ${x.k}${x.excl ? ' *(不计入)*' : ''} | ${x.b} | ${x.n} | ${x.d > 0 ? '+' + x.d : x.d} ${x.mark} | ${OWNER[x.k]} |`).join('\n')}

${now > 0 ? `## 剩余未清\n\n${CLASS_KEYS.filter((k) => !EXCLUDED_FROM_ACCEPTANCE.includes(k) && cls[k].length).map((k) => `### ${k} — 剩 ${cls[k].length}\n\n${cls[k].slice(0, 20).map((f) => `- \`${f.file}:${f.line}\` ${JSON.stringify((f.text || f.href || '').slice(0, 70))}`).join('\n')}${cls[k].length > 20 ? `\n- … 另 ${cls[k].length - 20} 条` : ''}`).join('\n\n')}` : '## ✅ 无剩余'}

---
*本脚本带三道前置闸: 不满足可比性时拒绝出数, 而不是出一个会被误读的数。*
*(干跑实录: 在未 rebase 的 feat/render-locale 上裸跑得 1651, 是基线 547 的 3 倍 —— 纯属分叉点旧, 不是 dev 的错)*
`;
  fs.writeFileSync(path.resolve(REPO, MD), md);
  console.log(`已写 ${MD}`);
}

process.exit(now === 0 ? 0 : 1);
