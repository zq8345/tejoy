# pt 泄漏验收 —— **收官：501 → 7，且 7 条里没有一条是真泄漏**

| 项 | 值 |
|---|---|
| 被测 | `feat/i18n-chrome-r1` @ **`eedd081b`**（树干净，扫描期间未变） |
| 基线 | scanner **v1.0.0** @ `69966153`（**未 bump、未重出** —— 全程同一把尺） |
| 前置闸 | ✅ 树干净 · ✅ 扫描期 HEAD 未变 · ✅ 含基线 commit · ✅ scanner 同版本 · ✅ 页数 **90 = 90** |

---

## ⭐⭐ 最终账

```
类               基线   现在    变化
a_cardTitles      199 →   4    −195   ← 逐条核过：**4 条全是葡语，无一真泄漏**（见 §1）
b_altSuffix       256 →   0    −256   ✅ catalog key 构造消除
c_filename         46 →   0    − 46   ⭐ 我判"修不掉"并剔出验收的那批 —— 派生方案全修了
d_otherText        11 →   3    −  8   ✅ **身份判定通过：恰好是那 3 条已列名的**
e_links            35 →   0    − 35   ✅ R1 战果保持

⭐ translationLeaks: 501 → 7   （降 99%）
```

**【d 类地板 — 身份判定】✅ 通过 —— 恰好是那 3 条，一条不多一条不少。**

---

## §1 `a` 剩的 4 条：**逐条看过，全是葡语**

```
[text] pt/enterprise/index.html:423   hits=["high"]
[text] pt/products/index.html:425     hits=["high"]
   "Conversão Ethernet sem interrupções: Converta facilmente o conector Starlink Flat High P…"
   → ⚠️ **我的 scanner 误报**：`High` 是产品型号的一部分（`Flat High Performance`），不是英文残留

[text] pt/mini/index.html:646         hits=["power"]
[text] pt/products/index.html:711     hits=["power"]
   "【XLinkShop】 Para evitar perdas durante o uso… escolha um power bank…"
   → ⚠️ **`power bank` 是巴葡通用外来词** —— **这正是我地板名单里的第 3 条**，
      只因出现在 index.html 上，被我那个「只看文件路径」的判据归进了 a 类
   → 另：`【XLinkShop】` 是品牌残留，**等 Joe 审正文**（它是 `description_html` 的派生物）
```

→ **4 条里：2 条是 scanner 误报，2 条是地板项被错分 + 等 Joe 的品牌残留。**
→ **pt 侧的可见文本，实际已经干净了。**

---

## §2 ⚠️ 我这把尺子自己的 3 个缺陷（挂账，不影响本次判定）

| # | 缺陷 | 表现 |
|---|---|---|
| 1 | **`a` 类判据只看文件路径**（`/\/index\.html$/`） | 分类页上**任何东西**都被归成"卡片标题" —— 实际混着 `meta_title`、分类卡 alt、品牌残留、**甚至地板项本身** |
| 2 | **`Flat High Performance` 里的 `High` 被当英文标记词** | 型号名被误报（`Starlink` 在白名单里，`High` 不在） |
| 3 | **`c` 类被我剔出验收，理由是"R2 不会自动修"** | **错。派生方案修掉了。**「X 修不掉」是关于**所有可能方案**的全称断言 —— 我只检查了我想到的那一个 |

**→ 若重做基线，`a` 类该按 DOM 位置分（卡片 / `<title>` / alt），而不是按文件路径。**

---

## §3 这一路是怎么清掉的 —— **两次都不是靠翻译**

| 类 | 数量 | 怎么清的 |
|---|---|---|
| **b_altSuffix** | 256 | **catalog key**（我签 `- Produtos Tejoy`）→ 它不再是每页一份的字符串 |
| **c_filename** | 46 | **派生规则**（`alt = i18n[locale].title`）→ 那 46 条**失去了存在的地方** |

> **「256 处不是靠翻译关掉的，是靠删掉这个概念关掉的。」**
> —— 我签 `card.alt.suffix` 时写的。**c 类那 46 条，是 dev 把同一个道理用在了我判"修不掉"的那批上。**

---

## §4 方法留痕：**这一轮四次差点拿错东西判人，四次都躲过**

1. **`bc7e889b`**：130 页印着 `{{t.body.contact_now}}` → 正要报"R2 打坏 130 页"，查 HEAD 发现 **dev 已自修**
2. **placeholder "存量"前提**：实测现网 4 页全葡语、真源在 `phase2-convert.js:54` → **是回归，译文一直都在**
3. **dev worktree 脏时**：没跑闸，改用 `git archive` 导出**钉死的 ref** 再扫 —— **被测对象是一个 commit，不是一棵会动的树**
4. **刚才**：我的 Monitor 报 `meta_title 从 1 涨到 2` → 一查是**它数的是整个文件的字符串出现次数，没区分标签** —— `<title>` 已修好，剩的是 `og:title`/`twitter:title`，**实际是 3 降到 2**

### ⭐ dev 的自我诊断 —— 今天所有错的母形
> *"I checked the live pt page — **the right method**. But the file I checked was in my working tree, i.e. **it was already my own R2 output**. **I measured my own reflection and filed it as evidence about the original.**"*

**「我量了自己的倒影，然后把它当成了关于原件的证据。」**

我的 `!src` / `?v=` / 空 `<img/>` / 「文件存在+200=好图」/「`meta_title` 以 `title` 开头 = 它由 title 派生」/
「c 类修不掉」/ 旁路管线替主管线遮丑 / 验收器只看它认识的三块 / **刚才那个 Monitor** ——
**全是同一个形状：量到的不是你以为的那个东西。**

---

*多语言窗 · 全程同一把尺（scanner v1.0.0，未 bump、未重出基线）· 被测树干净、扫描期未变*
