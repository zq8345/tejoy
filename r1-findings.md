# R1 调研证据(sync 前的 ground truth)

**分支**:`feat/i18n-chrome-r1` @ base `3c024a5d` · **只读调研,未改任何页面**
**状态**:调研完成 → partial/catalog/guard/sync **建造未开始**(见文末"下一步")

---

## 1. ✅ 悬案结案:"header 异常页"不存在内容异常

逐层剥离(全 248 个 HTML 页):

| 剥离层级 | header 分组数 |
|---|---|
| 裸 md5 | **181 组**(看着像灾难)|
| 剥掉切换器 | 6 组(en 4 / pt 2),`index.html` 独一份 |
| ⭐**剥切换器 + 归一化空白** | **en 158 页 → 1 组(158/158)** |

**结论**:158 个 en header **内容 100% 相同**,4 个"变体"纯粹是**空白/缩进**差异(不同批次注入切换器手法不同留下)。`index.html` 不是内容异常,只是缩进独一份。**单一 partial 能代表全部 158 页。**

**footer / mobilenav**:en 158 页**完全一致**(各 1 组)。

---

## 2. ✅ 切换器有无 100% 正确 → partial 用 `hasPt` 条件渲染

| | 数量 | 交叉核对 |
|---|---|---|
| en 页总数 | 158 | |
| 无切换器 | 68 | **0 个有 pt 对应页**(该没有,正确)|
| 有切换器 | 90 | **0 个缺 pt 对应页**(无指向 404 的切换器)|

---

## 3. 🔴 FOOTER_LANGS 在 en 页是**承重的**,不是 dormant 残渣

en 页 footer 的 Products / Guides 两列在 HTML 里**是空的**:
```html
<h3 id="footer-products-title">Products</h3>
<ul id="footer-products-list">
  <!-- 各语言的子分类由JS根据URL动态显示 -->
</ul>
```
子项**全靠 FOOTER_LANGS 脚本运行时注入**("Other menus" 列才是静态的)。→ **裸删 = en 页脚两列变空 = 可见回归。必须同趟烘焙成静态。**

### 3.1 脚本逻辑全貌(URL 依赖已核实)
```js
var m = window.location.pathname.match(/^\/([a-z]{2,5})\-/);  // 匹配 /jp-xxx/ /de-xxx/
var lang = m ? m[1] : 'en';
if (!FOOTER_LANGS[lang]) lang = 'en';
// 设 3 个栏标题 textContent + 填 products/service 两个 <ul> 的 innerHTML
```
⭐**URL 依赖 = 纯语言选择,且在现网 URL 格式下是死代码**:正则要求"语言-连字符"前缀(旧 6-locale 方案 `/jp-xxx/`),而现网 pt 页是 `/pt/...`(斜杠)→ **永不匹配 → 每页都回落 `lang='en'`**。
**它不干别的**:无当前栏目高亮、无逐页差异。→ **无隐藏行为需要保留**(总工要求核实的点,已确认)。
(也正因此,多语言必须删脚本才能让 pt 页脚显示葡语——否则它会把 pt 页脚刷成英文。)

### 3.2 赃比预想大得多 → 应写进 R1 收益清单
| 项 | 实测 |
|---|---|
| 脚本体积 | **14 004 字节 / 页 × 159 页 ≈ 2.2 MB** |
| 内含 locale | **17 个**:`en, cn, de, fra, spa, it, pt, pl, nl, jp, kor, th, may, vie, ara, hau, swa` |
| 实际在用 | **仅 en + pt** → **15 个 locale 是纯死重** |
| ⭐SEO | footer 分类内链**不在静态 HTML** → **爬虫不可见** → 这批内链等于不存在 |

**烘焙成静态 = 死重清零 + 内链变可爬 + 6-locale 遗产埋掉,一趟三收。**

---

## 4. ⭐ DOM 级 oracle(真浏览器跑真脚本的实际产出)

方法:本地起静态服务器 → **真浏览器加载 `/products/`** → 待 FOOTER_LANGS 执行 → 快照注入后的 footer DOM。
(**不是**"我读 JS 得出的结论",是机器实产 —— 满足总工要求的真 oracle。)

**en(脚本注入后)**:
- 标题:`Products` / `Guides` / `Other menus`
- **products 列(7)**:
  `/standard-circular/`→`- Standard Circular` · `/standard-actuated/`→`- Standard Actuated` · `/standard/`→`- Standard` · `/mini/`→`- Mini` · `/performance-gen-1/`→`- Performance (Gen 1)` · `/performance-gen-3/`→`- Performance (Gen 3)` · `/enterprise/`→`- Enterprise`
