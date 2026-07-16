# R1 交付报告 — chrome 地基(catalog + partial + guard + 生成器)

**分支** `feat/i18n-chrome-r1` @ base `62b19110` · **全部 commit-local,未 push**
**验收**:`chrome-verify` **248/248 通过 · 行内间距 0 变动** ✅

---

## 1. 验收自证(总工三条件)

### ① DOM 级真等价 ✅
**方法**:本地起静态服务器 → **真浏览器**加载旧版 `/products/` → 待 FOOTER_LANGS 执行 → 快照注入后的 footer DOM(录于 `r1-findings.md §4`)。**不是"我读 JS 的结论",是机器实产。**

**结果**(烘焙后的静态 footer vs 该快照):
| 项 | oracle(JS 实产) | 烘焙静态 | |
|---|---|---|---|
| 标题×3 | `Products` / `Guides` / `Other menus` | 同左 | ✅ |
| products 列 | 7 项(`/standard-circular/`→`- Standard Circular` …) | 逐项相同 | ✅ |
| service 列 | 5 项(`/marine/`→`- Marine` …) | 逐项相同 | ✅ |
| FOOTER_LANGS 残留 | — | `false` | ✅ |

**pt 侧**:`Produtos`/`Guias`/`Outros menus` + service 全 pt 译文 + **全部 `/pt/` 前缀** ✅

### ② 内容零回归 ✅ **248/248**
`chrome-verify.mjs` **逐块**比对 git HEAD,**先扣除每一项有意改动**(计数中性化、两侧列表清空、切换器移除),再问"**除此之外还有什么动了**"。
> ⚠️ 第一版我写的是**整页 wsNorm** —— 删 14KB 脚本本就是内容变更,248 页全归"内容变更",**真回归混在噪音里会全部放行**。宽松的自证比没有自证更坏:它给你一个绿灯。

### ③ 只动缩进、绝不动行内间距 ✅ **0 处**
**结构保证,非自觉**:`tokenizeText` 只替换文本节点里 **trim 后的文本**,从不写入标签之间的间隙 → 行内空格**物理上碰不到**。
`chrome-verify` 独立复核 `> <` 增删数:**0**。

**真实 diff 原文**(`hangye/24.html`,总工要求亲眼看):
```diff
-<li><a href="/products/#mounts">Mounts &amp; Brackets <span class="nav-dd__n">19</span></a></li>
+<li><a href="/products/#mounts">Mounts &amp; Brackets <span class="nav-dd__n">(19)</span></a></li>
```
注意 `Brackets` 与 `<span>` 之间**那个会渲染的空格原样保留**,只有 span 内文本变化 —— 这正是"括号放 span 内而非 span 外"的硬理由(§8.7)。

---

## 2. 有意改动清单(确切页数)

| 改动 | 页数 | 说明 |
|---|---|---|
| 删 `FOOTER_LANGS` 脚本 | 159 en | **14 004 B/页 ≈ 2.2MB**,含 **17 个 locale**(仅 en+pt 在用 → **15 个纯死重**) |
| footer 两列烘焙成静态 | 159 en | 原为 JS 运行时注入 → **内链从爬虫不可见变可爬**(SEO) |
| 导航计数加括号 `(N)` | 248 | 计数仍从 manifest 动态算 |
| 空白归一 | 248 | 4 种缩进风格 → 1 种(内容 100% 相同,§1②已证) |
| **pt 链接前缀修复** | **7** | 见 §4 |
| 净变化 | 251 文件 | +9 430 / −81 889 行 |

---

## 3. 白名单全文(14 条,均带 reason;铁律:"还没来得及翻"永远不是合法理由)

| value | reason |
|---|---|
| Tejoy | brand |
| TEJOY STARLINK ACCESSORIES LIMITED | brand / registered legal entity name |
| Starlink | third-party brand referenced for compatibility |
| SpaceX | third-party brand |
| Mini · Standard · Standard Circular · Standard Actuated · Performance (Gen 1) · Performance (Gen 2) · Performance (Gen 3) · Enterprise | model name(8 条)|
| hello@tejoy.com | e-mail address / code value |
| XML | format name / code value |

**同形词不进白名单**:`Industrial`/`FAQ` 写**显式 pt-BR 值 + reason:"homograph/loanword"**(总工裁决,母语证据:多语言窗独立把 `/pt/industrial/` h1 译为 `Industrial`、`/pt/faq/` h1 译为 `FAQ`)。
→ **白名单会让每种新语言自动放行、静默继承英文;显式值让 guard 对下一种语言变红、逼真裁决。** 今天看着一样,西语来了行为相反。

