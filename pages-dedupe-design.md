# pages 去重 —— catalog 设计（给 dev）

> **906 条里 429 条是复印件。它们不该被翻译,它们不该存在。**
> 这份不碰内容,只碰结构。多语言窗 2026-07-17 · 总工批准

---

## 为什么做:**不是省事,是 pt 已经漂了**

同一个 en 串,pt 却有**多种译法** —— **23 / 477 个串已经发生**:

```
"About Us"  →  "Sobre Nós"  /  "Sobre"  /  "Sobre a Tejoy"
"FAQ"       →  "Perguntas frequentes"  /  "FAQ"        ← pt 自己两种都有
品牌串       →  "…para Starlink" / "…Starlink: Suportes…" / "…Starlink, Suportes…"
```

**69 个 "More" 存在 69 个地方,没有任何机制让它们一致。** 这不是"pt 翻得不好",
这是**存重复字符串的必然结果**。

> 我签 `card.alt.suffix` 时写过:
> **「256 处不是靠翻译关掉的,是靠删掉这个概念关掉的。」**
> **这 429 条是同一个形状。**

⚠️ 而我差点错过它:我在 `video.json` 注释里写过「pt 在这里用了冒号而 chrome 用逗号 —— pt 自己不一致」。
**我当时以为那是一处偶然。它是 23 处系统性 drift 的一个样本。**

---

## 账:906 条的去向（**已对账,三类相加 = 906**）

| | 串 | 引用处 | 处置 |
|---|---:|---:|---|
| ① **chrome.json 里已经有 key** | 26 | **161** | ⭐ **不需要新 key —— 指向已有的那个,pages 侧全部消失** |
| ② 需要新的**共享 key** | 58 | **352** | 352 处收敛成 58 条 |
| ③ 真正 page-specific | 393 | 393 | 留在原地 |
| | | **906** ✅ | |

```
⭐ es 真正要翻 = 58（共享）+ 393（page-specific） = 451 条
   —— 不是 906，不是 477，是 451
```

> ⚠️ **这份文档的初稿在这张表上写错了两个数(18 串/153 处 → 459 条)。**
> 我只算了「pages 内部重复【且】chrome 有」的 18 个,**漏掉了「pages 内部只存了一份、
> 但 chrome 里也有」的另外 8 个** —— 它们同样该指向 chrome key。
> **是 `catalog-dupe-check` 报 86 而我文档写 76,逼我回去重算的。**
> 📌 **给 dev 的设计文档里放一个错数字,他跑出来对不上,只会以为工具坏了。**

### 📌 两个口径,别混（都对）

| | 数 | 口径 |
|---|---|---|
| 上面这张表 | 906 条目 | **pages 条目**,chrome 不计入 |
| `catalog-dupe-check` | **86 串 / 543 处** | **chrome + pages 全局**,且只问"是否重复"(chrome 自己那份也算一个实例) |

**去重完成后,`catalog-dupe-check` 应报 0。那是验收线。**

### ① —— **pages 存了一份 chrome 已有的东西**（26 串 / 161 处）

```
36×  "Tejoy | Premium Starlink Accessories, Mounts & Power Solutions"
       → 已有 header.tejoy_premium_starlink_accessories
       ⭐ pt 恰恰在这 36 处漂出了【三种译法】。指过去 = drift 自动消失。
18×  "Home"               → 已有 header.home
 3×  "FAQ"                → 已有 header.faq      ⭐ pt 在这里也漂了（FAQ / Perguntas frequentes）
 2×  "Standard Circular"  → 已有 footer.standard_circular
 2×  "Standard Actuated"  → 已有 footer.standard_actuated
 2×  "Standard"           → 已有 footer.standard
 2×  "Enterprise"         → 已有 footer.enterprise
 …
```
**这一类零决策:值已经存在且已翻好,pages 只是又抄了一份。**

### ② —— 需要新共享 key（58 串 / 352 处）

