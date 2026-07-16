# 产品数据体检 —— **64/64 全做完**

> 总调度：「Joe 拿到的是一张半张的画面……剩下那些是好是坏，直接影响他怎么判。」
> 现在是完整的画面。**每条附原文，可核对。**

---

## ⚠️ 先纠正一个我自己造成的误导

总调度说「**剩 20 个**」，那是基于我报的「41/61」。**这个进度数字把范围搞混了**：
- **61** 是「meta 截断式产品」的数（【3】的范围）
- **64** 才是**体检**的对象（全部产品）

真实缺口是 **12 个**（3 个从没碰过 + 9 个我只读过正文、没做过缺陷检查），不是 20 个。
→ **我的进度数字误导了你。** 现已全部补完：**64/64**。

---

## 🔴 第一类：可能伤人 / 伤设备（**只看这一类**）

### ⚡ `4206` —— 一页三雷，其中一条是**物理性的起火路径**

| # | 问题 | 原文 |
|---|---|---|
| **1** | **18AWG 的线，配 15A 保险丝** | `Cable Gauge \| **18AWG** high-purity copper`<br>`Inline Fuse \| **15A** (built-in for circuit protection)` |

**为什么这条最严重**（我自己核过原文 + 电气常识）：
- 18AWG 铜线在车用/配线场景的安全载流**约 10A 上限**
- **15A 的保险丝意味着：电流冲到 10–15A 时，保险丝还没熔断，线已经在过载发热**
- **保险丝的职责是保护它下游的线。额定值高于线的载流 = 保护失效**
- ⚠️ **这根线接的是车/船电瓶 —— 一个能供出几百安培的源。**

→ **这不是文案瑕疵，是接线安全问题。** 要么线换粗，要么保险丝换小，**两个数字必须对得上**。

| # | 问题 | 原文 |
|---|---|---|
| **2** | **一根无源延长线，声称输出 100W / 20V 5A** | `Input Voltage \| DC **12V–24V** (standard cigarette lighter)`<br>`Power Rating \| Up to **100W (20V/5A** max)`<br>`Supports up to 100W power output (20V/5A), **fully meeting the power requirements** of your Starlink Mini` |

**全文没有任何升压/转换器**。**12V 进只能 12V 出** —— 而按同站 `704` 自己的说法，低于 12.8V 会**不停重启**。

| # | 问题 | 原文 |
|---|---|---|
| **3** | **IP68 自己前后打架** | 规格表：`Waterproof Rating \| IP68 (**connector end**, with sealing gasket)`<br>卖点：`IP68 waterproof-rated connectors… protect against rain, snow, dust, and **salt spray** — ideal for outdoor and **marine** installations`<br>用例：`Boat \| IP68 waterproof rating stands up to **salt spray and marine moisture**` |

规格表把 IP68 限定在**接头端**，卖点却拿它承诺**整线**抗盐雾上船 —— **而这根线另一头是敞开的点烟器插头**。

---

### ⚡ `704` —— 同一段里自己打自己

| 原文 |
|---|
| `【**100W+**12.8V PD Source Required】…This cable requires use with a PD power adapter or PD power supply supporting **at least 65W** of power. Starlink Mini needs at least 12.8V to work properly. **If the voltage drop below 12.8V, Starlink mini will constantly reboot** because of the lack of power.` |

**小标题要求 100W+，正文说 65W 就行 —— 而它自己紧接着写了"电压不够会不停重启"。**
照 65W 买的客户，直接踩它自己描述的那个坑。

---

### ⚡ 跨页：**Starlink Mini 到底要多少伏，站上有三套说法**

| 产品 | 说法 |
|---|---|
| `703` | **24V** / 2.5A / 60W |
| `4204` `4205` | **30V** / 2A / 60W |
| `4200` `4206` | **20V** |

**三套不可能都对。** 但**每一页内部都自洽** → **无法从文件判定哪份是真的**。
→ **必须拿实物或 Starlink 官方规格定一次真源，然后统一刷。**
（这跟先前报的功率乱套是同一件事的另一面：`4207`=100W · `4204`/`4205`=60W · `656`=36W · `692`=65W+ vs `693`=100W）

---

## ⭐ 模板级问题 —— **脚本扫全站，范围已钉死**

### 1. 「标题钉死长度，正文写 flexible lengths」→ **命中 3 个，全站就这 3 个**
```
🔴 663  标题 2M/3M/5M/10M/15M  → 正文 "flexible/multiple lengths"，标题的长度数字全不出现
🔴 669  标题 75FT/23M          → 同
🔴 693  标题 16.4 FT/5 M       → 同
```
**通稿是给「多长度 SKU 系列」写的，被复用到了单一长度页。** 好消息：**只有 3 个，不是一批。**

