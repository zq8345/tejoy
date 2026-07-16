# 西语（es-419）翻译规范 —— **地基,未开工**

> 总调度:「趁 R3 在做,把西语的地基先备好。**别开始翻,只备规范** —— R3 没落地,翻了会返工。」
> 本文件**零翻译产出**,只有:①从 pt 实战里提炼的、**西语会重演/不会重演**的坑 ②必须先拍的决定。
> **每条都附 pt 的实证数字,不是印象。**

---

## 🔴 一、最要紧的一条:**pt 的尺子不能照搬给 es —— 照搬当场废掉**

`pt-leak-scan.mjs` 的 `EN_MARKERS`(290 个"无歧义英文标记词")里,有 3 个**在西语中是合法西语词**:

| 词 | pt 侧 | es 侧 | 实测爆炸半径 |
|---|---|---|---|
| **`cable`** | pt 是 `cabo` → **`cable` 确是英文残留** | **`cable` 就是西语词本身** | ⚠️ **pt 页里 `Cabo/Cabos` 出现 3202 次 / 90 页** → **es 每一页都会被标红** |
| **`durable`** | pt 是 `durável` | **`durable` 是合法西语** | pt 里 `durável` 出现 **201 次** |
| **`simple`** | pt 是 `simples` | **`simple` 是合法西语** | pt 里 7 次 |

→ **`cable` 这一个词就足以让 es 的 scanner 100% 失效** —— 而且它**看起来在正常工作**(每页都报泄漏,像是翻译没做完)。

### ⭐ 根因:**西语与英语的同形词远多于葡语**
pt 只需剔除 **6 个**:`use` / `ideal` / `complete` / `data` / `total` / `normal`
**es 至少还要剔除**(同一个 `-al` / `-ble` / `-ar` 词尾家族):
```
cable  durable  simple  real  general  material  original  flexible  metal  control
panel  universal  natural  digital  central  local  portable  compatible  visible
industrial  comercial  personal  principal  especial  actual  manual  legal  social
horizontal  vertical  individual  similar  particular  popular  regular  superior
interior  exterior  final  color  error  base  line  red(=网络!)  solo  fin  sea  van  son
```
⚠️ **`red`** 尤其阴险:英语 = 红色,**西语 = 网络** —— 这是本产品目录的核心词(`red Wi-Fi` / `adaptador de red`)。
⚠️ **`no`** / **`con`** / **`sin`** / **`para`** / **`como`** / **`este`** / **`mas`** —— 西语功能词,若混进标记词表 = 每页必红。

**→ 结论:es 的 `EN_MARKERS` 必须从零重建,不能从 pt 复制。**
**→ 建 es 基线前,先跑一遍「把标记词表逐个对着西语词典过」** —— 这是 30 分钟的活,能省掉一把废尺子。

---

## 🔴 二、必须先拍的 4 个决定（**我给建议,但这些不全是我能定的**）

### 1️⃣ `usted` vs `tú` —— **这个决定要贯穿全站,现在不定,以后改要动每一页**

| | pt 侧我怎么做的 | es 侧的分叉 |
|---|---|---|
| placeholder | `Seu nome` / `Seu telefone` | **`Su nombre`(usted)** vs **`Tu nombre`(tú)** |
| CTA | `Envie uma consulta` | `Envíe una consulta`(usted) vs `Envía una consulta`(tú) |

**pt 没有这个问题** —— 巴西 `você` 一统,`Seu` 两边都通。
**西语有,而且 LatAm 内部还分叉**:阿根廷用 `vos`(`Enviá`),墨西哥/哥伦比亚 `tú`,正式商务 `usted`。

**我的建议:`usted`**
- 理由:①**pan-LatAm 安全**(vos 区也接受 usted,反之不成立) ②Tejoy 有 OEM/ODM 面 = 半 B2B ③买家是房车/船主,不是青少年
- **代价**:比 `tú` 冷一点。若 Joe 要 B2C 暖调,就全站 `tú` —— **但那样阿根廷会读着别扭**
- ⚠️ **这是市场定位决定,不纯是语言判断 → 该 Joe 拍**