- **service 列(5)**:
  `/marine/`→`- Marine` · `/rv-off-grid/`→`- RV / Off-Grid` · `/mounts/`→`- Mounts` · `/industrial/`→`- Industrial` · `/power/`→`- Power`

**pt(`/pt/products/`,静态、`hasFooterLangsScript: false`)**:
- 标题:`Produtos` / `Guias` / `Outros menus`
- products 列:**机型名与 en 完全相同**,href 全 `/pt/` 前缀
- service 列:`- Náutico` · `- Motorhome / Off-Grid` · `- Suportes` · `- Industrial` · `- Energia`

**→ 这份 DOM 快照 = 烘焙静态 footer 的验收标尺(断言新静态 footer DOM == 本快照)。**

---

## 5. catalog 种子(零重译,两侧都白捡)

| key(拟) | en | pt-BR | 分类 |
|---|---|---|---|
| footer.products.title | Products | Produtos | translated |
| footer.service.title | Guides | Guias | translated |
| footer.other.title | Other menus | Outros menus | translated |
| footer.service.marine | Marine | Náutico | translated |
| footer.service.rv | RV / Off-Grid | Motorhome / Off-Grid | translated |
| footer.service.mounts | Mounts | Suportes | translated |
| footer.service.power | Power | Energia | translated |
| footer.service.industrial | Industrial | Industrial | **homograph**(其余 4 项都译了、独留它 → 多语言判定同形;葡语 industrial 确为同词)|
| model.*(7 个机型名)| Standard Circular / Mini / Performance (Gen 1) … | 同左 | **whitelist: model-name** |
| href `/marine/` → `/pt/marine/` | — | — | ⛔**路由派生,不进 catalog** |

**en 侧的值白捡来源**:`FOOTER_LANGS.en` 数据本身;**pt 侧**:pt 页静态 footer。

### 5.1 header 枚举对齐(枚举驱动核心)
- **en 41 单元 = pt 41 单元,完美对齐** ✅
- 32 个 en≠pt(已翻,白捡种子)
- 9 个 en==pt,拆开**全部合理**:**6 个是计数数字**(19/5/33/4/3/64 → `{{count.*}}` token,不进 catalog)、1 个 `&rarr;`(结构)、**2 个同形词**(`Industrial` / `FAQ`)
- ⭐同形词印证第三类价值:guard 标红 = **强制裁决**(同形词就显式写 `pt-BR` + `reason:"homograph"`;拿不准一律留红)

### 5.2 footer 的 en/pt 单元数不等(15 vs 27)—— 已解释,非结构漂移
pt 已烘焙子项、en 还靠 JS 注入 → 数量差。**烘焙 en footer 后两侧即对齐。**

---

## 6. ⚠️ 发现的真 bug(R1 由构造杀掉,不打补丁)

### 6.1 pt footer 缺 `/pt/` 前缀(7 页)
`pt/about` · `pt/compatibility` · `pt/contact` · `pt/marine` · `pt/mounts` · `pt/power` · `pt/rv-off-grid`
其 footer 机型链是 `href="/standard-circular/"`(**指回英文页**),正确应为 `/pt/standard-circular/`。

⭐**这个泄漏类三种方法各抓一部分**:多语言 scanner 扫"可见文本"**抓不到**(这是 href);死链检查**放行**(`/standard-circular/` 是存在的英文页);只有**结构分析**能抓。→ 佐证:唯有**由构造保证**才封得住。
**处置**:R1 的 `{{url.PATH}}` + `localizeUrl(path, locale)` 派生 → pt 渲染必出 `/pt/...`。**样板需专验其中一页。**

### 6.2 机型显示名有**两套形态**(建议 R2 收)
| 用途 | 形态 | 定义处 |
|---|---|---|
| meta_title / footer / CAT_H1 | `Standard Actuated` · `Performance (Gen 3)`(空格/括号)| 数据 + FOOTER_LANGS |
| **产品页可见的 `Category:` 标签** | `Standard-Actuated` · `Performance-Gen-3`(**连字符**)| `render.js` 的 `CATMAP` |

用户在详情页看到连字符版,meta/页脚是空格版。**同一事物两种写法两处定义** → 违反单一真源。

### ✅ 总工已拍板(2026-07-14):**统一成空格版**
证据一边倒 —— 空格版是全站主流,连字符版是异类:
- **首页机型宫格**(用户最先看到):`Standard Actuated` / `Performance (Gen 1)`(空格)
- **meta_title / 搜索结果**:空格版
- **pt 分类页 h1 词表**(总工已批):`Acessórios para Starlink Performance (Gen 1)`(空格)
- **Starlink 官方命名**本身即空格

