# 【1】R1 验收 — scanner 对基线

| 项 | 值 |
|---|---|
| 被测树 | `C:\开发\tejoy-r1-wt` |
| 被测分支 | `feat/i18n-chrome-r1` @ **`3928fb0d`**（r1-report.md 已落地） |
| 基线 | scanner **v1.0.0** @ `69966153`（未 bump、未重出） |
| 前置闸 | ✅ 树干净(0 未提交) · ✅ 扫描期间 HEAD 未变 · ✅ 含基线 commit · ✅ scanner 同版本 · ✅ 页数同为 90 |

---

## ⭐ 结论：**R1 通过。它把自己那一格清空了：`e_links 35 → 0`（100%）**

## ⚠️ 但「501 → ~0」这把尺子**现在还不能用来判 R1** —— 剩下的 466 全部不在 R1 射程内

| 类 | 基线 | 现在 | 变化 | 归谁 | 判定 |
|---|---|---|---|---|---|
| **e_links** | 35 | **0** | **−35** | **R1 `localizeUrl`** | ✅ **本职，100% 清空** |
| a_cardTitles | 199 | 199 | 0 | **R2 生成器**（从 `i18n[locale]` 渲卡片） | 不是 R1 的活 |
| b_altSuffix | 256 | 256 | 0 | **R2** 用 catalog key 重生成 pt HTML | 不是 R1 的活 |
| d_otherText | 11 | 11 | 0 | ⚠️ **见下，我的基线写错了** | — |
| c_galleryAltFilename *(不计入)* | 46 | 46 | 0 | 图片/数据质量档 | — |

**translationLeaks: 501 → 466（降 7%）**

**7% 不是 R1 的成绩单。** R1 的射程 = `e_links`，它清了 **35/35**。
a(199)+b(256) 是产品卡内容，由 `render.js` 从 `i18n[locale]` 渲染 —— **R2 的域**。
→ **「501 → ~地板」只能在 R2 落完之后判，不能拿来判 R1。**

### 交叉验证：dev 自称修的 7 页 = 我基线 e 类的那 7 页，逐页吻合
`pt/about` `pt/compatibility` `pt/contact` `pt/marine` `pt/mounts` `pt/power` `pt/rv-off-grid`
—— 每页同样 5 条页脚机型链，共 35 条。**dev 声称的和我独立测到的对得上。**

### 顺带核实：dev 没动我的考卷
`git log dc5cdcb7..feat/i18n-chrome-r1 -- scripts/pt-leak-scan.mjs scripts/pt-leak-baseline.json` → **空**。
文件差异纯 CRLF。**他没碰基线、没碰白名单。**

---

## ⚠️⚠️ 自我更正：**我的基线把 d 类结论写错了，总工是信了它才批的**

`i18n-baseline.md` 里我写：
> **d_otherText** 其余可见文本 | 11 | 已逐个核实=**真型号名**，**无需修**
> - `Gen 3 Mesh Router` / `Starlink 2M Router Cable` / `Internet Kit Satellite` / `Case`

**实际的 11 条根本不是这批。** 逐条重核（两棵树逐字相同，R1 没碰）：

| # | 实际内容 | 真实性质 |
|---|---|---|
| 1 | `‎Starlink 2M Router Cable` (657) | ✅ 真型号名字段值 —— 这条我写对了 |
| 2 | `Starlink Mini Internet Kit Satellite` (680) | ✅ 真型号短语（误报，pt 正文里的官方品名） |
| 3 | `carregadores PD/power banks` (702) | ⚠️ **假阳性** —— `power bank` 是巴葡通用外来词 |
| **4-6** | `Starlink Mini Car Power Adapter **main view**`<br>`Mini Car Power Adapter with Starlink Mini - **angled view**`<br>`Mini Car Power Adapter connected in a vehicle - **illustration**` (4205) | ❌ **真漏译** |
| **7-11** | `Gen 3 Pivot **Mount**` / `Starlink Gen 3 Mount` / `Starlink Pivot Mount` / `Starlink Mount Gen 3` / `Starlink Mount` (672) | ❌ **真漏译**（且是关键词堆砌 alt） |

### 根因：**是我自己漏的，不是 dev 的**

那 8 条在 **`description_html` 里内联 `<img>` 的 alt** 上。我在 Phase 2.5 译 64 条描述时，
**译了正文散文，把内联 img 的 alt 原样留成英文**：

```
4205  i18n[en].description_html    alt="Starlink Mini Car Power Adapter main view"
4205  i18n[pt-BR].description_html alt="Starlink Mini Car Power Adapter main view"   ← 逐字相同 = 没译
672   i18n[en]  ×5 alt="… Mount"
672   i18n[pt-BR] ×5 alt="… Mount"                                                    ← 逐字相同 = 没译
```

### 我为什么会写错

我调白名单时数字走过 **558 → 741 → 512**，**每次都重出了数字，却没重核那段「逐条结论」**。
那段描述的是**旧 scanner 版本**下的另一批条目。
→ **我冻结了数字，没冻结结论。** 这正是我自己那条规则的反面：
自建度量里，**结论和数字一样会漂**，而结论漂了更难发现 —— 因为它读起来仍然像已经核实过。

---

## 📌 验收地板的修正：**不是 11，是 ~3**

| | 原口径 | 修正后 |
|---|---|---|
| d 类合格值 | 11（"全是型号名，无需修"） | **~3**（2 条真型号 + 1 条外来词假阳性） |
| **R2 落完的合格线** | `translationLeaks == 11` | **`translationLeaks == ~3`**（a=0 b=0 e=0 d≈3） |

**那 8 条是我的活**：改 `i18n["pt-BR"].description_html` 里的内联 alt。
**纯 pt 数据 → 不碰 en → 不破 R2 的「en 字节一致」门 → R2 直接吃 → 零返工。**

⚠️ **但我没有自行开工**：改它会让验收地板从 11 挪到 ~3 ——
**在验收者脚下挪动合格线，哪怕是往严格挪，也必须先说、后做。** 等总工点头。

（另：`power bank` 是否进白名单 = **改考卷** → 若做必须 bump `SCANNER_VERSION` + 重出基线 + 留痕。
建议**先不动**：1 条噪音的代价远小于让基线不可比。）

---

## 📋 待总工裁决

1. **R1 是否放行？** 我的判断：**放行**。本职 `e_links 35→0` 100% 完成，交叉验证吻合，没碰考卷。
2. **那 8 条内联 alt 我改不改？**（纯 pt 数据、零门风险、我自己的漏）改完地板 11 → ~3。
3. **合格线是否改为 `translationLeaks == ~3`？**（原 "~0" 在字面上永远达不到）
4. **R2 分支必须先 rebase** 到含 `3c024a5d` 的 main —— 否则不可比（裸跑得 1651 vs 基线 547，纯属分叉点旧）。**这条卡着 R2 验收。**

---

*多语言窗 · 工具 `scripts/pt-leak-vs-baseline.mjs`（四道闸，不可比时拒绝出数）*
*四道闸都来自真踩到的坑：分叉点旧（R2 裸跑 1651=基线 3 倍）、扫活树（R1 worktree 一度 251 文件未提交，HEAD 连动三次，读数不可复现）*
