# 【1】R2 验收 —— scanner 对基线

| 项 | 值 |
|---|---|
| 被测树 | `C:\开发\tejoy-r1-wt` |
| 被测分支 | `feat/i18n-chrome-r1` @ **`7286c17d`**（dev 自修后的版本，见 §0） |
| 基线 | scanner **v1.0.0** @ `69966153`（未 bump、未重出） |
| 前置闸 | ✅ 树干净 · ✅ 扫描期间 HEAD 未变 · ✅ 含基线 commit · ✅ scanner 同版本 · ✅ 页数同为 90 |

---

## ⚠️ §0 先说一件差点让我误判的事

第一次跑验收时被测的是 **`bc7e889b`**（"R2 lands"），结果 **d 类 11 → 1957**，
页面上直接印着 **`{{t.body.contact_now}}` / `{{t.body.form.company}}`** ——
**130 个页面（64 pt + 66 en）全是未替换的模板占位符**，用户看到的就是那行花括号。

**我正要报「R2 把 130 个页面打坏了」，先查了一眼 HEAD**：
```
7286c17d  fix(i18n): render resolves the body-chrome tokens — they ARE the English now   ← dev 自己修了
bc7e889b  feat(i18n): R2 lands …                                                          ← 我测的那个
```
**dev 在我扫描期间自己抓到并修了。** 我若照报，报的是一个**已被撤销的瞬时状态**。
→ **这是我第三次差点这么干。本报告的被测对象是 `7286c17d`。占位符问题已不存在（en/pt 双侧实测 0 处）。**

---

## ⭐ 结论：**不通过** —— 但**两格是 dev 的战果，一格是新回归**

| 类 | 基线 | 现在 | 变化 | 归谁 | 判定 |
|---|---|---|---|---|---|
| **b_altSuffix** | 256 | **0** | **−256** | **R2 catalog key** | ✅ **100% 清空** |
| **a_cardTitles** | 199 | **15** | **−184** | **R2 生成器** | ✅ 降 92%，**但未归零** |
| **e_links** | 35 | **0** | −35 | R1 `localizeUrl` | ✅ 保持 |
| **d_otherText** | 11 | **1061** | **+1050** | ⚠️ **新回归** | ❌ |
| c_galleryAltFilename *(不计入)* | 46 | 46 | 0 | 图片/数据质量档 | — |

**translationLeaks: 501 → 1076** —— ⚠️ **这个数字不能照字面读**：d 类的 +1050 淹没了 a/b 的 −440。

### ✅ dev 做到的
- **`b_altSuffix` 256 → 0** —— 我签的 `- Produtos Tejoy` 已由 catalog 生效。**由构造消除，不是翻掉的。**
- **`a_cardTitles` 199 → 15** —— 降 92%

### ❌ 但 a 没归零（合格线是 a=0）
剩余 15 条全在 `pt/*/index.html` **分类页**上：
```
pt/enterprise/index.html:115  "Enterprise-Tejoy | Premium Starlink Accessories, Mounts &amp;…"
```
—— 这是**分类页的 `meta_title`**，不是产品卡标题。**需 dev 确认是否在 R2 射程内。**

---

## 🔴 d 类 11 → 1061：真回归，构成已查清

按 `kind` 拆：**`alt` 738 · `text` 259 · `placeholder` 64**

### 大头（738 `alt`）：**pt 页出现了 14 个英文图库 alt**
```
基线  pt/enterprise/650.html  英文 alt（"For Starlink…"）:  0 处
现在  同一文件                英文 alt:                     14 处
葡语 alt 两边都是 4  → 不是我的译文被冲掉，是 R2 新渲染出了英文的
```
**根因（结构性，我早报过）**：那是 **`images[].alt`** —— **语言中立的单一字段，在 `i18n` 之外**。
R2 从 `data/products/*.json` 渲染时按原样取用 → **pt 页印出英文 alt**。

⚠️ **这正是 `alt-quality-investigation.md`（`2be1cd44`）的结论**：
> `images` 不在 `i18n` 里 → 改它 en/pt 同时变，**物理上做不到只改 pt**
> 要修**必须先加 `i18n[locale].images[].alt` 槽**（数据模型改动）

→ **不是 dev 写错了代码，是数据模型缺一个槽。补槽之前，R2 无论怎么写都会印英文 alt。**

### 中头（259 `text`）+ 小头（64 `placeholder`）：表单正文 chrome
**范围比看起来小得多** —— 逐条核过：

| | 基线 | 现在 |
|---|---|---|
| 标签 `>Nome<` `>Telefone<` `>E-mail<` `>Mensagem<` | 葡语 | **葡语 ✅ 完好** |
| placeholder `Seu nome` / `Seu telefone` / `Seu e-mail` / `Sua mensagem` | 葡语 | **葡语 ✅ 完好** |
| **placeholder `Nome da empresa`** | **葡语** | **`Company Name` ❌ 回归** |

→ **5 个 placeholder 里只有 1 个回归**，**标签全部完好**。
dev 的 body-chrome token 覆盖了标签和 4 个 placeholder，**漏了 `company` 那一个**。

---

## 【d 类地板 — 身份判定】❌ 不符
| 地板 3 条 | 在? |
|---|---|
| `Starlink 2M Router Cable`（`pt/enterprise/657.html`） | ✅ |
| `Starlink Mini Internet Kit Satellite`（`pt/mini/680.html`） | ✅ |
| `power bank`（`pt/mini/702.html`，假阳性） | ✅ |

**那 3 条全在** —— 但**名单外多出 1050 条**（上面已拆解）。

⭐ **这正是身份判定的价值**：若只看计数「d 应为 3 条」，**这次会看到 1061 直接判失败，却说不出哪 3 条还在、多出的是什么**。
身份判定同时给出了「地板完好」+「多出 1050 条且是什么」—— **计数做不到。**

---

## 📋 待办（按归属）

| # | 问题 | 归谁 | 备注 |
|---|---|---|---|
| 1 | `a_cardTitles` 剩 **15**（分类页 `meta_title`） | **dev** | 合格线 a=0 |
| 2 | `placeholder="Company Name"` 未 token 化 | **dev** | 5 个里漏 1 个 —— 小修 |
| 3 | 🔴 **pt 页 14 个英文图库 alt** | **数据模型 / 总调度定** | **需先加 `i18n[locale].images[].alt` 槽**；**不是代码 bug，补槽前 R2 怎么写都会印英文**。且 `images[].alt` 是 **Joe 的地盘**（后台有 alt 输入框） |

**我的判断**：#1 #2 是 dev 的收尾；**#3 是结构问题，得总调度定**（补槽 = 数据模型改动，且触及 Joe 的 alt 地盘）。

---

*多语言窗 · 工具 `scripts/pt-leak-vs-baseline.mjs`（四道闸，不可比时拒绝出数）*
*⚠️ 本轮实录：`bc7e889b` 有 130 页占位符 → dev 自修为 `7286c17d` → **我没拿已撤销的状态判人**（第三次）*