→ 详情页的 `Category: Standard-Actuated` 是**从 URL slug 直接首字母大写留下的痕迹,不是设计**。

**执行要求**:
1. 统一成**一份机型显示名常量**(空格版);`CATMAP` / meta_title 派生 / `CAT_H1` 全部引它 → 单一真源
2. 它是**结构常量,不翻译**(pt 侧 `Performance (Gen 3)` 原样)→ 白名单 `reason:"model name"`
3. ⚠️**用户可见改动 → 单独成一个 commit**,不混进结构改动(便于总工/Joe 单独审、单独回退)
4. 常量在 R1 建立;`render.js` 的 `CATMAP` 接线属 R2(R1 不碰 render.js)

### 6.3 pt mobilenav 2 变体(71 / 19),差 2 字节 —— 细节待 sync 时定位

---

## 7. R2 契约的两个实证答复

### 7.1 `meta_title` 派生契约:**验证可实现,64/64**
```
meta_title = {本地化 title} + "-" + {机型显示名} + "-Tejoy" + {{t.meta.title.suffix}}[locale]
```
机型显示名(实测反推,64/64 吻合):
`mini:"Mini" · standard:"Standard" · standard-actuated:"Standard Actuated" · standard-circular:"Standard Circular" · performance-gen-1:"Performance (Gen 1)" · performance-gen-3:"Performance (Gen 3)" · enterprise:"Enterprise"`
→ R2 照此派生,JSON 里 `pt-BR.meta_title` 弃用。加语言 = 翻一条后缀 key。

### 7.2 `meta_description`:**混合 → 建议留数据**
64 个产品实测(归一化实体+空白后):
- **派生自 description_html(截断前缀):56 / 64**
- **真人独立文案:8 / 64**(`#4201` `#4202` `#4206` `#663` `#677` `#700` …)

→ **不是纯派生 → 按"真人独立文案留 JSON"规则,meta_description 保持数据不动。** 一刀切派生会改掉那 8 个真文案 + 动 56 个线上 meta 标签。
⚠️**顺带的内容问题(非架构,建议另开 backlog)**:56/64 的 meta description 就是正文前 ~300 字截断 —— 复制正文是 SEO 异味(搜索摘要=正文开头,无独立卖点钩子)。

---

## 8. 验收口径(总工已批 + 3 条件)

- ① **DOM 级真等价**:真浏览器跑旧页 FOOTER_LANGS → 快照 footer DOM ↔ 新静态 footer DOM **断言相等**(§4 快照已取)
- ② `wsNorm(旧chrome) === wsNorm(新chrome)` 逐页断言(**零内容回归**)
- ③ 有意改动逐页列清单(括号 / footer 烘焙 / 删 14KB / 空白归一)
- ⭐**空白硬条件**:只动**缩进/块级元素之间**空白,**绝不增删行内元素之间**的空白(会改渲染);必须动的单独列出;样板附**真实空白 diff 原文**

---

## 8.5 📋 Backlog:「alt 面」清理(**不进 R1/R2**,独立一次改动)

多语言窗(pt 真源)签 `card.alt.suffix = "- Produtos Tejoy"` 时,顺带论证**这个后缀本身就不该存在**,论证成立:
- `pt/products/` 一页 64 张卡,**64 个 alt 全以它结尾** → 屏幕阅读器用户要听 **64 遍**"- Produtos Tejoy"。alt 是描述**这张图**的,不是给每张图缀店名。
- 零信息(产品标题已说完)、SEO 非加分(Google 图片指南是"描述图片",品牌样板串属填充)。
- **是一笔按语言收的永久税**:每加一种语言都要为一句没用的样板串翻一次、审一次、guard 红一次。
- 更好的结构:`alt = {本地化产品标题}`,后缀概念消失 → **256 处泄漏不是靠翻译关掉的,是靠删掉这个概念关掉的**。

⭐**但不能塞进 R2**(多语言窗的理由,已采纳):删后缀会改**英文侧** alt 输出 → **直接破坏 R2 的「en 字节一致」验收门**,而那是总工判断"生成器到底做对没有"的**唯一干净信号**。**把内容改动夹带进重构,会把重构的验收信号一起毁掉。**

**排法**:
1. **R2**:照常用 `- Produtos Tejoy` 拼 alt → en 字节一致成立、b 类 256 由构造消失、基线可验证下降。
2. **之后(独立改动,en+pt 一起)**:从 alt 模板删后缀 + 删 `card.alt.suffix` key。那次**自己单独验**(en 输出会变,是有意的)。
3. 与基线 **c 类 46 处(alt 直接写成图片文件名)是同一档病**:*alt 被当成塞东西的地方,而不是描述图片的地方*。建议两件一起排进「图片/数据质量」档,一次把 alt 这个面收干净。

