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
| `meta_description` | **保持数据不动** —— **61 派生 / 3 真人文案**(`4201` `703` `704`)= 混合,一刀切派生会毁掉那 3 条真文案。⚠️我原写的 56/8 **是错的**,见 §4.6 | — |
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

## 4.5 🔴 R2 第一次落地失败(501→2424)—— 根因是 item 7,已回滚

| 类 | 基线 | 落地后 | | |
|---|---|---|---|---|
| a_cardTitles | 199 | **15** | −184 | ✅ 我的格子,成了 |
| b_altSuffix | 256 | **64** | −192 | ✅ 我的格子,成了 |
| d_otherText | 11 | **2089** | **+2078** | ❌ **我砸的** |
| e_links | 35 | **256** | **+221** | ❌ **我砸的**(连 R1 的战果一起毁)|
| **translationLeaks** | 501 | **2424** | | **比基线坏 4 倍** |

**根因 = 我跳过了总工 R1 spec 的 item 7**(白纸黑字:「product.html 里硬编码的英文 chrome 也改成引用 partial —— **否则 render.js 生成的 64 页照样烧英文 chrome**」)。
以前这个洞看不见:pt 详情页由 phase2-convert 生成,**它的 CHROME[] 顺手译了 body chrome**。R2 一从模板重生成 → **模板的英文 body chrome 全回来**,连 body 里的 `/pt/` 链接一起变回英文 → e_links 爆炸。

### ⭐ 三条必须记住的

**① 一个验收器的宽度 = 你给它的定义的宽度**
`chrome-verify` 只对**它认识的三块**(header/footer/mobilenav)下断言。我把"chrome"定义成那三块 → **body chrome 可以烂掉而红灯永远不亮**。R1 的 248/248 **在它自己的定义域内是真的**,但那个定义域比我以为的窄。

**② 一个验证者的宽度 = 他所用工具的宽度**(总工的自评,比我的更狠)
> 「**我跑了你的机器,然后管这叫'独立验证'。机器的定义域是你定的 —— 我的'独立'从第一秒起就继承了你的盲区。**」
→ 换个人按同一个绿灯,不是独立验证。

**③ 完备性的裁判是扫描器,不是 chrome-verify**
- `chrome-verify`/`guard` 是**我的**工具、用**我的**定义 → 只能证明"**我定义的那部分**没坏"
- **多语言的扫描器扫全部可见文本** → **它才是"完备"的定义**
→ **「恰好 3 条」这条验收线本身就是完备性检查。** 别指望把 chrome-verify 做到完备(**做不到 —— 你永远不知道第 4 个面在哪**);让它对**已知的面**下硬断言,**让扫描器当裁判**。
→ 但**仍要扩宽 chrome-verify**,理由不是"求完备",而是:**一个窄验收器给出的绿灯,比没有验收器更危险** —— 它至少不该对 body chrome 保持沉默还显示 248/248。

**④ 这次失败证明机器在工作**
```
我的窄工具   → 没看见        ❌
广扫描器     → 当场抓 501→2424 ✅
我           → 干净回滚       ✅
```
**没有那把尺子,2424 处泄漏会带着 chrome-verify 的绿灯上线,总工会跟着签字。** 它刚把自己的建造成本挣回来。

### item 7 的确切靶子(实测,19 处 body 可见文本)
`Products`(banner 标题)· `Starlink-compatible accessories for every terminal generation`(banner 副标题)· `Contact Now` · `Back` · `Send an Inquiry` · `Interested in this product? Leave us a message and we'll reply as soon as possible.` · 表单标签 `Company Name`/`Name`/`Phone`/`Email`/`E-mail`/`Message`/`Submit` · `Related products` · `Category:` 等

⚠️**item 7 = 字符串 + 链接两件事**(总工点破):body 里的链接必须走 `localizeUrl`,不能硬编码在模板里 ——
> **否则 R1 那条"存在性驱动路由"被模板绕过去了。规则再对,绕过它的路径还在,就没用。**

---

## 4.6 ⚠️ 更正:我的 `56/8` 是错的 —— 真相 **61/3**(而且总工也错在同一处)

多语言**逐条人工真看**给出 **61/3**(真人文案仅 `4201` `703` `704`);总工用它的判据独立复跑,**61/3 一字不差**。**我和总工的 56/8 都错。**

