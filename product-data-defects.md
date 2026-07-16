# ⚠️ 产品数据缺陷清单 —— 铺 SEO 摘要时挖出来的

> **这份报告不是我要找的东西。** 我在铺 61 条 meta description，挖料时逐条读正文，
> 结果 **41 个产品里约 26 个带缺陷**，其中若干**已经不是文案问题**。
> 每一条都附**正文/规格表原文**，可自行核对。

---

## 🔴 一、可能伤人或伤设备的（**建议优先级高于一切文案工作**）

| 产品 | 问题 | 原文证据 |
|---|---|---|
| **`679`** | **标题写 `12V-48V`，正文两处都是 `12V-24V`** —— **48V 车/船（部分卡车、游艇）买家照标题下单会直接烧** | 标题 `12V-48V`；正文 `it ensures a stable **12.8V-24V** power supply` + `works seamlessly with **12V-24V** cigarette lighter jacks`。**48V 在正文里根本不存在** |
| **`678`** | **标题打 `POE`，但引脚是无源直流分配，不是 802.3af/at** —— **买家按「POE」理解插到标准 POE 交换机上有烧设备风险** | `Positive (Pin+): 1, 2, 3, 6; Negative (Pin-): 4, 5, 7, 8`。全文无 802.3af/at、无功率协商 |
| **`695`** | **标题叫 `Waterproof Hard Case`，规格表自己写 `IP Rating: IP60`** —— **IP6`0` 第二位 0 = 对水零防护**。买「防水箱」的人默认淋雨没事 | 正文 `water-resistant, dust-proof`；规格表 `IP Rating: **IP60**` |
| **`692`** vs **`693`** | **同一台 Starlink Mini，两页给出互相打脸的功率门槛** | `692`: `can work with **65W+** PD wall plug`；`693`: `please choose a power bank with at least **100 watts**...(20V 5A output)` |
| **`4207`** vs **`656`** vs **`4204`/`4205`** | **同一台 Starlink Mini，站上有三个功率数字** | `4207`: `official specifications require... **100W** (20V/5A)`；`656`: **36W**；`4204`/`4205`: **60W** |
| **`675`** | **把 `CMX` 说成"更高的安全和防火等级"—— 说反了**。CMX 是 NEC 里**最低**的限用等级（低于 CM/CMR） | `Both CMX and CMR offer **higher safety and fire hazard ratings**` |
| **`665`** | **声称可直埋，但线材是 `CMX/CMR` 级 —— 两者都不是直埋等级** | 正文 `Our Star link cables can be **buried directly**`；标题 `CMX CMR Rated`。**正文和产品图都在说** |
| **`681`** / **`687`** | **磁吸只对铁/钢面有效，但标题主打 RV / Van / Boat / Yacht** —— 铝顶房车、玻璃钢游艇**吸不住**。`687` 全文甚至没提需要铁质表面 | `681`: `gently place it on the **iron roof**` / `more stable on **iron surfaces**`，标题却是 `for RVs, Vans, Boat, Yachts, Trucks`。`687`: 全文零处提及铁质要求 |
| **`691`** | **`all types of roofs` 绝对化声明，且恰好漏掉最装不了的瓦/石板/黏土瓦**；另称 `500lbs` 承重 + 抗 `hurricane-force winds` + 盐雾，**零标准/测试依据**（净重仅 1.25kg 的屋顶件）。**屋顶件掉下来砸人是真实责任** | `ensures a perfect fit and secure installation on **all types of roofs**, including shingles, asphalt shingles, or flat concrete roofs` + `designed to withstand loads over **500lbs**... even in **hurricane-force winds**` |
| **`702`** | **给 Router Mini（9V/18W）的线，正文反复往 Starlink Mini 碟（20V/100W）上蹭** —— 功率差 5 倍多，**买碟配件的人被引进来，插上必然带不动** | `Perfect for home use or **Starlink Mini Portable** on-the-go` / `it's the perfect choice for **Starlink Mini accessories**`。本品实为 `Router Mini` 专用 |

---

## 🔴 二、第三方品牌残留（**在自家商品页给别家打广告**）

