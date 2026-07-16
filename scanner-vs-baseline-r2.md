# 【1】R2 验收 —— scanner 对基线（最终）

| 项 | 值 |
|---|---|
| 被测树 | `C:\开发\tejoy-r1-wt` |
| 被测分支 | `feat/i18n-chrome-r1` @ **`8b3e880e`** |
| 基线 | scanner **v1.0.0** @ `69966153`（未 bump、未重出） |
| 前置闸 | ✅ 树干净 · ✅ 扫描期间 HEAD 未变 · ✅ 含基线 commit · ✅ scanner 同版本 · ✅ 页数同为 90 |

---

## ⭐ 结论：**R2 在它射程内 —— 干净。剩下的全是一个数据模型缺口。**

| 类 | 基线 | 现在 | 变化 | 判定 |
|---|---|---|---|---|
| **b_altSuffix** | 256 | **0** | **−256** | ✅ **100% 清空**（catalog key 构造消除） |
| **e_links** | 35 | **0** | −35 | ✅ 保持（R1 战果） |
| **a_cardTitles** | 199 | **15** | −184 | ✅ 真卡片标题 **184 → 0**；剩 15 是**分类页 `meta_title`**（基线分类器把两种东西混成了一类，见 §2） |
| **d_otherText** | 11 | **741** | +730 | ⚠️ **738 = `images[].alt`（数据模型缺口）+ 3 = 地板** |

**translationLeaks 501 → 756** —— ⚠️ **这个数不能照字面读**（见 §1）。

---

## §1 ⭐ 决定性检验：**把 `images[].alt` 那一类拿掉，d 恰好是地板 3 条**

```
d 类 741 条  →  按 kind 拆:  alt 738 · text 3

去掉全部 kind==='alt' 后剩 3 条:
  [text] pt/enterprise/657.html:374  hits=["router","cable"]  "‎Starlink 2M Router Cable"
  [text] pt/mini/680.html:380        hits=["satellite"]       "Compatibilidade específica com Starlink Mini…"
  [text] pt/mini/702.html:380        hits=["power"]           "Chip inteligente e protocolo PD…"

✅ 命中地板: 3 / 3      ❌ 名单外: 0
```

→ **`d` 的可见文本部分 = 恰好那 3 条已列名的。一条不多，一条不少。**
→ **R2 把它能碰的可见文本全清干净了。** 那 738 条不是 738 个问题，**是同一个数据模型缺口的 738 次重复投影**。

### 🔴 那 738 条的根因（我早报过，`alt-quality-investigation.md` @ `2be1cd44`）
```
images[].alt  ——  语言中立的单一字段，在 i18n 之外
```
R2 从 `data/products/*.json` 渲染 pt 页时按原样取用 → **pt 页必然印英文 alt**。

> **不是 dev 写错了代码。补 `i18n[locale].images[].alt` 槽之前，R2 无论怎么写都会印英文。**

⚠️ 且 **`images[].alt` 是 Joe 的地盘**（后台有 alt 输入框）→ **补槽 = 数据模型改动 + 触及 Joe 的地盘 → 得总调度定。**

---

## §2 `a` 剩的 15 条：**基线分类器把两种东西混成了一类**（总调度指出，我认）

我的基线里 `a_cardTitles` 的判据是 `/\/index\.html$/`（**只看文件路径**），
于是**分类页上任何东西**都被归成了"卡片标题"。实际这 15 条是：
```
pt/enterprise/index.html:115      "Enterprise-Tejoy | Premium Starlink Accessories…"   ← meta_title
pt/index.html:274                 "Standard Circular - tejoy product category"          ← 分类卡 alt
pt/index.html:484                 "TEJOY company background wall"                       ← 图片 alt
pt/mini/index.html:646            "【XLinkShop】 Para evitar perdas…"                    ← 品牌残留(等 Joe)
pt/products/index.html:425        "Conversão Ethernet sem interrupções…"               ← ⚠️ 葡语!误报
```
**真正的产品卡标题 184 → 0 ✅** —— 是总调度先看出这个分类问题的，**我的报告里照抄了机器分类，没质疑它**。

**注**：`pt/products/index.html:425` 那条是**葡语**（`Conversão Ethernet sem interrupções…`），
被 `hits` 命中英文标记词 → **假阳性**。这说明基线的 `a` 类里本就掺着噪音。

---

## 【d 类地板 — 身份判定】
| 地板 3 条 | 在? |
|---|---|
| `Starlink 2M Router Cable`（`pt/enterprise/657.html`） | ✅ |
| `Starlink Mini Internet Kit Satellite`（`pt/mini/680.html`） | ✅ |
| `power bank`（`pt/mini/702.html`，假阳性） | ✅ |

**3/3 全在，名单外 0 条**（在排除 `images[].alt` 那一类之后）。

⭐ **身份判定在这一轮证明了两次自己**：
1. 上一轮 d=1061 时，它同时给出「地板完好」+「多出 1050 条且是什么」—— **计数只能给出"失败"**
2. 这一轮它让我能干净地断言「**去掉 alt 那一类，恰好是那 3 条**」—— **这是"通过/不通过"之外的第三种答案：R2 通过了，缺口在别处**

---

## 📋 剩余待办（按归属）

| # | 问题 | 数量 | 归谁 |
|---|---|---|---|
| 1 | 🔴 **pt 页英文图库 alt** | **738** | **总调度定** —— 补 `i18n[locale].images[].alt` 槽（数据模型 + Joe 的地盘）。**这是唯一挡着 d 归零的东西** |
| 2 | 分类页 `meta_title` | ~8 | **dev / R3** |
| 3 | `pt/mini/index.html` `pt/products/index.html` 的 `【XLinkShop】` | 2 | **等 Joe 审**（正文品牌残留的派生物） |
| 4 | 基线 `a` 类判据只看路径 → 混入 alt/meta_title/假阳性 | — | **我的**（基线口径问题，不影响本次判定，挂账） |

---

## 📌 本轮实录（三次差点误判，全部躲过）
1. **`bc7e889b`**：130 页印着 `{{t.body.contact_now}}` 占位符 → 正要报"R2 打坏 130 页"，查 HEAD 发现 **dev 已自修**（`7286c17d`）
2. **`7286c17d`**：placeholder `Company Name` 被判"存量泄漏、要我造译文" → **实测现网 4 页全是葡语，真源在 `phase2-convert.js:54`** → **是回归，译文一直都在**
3. dev 的自我诊断（值得留档）：
   > *"I checked the live pt page — the right method. But the file I checked was in my working tree, i.e. **it was already my own R2 output**. **I measured my own reflection and filed it as evidence about the original.**"*

**→ 第 3 条是今天所有错的母形：`量到的不是你以为的那个东西`。**

---

*多语言窗 · 工具 `scripts/pt-leak-vs-baseline.mjs`（四道闸，不可比时拒绝出数）*
