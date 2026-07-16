# R2 报告 — render.js locale 化(进行中)

**分支** `feat/i18n-chrome-r1` · commit-local 未 push

---

## 1. ⭐ R1 已交出可验证战果(R2 开工前先量,免得混功劳)

`node scripts/pt-leak-scan.mjs`(多语言窗的独立 oracle,**不是我自己写的尺子**)实测:

| | 基线 `pt-leak-baseline.json` | R1 落地后 | |
|---|---|---|---|
| **类② 英文链接**(`e_links`) | **35** | **0** | ✅ **R1 由构造杀掉** |
| 类① 可见文本(a+b+c+d) | 512 | 512 | R2 的靶子 |
| 泄漏总数 | 547 | 512 | −35 |

**那 35 处不是翻掉的,是路由规则派生后"物理上发不出来"了。** 印证 §5 的判断:存在性驱动的 `localizeUrl` 让"pt 页链回英文站"这个泄漏类**不可能再出现**。

### ⚠️ 靶子 = **455**,不是 466 —— 我一开始算多了一格(总工 2026-07-14 纠正)

我原写"靶子 466 = a199 + b256 + **d11**"。**错了,而且这个错很贵**:d 那 11 条 **R2 根本杀不掉**,照那个定我会**永远差 11,然后去追一个不存在的 bug,浪费整轮**。

多语言在 R1 验收时逐条重核(`ccd49f65`),d 的真相:

| 条数 | 真相 | 归谁 |
|---|---|---|
| **8** | **pt 数据里的漏译**:`description_html` **内联 `<img>` 的 alt** —— Phase2.5 译了正文散文,内联 img 的 alt 原样留英文(4205×3 + 672×5,pt-BR 与 en 逐字相同) | **多语言**(纯 pt 数据,正在修)|
| **2** | **真型号短语**(`Starlink 2M Router Cable` / `Internet Kit Satellite`) | **本就不该降 —— 降了说明型号被译坏** |
| **1** | 假阳性(`power banks` = 巴葡通用外来词) | 白名单候选,先不动(改考卷代价 >> 1 条噪音)|

> ⭐**生成器读什么渲什么。数据里是英文,渲出来就是英文 —— 这不是生成器的错,修它也不在生成器这一层。**
> R2 落完 **d 仍会是 11**;多语言修完那 8 条后 d 才变 3。

**→ 我的成绩单 = `a=0` 且 `b=0`。** e 已是 R1 战果(35→0),d 不是我的格子。
(总工先前说的"d 恰好是那 3 条"是**全局地板**,前提是多语言先修完它那 8 条 —— **那是两个窗口合起来的结果,不是我一个人的格子。**)

---

## 2. ⚠️ 开工即撞到的 schema 决策:manifest 必须自带 pt

**现状**:卡片标题来自 `data/products-index.json`,而条目只有**单个 en 字段**:
```json
{ "id": 650, "category": "enterprise", "form": "Cables",
  "title": "(2 Pack) For Starlink Ethernet Adapter…",   ← 只有 en
  "thumb": "…", "excerpt": "Seamless Ethernet Conversion…" }   ← 只有 en
```

**约束**(来自 render.js 顶部注释,是有意设计):
> *related is generated from lightweight manifest entries so **publish-time regen needs only the manifest (not every product JSON)***

→ CF Function 在 admin 发布时**只读 manifest**。若 pt 标题只存在 64 个产品 JSON 里,Function 就得读 64 个文件才能渲 pt 列表页 —— **违背这条设计,且让发布变慢/易错**。

**决策:manifest 条目加 locale 映射,保持自足**
```json
{ "id": 650, …, "title": "(en)", "excerpt": "(en)",
  "i18n": { "pt-BR": { "title": "…", "excerpt": "…" } } }   ← 新增,仅当有非 en 值时出现
```
- `title`/`excerpt` **保持 en 不动** → admin UI 读 `p.title` 无需改动(**向后兼容**)
- `cardHtml(e, locale)` → `e.i18n?.[locale]?.title ?? e.title`(字段级回退,与 catalog 同一套原则)
- **派生值不存数据**:`excerpt` 是从 `description_html` 截断派生的 → pt excerpt 由 pt description 派生,不手工存

