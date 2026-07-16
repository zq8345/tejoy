# chrome catalog — pt-BR 决定（多语言窗签字）

> 我是 pt 的真源。dev 拒绝替母语方签字（哪怕签的人是总工）是对的，这类字该由这里签。
> 一行一个 key，dev 直接读进 catalog。

---

## `card.alt.suffix`

```
card.alt.suffix  pt-BR = "- Produtos Tejoy"
```

**reason**：
- `Produtos` = 我 chrome 里既定术语（导航/页脚/过滤器全用它），不新造词。
- 语序按葡语：名词在前、品牌在后（`Produtos Tejoy`，同 `Produtos Apple` 的说法），不是英文语序直译。
- **品牌大写 `Tejoy`**：pt 可见文案一律 `Tejoy`（"Por que a Tejoy" / "Sobre a Tejoy"）；英文那句的小写 `tejoy` 只是历史遗留，**不把英文侧的不一致复制进新语言**。（本站小写 `tejoy` 只该出现在域名 `tejoy.com`、文件名 `tejoy-logo-white.png`、邮箱 `hello@tejoy.com`。）

✅ 这个值可以直接用，**R2 拿它拼 alt 即可让基线 b 类 256 处由构造消失**，且不动英文侧、不破"en 字节一致"验收门。

---

## ⚠️ 但我要顺带说一句：**这个后缀本身就不该存在**（总工邀请我评结构，我评）

**问题不在翻译，在这句 alt 本身**：

1. **它是噪音，而且量化得出来**：`pt/products/` 一页 64 张卡，**64 个 alt 全部以它结尾**。屏幕阅读器用户 tab 过这个网格，要听 **64 遍**"- Produtos Tejoy"。alt 是用来**描述这张图**的，不是每张图后面缀一遍店名。
2. **它零信息**：说不出这张图是什么。产品标题已经把该说的说完了。
3. **对 SEO 也不是加分**：Google 的图片指南是"描述图片"，品牌样板串属于填充，不属于描述。
4. **它是一笔按语言收的永久税**：留着它，以后每加一种语言（es / vi / id …）都要为一句没用的样板串翻一次、审一次、guard 红一次。

**更好的结构**：`alt = {本地化产品标题}`，不带后缀 → 这个 key 直接消失，**256 处泄漏不是靠翻译关掉的，是靠删掉这个概念关掉的**。

### 但**不要现在做，也不要塞进 R2**

删后缀会改**英文侧**的 alt 输出 → **直接破坏 R2 的"en 字节一致"验收门**，而那道门是总工判断"生成器到底做对没有"的唯一干净信号。**把一个内容改动夹带进重构，会把重构的验收信号一起毁掉。**

**建议排法**：
1. **现在**：用上面 `- Produtos Tejoy` 填 catalog，R2 照常落地，en 字节一致成立，b 类 256 由构造消失，**基线 501 → 可验证地下降**。
2. **之后（独立一次改动，两种语言一起）**：把后缀从 alt 模板里删掉，`card.alt.suffix` 这个 key 一并删除。那次改动**自己单独验**（en 输出会变，是有意的），别和 R2 混在一起。

→ 它跟基线里挂账的 **c 类 46 处（alt 直接写成图片文件名）** 是同一档病：**alt 被当成了塞东西的地方，而不是描述图片的地方**。建议这两件一起排进"图片/数据质量"档，一次把 alt 这个面收干净。

---

## `body.ph.company`

```
body.ph.company  pt-BR = "Nome da empresa"
```

### ⚠️ 但先纠一个前提：**这不是「存量泄漏」，是 R2 的回归。而且译文一直都在。**

任务说：「phase2-convert **从来没译过**这个 placeholder…真源里没有葡语值可白捡，所以要你写。」

**我实测了四路，全部相反**：

| | `Nome da empresa`（葡语） | `Company Name`（英文） |
|---|---|---|
| **现网**（curl 实测 `pt/enterprise/650` · `pt/mini/4200` · `pt/standard/671` · `pt/performance-gen-3/42`） | ✅ **全部** | **0 次** |
| **基线（我的树）** | **65 个 pt 页** | **0 个** |
| **dev 分支 `7286c17d`** | **1 个** | **64 个** |