### 2️⃣ **数字格式:LatAm 内部是分裂的**
```
墨西哥:      25.6"  1,200 Mbps   ← 句点小数(同美国)
阿根廷/智利/哥伦比亚: 25,6"  1.200 Mbps   ← 逗号小数(同 pt-BR)
```
**pt 我统一用了逗号**(`25,6"`),巴西无分歧。
**es 没有"都对"的选项。** 建议:**跟主力市场走** —— 若墨西哥是首要市场就用句点。**待 Joe 定市场优先级。**

### 3️⃣ **"车"这个词,LatAm 内部也分裂**
```
carro   ← 墨西哥 / 哥伦比亚 / 中美
auto    ← 阿根廷 / 智利 / 乌拉圭
coche   ← 西班牙(❌ 不用)
```
本目录**高频**(`Car Charger` / `for Car, Truck, RV, Boat`)。
**我的建议:`auto`** —— 理由:`carro` 在南锥体听着像巴西外来词;`auto` 在墨西哥完全可懂(`automóvil` 的缩写),**反向不成立**。
**同类需定的**:`truck` → `camión`(通用) · `boat` → `bote`/`lancha`(小)/`barco`(大) —— **本目录的语境是小艇,建议 `bote`**

### 4️⃣ **外来词:哪些保留英文**(pt 的判例可以参考,但不能照抄)

| en | pt 我的决定 | es 建议 | 理由 |
|---|---|---|---|
| `Case` | **保留 `Case`**(`Cases e Proteção`) | ⚠️ **改用 `Estuche`** | 西语 `case` 不是通用外来词;`estuche`(硬壳)/`funda`(软套) 是本地词。**pt 保留是因为巴西真这么说,西语不是** |
| `Kit` | 保留 | **保留** | 西语通用,且 Starlink 官方拉美站就用 `Kit` |
| `power bank` | 保留 | **保留**,但 ⚠️ **必须进白名单**(不然被标记词 `power` 命中) | LatAm 通用;`batería externa` 也可,但 power bank 更常见 |
| `plug and play` | 保留 | **保留** | 技术通用 |
| `notebook` | 保留 | ⚠️ **改用 `laptop`** | **巴西说 notebook,西语说 laptop/portátil** —— **这是个真陷阱:两个语言的英语外来词不一样** |
| `off-grid` | 保留 | 保留 | 无好的西语对应 |
| `Dishy` | 保留 | 保留 | Starlink 官方昵称 |

⭐ **最后一条(`notebook`)值得单独说**:**两种语言借的英语词不是同一批。**
「pt 保留了英文所以 es 也保留」是错的推理 —— **要逐个查那个语言真实的说法,不能从另一个语言外推。**

---

## ✅ 三、**可以直接复用的**(pt 的白名单,与语言无关)

这些是**技术/规格 token**,任何语言都保持英文 —— **可原样搬过来**:
```
机型/产品线: Starlink · Mini · Standard · Standard Actuated · Standard Circular
             Performance (Gen 1/2/3) · Flat High Performance · Enterprise · Dishy
             Rectangular Satellite · Mesh Router · Internet Kit · V2/V3
规格 token : RJ45 · IP67/IP68 · PoE/POE · Type-C · USB-A/C · DC · AC · PD · AWG
             Cat5e/Cat6/Cat8 · T568B · CMX/CMR · Ethernet · SPX · E-MARKER · DC5521 · LED
认证/商务  : OEM · ODM · MOQ · DDP · ISO · RoHS · CE · FCC · QC · XML · FAQ · SKU · CIF · FOB · EXW
品牌       : Tejoy · SpaceX · (+ 待清理的第三方残留)
法定名     : TEJOY STARLINK ACCESSORIES LIMITED
数值+单位  : 60W · 20V · 5A · 1200Mbps · 23AWG · 75FT · IP68 · −20°C
```
⚠️ **一个 pt 的实战教训直接适用**:**多词条目必须排在单词之前**,否则 `\bStarlink\b` 会先吃掉中间词,
`TEJOY STARLINK ACCESSORIES LIMITED`(法定名)**永远匹配不上** → 假阳性 212→29。**这个 bug 会原样重演。**

---

## ⚠️ 四、pt 踩过、**es 会原样重演**的坑（按会不会重演分类）