| 产品 | 品牌 | 出现位置 |
|---|---|---|
| **`693`** | `XLinkShop` | **正文 5 处 —— 5 条卖点每一条的开头** |
| **`702`** | `STARGEAR` | **正文 4 处** |
| **`669`** | `linkoostar` | 标题 + **`jsonld_product.name`** + **全部图片的 alt** ⚠️ 清理不能只改 title |
| **`681`** | `starlingkshop` | 标题 |
| **`686`** | `DaierTek` | 标题 |
| **`665`** | `Dbilida` | 图片 ×2（其一**印在线身实物上** → 供应链问题，撤图治不了） |
| **`4199`** | `TP-Link` | 图片（真实品牌名 + 疑似 AI 假图） |

---

## 🔴 三、复制粘贴残留（**别的产品的段落串进来了**）

| 产品 | 串进来的东西 |
|---|---|
| **`687`** | 包装清单里混入 **`1x Magnetic LED Tube Light` + `2x Straps`** —— **完全是另一个产品（LED 灯管）** |
| **`674`** | 路由器壁挂支架的包装清单里混入 `673` 的 **`1x Mast` / `1x Pivot Mount`**（桅杆和枢轴座） |
| **`677`** | **DC 电源线通篇讲网速/延迟/信号质量** —— 整段从网线 listing 抄来。同页自称 `extension cable` / `internet cable` / `DC Power Replacement Cable` **三个身份** |
| **`692`** | **转接头被通篇写成「线」** —— `The outer layer of the... power **cable** is made of... PVC`。一个转接头没有 PVC 外被 |
| **`697`** | **耦合器被通篇写成「23AWG cable」** —— coupler 里没有成段线材，AWG 对它几乎无意义 |
| **`662`** | `secure runs of cables like **coax**` —— Gen3 用网线不是同轴 |
| **`680`** | 车载吸盘支架首段冒出 `Starlink **Mesh**`（路由器配件） |

---

## 🔴 四、标题与正文对不上（**买家按标题下单会买错**）

| 产品 | 标题说 | 正文说 |
|---|---|---|
| **`665`** | `30FT 75FT 100FT 150FT` | **通篇 `50ft`（8 次以上）** —— 标题的档位一个都没确认 |
| **`660`** | `Cat 6` · `Waterproof` | `CAT5E FTP` + 1000Mbps · `water-resistant`（**防水 vs 抗水，退货口径不同**） |
| **`700`** | `Cat6` | **通篇零提任何类别等级** |
| **`675`** | `24AWG` · `Satellite V2` | `26AWG` · `Starlink **Gen3** RJ45`（**代次对不上**） |
| **`678`** | `Cat6 RJ45` | 同一张表里 `CAT5E cable` —— **Cat6 头配 CAT5E 线，标 Cat6 涉嫌虚标** |
| **`676`** | `Compatible with 100W+ Power Bank and PD Charger` | **正文零支撑** —— 无 PD、无瓦数、无电压电流。**而这正是「拿 65W 头带不动」的头号退货点** |
| **`686`** | `0.98FT` | 正文**无任何长度数字** |
| **`682`** | `Adjustable` · `Wall` | **两者正文都没有**；且句子是断的：`ensuring long-term use in different .` |
| **`688`** | `fit 1.1-1.7`（**无单位、两端都被截**） | `1 1/8" to 1 3/4"`（=1.125–1.75"）→ **1.75" 的买家看标题会误判不兼容，1.1" 的会误判兼容** |
| **`701`** | 未提有**两个 Option** | 规格表有 `Up to 1 1/2"` 和 `1 1/4" to 2 1/2"` **两个孔径**，正文只讲后者 → **发错货** |

### ⭐ 模板级问题（**不是个案，别一页页打补丁**）
**`669`**（标题 `75FT/23M`）和 **`693`**（标题 `16.4 FT/5 M`）**都**在正文里写 `flexible lengths` / `multiple lengths for you to choose from`，**全文不出现标题那个长度**。
→ **正文是给「多长度 SKU 系列」写的通稿，被复用到了单一长度的详情页上。建议按模板查全站。**

---

## 🔴 五、自家两页互抢同一个词（有几对疑似**同一件货开了两个 listing**）

