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

# 全量铺开（总调度已批声音，2026-07-15）

## ⚠️ 口径先钉死：**52 条，不是 54，也不是 56**

我用 `node -e` 内联跑过两次，得到 **54** 和 **52** —— 因为 bash 双引号里 `$` 被转义，
**两次的判定正则实际不同**。这就是「数字漂」，我自己又犯了一次。
→ 口径已钉进 **`scripts/meta-truncation-census.mjs`**（文件里，不在命令行里），两次复跑完全一致：

```
产品总数 64
  截断式 meta_description : 52   ← 【3】重写范围
  独立撰写                 : 12   ← 不动
  空                       : 0
```

### ⚠️⚠️ 但有一个**必须人工核**的风险

| 谁 | 说法 |
|---|---|
| 总调度 | 「56 个」 |
| **dev**（独立实测） | **56 派生 + 8 真人文案** |
| **我**（钉死口径） | **52 截断 + 12 独立撰写** |

**两个独立分类器在 4 个产品上不一致。** 按总调度的红线「**宁可缺，不可编**」——
**若我把一条真人文案误判成「截断」然后重写，就是在毁掉真文案**（正是 dev 拒绝一刀切派生的理由）。
→ **那 4 个必须逐条人工核，核完才动。** 已列入下方待办，**未核完不铺那 4 条**。

---

## 批次 1（6 条 × 2 语）

> 规则不变：钩子在前 · 145–155 字 · **卖点必须标出正文出处，一个字不编**。

### `42` · Starlink Performance Gen 3 转 RJ45 适配器（耦合器式）
| | |
|---|---|
| 现状 | `Plug-and-Play Connectivity:The Starlink Ethernet Adapter for Performance Gen 3 provides a seamless connection…`（299字，句中截断） |
| **EN** | `Connect your Starlink Performance Gen 3 dish to standard Ethernet — no cutting, no crimping. Soldered RJ45 connectors cut contact resistance by 50%.` |
| **PT** | `Conecte a antena Starlink Performance Gen 3 a cabos Ethernet comuns — sem cortar nem crimpar. Conectores RJ45 soldados reduzem a resistência em 50%.` |
| 出处 | 正文「eliminates the need for cutting or crimping」+「patented advanced soldering-type RJ45 connectors… reduce contact resistance by **50%**」 |

### `43` · Starlink Performance Gen 3 转 RJ45（一体线式）
> ⚠️ `42` 与 `43` 是**近似产品**，钩子必须区分开，否则两页互相吃流量。
> `42` = 耦合器/延长；`43` = **一根线一体成型 + 两端都防水**。

| | |
|---|---|
| 现状 | `*Compatibility:Designed specifically for the Starlink Performance Gen 3 dish…`（300字，句中截断） |
| **EN** | `One cable: Starlink plug on one end, waterproof RJ45 socket on the other. Fits both dish and router — no cutting, no crimping, sealed at both ends.` |
| **PT** | `Um único cabo: plugue Starlink de um lado, tomada RJ45 à prova d'água do outro. Para antena e roteador — sem cortar nem crimpar, vedado nas duas pontas.` |
| 出处 | 正文「integrated Starlink plug (for both Dish & Router) and a female RJ45 (T568B) adapter, **all in a single cable**」+「**both the female and male ends** of the cable are fully waterproof」 |

### `4203` · 2 合 1 车载 12–24V 电源线
| | |
|---|---|
| 现状 | `Engineered for Starlink Mini enthusiasts, this 2-in-1 12-24V car adapter power cable transforms…`（298字，句中截断） |
| **EN** | `Power your Starlink Mini from any 12–24V cigarette lighter. Spring-loaded plug stays put on rough roads. Waterproof DC 5521, 18AWG copper, −20 to 60 °C.` |
| **PT** | `Alimente seu Starlink Mini em qualquer acendedor 12–24V. O plugue com mola não solta em estrada ruim. DC 5521 à prova d'água, cobre 18AWG, −20 a 60 °C.` |
| 出处 | 正文「**spring-loaded contact design to prevent loosening during bumpy rides**」+「waterproof DC 5521 plug」+「18AWG copper core」+「−20°C to 60°C」 |
| 钩子理由 | 「颠簸路上插头不松脱」是**这条线独有的**，标题里完全没说 —— 而它正是车载用户真实的痛点。 |

### `4204` · Starlink Mini 60W 电源套装（家用 + 车载）
| | |
|---|---|
| 现状 | `Engineered for Starlink Mini users, this 60W power supply kit delivers efficient and stable power…`（300字，句中截断） |
| **EN** | `Two ways to power your Starlink Mini in one kit: a 110–240V wall adapter plus a 12V car charger, both 30V/2A 60W. Waterproof DC cable for the road.` |
| **PT** | `Duas formas de alimentar o Starlink Mini em um kit: adaptador de tomada 110–240V e carregador veicular 12V, ambos 30V/2A 60W. Cabo DC à prova d'água.` |
| 出处 | 正文「The kit includes **two** essential components: AC Power Adapter: Accepts **110-240V**… outputs **30V=2A (60W)**」+「**12V DC Car Charger**」+「rugged, **waterproof** DC cable」 |

### `4205` · Starlink Mini 车载 DC-DC 转换器
| | |
|---|---|
| 现状 | `The Mini Car Power Adapter is a high-performance DC-DC converter tailored for Starlink Mini users…`（300字，句中截断） |
| **EN** | `DC-DC converter that turns any 12–24V vehicle supply into the steady 30V/2A the Starlink Mini needs. Overload protection, no wiring. Truck, RV, boat.` |
| **PT** | `Conversor DC-DC: transforma 12–24V do veículo nos 30V/2A estáveis que o Starlink Mini exige. Proteção contra sobrecarga, sem fiação. RV, barco, caminhão.` |
| 出处 | 正文「input range of **12V-24V**… fixed **30V 2A (60W)** output… **without voltage fluctuations**」+「**Overload Protection**」+「**Plug-and-Play**: No complex installation」 |
| ⚠️ | `4205` 与 `4206`（样板里那条）**都是车载供电**。`4206`=延长线（点烟器→DC），`4205`=**DC-DC 转换器**（升压到 30V）。钩子已按此区分。 |

*（`4200` 见上方样板，已含）*

---

## 进度
- ✅ 样板 4 条（`4200` / `650` / `4206` / `671`）
- ✅ 批次 1：`42` `43` `4203` `4204` `4205`
- ⏳ 剩余 **约 43 条**（52 − 9 已写），分批推进
- 🔴 **阻塞项**：与 dev 分类不一致的 **4 个产品必须先人工核**（宁可缺不可编）

## 「正文无钩子可用」清单（总调度要求：**宁可缺，不可编**）
> 目前批次 1 的 6 条**都有真钩子**。此清单随铺开逐条追加 —— **绝不为了填满 52 条而制造钩子**。

*(暂空)*

## 本次重写顺带修掉的既有线上 bug（总调度要求挂账，别让它们悄悄消失）
| bug | 实例 | 重写后 |
|---|---|---|
| **bug1** 剥标签不留空格→单词黏连 | `4200` `CableExperience` / `4206` `OverviewDesigned` | ✅ 自动消失（新文案是重写的，不是截的） |
| **bug2** HTML 实体未解码 | `671` `25.6&quot;L x 15.7&quot;W` | ✅ 自动消失 |
| **bug3** 长度约为 Google 展示上限的两倍 | 52 条全部 290–300 字 | ✅ 新文案 145–155 |

---

*多语言窗 · 零数据改动（只写草稿，不碰 JSON —— 会破 R2 的 en 字节一致门）*