```
69×  "More"                                              → common.more
18×  "Tejoy is a leading third-party manufacturer of…"   → ld.org.description
18×  "Tejoy is a leading manufacturer of… 15+ years…"    → ld.org.description.alt
18×  "Starlink-compatible accessories"                   → ld.org.knowsAbout.1
18×  "satellite internet accessories"                    → ld.org.knowsAbout.2
18×  "RV connectivity"                                   → ld.org.knowsAbout.3
18×  "off-grid power"                                    → ld.org.knowsAbout.4
18×  "mounting systems"                                  → ld.org.knowsAbout.5
```
**JSON-LD 那 7 条 × 18 页 = 126 处,是【站点级常量】(公司简介),不是页面级内容。**
它们每页存一份,纯属结构错位。

⚠️ **两个 `ld.org.description` 内容【不同】**(一个讲 third-party 独立性,一个讲 15+ 年/200+ 专利),
**不要合并** —— 那是内容决定,不是我的。保留两个 key,如实命名。

---

## 放哪

**建议 `data/pages/_shared.json`**,而不是塞进 `chrome.json`。理由:

- `chrome.json` 的语义是「**每页都渲染的外壳**」(header/footer/nav)。`common.more` 和 JSON-LD 样板不是外壳。
- guard 已经**从目录读** `data/pages/*.json`(`i18n-check.mjs:25`),**新文件自动进 guard,没人需要记得**。
- ⚠️ `_` 前缀 —— **实测过了,不是我推的**(临时放了个 `data/pages/_probe.json` 进去跑 guard):
  - **文件名带 `_` 会被正常读入** ✅ —— guard 只排除 `home-tiles.json`,不看前缀(`keys` 从 986 → 987)
  - **key 名带 `_` 会被当 doc 跳过** ✅ —— `_should_be_skipped` 没被报,只报了 `probe.real_key`
  - → **文件名可以有 `_`,key 不能。**（探针已删）

---

## ⭐⭐ 验收:**去重之后,要有东西防止它再长回来**

否则半年后又有人复制粘贴,**而且没有任何东西会告诉他**。

**可测的断言:整个 catalog 里,任何两个 key 不许有相同的 `en` 值。**

```
node scripts/catalog-dupe-check.mjs        # ✅ 已写并已提交
```
- **现在跑 = 报 86 个重复串 / 543 处**(全局口径,见上)
- 去重完 = **0**  ← **这就是验收线**
- 之后任何人再复制一份 → **当场红**

⚠️ **例外必须显式**:如果两个 key 真的该有相同的 en 值(不同语境下巧合同形),
需要 `"reason.dupe": "..."` 显式声明 —— **和 `allowMissing` 同一个道理:
「我忘了」和「我故意」不能长得一样。**

---

## 顺带:两个不该我做但你们该知道的

1. **pages 的 `meta.title` 是【存】的** —— 而 `render.js:20` 对产品明确写着
   *"deliberately NOT read from data — it is DERIVED"*。
   **存派生值 = 标题一改就静默漂,这正是当初半英半葡 meta_title 上线的成因。**
   → pages 的 meta.title 也该派生(`{page title}-Tejoy{meta.title.suffix}`)。**又能消掉 ~18 条。**

2. **guard 的 `unused` 不进 fail** —— `fail = gaps || orphans`,
   而且 `⚠️ 无人使用的 key` 后面还会打一个**大绿的 ✅,还是最后一行**。
   去重会产生大量 unused key,**它们会被列出来但没有任何东西强制清理**。
   → 建议同期修:**有 unused 时不许打 ✅**(不动 fail 语义,只是别撒谎)。

---

## 我这边的顺序

1. dev 做去重 → 我翻 **459**(不是 906,也不是 477)
2. ⭐ **去重会顺手修掉 pt 那 23 处已发生的 drift** —— 同一个 key 只有一个值,漂不了。
   **这不是 es 的活儿,但 es 的去重会把它一起解决。**
3. **products 206 条:等 Joe 审正文。别翻。**
