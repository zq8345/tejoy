# 【3】meta_description 重写 — **样板**（待总工定声音，再全铺）

> ⚠️ **本文件只是草案，未替换任何线上数据。** `data/products/*.json` 一个字没动。
> 按本项目一贯规矩**先出样板**：54 条 × 2 语 = 108 条，声音定错了全部返工，不值当。

---

## 一、先核实前提（上一条【2】的前提错了三个，我不再默认接受数字）

总工说「56 个产品的 meta_description 就是正文前 300 字截断」。

**核实结果：现象属实，我数出 54 个**（口径：meta_description 前 60 字符是否为正文开头）。
另 10 个是独立撰写的。差额 2 个大概率是口径差异，不影响结论。

```
产品总数: 64 | meta_description = 正文截断: 54 | 独立撰写: 10
```

## 二、⚠️ 但截断不是最糟的 —— 我发现两个**已经在 Google 搜索结果里**的 bug

### bug 1：剥标签时没留空格，单词黏连（4200 等）

```
Upgrade Your Power Setup with Our High-Efficiency Mini Flat CableExperience seamless...
                                                            ^^^^^^^^^^^^^^^
```
`...Mini Flat Cable` + `Experience seamless...` 之间原本是 `</h?>` `<p>`，
剥标签时直接拼接 → **`CableExperience`**。这是个真词黏连，Google 直接展示。

### bug 2：HTML 实体没解码，`&quot;` 裸奔进 meta（671 等）

```
(Size: 25.6&quot;L x 15.7&quot;W x 1.57&quot;H)
```
原意是 `25.6"L x 15.7"W`（英寸）。

→ **这两个 bug 说明 meta_description 是被一段"剥标签+截 300 字"的脚本机械生成的，
而那段脚本本身是坏的。** 换句话说：就算不重写文案，这批 meta 也得修。

### bug 3（口径）：300 字符 ≈ Google 展示上限的两倍

Google SERP 大约展示 **155–160 字符**。现在 300 字符 = 一半根本不显示，
且因为是正文开头，**被砍的位置往往在句子中间**。

---

## 三、写作规则（我给自己定的，请总工审）

1. **长度 145–155 字符**，一句话说完，不靠截断。
2. **开头就是钩子**，不是营销标题（❌「Upgrade Your Power Setup with...」）。
3. **卖点必须来自正文** —— 我逐个读了正文才动笔，**一个字不编**。（诚信红线）
4. **带机型词**（Starlink Mini / Gen 3 / Enterprise）—— 那是真实搜索词。
5. **pt 不是 en 的直译**，是同一个钩子的葡语原生说法。
6. 不承诺正文没说的（不写"最快""第一"这类无据形容词）。

---

## 四、样板（4 条，覆盖 mini / enterprise / 收纳 三类）

### 4200 · Starlink Mini 扁平电源线（Type-C→DC / DC→DC, 60W）

| | 文案 |
|---|---|
| **现状** | `Upgrade Your Power Setup with Our High-Efficiency Mini Flat CableExperience seamless, high-speed power delivery with our Mini Flat Power Charging Cable, engineered for modern electronics that demand both performance and portability. Available in two versatile configurations, this cable is the ultimate conne` (300字, 含 bug1) |
| **EN 新** | `Power your Starlink Mini from any USB-C PD charger — or extend an existing DC line. 60W (20V/3A), flat tangle-free build that routes through tight spaces.` |
| **PT 新** | `Alimente seu Starlink Mini com qualquer carregador USB-C PD — ou estenda uma linha DC existente. 60W (20V/3A), cabo flat que passa por espaços apertados.` |
| 钩子依据 | 正文「Type-C to DC: Transform your PD wall adapter into a universal DC power source」+「flat cable construction... route it through tight spaces」 |

**为什么这个钩子**：买家真正的痛点是「不想再背一个专用电源砖」。
「用你现有的 USB-C PD 充电器供电」是这条线**独有**的能力，标题里没说透。

---

### 650 · Starlink Enterprise 转 RJ45 适配器（2 件装）

