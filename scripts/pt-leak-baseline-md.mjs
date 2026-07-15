#!/usr/bin/env node
/** 从 pt-leak-baseline.json + scanner 源码 生成人读版 i18n-baseline.md (白名单快照自动抽取, 非手抄) */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const snap = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/pt-leak-baseline.json'), 'utf8'));
const src = fs.readFileSync(path.join(ROOT, 'scripts/pt-leak-scan.mjs'), 'utf8');

const cut = (startMark, endMark) => {
  const i = src.indexOf(startMark);
  if (i < 0) return '(未找到)';
  const j = src.indexOf(endMark, i);
  return src.slice(i, j + endMark.length);
};
const whitelistSrc = cut('const WHITELIST = [', '];');
const markersSrc = cut('const EN_MARKERS = new Set([', ']);');

const pages = Object.entries(snap.byPage);
const rows = pages.map(([f, c]) =>
  `| ${f} | ${c.total} | ${c.a_cardTitles} | ${c.b_altSuffix} | ${c.c_galleryAltFilename} | ${c.d_otherText} | ${c.e_links} |`).join('\n');

const md = `# i18n 泄漏【基线快照】—— 冻结

> ⚠️ **这是验收标尺，不要手改。** 只有 \`SCANNER_VERSION\` bump 时才可用
> \`node scripts/pt-leak-baseline.mjs --write && node scripts/pt-leak-baseline-md.mjs\` 重出，
> 并**必须在下方【白名单变更记录】留痕 + 知会总调度**。
> 改白名单 = 改考卷；不留痕 = 自己给自己打分。

| 项 | 值 |
|---|---|
| scanner 版本 | **v${snap.scannerVersion}** |
| 基线 commit | **${snap.commitShort}** (\`${snap.commit}\`) |
| 扫描范围 | \`pt/**/*.html\` — **${snap.ptPagesScanned}** 个页面 |
| 机读版 | \`scripts/pt-leak-baseline.json\`（含全量逐条 finding） |

## 总数

- **N = ${snap.total}**
- ⭐ **翻译泄漏 = ${snap.translationLeaks}** ← **验收看这个数**（a+b+d+e）

### 为什么验收不是 N
\`c_galleryAltFilename\`(${snap.byClass['c_galleryAltFilename — 图库alt=图片文件名 ⚠️既有数据问题, 非翻译泄漏, 不计入"应逼近0"']}) 排除在外：这些 alt 直接写的是**图片文件名**
（如 \`Starlink Performance Adapter Gen 3 cable-images (1).jpg - tejoy\`），**英文站的 alt 一模一样** →
属既有数据质量问题、与翻译无关、**R2 也不会自动修**。计入会让"逼近 0"**永远达不到**，
反而遮住"生成器到底有没有做对"。它跟类③（图片里烧死的英文像素）一起挂"图片/数据质量"档。

## 按类

| 类 | 数量 | 归谁修 |
|---|---|---|
| **a_cardTitles** 列表/分类页产品卡英文标题 | ${snap.byClass['a_cardTitles — 列表/分类页产品卡英文标题 → R2 生成器域']} | **R2 生成器**（从 \`i18n[locale]\` 渲卡片） |
| **b_altSuffix** \`"- tejoy Products"\` 模板串 | ${snap.byClass['b_altSuffix — "- tejoy Products" 模板串 → chrome catalog key']} | **chrome catalog key** |
| **c_galleryAltFilename** alt=图片文件名 | ${snap.byClass['c_galleryAltFilename — 图库alt=图片文件名 ⚠️既有数据问题, 非翻译泄漏, 不计入"应逼近0"']} | ⚠️既有数据问题，不计入验收 |
| **d_otherText** 其余可见文本 | ${snap.byClass['d_otherText — 其余可见文本 (已逐个核实为真型号名)']} | 已逐个核实=**真型号名**，无需修 |
| **e_links** 该指 pt 却指英文 | ${snap.byClass['e_links — 该指pt却指英文 → R1 localizeUrl 域']} | **R1 \`localizeUrl\`** |

### d_otherText 逐条核实结论（不是漏译）
- \`Gen 3 Mesh Router\` — Starlink 真型号
- \`Starlink 2M Router Cable\` — 该行就是规格表的「Nome do modelo」字段值
- \`Internet Kit Satellite\` — 型号短语
- \`Case\` — 巴西通用外来词，且与 chrome 术语「Cases e Proteção」一致

### e_links = dev 实测的那 7 页（我的检查独立复现，且**全站无第 8 处**）
\`pt/about\` \`pt/compatibility\` \`pt/contact\` \`pt/marine\` \`pt/mounts\` \`pt/power\` \`pt/rv-off-grid\`
——每页同样 5 条页脚机型链：\`/standard-circular/ /standard-actuated/ /performance-gen-1/ /performance-gen-3/ /enterprise/\`

**根因**：这些页脚在 Phase 1 上线时**是对的**（那时这 5 个分类还没 pt 版，链英文正确）；是 **Phase 2 建了 pt 分类页之后变陈旧的**，
而 Phase 2 的漏斗 rewire 只覆盖了 pt/products、pt/mini、pt/standard、pt/index。
**"写时对、后来错"** = 人工 sweep 结构上杀不死、\`localizeUrl(path, locale)\` 由构造能杀的一类。

## 按页（共 ${pages.length} 页；全量见 JSON）

| 页面 | 合计 | 卡片标题 | alt后缀 | 图库alt | 其它文本 | 链接 |
|---|---|---|---|---|---|---|
${rows}

## 两类检查的定义（scanner v${snap.scannerVersion}）

1. **类①可见文本**：标签间文字 + \`placeholder\`/\`alt\`/\`title\`/\`aria-label\`。
   跳过 \`<script>\`/\`<style>\`/注释/JSON-LD/\`class\`/\`href\`/\`src\`。
2. **类②英文链接**：pt 页里 \`<a href="/{path}">\` 且 \`/pt/{path}\` **存在** → 泄漏。
   **白名单掉**：切换器 EN 链（设计如此该指英文）、无 pt 版的页（指南文章/遗留编号页，链英文是**正确**的防软404）。
3. **类③**（图片里烧死的英文像素）：**扫不到**，需重做图，不在本基线内。

任一类非零 → \`exit 1\`（可挂 CI / pre-push）。

## 验收口径

> R1+R2 落完，用**同版本 scanner** 重跑：**translationLeaks 应从 ${snap.translationLeaks} 逼近 0**。
> 若期间 bump 了 scanner 版本 → 必须重出基线 + 在下方留痕，否则前后数字不可比。

---

## 白名单快照（= 考卷原文，自动从 \`scripts/pt-leak-scan.mjs\` 抽取）

### 合法保持英文（WHITELIST）
\`\`\`js
${whitelistSrc}
\`\`\`

### 无歧义英文标记词（EN_MARKERS）
> 刻意排除与葡语同形的词（\`use\`=usar祈使、\`data\`=日期、\`ideal\`、\`complete\`、\`total\`、
> \`a/o/e/as/do/no/para/de/com/mais\` …），否则全是噪音。
\`\`\`js
${markersSrc}
\`\`\`

### 调优时抓到的 3 个真 bug（否则报告全是噪音／漏报）
1. **词边界必须含重音字母** — 否则 \`transferência\` 被切成 \`transfer\` → 假阳性。
2. **多词白名单必须排在单词之前** — 否则 \`\\bStarlink\\b\` 先吃掉中间词，
   \`TEJOY STARLINK ACCESSORIES LIMITED\`（法定公司名）永远匹配不上（假阳性 212→29）。
3. **类②盲区**（dev 结构分析发现）— 可见文本扫不到 href；死链检查也放行（英文页真实存在）→ 补了类②。

---

## 【白名单变更记录】（改白名单 = 改考卷，必须留痕）

| 日期 | scanner 版本 | 改了什么 | 为什么 | 对基线的影响 |
|---|---|---|---|---|
| 2026-07-14 | v1.0.0 | 初版冻结 | — | 基线 N=${snap.total} / translationLeaks=${snap.translationLeaks} @ ${snap.commitShort} |
`;

fs.writeFileSync(path.join(ROOT, 'i18n-baseline.md'), md);
console.log('已写 i18n-baseline.md');
console.log(`  scanner v${snap.scannerVersion} @ ${snap.commitShort} | N=${snap.total} | translationLeaks=${snap.translationLeaks} | ${pages.length} 页`);