| pt 的坑 | es 会重演吗 | 说明 |
|---|---|---|
| **同形词假阳性** | ⚠️ **更严重** | 见 §一。pt 6 个,es 至少 40+ |
| **多词白名单排序** | ✅ **会** | 与语言无关,是正则的性质 |
| **词边界要含重音字母** | ✅ **会** | pt:`transferência` 被切成 `transfer` → 假阳性。**es:`transferencia` 同样**;且 es 有 `ñ` —— **正则的字符类必须含 `ñ`**,否则 `año`/`diseño`/`pequeño` 全被切断 |
| **`&#12304;` 数字实体没解码** | ✅ **会** | 与语言无关 |
| **剥标签不留空格 → 单词黏连** | ✅ **会** | `CableExperience` 那个 bug |
| **`?v=` 查询串** | ✅ **会** | 与语言无关 |
| **`images[].alt` 语言中立** | ❌ **已由构造解决** | dev 的派生方案(`alt = i18n[locale].title`)对 es 自动生效 —— **这是 R3 给西语的最大红利** |
| **`card.alt.suffix` 每语一份** | ⚠️ **要签一个 es 值** | 但**建议一并删掉这个 key**(我早提过),那样 es 一条都不用签 |
| **chrome 每页一份 → 改一处要改 90 页** | ❌ **已由 catalog 解决** | R1 的成果 |

---

## ⭐ 五、**从 pt 学到的、最该带给 es 的一条**

> **b(256 处) 靠 catalog key、c(46 处) 靠派生规则 —— 两次都不是靠翻译清掉的,是靠删掉那个概念清掉的。**
> **最好的翻译,是让那个字符串不必存在。**

**对 es 的具体意义**:
| 在做 es 之前先问 | 若答案是"能" |
|---|---|
| 这个字符串**能不能由别的字段派生**? | **别翻它** —— 派生一次,所有语言都对(如 `alt = title`) |
| 这个字符串**是不是每页一份**? | **先进 catalog** —— 否则 es 要翻 90 遍,日语再 90 遍 |
| 这个概念**是不是本来就不该存在**? | **删掉它** —— 如 `card.alt.suffix`(品牌后缀对屏幕阅读器是噪音) |
| 这个值**能不能从数据算出来**? | **让生成器算** —— 如 `meta_title = {本地化标题}-{机型}-Tejoy{后缀}` |

**→ 每加一种语言,上面每一条都在收利息。pt 是第一次付学费的那个。**

---

## 📋 六、开工前的检查清单（**R3 落地后**）

- [ ] **es 的 `EN_MARKERS` 从零重建**(逐个对西语词典过,**尤其 `cable`/`red`/`no`/`durable`/`simple`)
- [ ] **正则字符类含 `ñ` 和重音字母**(`[a-zà-ÿñ]`)
- [ ] Joe 拍:**`usted` vs `tú`**(市场定位决定)
- [ ] Joe 拍:**数字格式**(墨西哥句点 vs 南锥体逗号)→ 跟主力市场
- [ ] 定:`auto` vs `carro`(我建议 `auto`)
- [ ] 定:`Estuche` 替代 pt 的 `Case`;`laptop` 替代 pt 的 `notebook`
- [ ] **es 基线按 DOM 位置分类**(卡片 / `<title>` / alt),**不是按文件路径** —— pt 基线那个 `a` 类判据是错的,别复制
- [ ] 复用 pt 白名单的**技术 token 部分**(§三),**不复用 EN_MARKERS**

---

## ⚠️ 七、本文件的边界

- **零翻译产出** —— R3 没落地,翻了会返工(总调度的判断,我同意)
- §二 的 4 个决定里,**①②是市场定位决定,该 Joe 拍**;③④我给了建议,**但我是 pt 真源,不是 es 真源** ——
  ⚠️ **若有西语母语者,这些该他签,不该我签**(同 dev 拒绝替我签 pt 的道理)
- 我能做的是:**把 pt 踩过的坑标出来,把可复用的搬过来,把不能复用的拦住**

---

*多语言窗 · 基于 pt 实战(501→7,尺子一次没换)· **零翻译,只备地基***