| | 文案 |
|---|---|
| **现状** | `Seamless Ethernet Conversion: Easily convert Starlink Enterprise's connector to a standard RJ45 port, allowing you to use high-quality 23AWG or better cables for extended connectio` (290字, 句中截断) |
| **EN 新** | `Convert your Starlink Enterprise connector to standard RJ45 — no cutting or crimping. IP67-sealed, supports 23AWG CAT6 runs up to 50 m. Two-pack.` |
| **PT 新** | `Converta o conector do Starlink Enterprise em RJ45 padrão — sem cortar nem crimpar. Vedação IP67 e lances de até 50 m com CAT6 23AWG. Pacote com 2.` |
| 钩子依据 | 正文「no need for crimping or cutting」+「up to 50 meters of 23AWG CAT6」+「IP67 waterproof」+ 标题「(2 Pack)」 |

**为什么这个钩子**：「不用剪线不用压接」是买家最怕的那一步，正文写了但埋在第二句。

---

### 4206 · Starlink Mini 车载 DC 延长线（点烟器 12V/24V）

| | 文案 |
|---|---|
| **现状** | `Product OverviewDesigned for Starlink Mini users who live or travel on the road, this DC power extension cable frees you from the limitations of standard AC wall outlets. Whether y` (299字, 含 bug1 `OverviewDesigned`) |
| **EN 新** | `Run your Starlink Mini straight off your vehicle's 12V/24V socket — no generator, no shore power. IP68 connectors, 18AWG pure copper. RV, truck, boat, car.` |
| **PT 新** | `Ligue seu Starlink Mini direto no acendedor 12V/24V do veículo — sem gerador. Conectores IP68, cobre puro 18AWG. Para RV, caminhão, barco e carro.` |
| 钩子依据 | 正文「no generator or shore power required」+「IP68 waterproof-rated connectors」+「18AWG pure copper core」+「travel trailers, RVs, trucks, cars, marine boats」 |

---

### 671 · Starlink Gen 3 收纳包（多口袋 / 手提肩背）

| | 文案 |
|---|---|
| **现状** | `Multi-pocket Design: This starlink gen 3 case is designed for Starlink Gen 3. (Size: 25.6&quot;L x 15.7&quot;W x 1.57&quot;H) Multiple pockets are separated for storage and the lay` (299字, 含 bug2 `&quot;`) |
| **EN 新** | `Carry your whole Starlink Gen 3 kit in one bag — dish, router, cables, power supply. Padded shock-absorbing nylon; handle plus detachable shoulder strap.` |
| **PT 新** | `Leve todo o kit Starlink Gen 3 em uma bolsa — antena, roteador, cabos e fonte. Nylon acolchoado antichoque, com alça de mão e alça de ombro removível.` |
| 钩子依据 | 正文「large pocket can hold the Gen 3 Dish, small pocket can hold the Router/cable/Power Supply」+「Shock-absorbing Cotton」+「handle... or detachable... shoulder strap」+「made of nylon」 |

**pt 用词说明**（我是 pt 真源，这几个是判断不是直译）：
- `Dish` → **`antena`**（巴西口语就说 antena，不说 prato）
- `shock-absorbing` → **`antichoque`**（现成词，不生造 `absorvente de choque`）
- `kit` → 保留（巴葡通用外来词，且 Starlink 官方巴西站就用 kit）

---

## 五、⚠️ 排期上的一个坑（跟【2】同一道闸）

**改 `i18n.en.meta_description` 会改变 en 输出 → 破 dev R2 的「en 字节一致」验收门。**

所以即使总工批了文案，**也不能现在写进 JSON**。建议：
1. **R2 先落地验收**（en 字节一致成立）
2. 再单独一次改动落这批文案（en+pt 一起，那次自己单独验，en 输出会变、是有意的）

**唯一的例外**：如果总工判断 bug1/bug2（`CableExperience` / `&quot;`）是**线上正在流血的 SEO 伤**、
不能等 R2，那也应该**单独一个 commit 只修这两个 bug**、并明确告知 dev「en 基线已移动，请 rebase 后重取字节基线」——
**而不是**悄悄夹带。夹带会让 dev 的验收信号失效，而他不知道。

---

## 六、待总工裁决

1. **声音对不对**？（钩子在前、145–155 字、卖点必须有正文出处）→ 批了我就全铺 54 × 2 = 108 条。
2. **bug1/bug2 要不要提前单修**？（`CableExperience`、`&quot;` 已在线上）还是跟文案一起等 R2 之后？
3. **en 文案我是否有权写**？我是 pt 真源，en 侧按理该 dev 或运营窗签字。
   我可以起草，但**建议 en 最终由懂英文母语侧的人过一遍**——同理于 dev 拒绝替我签 pt。

---

*多语言窗 · 基于 `2be1cd44` · 零数据改动*