### 为什么两个"独立"的人会一致地错
我俩都用**朴素字符串匹配**判"meta 是不是正文截断"。但**剥标签时的单词黏连 bug** 让匹配失败:
```
meta:  Connectivity Solutio|nThis compact P…    ← 黏连(剥 </p><p> 没留分隔)
正文:  Connectivity Solution This compact…      ← 有空格
→ 匹配失败 → 判成"真人独立文案" → 放进「别碰」名单
```
**而那 5 条(`4199` `4202` `675` `678` `4206`)正是黏连 bug 最典型的实例 —— 是本来就要修的东西。**
> ⭐**「别碰」名单上放着的,正是最该修的。**

### 我自己复验的结果:**58/6,仍然不对**(诚实记账)
按纪律我没有只接受更正,而是用**修正后的判据**(补回黏连处空格)复跑 → **58 派生 / 6 真人**(`4201 4206 677 700 703 704`)。
**比原来近了(8→6),但仍不是 61/3** —— 我的机械判据在 `4206` `677` `700` 上**依然判错**。
→ **所以我不声称"我复验了 61/3"。** 那个数来自**人工逐条真看**;我的机械尺子**至今没能复现它**。
→ **这本身就是本节教训的又一个证据:机械检查器在这类问题上一直在失败。**

### ⭐ 今天第四次同形
> **数据的缺陷,骗过了检测那个缺陷的检测器。**

| 出处 | 检查器共享了被检查者的哪个假设 |
|---|---|
| 黏连 bug 让"找黏连 meta"失败 | ← 本次 |
| 旁路管线顺手译了 body chrome → 让"模板缺 item 7"隐形 | ← 我 R2 |
| `chrome-verify` 只看它认识的三块 → body chrome 烂掉红灯不亮 | ← 我 R1 |
| **总工跑我的机器,管它叫"独立验证"** | ← 他 |

而这次更狠:**我和总工一致,反而让错误更自信** —— 他当时对多语言说"我=dev=56/8,你是离群值"。
> ⭐**两个独立验证者一致 ≠ 正确。如果他们瞎在同一处,一致只会让错误更自信 —— 而且会让那个唯一看对的人显得像离群值。**

**结论不变**:meta_description **保持数据不动**(3 条真人文案 > 0,一刀切派生仍会毁掉它们)。**变的是理由的数字 —— 别再引用 56/8。**

---

## 5. 状态

- ✅ 已量基线(§1)、已定 schema 决策(§2)
- ⏳ render.js 改造未开始

---

## 6. 📋 R2 之后的两项(外部审计 Codex,总工复核后归我;**现在不做**)

### 项1 `_redirects` 收窄(⭐零基线影响,只动 `_redirects` 不碰页面字节)
现状 `/about-tejoy/* → /about/ 301` **既太宽又太窄**(总工实测 + git 历史:`about-tejoy/` 下历史上只有过 index.html,删于 `7cb1b179`):
| URL | 现状 | 问题 |
|---|---|---|
| `/about-tejoy/` | 301 | ✅ 对(唯一真实老 URL)|
| `/about-tejoy/foo` | 301 | ❌ **任意垃圾路径被伪装成正常页,掩盖 404** |
| `/about-tejoy` | 404 | ⚠️ **不带斜杠的老链接丢了权重** |

改成:`/about-tejoy → /about/ 301` + `/about-tejoy/ → /about/ 301` + `/* → /404.html 404`

### 项2 13 页重复 `<meta name="description">` —— **可能 R2 已由构造修掉**
en 7 个(compatibility / contact / video / certifications-testing / starlink-compatible-accessories / patents-manufacturing / oem-odm-manufacturing)+ pt 对应 6 个。实测 compatibility、contact **各有 2 条**。

⭐**归我的理由**:这是**生成器/模板重复注入**的症状,而我正在重建生成器。
- **R2 落地后先跑一遍看还在不在** —— 单生成器很可能**由构造就修掉了**
- 还在再查根因;⚠️**别一页页删** —— 那是改症状,下次重生成又回来

### ⚠️ 基线纪律(总工已停手)
> 总工原话:「**我拿"能并行"当效率,结果是给正在验收的人反复挪考卷。**」

多语言所有会动 en 输出的活(656 的 4 个 HTML 伪图等)**已备好不推**,等 R2 验收通过再一起落。
**→ 我的基线 = `72b30e24`,在 R2 验收完之前不再移动。**

---

## 7. 🔴 穷举:模板缺 5 样 phase2-convert 会做的事(R2 收尾清单)

item 7 的教训是「**旁路管线默默做了模板不会做的事,我一次崩一个地发现**」。所以这次**一次性穷举**(对比现网 pt 页 vs 模板):