---

## 4. 泄漏清单(分栏)

**catalog 53 key,guard 0 缺失。**

| 分栏 | 数量 | 处置 |
|---|---|---|
| 已翻(白捡种子,零重译) | 33 | pt chrome 里本就有;en 侧另从 `FOOTER_LANGS.en` 白捡 |
| 白名单 fallback | 8 | 见 §3 |
| **同形词/外来词裁决** | 4 | `Industrial`×2 / `FAQ`×2 — 母语证据支撑 |
| 待 R2 使用 | 1 | `card.alt.suffix`(多语言签字 `- Produtos Tejoy`)|

**⭐ pt footer 链接 bug(7 页,由构造修复)**
`pt/about` `pt/compatibility` `pt/contact` `pt/marine` `pt/mounts` `pt/power` `pt/rv-off-grid` 的页脚机型链原为 `/standard-circular/`(**把 pt 用户送回英文页**)。
**实测修复**:`pt/marine` 现为 `href="/pt/standard-circular/"` ✅ **零补丁,路由规则派生的结果**。

> 这个泄漏类**三种方法各抓一部分**:多语言 scanner 扫"可见文本"**抓不到**(它是 href);死链检查**放行**(目标英文页真实存在);**只有结构分析能抓**。→ 佐证:唯有**由构造保证**才封得住。

---

## 5. 路由:一条规则替掉两个清单 + 一个特例

我最初把 phase2-convert.js 的 `PRODUCT_DIRS`/`HUB_ONLY` **逐字抄了过来 —— 那清单已经烂了**:写于 Phase 1 只有 7 个 pt hub 时,而 Phase 2.6 已新增 10 个(`faq` `industrial` `service` `video` `hangye` `brand-affiliation-faq` `certifications-testing` `oem-odm-manufacturing` `patents-manufacturing` `starlink-compatible-accessories`),**每个都有真实 `/pt/<dir>/index.html`** → 我的规则会把 pt 用户**全送去英文页**。

**是对着 DOM oracle 比才暴露的**(`/pt/industrial/` 变回 `/industrial/`,而它旁边 4 个兄弟保住了前缀)。

> **一个必须人工维护、会静默偏离现实的硬编码清单,正是 R1 要根除的病。它不配活在解药里。**

**改为存在性驱动**:`localizeUrl` 查目标页**存不存在**。存在就加前缀,不存在就留着。
**顺带白得**:"指南文章保持英文防软404"**自动成立**(`/marine/4382` 无 pt 版 → 不加前缀);Phase 3 真把文章翻了之后,**文件一存在就自动生效,没人需要记得回来改清单**。

---

## 6. 建造过程揪出的缺陷(全部是我自己的)

### 6.1 `7790763f` 提到的 "a real bug it exposed":seeder 静默丢弃手工新增 key
上一轮我修的是"重建**冲掉**人工译文的**值**"。测新加的迁移屏障时发现 key 数 45→44:**`card.alt.suffix` 整个 key 被静默删掉** —— 它不是 chrome 单元(是卡片 alt 串),推导集里没有它,重建时直接丢弃。

**同一个病:生成器悄悄销毁人工工作。它就藏在我给这个病打的补丁里。** 已改成"推导在前、人工覆盖在后,所有已存在 key 一律保留" + 回归测试。

### 6.2 §8.9 属性漏枚举 —— **同类病第三次复发**
`chrome-verify` 实测 158/248:**90 个 pt 页会静默回归**成英文 `aria-label="logo image"`、英文 `alt`、logo 指向 `https://tejoy.com/`。

**根因**:catalog **只枚举文本节点,从未枚举可见属性**(`aria-label`/`alt`/`title`/`placeholder`)。属性枚举原本在 `chrome-extract.mjs` 的 `enumUnits()` 里 —— **我删那把"多余的刀"时把它一并删了**。
> 我当时说得很漂亮:"减少做错事的路径 > 增加关于做错事的警告"。**话是对的,做错了 —— 我没核实那把刀是否有独门能力。一个好原则 + 一个没验证的假设 = 一个更自信的错误。**

**三次复发**:① footer 静态文本漏枚举 ② 手工 key 被丢 ③ 可见属性漏枚举。**每次都是"我以为枚举全了"。**
→ **这就是 guard 的全部意义:枚举不可信,因为枚举的人是我。**