**真源就在我的 `phase2-convert.js` 第 54 行**：
```js
['placeholder="Company Name"', 'placeholder="Nome da empresa"'],
```
**我译过它。值一直都在。**

**决定性旁证**：dev 分支上唯一还是葡语的那页是 **`pt/contact/index.html`** ——
**R2 不重生成它（不是产品页），所以它保住了。** → **其余 64 页的英文是 R2 渲染出来的。**

→ **`d` 的 64 处 placeholder 是回归，不该算进「存量」。** dev 用了对的方法（查现网辨存量 vs 回归），**但结论错了** —— 我不知道它查的是什么，但现网四页我都实测了。

### ✅ 所以：**不需要我造译文，需要 R2 别把它弄丢**
签的值 = **保住现网已有的那个**：`Nome da empresa`

---

## ⚠️ 顺带评一句结构（总调度邀请我判「placeholder 和 label 是否该一样」，我判）

**先看清 en 侧自己的模式**：
| label | placeholder |
|---|---|
| **`Company Name`** | **`Company Name`** ← **例外：跟 label 一样** |
| `Name` | `Your Name` |
| `Phone` | `Your Phone` |
| `Email` | `Your Email` |
| `Message` | `Your Message` |

**我当初如实镜像了这个例外**（pt：`Nome da empresa` → `Nome da empresa`；其余四个 → `Seu nome` / `Seu telefone` / `Seu e-mail` / `Sua mensagem`）。

**我的判断：这个 placeholder 本身是冗余的，但现在别动。**
- **冗余**：label 说「这个字段是什么」，placeholder 说「把**你的**那个填这儿」。
  其余四个都做到了（`Seu nome`），**只有 company 把 label 又说了一遍 —— 它没增加任何信息**。
  且 **placeholder 一打字就消失**，本就不该承担 label 的职能。
- **若要改**，按我自己在 pt 侧建立的模式应是 **`Sua empresa`**（不是 `Seu nome da empresa` —— 那在葡语里很别扭）。
- **但别现在改**，理由跟我签 `card.alt.suffix` 时一样：
  > **en 侧有同样的冗余（`Company Name` → `Company Name`）。只改 pt 会让两侧结构分叉；改 en 会动字节基线。**
  > **把内容改动夹带进重构，会毁掉重构的验收信号。**
- **排法**：R2 验收通过后，**独立一次改动，en + pt 一起**（`Your Company` / `Sua empresa`），那次自己单独验。

---

## `nav.shop_by_type`

```
nav.shop_by_type  pt-BR = "Comprar por tipo"
```

**成对依据**：`Shop by Starlink model` → `Comprar por modelo Starlink`（我译的，现网在用）。
→ **`Shop by type` → `Comprar por tipo`**。同一个动词、同一个介词、同样省略冠词。**这一条可以直接用。**

### ✅ 那 5 条：**确认可复用，别新造**（任务问的第 ② 条）

| en | pt-BR（现网 90 个页面全在用） |
|---|---|
| `Cables` | `Cabos` |
| `Mounts & Brackets` | `Suportes e Fixações` |
| `Power & Charging` | `Energia e Carregamento` |
| `Networking` | `Redes` |
| `Cases & Protection` | `Cases e Proteção` |

**逐条核过**：这 5 个词在 **90 个 pt 页**里都存在，且**语境完全相同** —— 都是 PRODUCTS 下拉里带计数的类型条目。
→ **可以复用，无语境差异。**

---

## ⚠️ 但我要先说一件事：**「Shop by type」这个槽位可能不该存在 —— 因为它已经在了**

**任务的前提**：「dev 建了 5 个类型页，**但现在没有入口，谁都链不到**；nav 里已有 `Shop by Starlink model`，镜像槽位 `Shop by type` 是它显然的家。」

**我核了 nav 的实际结构（dev 分支 `feat/i18n-chrome-r1`）**：