---

## 3. R2 施工清单(照此)

| 项 | 做法 | 杀掉 |
|---|---|---|
| `render.js` locale 化 | `mergeI18n(prod, locale)` 字段级 `?? en`;`render(prod, {template, imgBase, related, locale, catalog})` | — |
| 卡片标题 | `cardHtml(e, locale)` 取 `e.i18n[locale].title ?? e.title` | **a 类 199** |
| **alt 后缀** | `alt = {本地化title} + " " + catalog["card.alt.suffix"][locale]`(pt-BR 已签 `- Produtos Tejoy`)。⛔**别删这个 key**——删后缀会改 en alt 输出 → 毁掉 en 字节一致门(多语言窗的判断,已采纳;另排独立改动) | **b 类 256** |
| `genRelated` | 同样走 `i18n[locale]` | a 类的一部分 |
| `meta_title` | **生成器派生、JSON 不存**:`{本地化title}-{model_display[category]}-Tejoy{catalog后缀}`。机型显示名取 `data/locales.json` 的 `model_display`(空格版),**实测 64/64 吻合** | 半英半葡 bug 类 |
| `meta_description` | **保持数据不动** —— 实测 **56/64 派生 + 8/64 真人文案 = 混合**,一刀切派生会毁掉那 8 条真文案 + 动 56 个线上 meta | — |
| 路由 | 复用 chrome-sync 的**存在性驱动** `localizeUrl` | (R1 已杀 e 类 35) |
| 机型显示名统一空格版 | `CATMAP` 连字符版是 URL slug 首字母大写的痕迹 → 引 `model_display` | **用户可见 → 单独 commit** |
| 列表页 chip 括号 | `product-chip__n`(页面内容,非 chrome,归 R2) | — |

---

## 4. 验收(两道门,都不许放宽)

### ⚠️ 合格线**不是 ~0**(总工 2026-07-14 修正,必须照此)

多语言窗挖出**它自己基线里的一个错**:d 类那 11 条标注"已核实=真型号名",但那个结论**描述的是旧 scanner 版本下的另一批** —— **它冻结了数字,没冻结结论**。重核真相:

| d 类 11 条的真实构成 | |
|---|---|
| **8 条真漏译** | Phase2.5 译描述时把**内联 `<img>` 的 alt** 留成了英文 → 多语言修(纯 pt 数据、不碰 en、**不破我的字节门**),R2 直接吃 |
| **2 条真型号名** | 本就该留英文 |
| **1 条假阳性** | — |

**→ 全局地板(两窗合力) = `a=0 且 b=0 且 e=0 且 d 恰好是这 3 条已列名的`**:
`657 "Starlink 2M Router Cable"` · `680 "Internet Kit Satellite"` · `702 "power bank"`

- ⚠️ **d 归 0 反而是错的** —— 那说明型号名被译坏了。**别追求好看的数字。**
- ⚠️ **d 不是 R2 的格子**:那 8 条在 pt 的 description_html 数据里,多语言修;我只对 **a、b** 负责(见 §1)。
- ⚠️ **d 仍是 3 条但内容换了 → 不通过**(修好旧的又漏了新的)

> 这条值得单记:**一个"更好看"的数字可能正是失败的证据。** 验收标准是"**是不是那 3 条**",不是"**是不是 3 条**"。

### 两道门
1. ⭐**独立 oracle**:`node scripts/pt-leak-scan.mjs` → 按上面的精确判据。
   **尺子是多语言窗写的、基线冻结在 git 里 —— 不由我说了算。** 达不到就写清差距和原因,**不粉饰**。
   ⚠️ 扫描要给**干净 commit 点**,别让它扫活树 —— 多语言曾扫到我活树的瞬时读数(1651),它**主动拒绝出数**,理由:「**拿半完成状态判人是不公正的**」。
2. ⭐**en 零回归**:`chrome-verify` 仍 **248/248**,且新旧 render.js 给同样输入产出同样字节。
   *(R1 的血泪:宽松的自证比没有自证更坏 —— 它给你一个绿灯。)*

---

## 5. 状态

- ✅ 已量基线(§1)、已定 schema 决策(§2)
- ⏳ render.js 改造未开始