| head 项 | 现网 pt 页(phase2-convert 产物,真源) | 模板 | 后果(若不接) |
|---|---|---|---|
| `<html lang>` | `pt-BR` | **硬编码 `en`** | pt 页声明自己是英文 |
| `canonical` | `/pt/enterprise/650` | `{{CANONICAL}}` 但拼死 `/${category}/${id}` | 🔴 **pt 页 canonical 指英文页 = 告诉 Google「别索引 pt」→ 整个 pt 站 SEO 作废** |
| **hreflang trio** | en + pt-BR + x-default 三条 | **完全没有** | 搜索引擎不知道两版互为翻译 |
| `og:locale` | `pt_BR` | **没有** | 社交分享语言错 |
| JSON-LD `inLanguage` | `pt-BR` | **硬编码 `en`** | 结构化数据谎报语言 |

**→ R2 收尾必须让这 5 项全部由 locale 派生**,`urlOf` 已在 `genRelated` 接上(e_links 真凶),canonical/og:url 同理。

⭐**这 5 项 + item 7 的 18 条 + genRelated 是同一个形状**:
> **模板只会做英文版本会做的事。凡是 phase2-convert 顺手替 pt 做过的,模板都不知道 —— 而它们只在我从模板重生成时才暴露。**

**R2 剩余步骤**:接这 5 项 → 扩宽 chrome-verify 到 body chrome + head → R2 落地 → 多语言的 `pt-leak-vs-baseline.mjs` 自证(**a=0 且 b=0**)

## 8. ✅ 基线与 park 清单更新
- **基线 = `93b6972b`**(多语言撤了 656 的 4 个"图"——实为 XLinkCore 整页 HTML)。总工承诺:**R2 验收完前不再动 en**。
- ~~`_redirects` 收窄~~ **已由多语言做完并推**(`59b21519`),线上实测 `/about-tejoy → 301` `/about-tejoy/foo → 404`,**从 park 清单划掉**。
- **重复 meta:别去刨生成器** —— 多语言查完了,**根不存在**:那句话在 JSON-LD `description` 里 228 个文件(`@type: WebSite`,**站点描述全站一致=正确**),被当 `<meta name="description">` 用的只有 21 个,**生成它们的脚本 0 个**。真相是**31 个手写静态页的作者复制了首页那句凑数**。→ 建 `page-meta` catalog(路径→description)并进我的 catalog,**排 R2 之后**。
  (多语言自己也差点结案:它在 `product.html:133` 找到那句 → 以为是模板硬编码 → **逐行看才发现那是 JSON-LD 里的,不是 meta**。)

---

## 9. 📋 R2 之后:删 meta keywords 全站(Joe 拍板)+ ⚠️一处必须更正的前提

`<meta name="keywords">` 是死字段(Google 2009 年公开宣布不作排名信号),站上 248 页带着它。**Joe:删。**

### 实测范围(不是估的)
| | 数量 | 处置 |
|---|---|---|
| 带 keywords 的页 | **248** | |
| ├ **生成页** | **128** | 删模板第 96 行 + `render.js` 的 `KEYWORDS` token → **重生成即消失** |
| └ **静态页** | **120** | ⭐**并进 R3** —— 它们正是 R3 要模板化的那批,**别扫两遍** |
| `i18n.en.keywords` 非空 | **64/64** | 连数据一起删(总工倾向,我同意:留一个没人渲染的字段只会腐烂)|
| `i18n.pt-BR.keywords` | **0/64** | 本来就没有 → 印证 keywords 从来没进过 pt 契约 |

其余:`admin/index.html` 的「关键词(SEO)」输入框 + API 透传一并删(否则 Joe 还能填一个不会被渲染的字段);guard 复核不会因少字段误报。

### 🔴 更正总工的一个前提:**"品牌残留会自动消失"是错的**
> 总工原话:「`linkoostar`/`starlingkshop`/`DaierTek` 的品牌残留**有 3 处就在 keywords 里 —— 字段删了自动消失,不用单独清**」

**实测**:
| 位置 | 页数 | 删 keywords 后 |
|---|---|---|
| 在 `keywords` 里 | **6** | ✅ 自动消失 |
| **在 `keywords` 之外** | **20** | 🔴 **清不掉**(`enterprise/650` `657` `658` `669` …)|

**→ 照原说法我会以为品牌残留已解决而结案,把 20 页竞品品牌留在线上。**
**删 keywords 后必须单独扫一次品牌残留**,它是独立的一项,不是搭车项。

> 又一次同形:**一个"顺带就解决了"的乐观前提,会让人跳过验证。** 和"删掉那把多余的刀"、"两个验证者一致=正确"是同一个病 —— **越是听起来省事的结论,越要单独验它的前提。**
