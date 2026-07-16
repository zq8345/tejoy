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

### ⚠️ d_otherText 逐条核实结论 —— **原结论是错的，2026-07-15 重核后作废重写**

> **原结论**（已作废）：「已逐个核实 = 真型号名，**无需修**」，并列了
> \`Gen 3 Mesh Router\` / \`Starlink 2M Router Cable\` / \`Internet Kit Satellite\` / \`Case\`。
>
> **错在哪**：那批条目是**旧 scanner 版本**下的结果。调白名单时数字走过 **558 → 741 → 512**，
> **每次重出了数字，却没重核这段「人的结论」** —— 它跟着 scanner 版本漂走了，
> 却还穿着「已核实」的外衣。**总调度是信了这句才批的基线。**
>
> ⭐ **教训（已立为规矩）**：**冻结数字的同时必须冻结结论，且结论要绑 scanner 版本。**
> 口径一变，**所有基于旧口径的人工结论一律作废重核，不许继承**。
> **「已核实」是一个会过期的状态，不是一个永久属性。**

**重核后的真相**（scanner v1.0.0，两棵树逐字相同，R1 没碰）：

| 条数 | 实为 | 归谁 | 处置 |
|---|---|---|---|
| **8** | ❌ **真漏译 —— 多语言窗自己的漏**：Phase 2.5 译描述时，译了正文散文却把 \`description_html\` 里**内联 \`<img>\` 的 alt** 原样留成英文（\`4205\`×3 + \`672\`×5，pt-BR 与 en 逐字相同 = 根本没译） | 多语言窗（pt 数据） | ✅ **已修 \`53b15e6\`**（纯 pt 数据，en 零改动，不破 R2 字节一致门） |
| 2 | ✅ 真型号短语：\`Starlink 2M Router Cable\`(657) / \`Starlink Mini Internet Kit Satellite\`(680) | — | **本就不该降**（归零反而说明型号被译坏了） |
| 1 | ⚠️ 假阳性：\`carregadores PD/power banks\`(702) —— **power bank 是巴葡通用外来词** | — | **刻意不进白名单**（改白名单 = 改考卷；1 条噪音的代价 << 基线不可比。**尺子没坏就别动尺子**） |

→ **验收地板从 11 修正为 3。基线 JSON 不重出**（\`N=547 / translationLeaks=501\` 是历史冻结快照，
**不因为我们后来修好了东西就改它 —— 那正是它存在的意义**）。

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

## 验收口径 —— **身份判定，不是计数**（总调度裁决 2026-07-15）

> **R2 通过条件**：\`a=0 且 b=0 且 e=0 且 **d 恰好是这 3 条已列名的**\`
> （\`657 router,cable\` / \`680 satellite\` / \`702 power\`，见上表）。
>
> **为什么不是「逼近 0」**：那 2 条真型号名归零**反而说明型号被译坏了**。
> **为什么不是「~3」**：模糊数会招来「差不多就行」，且**抓不到「修好旧的又漏了新的」**
> —— d 仍是 3 条但换了内容，**计数完全看不出来**。
> **若 d 仍是 3 条但换了内容 → 不通过。**
>
> 已编进 \`scripts/pt-leak-vs-baseline.mjs\`（身份 = **文件 + 命中词集**，不是文本内容 ——
> scanner 的 \`f.text\` 是整个文本节点，用短语 \`includes\` 会漏判；第一版就这么错过，实测抓出来了）。
>
> 用法：\`node scripts/pt-leak-vs-baseline.mjs --tree <被测树> --md 输出.md\`
> **四道前置闸**（树干净 + 扫描期 HEAD 不动 / 含基线 commit / scanner 同版本 / 页数 = ${snap.ptPagesScanned}），
> **不可比时拒绝出数**，而不是出一个会被误读的数。
>
> 若 bump 了 scanner 版本 → 必须重出基线 + 在下方留痕 + **所有旧口径下的人工结论一律作废重核**。

### R1 验收结果（scanner v${snap.scannerVersion} @ \`3928fb0d\`，四道闸全过）
**✅ R1 通过**：本职 \`e_links\` **35 → 0**（100% 清空，由构造杀掉，不是翻掉的）。
translationLeaks 501 → 466 **不是 R1 的成绩单** —— 剩余 466 = a(199)+b(256)+d(11) **全是 R2 的域**。
交叉验证：dev 自称修的 7 页 = 本基线 e 类的那 7 页，逐页吻合；且 dev **没碰考卷**（diff 为空，差异纯 CRLF）。
**⚠️ R2 的真靶子 = 455（a 199 + b 256），不是 466** —— d 的 11 条 R2 杀不掉（8 条是 pt 数据里的漏，已由 \`53b15e6\` 修）。

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
| 2026-07-14 | v1.0.0 | 初版冻结 @ \`836f341f\` | — | 基线 N=547 / translationLeaks=501（总调度逐条核实后批准，含独立 curl 复核 c 类剔除的合法性） |
| 2026-07-14 | v1.0.0（**未 bump**） | 加 \`ledger\`：c 类 46 条 + e 类 35 条**逐条留档** | 总调度要求「c 类必须挂账、不许消失」；e 类逐条 = R1 \`localizeUrl\` 的验收靶子 | **数字零变化**（N=${snap.total} / translationLeaks=${snap.translationLeaks}）。⚠️记录的 commit \`836f341f\`→\`${snap.commitShort}\`：重跑发生在当前 HEAD，两者之间 \`pt/\` **零内容改动**（只加了 scripts/docs），故完全可比。**判定口径（白名单/标记表）一字未动**，所以不 bump 版本。 |
| 2026-07-15 | v1.0.0（**未 bump**） | ⚠️ **d 类「逐条核实结论」作废重写**（见上）+ 验收口径由「逼近 0」改为**身份判定**（\`d 恰好是那 3 条\`）+ 地板 **11 → 3** | **原结论是错的**：它描述的是旧 scanner 版本下的另一批条目。调白名单时数字重出过三次（558→741→512），**结论一次都没重核**。总调度是信了那句「已核实=真型号名，无需修」才批的基线。 | **基线数字零变化**（N=${snap.total} / translationLeaks=${snap.translationLeaks} **不重出**）—— 冻结快照就该是历史，不因为后来修好了东西而改动。**判定口径（白名单/标记表）一字未动 → 不 bump**。变的只有①人的结论 ②合格线定义。修复 commit \`53b15e6\`（8 条 pt 内联 alt，en 零改动）。 |
`;

fs.writeFileSync(path.join(ROOT, 'i18n-baseline.md'), md);
console.log('已写 i18n-baseline.md');
console.log(`  scanner v${snap.scannerVersion} @ ${snap.commitShort} | N=${snap.total} | translationLeaks=${snap.translationLeaks} | ${pages.length} 页`);
