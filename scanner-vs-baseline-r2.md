# 【1】R2 验收 —— scanner 对基线（**收官**）

| 项 | 值 |
|---|---|
| 被测 | **`430eca78`**（钉死的 ref，**未碰 dev 的活树** —— 它正在做 `performance-gen-2`，worktree 脏） |
| 方法 | `git archive 430eca78 → 临时目录 → 扫` |
| 基线 | scanner **v1.0.0** @ `69966153`（未 bump、未重出） |
| 可比性 | ✅ 页数 **90 = 90** · ✅ scanner 同版本 · ✅ 被测对象是钉死 commit，扫描期间不可能变 |

---

## ⭐⭐ 结论：**translationLeaks 501 → 18，且 d 恰好是地板 3 条**

```
类              基线   现在
a_cardTitles     199 →  15    ← 逐条看过：没有一条是真泄漏（见 §2）
b_altSuffix      256 →   0    ✅ catalog key 构造消除
c_filename        46 →   0    ⭐ 我剔出验收的那 46 条 —— dev 的派生顺手修掉了（见 §1）
d_otherText       11 →   3    ⭐ 命中地板 3/3 · 名单外 0 条
e_links           35 →   0    ✅ R1 战果保持

⭐ translationLeaks: 501 → 18   (= a15 + b0 + d3 + e0)
```

**【d 类地板 — 身份判定】✅ 通过：命中 3/3，名单外 0 条。**

---

## §1 ⭐ **我错了一条，而且是我亲手写进基线的**

我把 `c_galleryAltFilename`（46 条）**从验收里剔了出去**，理由写在 `i18n-baseline.md` 里：
> 「属既有数据质量问题、与翻译无关、**R2 也不会自动修** → 计入会让"逼近 0"**永远达不到**」

**dev 的派生方案把它们全修了：46 → 0。**

**我的剔除理由是错的。** 我判断"R2 不会自动修"时，假设的是 R2 会**读**那个字段；
dev 选择的是**不读它、按规则重新派生**：
```
images[].alt 为空 / 是文件名 / 已经就是标题  →  alt = i18n[locale].title（派生）
Joe 在后台显式设过                          →  他的值赢（后台有 alt 字段 = 那是他的）
```
→ **它不是"修好了 46 条"，是让那 46 条失去了存在的地方。**

**这正是我签 `card.alt.suffix` 时说的那句，只是这次是别人做到的**：
> **「256 处不是靠翻译关掉的，是靠删掉这个概念关掉的。」**

**而且 dev 独立验证了前提**（不是照总调度的话做）：**428 条 alt 里 369 条已逐字重复标题、59 条是文件名、0 条是真描述** → **派生零损失，且每加一种语言不用再翻 428 条**。

---

## §2 `a` 剩的 15 条：**逐条看过，没有一条是真泄漏**

**我的基线判据是 `/\/index\.html$/` —— 只看文件路径**，于是分类页上任何东西都成了"卡片标题"。
（总调度先看出这个分类问题，**我照抄了机器分类，没质疑它**。）

| 数 | 实际是什么 | 样本 | 归谁 |
|---|---|---|---|
| **5** | 分类页 `meta_title`（`<title>` 标签） | `Enterprise-Tejoy \| Premium Starlink Accessories…` | **dev / R3** |
| **6** | `pt/index.html` 的**分类卡 alt** + 1 张背景图 alt | `Standard Circular - tejoy product category` · `TEJOY company background wall` | **alt 派生没覆盖首页** |
| **2** | ⚠️ **葡语假阳性 —— 我的 scanner 误报** | `Conversão Ethernet sem interrupções: Converta facilmen…` | **我的**（挂账） |
| **2** | `【XLinkShop】` 品牌残留 | `【XLinkShop】 Para evitar perdas durante o uso…` | **等 Joe 审正文**（是 `description_html` 的派生物） |

→ **真正待办只有 5 条 `meta_title` + 6 条首页 alt。** 其余 4 条要么是我的误报，要么等 Joe。

---

## §3 📋 剩余（全部）

| # | 问题 | 数量 | 归谁 |
|---|---|---|---|
| 1 | 分类页 `meta_title` 未本地化 | 5 | **dev / R3** |
| 2 | `pt/index.html` 分类卡 alt + 背景图 alt | 6 | **alt 派生未覆盖首页** —— 同一个方案延伸即可 |
| 3 | `【XLinkShop】` | 2 | **等 Joe 审正文**（派生物，源头一改就没） |
| 4 | scanner 对葡语正文误报（`Conversão…` 被英文标记词命中） | 2 | **我的**（挂账，不影响判定） |
| 5 | 基线 `a` 类判据只看路径 → 混入 alt/meta_title/假阳性 | — | **我的**（挂账） |

---

## §4 ⚠️ 方法留痕：**没扫活树**

dev 的 worktree 此刻有 3 个未提交文件（它在做 `performance-gen-2`）。
→ **我没跑 `pt-leak-vs-baseline.mjs`**（闸会拦，而且拦得对），改用 `git archive` 把**钉死的 `430eca78`** 导出到临时目录再扫。
**被测对象是一个 commit，不是一棵会动的树。**

**这一轮我三次差点拿瞬时状态判人**（130 页占位符 / placeholder"存量" / 现在这次），**三次都躲过了**。

---

## §5 dev 的自我诊断 —— **今天所有错的母形**
> *"I checked the live pt page — **the right method**. But the file I checked was in my working tree, i.e. **it was already my own R2 output**. **I measured my own reflection and filed it as evidence about the original.**"*

**「我量了自己的倒影，然后把它当成了关于原件的证据。」**

今天全部的错都是这个形状：
- 我的 `!src` / `?v=` / 空 `<img/>` / 「文件存在+200 = 好图」
- 我把「`meta_title` 以 `title` 开头」当成「它由 `title` 派生」
- 我把「c 类 R2 不会修」当成事实 —— **而 dev 换个渲染规则就修掉了**
- 「旁路管线替主管线遮丑」/「验收器只看它认识的三块」

→ **量到的不是你以为的那个东西。**

---

*多语言窗 · 被测 `430eca78`（钉死 ref，未碰活树）· 基线 scanner v1.0.0 @ `69966153` 未 bump*