### 2. 第三方品牌残留 → **扫全字段（title / body / jsonld / meta_title / images.alt），命中 5 个**
```
🔴 669  linkoostar    (title, jsonld, meta_title, images.alt)   ← 4 个字段都有
🔴 681  starlingkshop (title, jsonld, meta_title, images.alt)   ← 4 个字段都有
🔴 686  DaierTek      (title, jsonld, meta_title, images.alt)   ← 4 个字段都有
🔴 693  XLinkShop     (body×5, jsonld)
🔴 702  STARGEAR      (body×3, jsonld)
```
⚠️ **前三个改 title 是不够的** —— `jsonld_product`、`meta_title`、**全部图片 alt** 里都有。
（`665` 的 `Dbilida`、`4199` 的 `TP-Link` 在**图片像素里**，扫不到，已按 Joe 决定撤图处理。）

---

## 🟡 第二类：其它（**不用给 Joe 看**）

| 产品 | 问题 |
|---|---|
| **`42` ↔ `43`** | **疑似同一件货两个 listing**：正文**七张配图文件名完全相同**（`StarlinkPerformanceAdapterGen3cable1-7.png`）。且各自页内线长自打脸：`42` 说 `164ft` 又说 `75ft`；`43` 说 `175 feet (50 meters)` 又说 `164 feet` —— **且 50m ≠ 175ft（换算错，应为 164ft）** |
| **`671`** | 四处：材质 `nylon` vs `polyester` 打架 · 尺寸 `25.6"L` vs 规格表 `24"`（括号里 `61cm` 换算正是 24"，说明 25.6 是错的）· `Should Strap` 拼错 ×2 · `route` 应为 `router` |
| **`4201`** | 摘要说能给手机/平板快充、当手机支架，**但规格说只有 DC 桶形口、专供 Mini，全篇无 USB 口** · 占位符没填：`it provides **of** continuous high-speed internet` · 标题打 `Fast Charging` 但**全文无输出电压/瓦数/续航数字** |
| **`703`** | **`Specifications`（规格）标题下面一条规格都没有** —— 规格表整块丢失 |
| **`4205`** | **生成文案时的 HTML 注释原样入库进了正文**：`<!-- Feature List (clean, no extra classes or styling) -->`、`<!--!doctype-->` |
| **`4204`** | **英文页两张图的 alt 是微信导出的中文文件名**：`alt="微信图片_2026-04-23_093435_645.png"` —— 会被搜索引擎和读屏软件读到 |
| **`4200`** | 标题是 `For Starlink Mini`，**正文+规格表通篇一次没提 Starlink**；兼容性只列通用桶形口尺寸 |
| **`4203`** | 自称 `2-in-1` 但**全文没说是哪两个功能**（只有一个 DC 5521 口）· 一根 DC 线却讲 `minimal **signal loss**` · keywords 混入中文全角逗号 |
| **`650`** | 标题 `(2 Pack)` + `with End Caps`，**正文既无数量说明也无包装清单，End Caps 一字没提** · keywords 带截断省略号入库 |
| **`4200`/`4206`** | meta 是正文机械截断：`CableExperience` / `OverviewDesigned` 粘字，且断在半个词 `ultima` / `wee` |

---

## 📊 完整画面

| | 数 |
|---|---|
| **产品总数** | **64** |
| **体检覆盖** | **64 / 64（100%）** |
| **完全干净的** | **0** |
| **🔴 可能伤人/伤设备/踩合规** | **~14**（新增 `4206`×3 + `704`×1 + Mini 电压三套口径） |
| 第三方品牌残留 | **7**（5 个在文本字段 + 2 个在图片像素，已撤图） |
| 复制粘贴残留 | **12+** |
| 疑似同货两 listing | **3 对**（`42`↔`43` · `689`↔`696` · `666`↔`668`）+ `690`↔`701` 逐句复制 |

**→ 64 个产品，没有一个是干净的。**

---

## 💡 我的建议（供参考，不是我该拍的）

**这不是「要不要体检」的问题了 —— 体检做完了，结论是全都有问题。**
真正的问题是**怎么修**：

1. **🔴 那 3 条先修**（`4206` 的保险丝/线规、`704` 的 65W、Mini 电压真源）—— **跟卖不卖得动无关，跟烧不烧客户设备有关**
2. **模板级的用脚本刷**（3 个长度通稿 + 5 个品牌残留）—— **一次性能扫出一批，不该一页页手改**
3. **其余排队** —— 但先定一件事：**这批数据是谁生成的？**
   `4205` 把 `<!-- Feature List (clean, no extra classes or styling) -->` 这种**给自己看的写作指令**写进了正文，
   `4201` 有没填的占位符，`4204` 的 alt 是微信文件名 ——
   **这些痕迹指向同一个上游流程。修 64 个页面是治标；那个流程不改，下一批产品还是这样。**

---

*多语言窗 · 64/64 全量体检 · 每条附原文 · 脚本扫模板级问题（范围已钉死）· 零改动*
