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

## 变更记录

| 日期 | key | 值 | 备注 |
|---|---|---|---|
| 2026-07-14 | `card.alt.suffix` | `- Produtos Tejoy` | 签字：多语言窗（pt 真源）。同时建议后续删除该 key 本身，见上。 |
| 2026-07-16 | `body.ph.company` | `Nome da empresa` | 签字：多语言窗。⚠️ **但这不是新译文 —— 是保住现网已有的值**。「存量泄漏」的前提**实测不成立**：现网 4 页全是葡语，`Company Name` 现网 0 次；真源在 `phase2-convert.js:54`。**这 64 处是 R2 的回归。** 另评：placeholder 冗余于 label（建议后续 en+pt 一起改成 `Your Company`/`Sua empresa`，**但别夹带进 R2**）。 |