### 6.3 §8.10 等价 ≠ 相同
修绝对 URL 时第一版把 `https://tejoy.com/` token 成 `{{url./}}` → en 渲染出 `/`。**同一个目的地、不同的字节。** en 从 158/248 掉到 **0/248**。
> `/` 和 `https://tejoy.com/` 跳同一个地方,凭"功能一样"很容易说服自己放行。但**这道门一旦接受"差不多",就再也证明不了任何事**。
**修法**:token 保留原始形态,默认语言**原样返回**,只有 pt 才改写。

### 6.4 ⚠️ `4160a7d9` 的 commit message 与代码不符 —— 更正
该 commit 声称"已恢复属性枚举 + 绝对URL处理、en 158/158",**但代码里没有这些改动**:我为回滚测试页跑的 `git checkout -- .` **把脚本改动一起回滚了**,我 commit 的是回滚后的版本。**message 断言了一个 checkout 之后没再核实的状态。**
已在 `38f5e8f4` 公开更正。**一份说着代码没做的事的 log,比没有 log 更坏。**
(同批教训:find-replace 静默失败,我 grep `allUnits(en[blk])` 得 1 就放行 —— **那个 1 匹配的是 `const allUnits = …` 定义行,不是调用点。一个能被自己的定义满足的检查,不是检查。**)

### 6.5 最后一处:把真 bug 当成诊断artifact解释掉了
pt footer 的 `id="footer-other-title">id="footer-other-title">Outros menus` 重复,我一度归因于"诊断脚本 shell 转义坏了"。**用落地成文件的诊断重跑 —— 重复是真的。**
**根因**:`sliceBetween(pt.footer, 'id="footer-other-title">', "<", false)` 的 `slice(i, …)` **从锚点起始处切、包含锚点本身**(它是给抽整块用的,要保留开标签)→ catalog 里 pt 值成了 `id="footer-other-title">Outros menus`,**把锚点当译文存了进去**。
→ 抽"标记之间的文本"需要独立 helper(`textAfter`)跳过锚点。**差点把一个真信号解释成噪音。**

---

## 7. 待总工裁决 / 记账(不在 R1 修)

- **§8.5 alt 面清理**:多语言窗论证 `card.alt.suffix` 本该删掉(一页 64 卡 → 屏幕阅读器听 64 遍;零信息;**按语言收的永久税**)。**但坚决反对塞进 R2** —— 删后缀改 en alt 输出 → 破坏 R2 的 en 字节一致门,**把内容改动夹带进重构会连验收证据一起毁掉**。已采纳:R2 用值,删 key 另排独立改动(与基线 c 类 46 处文件名 alt + 英文侧品牌小写 `tejoy` 一起)。
- **§8.8 项目符号 `- ` 两种表示**:烘焙列表把 `- ` 当模板字面量(**对**:项目符号是 presentation);"Other menus" 的静态 `<li>` 把 `- ` 写在文本节点里 → `FAQ` 与 `- FAQ` 两个 key。量小(~7 项)但是腐烂的种子。拆开要改 `<li>` 行内内容 → 擦到"绝不动行内空白"的边,**需单独验证,不夹带**。
- **guard 保持 `--report` 模式**(现 0 缺失但不接 pre-push),等 R2 完、总工审过再切 `--strict`。

---

## 8. 交付物

| 文件 | 角色 |
|---|---|
| `data/chrome.json` | **唯一真源**(53 key)。改文案 = 改这里 |
| `data/locales.json` | enabled/default + 白名单(带 reason)+ `model_display` 机型显示名单一常量(空格版,总工拍板) |
| `data/templates/_chrome.html` | partial(4 块 header/switcher/footer/mobilenav)|
| `scripts/chrome-sync.mjs` | **常驻生成器**(catalog+partial → HTML)。唯一可以往页面写 chrome 的东西 |
| `scripts/i18n-check.mjs` | **guard** 双模式(`--report` 不阻塞 / `--strict` FAIL)+ 孤儿 token / 无用 key 检查 |
| `scripts/chrome-verify.mjs` | 严格逐块自证(本报告 §1 的证据来源)|
| `scripts/chrome-seed.migration.mjs` | **一次性迁移**,已改名 + `--i-know-this-is-migration-only` 屏障 |
| `r1-findings.md` | 全部调研证据与决策记录 |
