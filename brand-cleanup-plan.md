# 第三方品牌清理 —— **方案（未执行）**

> Joe 的边界：**后台能改的 = 他的；后台改不到的 = 我们的。**
> 但我按字段核完之后，**结论跟"清 18 处"不一样：其中 16 处该等 Joe，不该我清。** 理由在下面。

---

## 🔴🔴 2026-07-16 更正：**下面 §二 的机制判断是错的**

**我原来的论点**：「`meta_title`/`keywords` 从 `title` 派生 → Joe 改完 title 会自动干净 → 我不该清」。
**总调度读了后台代码，我错了**：
```js
// functions/api/admin/[[path]].js:88
meta_title: en.meta_title || en.title,   // ← || 只在【空值】时回退；有值就【原样存】
```
- **后台原样传回，不重算。**
- **`admin/index.html` 里 `meta_title`/`keywords`/`meta_description` 各有一个可编辑 `<textarea>`**（第 91/92/95 行）
  → **Joe 说"后台只能改图片/标题/文案/分类"是不准的 —— 他的后台还能改这三个 SEO 字段，他不知道。**

### 我错在哪（方法层面）
> **「曾经是派生生成的」≠「每次编辑时会重新派生」。这是两个不同的断言。**
> 我的证据（`meta_title` 以 `title` 开头，5/5 吻合）**是真的**；推论**是假的**。
> **数据支持了一个错误的机制假设** —— 我把**观察到的模式**当成了**机制**，没去读那段代码。

### 修正后的真实账
| 字段 | Joe 改完标题后自动干净？ | 真正的原因 |
|---|---|---|
| `meta_title`（6 处） | ✅ **会** | **不是因为后台** —— 是 **dev 的 R2 派生它**（`render.js:20`：`meta_title is deliberately NOT read from data — it is DERIVED`）。**结论歪打正着，理由是错的。** |
| `keywords`（3 处） | ❌ **不会** | 独立存储，后台原样传回 |
| `meta_description`（5 处） | ❌ **不会** | 同上；且 dev 明确决定 **R2 不派生它**（保持数据） |
| `jsonld_product`（5 处） | ❌ **不会** | 后台根本没这个输入框 |

⚠️ **结论对 ≠ 推理对。同样的推理，下次会给出错误的结论。**

### ✅ Joe 的新决定（让这件事变简单了）
1. **`meta keywords` 整个字段删掉 —— 全站**（死字段，Google 2009 起就不看；249 个页面带着它，64/64 产品都存了）
   → **那 3 处 keywords 品牌残留自动消失，不用单独清。已派 dev，排在 R2 之后。**
2. **分工钉死**：Joe 审标题/图片/文案/分类 · 系统派生 SEO 标题（R2）· **我们清 `meta_description` + `jsonld_product`，但等 Joe 审完再清**

### 📌 所以现在：**什么都不清**
`meta_title` → R2 派生自动干净 · `keywords` → 字段整个删 · **`meta_description` + `jsonld_product`（10 处）→ 等 Joe 审完 64 个产品**，那时跑 `scripts/brand-residue-scan.mjs`，一次清干净且**跟源头一致**。

> **下面 §二 的证据（前缀吻合）仍然真实，但据此推出的"派生机制"不成立。保留原文以存错。**

---

## ⚠️ 一、我自己数了一遍，两个数字要更正

| | 报告说 | 我实测 |
|---|---|---|
| 我们的字段 | 18 处 | **18 个字段位，但 20 处出现**（`693` 的 en meta_description 里 `XLinkShop` 出现 **2 次**，jsonld 里也 2 次） |
| Joe 的字段 | 34 处 | **42 处** —— 差在 `images[].alt`（`669`×9 + `681`×6 + `686`×5 = **20 处**） |

**对账平**：每一处都归到了具体字段，`JSON.stringify(整个产品)` 的总数 = 各字段之和，**无遗漏字段**。

---

## 🔴 二、核心发现：**这 20 处里有 16 处是 Joe 那侧字段的派生物**

### 证据 1：`meta_title` / `keywords` 是从 `title` 机械派生的
```
669/681/686/693/702  meta_title 以 title 开头 → ✅ 全部是
669/681/686/693      keywords   以 title 开头 → ✅ 是（702 例外）

结构：meta_title = {title} + "-{分类}-Tejoy | Premium Starlink Accessories, Mounts & Power Solutions"
```
**品牌名在 `title` 里，所以派生物才带。**

### 证据 2：**dev 的 R2 代码里写着它不会再存 meta_title**
`functions/_lib/render.js`（dev 分支）：
```js
// meta_title is deliberately NOT read from data here — it is DERIVED (see metaTitleOf).
// meta_title = {localized title}-{model display}-Tejoy{locale brand suffix}
```