| 对 | 状况 |
|---|---|
| **`689`** ↔ **`696`** | 夹持 `0.8-1.18"` vs `0.8"-1.17"` —— **差 0.01 英寸（0.25mm），工程上是同一个产品**。都是铝合金「杆+夹」两件套、都主打 RV 梯子/游艇 |
| **`666`** ↔ **`668`** | 都是 Gen2 SPX↔RJ45 一对装、同样的 `75ft/175ft` 限制。差异只有 `IP67`/`IP68`、`24AWG`/`26AWG` —— **更像文案抄串**。且 `668` 是**更细的 26AWG** 却在强调「接触电阻会掉压」，组合反常 |
| **`673`** ↔ **`684`** | 正文**几乎逐字相同的模板**，仅 Compatibility(Gen 3 vs Mini)、净重(3 vs 2.8 Lbs) 不同 |
| **`690`** ↔ **`701`** | **逐句复制**，连拼写错误 `Compatibale` 都一样。真实区别：`690`=Mini/上限 1 1/2"/1 颗螺丝；`701`=Gen 3 Standard/1 1/4"–2 1/2"/2 颗螺丝 |
| **`680`** ↔ **`682`** | 同为 Mini 吸盘支架 |
| **`681`** ↔ **`687`** | 同为 Mini 磁吸支架（100 磅 vs 220 磅） |
| **`685`** ↔ **`686`** | 同为 Mini DC 短线（公转母 vs 母对母） |
| **`697`** ↔ **`700`** | 正文都在讲 `23AWG / 2000Mbps / 防水 / 即插即用` —— **必须一个讲接口转换、一个讲长度走线** |

**另一个方向的发现**：`690` 的整体尺寸与 `691` 的 `Mast Adapter Dimension` **逐字相同** → **`691` = `690` + 桅杆 + 云台的整套**。这两页是**升级关系，该互链，不是竞争关系**。

---

## 📌 六、其它（不改也不致命，但摆在英文页上不体面）

`667` 标题+`meta_title` 错字 `Ntworking` · `660` 标题错字 `Sata` · `662` 拼写 `Adpater` · `681` 拼写 `Compartatible` ·
`686` 标题拼写 `Protable` · `690`/`701` 拼写 `Compatibale` · `44` 拼写 `tradictional`/`enthernet` ·
`664` `5/32" → 3.8mm` 换算不准（应 3.97）· `673`/`684` 整机 22cm 却说单个零件 22.5cm ·
`689` 说明书要 4 颗螺丝、清单只给 2 颗 · `691` `Specifications:` 段**是空的** ·
`684` 标题缺 `For` 前缀（全站唯一）→ **会被读成官方产品，商标风险** ·
`657` 规格表 `Cat 8` 与 26AWG/1200Mbps 对不上 + `Compatible Phone Models: starlink gen 2` 错填 ·
`652` 正文自相矛盾（自己的块 1000Mbps/CAT5E/55cm vs 从 `651` 粘来的 2000Mbps/24AWG/IP68）

---

## ⭐ 七、一条我判错了、被独立复核驳回的（记下来）

我先前判 **`669`「是根 power cord 却在讲 bandwidth，疑似串稿」**。
独立复核驳回：**Starlink 的 Flat High Performance 线本身就是电力+数据同缆的专有 PoE 型线**，
一根线同时供电+传数据 → **同页既讲供电又讲带宽，技术上不矛盾，反而符合该产品的真实形态**。

→ 真问题不是「不该讲 bandwidth」，而是 **`more than Gigabit` 这个带宽声明没有依据**，
且**页面从没解释过它是电力+数据同缆** —— **后者恰恰是本页最该补、也最能变成钩子的信息**。

**我错了，这条更正。**（我让复核方「别照抄我的结论」，它真的没照抄。）

---

## 📊 规模

| | 数 |
|---|---|
| 已挖料的产品 | **41 / 61** |
| **带缺陷的** | **约 26** |
| 其中**可能伤人/伤设备或踩合规红线** | **11** |
| 第三方品牌残留 | **7** |
| 复制粘贴残留 | **7** |
| 疑似同货开两个 listing | **2 对** |

**→ 这不是文案质量问题，是产品数据完整性问题。**
**→ meta description 写得再好，也盖不住「标题说 48V、正文说 24V」。**

---

*多语言窗 · 挖 SEO 摘要素材时的副产物 · 每条附原文可核 · 零改动*