---

## 8.6 🔧 partial 的结构基线决策(已推演,照此实现)

**header / mobilenav**:取 **en 版作基线**(en 158 页 vs pt 90 页,en 是多数派 → churn 最小)。en/pt 单元数已验证 1:1 对齐(41=41 / 3=3),tokenize 后两边都能渲。

**footer**:⚠️**不能用 pt 作基线**(虽然它结构完整),因为那会把 pt 的空白强加给 158 个 en 页。正确做法:
- **取 en footer 作基线**(空白=多数派),把两个空 `<ul>` 用**烘焙好的 `<li>` 串**填进去;
- ⭐**`<li>` 之间不留空白** —— 因为 DOM oracle 实测 JS 产出就是 `<li><a…>- Standard Circular</a></li><li><a…>…`(`innerHTML` 拼接、**无 item 间空白**)。照抄这个形态 → **渲染出的 DOM 与 JS 注入的逐字节相同**,DOM 等价证明自然成立。
- 若改用 pt 基线或自作主张加缩进 → `<li>` 是 list-item(block),多数场景无碍,但**会偏离 oracle** → 等价证明就得靠"我觉得没事"而不是"字节相等"。**不冒这个险。**

**渲 pt 时**:pt footer 的现有空白会被归一到 en 基线 → 属已批口径(`wsNorm` 内容零回归 + 空白归一清单)。

## 8.7 🔢 计数 token + 括号 `(N)` 的实现决策(已看真标记,照此)

**导航下拉的真实标记**(`products/index.html` header 内):
```html
<li><a href="/products/#mounts">Mounts &amp; Brackets <span class="nav-dd__n">19</span></a></li>
<li><a href="/products/#power">Power &amp; Charging <span class="nav-dd__n">5</span></a></li>
<li><a href="/products/#cables">Cables <span class="nav-dd__n">33</span></a></li>
<li><a href="/products/#networking">Networking <span class="nav-dd__n">4</span></a></li>
<li><a href="/products/#cases">Cases &amp; Protection <span class="nav-dd__n">3</span></a></li>
<li class="nav-dd__sep"><a href="/products/">All products <span class="nav-dd__n">64</span></a></li>
```
- filter key ← href 锚点(`#mounts`/`#power`/`#cables`/`#networking`/`#cases`,`/products/` 本身 = `all`)
- partial 里渲成:`<span class="nav-dd__n">({{count.mounts}})</span>`

**括号放 span 内**(`>(19)<`)**而不是 span 外**(`>(<span>19</span>)<`):
1. span 是计数的显示单元,括号属于它 → 拿到 `.nav-dd__n` 的样式(通常是弱化色),视觉一致;括号放外面会用链接正文色,读着像正文的一部分。
2. ⭐**更硬的理由**:放外面要在 `Label ` 和 `<span>` 之间**插入字符** → **动到行内内容**;放里面只改 span 的**文本节点**,`Label` 与 span 之间那个会渲染的空格**原样不动** → 仍在「只改文本、不碰行内间距」的保证内。

**范围切分**:
- **R1(chrome)**:导航下拉计数 → `{{count.*}}` + 括号 ✅
- **R2**:列表页的过滤 chip 计数(`product-chip__n`,由 `regenListPage`/`updateChips` 产出)**不是 chrome**,是页面内容 → 括号在 R2 随 `regenListPage` 一起改。**别在 R1 里越界改它。**

## 9. 下一步(建造尚未开始)

1. `data/locales.json`(enabled/default/**白名单带 reason** → 交总工过目)
2. `data/chrome.json`(枚举驱动三分类;种子见 §5)
3. `data/templates/_chrome.html`(4 块 + `{{t.}}`/`{{count.}}`/`{{var.}}`/`{{url.}}` 四类 token;空白基线取**多数派风格**)
4. `scripts/i18n-check.mjs`(guard 双模式 `--report` / `--strict`;**交付时 report 模式不卡人**;附孤儿 token / 无用 key 检查)
5. `scripts/chrome-sync.mjs`(按锚点铺 159 页;烘焙 footer;删 14KB 脚本;括号 `(N)`)
6. 4 页样板 + `r1-report.md`(样板 diff / 空白 diff 原文 / DOM 等价证明 / 白名单 / 泄漏清单分栏 / 有意改动清单+页数 / 7-bug 页之一验证)

**R1 不碰 `render.js`**(那是 R2)。
**已就位工具**:`scripts/chrome-extract.mjs`(枚举 + 三分类推导器)。