### 证据 3：`meta_description` / `jsonld_product.description` 是 `description_html` 的机械截断
```
693  en.meta_description = "【XLinkShop】 To avoid losses during use…"   ← 正文开头逐字
702  en.meta_description = "…The STARGEAR Starlink Router Mini cable Includes 6.5FT…"  ← 同
jsonld_product.description ＝ 同一段截断
```
**而 `description_html` 里：`693` 有 `XLinkShop`×5、`702` 有 `STARGEAR`×3 —— 那是 Joe 的地盘。**

### ⭐ 所以
> **Joe 一审掉 `title` 和 `description_html` 里的品牌，这 16 处派生物自动干净。**
> **我现在手改 = 白改**，而且**会污染派生链** —— 我踩过这个坑：上次手改 title 污染了机械派生的 `meta_title`，产出半英半葡，**是 scanner 抓到我自己的**。

---

## ✅ 三、方案：分三档

### 档 A —— **等 Joe，我不动**（16 处）
| 字段 | 产品 | 为什么等 |
|---|---|---|
| `i18n.{en,pt}.meta_title` | `669` `681` `686` | 从 `title` 派生 + **R2 会改成生成器派生、JSON 不再存** → **双重理由不动** |
| `i18n.en.keywords` | `669` `681` `686` | 从 `title` 派生 |
| `i18n.{en,pt}.meta_description` | `693`(×3) `702`(×2) | 从 `description_html` 截断 |

**验收方式**：Joe 审完 title/正文 → 重跑 `node scripts/pt-leak-vs-baseline.mjs` 或我的品牌扫描 → **这 16 处应自动归零**。若没归零，说明派生链断了，那时再单独处理。

### 档 B —— **可以清，但仍建议等**（5 处）
| 字段 | 产品 | 情况 |
|---|---|---|
| `jsonld_product` | `669` `681` `686` `693` `702` | dev 的 R2 契约**没说要派生它** → 技术上我可以清 |

**但**：`jsonld_product` 里的 `"name"` 和 `"description"` **也是 title/正文的拷贝**。
- 若我现在清 → Joe 改完 title 后，**jsonld 的 name 会与新 title 不一致**（我清的是旧文案）
- **jsonld 的存在意义就是「结构化地重复页面内容」** —— 它跟源头不一致，比带着品牌名更糟

→ **建议：等 Joe 改完，让 jsonld 跟着一起重生成。若 dev 不派生它，那时我一次性同步。**

### 档 C —— **⛔ 绝不碰**（42 处，Joe 的）
`title` · `description_html` · `summary_html` · **`images[].alt`**（后台有 alt 输入框）

---

## 📌 四、如果总调度仍要我现在清，我需要一个决定

**我可以照做，但要先说清代价**：
1. **16 处是白工** —— Joe 审 title 时会再改一遍同样的内容
2. **`meta_title` 我坚持不手改** —— 双重理由（派生链 + R2 会废弃它）。**这条我不建议破例。**
3. **`jsonld` 清了会与源头不一致** —— 除非同时接受"jsonld 暂时与 title 不同步"

**我的建议**：**只做一件事 —— 把品牌扫描脚本留下当验收工具。**
Joe 审完 64 个产品后跑一遍，**能立刻看出哪些派生物没跟着干净**。那比现在手改 20 处有用。

---

## 五、⚠️ 会移动 en 基线
档 A/B 任何一项落地都会动 `i18n.en.*` → **必须等 R2 验收通过**，单独 commit + 明写「en 基线已移动」。
**本方案零改动，只出方案。**

---

## 六、背景（总调度转述 Joe 的话，解释了一切）
- **XLinkCore 是 Joe 朋友的公司，朋友让他 copy 的** → 那 4 个 XLinkCore 的 HTML 假图 = **抓图脚本抓失败存成了 `.png`**，纯事故，已修（`2dbc538b`）
- **但 `linkoostar` / `STARGEAR` / `DaierTek` / `starlingkshop` 不是他朋友的牌子** —— 格式看是亚马逊卖家品牌
- → **xlinkcore 自己的产品页也是从别处抄的，tejoy 继承了整条链的残渣**
- → **这也解释了那些规格错误（48V / 15A 保险丝配 18AWG / IP60 叫 Waterproof）：从来没人拿实物核过**

**Joe 会自己一个个审 64 个产品，规格那摊归他。**

---

*多语言窗 · 按字段自查（对账平，无遗漏）· **零改动** · 待裁*