```
PRODUCTS 下拉：
  /products/#mounts        → "Mounts & Brackets (19)"     ┐
  /products/#power         → "Power & Charging (5)"       │
  /products/#cables        → "Cables (33)"                ├─ ⭐ 这就是「按类型选」
  /products/#networking    → "Networking (4)"             │
  /products/#cases         → "Cases & Protection (3)"     ┘
  ──────────── 分隔线 ────────────
  /products/               → "All products (64)"
  /products/               → "Shop by Starlink model →"   ← 通往【另一个轴】的入口
```

**pt 侧结构完全一致**（`Cabos` / `Energia e Carregamento` / … / `Comprar por modelo Starlink`）。

### ⭐ 所以：**这个下拉本身就是「Shop by type」**
那 5 条带计数的链接**就是类型轴**。`Shop by Starlink model →` 之所以需要一个入口条，
**恰恰是因为 model 轴不在这个下拉里** —— 它在别处。

**再加一个 `Shop by type` + 5 条同名链接** → **同一个下拉里出现两组一模一样的文字，指向不同 URL**：
```
Cabos → /pt/products/#cables     （现有）
Cabos → /pt/type/cables          （新增）
```
→ **这正是我这两天一路在标的「自家两页互抢同一个词」** —— 只是这次抢的不是搜索词，是**用户的眼睛**：
**同一个菜单里两个「Cabos」，用户不知道该点哪个，而它们列的是同一批 33 个产品。**

### 💡 我的建议：**不是加入口，是把现有的 5 条重新指向**
```
现在：/pt/products/#cables  （products 页 + 客户端 filter）
改成：/pt/type/cables       （dev 新建的独立页）
```
**一处改动同时解决两件事**：
1. 那 5 个类型页**有了入口**（任务要解决的问题）
2. **不产生重复条目**（新方案会产生的问题）

**而且 dev 的独立页比锚点筛选更好**：可爬、有自己的 `title`/`meta`、有 h1（`Starlink Cables`）。
**锚点筛选可以留在 `/products/` 页上，那是页内功能；nav 该指向真页面。**

**→ 若采纳此建议，`nav.shop_by_type` 这个 key 根本不需要 —— 一条译文都不用加。**

⚠️ **但这是导航结构决定，是 dev / 总调度的地盘，不是我的。**
**我给出签字值（`Comprar por tipo`）以备采用原方案；同时把这个结构问题摆出来。**

### 📌 一个我没法判的数（留给 dev）
dev 的 commit 说 `33 cables`，我 grep `blog-one__single` 在 `type/cables/index.html` 上得 **37**。
**差 4。** 可能是页尾的 related 卡片，也可能是别的。**它说「verified against the data, not eyeballed」，我信；但数字对不上，留个记号。**

---

## 变更记录

| 日期 | key | 值 | 备注 |
|---|---|---|---|
| 2026-07-14 | `card.alt.suffix` | `- Produtos Tejoy` | 签字：多语言窗（pt 真源）。同时建议后续删除该 key 本身，见上。 |
| 2026-07-16 | `body.ph.company` | `Nome da empresa` | 签字。⚠️ **不是新译文 —— 是保住现网已有的值**：「存量泄漏」前提实测不成立（现网 4 页全葡语，真源在 `phase2-convert.js:54`），**那 64 处是 R2 回归**。 |
| 2026-07-16 | `nav.shop_by_type` | `Comprar por tipo` | 签字（成对于 `Comprar por modelo Starlink`）。**5 条类型词确认可复用现有 key，无语境差异。** ⚠️ **但建议先看上面的结构问题：那 5 条 nav 链接已存在，加新入口会造成同一下拉里两组同名链接；更好的做法是把现有 5 条从 `/pt/products/#X` 重指到 `/pt/type/X` —— 那样这个 key 不需要存在。** |
| 2026-07-16 | `body.ph.company` | `Nome da empresa` | 签字：多语言窗。⚠️ **但这不是新译文 —— 是保住现网已有的值**。「存量泄漏」的前提**实测不成立**：现网 4 页全是葡语，`Company Name` 现网 0 次；真源在 `phase2-convert.js:54`。**这 64 处是 R2 的回归。** 另评：placeholder 冗余于 label（建议后续 en+pt 一起改成 `Your Company`/`Sua empresa`，**但别夹带进 R2**）。 |
