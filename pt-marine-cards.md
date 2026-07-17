# pt/marine 缺的 20 张卡 —— **判断 + 40 条译文**

> 总调度:「**这 40 条可能不该存在,你有权推翻这个任务。** 你说 A/B/C,理由给我。」

---

# 第一部分:判断 —— **C，但 B 根本不成立**

## 🔴 一、**B 不是一个选项,是一个遗留物**（决定性,实测）

```
en/marine 的 30 篇:  62 63 64 65 66 67 68 69 70 71 72 73 74 75 76 77 78 79 80 81 82 … 91
pt/marine 的 10 篇:                                                              82 … 91
                                                                                  ↑
                                                    **恰好是 en 的最后 10 篇,一个连续区间**
```

**那不是"挑出来给巴西人的 10 篇" —— 那是旧分页器第一页的残留**（dev 刚修掉的那个分页 bug）。
**没有任何原则说「82-91 归巴西人,62-81 不归」。**

→ **B = 「保持现状」,而现状本身是一个 bug 的产物。** 把 bug 的输出当成一个可选方案,是给它追认合法性。
→ **B 出局。剩下的是 A 和 C。**

## 二、dev 那句我不能反驳,但它只对一半

> **「可达性一点没少（那 20 页在 pt 侧本来就点不到），页面只是不再对用户撒谎。」**

**「不再撒谎」这半句对** —— 但**「本来就点不到」是状态论证**:
「它以前就坏,所以不修它不算损失。」—— 这跟「我们一直有这个 bug,所以留着不亏」是同一句话。

**而且它漏了一件事:那 10 张卡已经在撒同样的谎了。**
所以真正的问题不是「要不要多 20 个谎」,而是 **「pt/marine 的正确状态是什么」**。

## ⭐ 三、我的判断:**C —— 30 张全上 + 语言标注**

| | 用户实际经历 |
|---|---|
| **A（30 张不标）** | 点进去发现是英文 → **一次小背叛** ×20 |
| **B（10 张）** | **看不到那 20 篇存在** → 直接走人。而且这 10 篇是**随机的**（分页残留） |
| **⭐ C（30 张 + 标注）** | **「这篇有,是英文的」** → 用户自己决定要不要读 |

**为什么 C 对**:
- 巴西技术人群读英文技术文档是常态。**问题从来不是"英文",是"没被告知"。**
- **信息存在却藏起来 = 用户永远不知道** —— 这比让他看到一篇英文文章糟得多。
- **卡片用葡语描述英文文章,本身不是撒谎** —— 那是**图书馆目录**:用读者的语言,告诉他这本书讲什么。**缺的只有一句「这本书是英文的」。**

## 🔴 四、⭐ **但标注必须是【派生】的,不能手写** —— 这是整条判断里最要紧的一句

**若手写 30 个「em inglês」**:Phase 3 把指南译成葡语后,**必须有人记得去删那 30 个标注**。
**忘了 → 标注反向撒谎**（说是英文,其实是葡语）。

> **一个写的时候对、后来烂掉的值 —— 这是我们这周踩的每一个坑的形状。**

**正确做法:让它由构造消失**
```js
// 卡片渲染时
const ptArticleExists = exists(`pt/marine/${id}.html`);
if (!ptArticleExists) → 标注 "em inglês" + 链接指向 /marine/{id}
else                  → 无标注 + 链接指向 /pt/marine/{id}
```
→ **Phase 3 一落地,标注自动消失,链接自动切到 pt 版。没人需要记得任何事。**

**这跟这个项目学到的是同一条**:
> **`b`(256) 靠 catalog key、`c`(46) 靠派生规则 —— 都不是靠翻译清掉的,是靠让它不必存在。**

⚠️ **派生机制是 dev 的地盘**（渲染逻辑）。**我签的是 pt 措辞,不是机制。**

### 我签的 pt 措辞
```
card.lang_badge  pt-BR = "em inglês"
```
**理由**:小写、不加括号、不喊叫。它是**一句提示,不是一个警告** —— 用户要的是"知道",不是"被劝退"。
（备选 `conteúdo em inglês` 更明确但更长,会挤掉卡片标题的空间。**我选短的。**）

## 五、⚠️ 我判错的一条（自纠,记下来）

我一开始看到 `#62` 的**摘要和标题逐字相同**,差点结论「摘要是标题的拷贝 → 只需译 20 条,不是 40 条」。
**查了全量:30 张里只有 1 张如此,另外 29 张有真摘要。**

> **我看了一张卡就推断了一个模式。** 这正是我这两天一直在抓的那个错。
> **幸好查了。这确实是 40 条活。**

（📌 顺带:`#62` 那张**摘要=标题**,是个真缺陷 —— 同 `alt = title` 的形状。**挂账,不在本次范围。**）

---

# 第二部分:40 条译文（**20 标题 + 20 摘要**）

> **规则**（沿用 pt chrome 既定）:`Starlink` / `Wi-Fi` / `Ethernet` / `OEM` / `kit` / `Tejoy` 保留 ·
> `dish`→`antena` · `boat`→`barco`(大)/`lancha`(小) · `mount`→`suporte` · `offshore`→`em alto-mar`

| # | pt 标题 |
|---|---|
| **81** | `Acessórios Starlink Marine para Sistemas de Monitoramento Remoto: Equipamentos e Guia de Instalação` |
| **80** | `Integração Ethernet Starlink Marine: Conexão Cabeada Confiável no Mar` |
| **79** | `Energia de Reserva para Starlink Marine: Opções Confiáveis e Guia de Escolha` |
| **78** | `Acessórios Starlink Marine da Tejoy: Conectividade em Alto-Mar para Plataformas de Petróleo` |
| **77** | `Manutenção do Starlink Marine: 5 Dicas Essenciais para Internet Estável no Mar` |
| **76** | `Acessórios Starlink Marine: O Kit Definitivo para Comunicação de Emergência no Mar` |
| **75** | `Personalização do Starlink Marine: Acessórios e Soluções de Fixação` |
| **74** | `Acessórios Starlink Marine: Soluções de Internet via Satélite para Lanchas e Embarcações Grandes` |
| **73** | `Organização de Cabos no Mar: Acessórios e Soluções Ideais para Starlink` |
| **72** | `Acessórios Starlink Marine para Lanchas vs Embarcações Grandes: Comparação Completa para Armadores` |
| **71** | `Guia Completo de Organização de Cabos Starlink Marine: Melhores Soluções e Estratégias para Barcos` |
| **70** | `Acessórios Starlink Marine para Estender o Wi-Fi da Marina: Antenas, Suportes e Repetidores` |
| **69** | `Otimização de Desempenho com Acessórios Starlink Marine: Mais Sinal e Conectividade no Mar` |
| **68** | `Como Proteger seu Equipamento Starlink com Acessórios Marine da Tejoy — Guia Completo de Proteção` |
| **67** | `Acessórios Starlink Marine para Quem Mora a Bordo` |
| **66** | `Acessórios Starlink Marine: Guia de Conectores de Grau Náutico` |
| **65** | `Guia de Compra por Atacado de Acessórios de Internet via Satélite — Starlink Marine` |
| **64** | `Fabricação OEM e Personalização de Marca para Acessórios Starlink Marine — Seu Fabricante de Confiança` |
| **63** | `Comparação de Acessórios Starlink Marine: Kits Oficiais vs de Terceiros para Barcos` |
| **62** | `Normas de Conformidade e Segurança para Acessórios Starlink Marine \| Guia Completo de Certificação` |

| # | pt 摘要 |
|---|---|
| **81** | `Conheça os melhores acessórios Starlink Marine para sistemas de monitoramento remoto. Veja suportes de antena, opções de energia, repetidores de Wi-Fi e a instalação passo a passo para manter seu barco conectado em alto-mar.` |
| **80** | `Veja como a integração Ethernet do Starlink Marine leva conexão cabeada estável e de alta velocidade aos barcos. Aprenda a instalação, as diferenças entre Ethernet e Wi-Fi e dicas essenciais de rede náutica da Tejoy.` |
| **79** | `Conheça as opções confiáveis de energia de reserva para seu Starlink Marine. Compare baterias náuticas, inversores, geradores portáteis e energia solar para não ficar sem conexão no mar.` |
| **78** | `Veja como os acessórios Starlink Marine reforçados da Tejoy entregam conectividade confiável em alto-mar para plataformas de petróleo. Ganhe eficiência operacional, bem-estar da tripulação e segurança com kits de fixação duráveis e capas à prova de intempéries.` |
| **77** | `Dicas essenciais de manutenção dos acessórios Starlink Marine para garantir internet via satélite estável no mar. Aprenda a limpar a antena, prender os cabos e proteger seus equipamentos do ambiente marinho.` |
| **76** | `Veja como os acessórios Starlink Marine se tornam um elo vital de comunicação de emergência no mar. Conheça os equipamentos essenciais de internet a bordo, da antena aos amplificadores de sinal, para navegar com segurança.` |
| **75** | `Conheça acessórios Starlink Marine sob medida para desafios náuticos específicos. De suportes reforçados a sistemas de energia eficientes, veja como a Tejoy adapta sua instalação para uma conexão confiável a bordo.` |
| **74** | `Compare os acessórios Starlink Marine para lanchas e embarcações grandes. Entenda as diferenças de banda, consumo de energia e instalação para escolher a solução de internet via satélite certa.` |
| **73** | `Conheça as soluções essenciais de organização de cabos para sua instalação Starlink. Veja estratégias de passagem de cabos e acessórios que aumentam a segurança, a organização e a durabilidade a bordo.` |
| **72** | `Compare os acessórios Starlink Marine para lanchas e embarcações grandes. Veja as principais diferenças de antena, banda, energia e desempenho para escolher a melhor solução de internet marítima.` |
| **71** | `Conheça as soluções essenciais de organização de cabos para acessórios Starlink Marine. Veja abraçadeiras, canaletas, estratégias de passagem e acessórios que aumentam a segurança e a durabilidade no seu barco.` |
| **70** | `Conheça os acessórios Starlink Marine essenciais para ampliar a cobertura de Wi-Fi na marina. Inclui antenas, kits de fixação, repetidores, soluções de energia e cabos. Ideal para quem navega e precisa de internet confiável. Da Tejoy.` |
| **69** | `Otimize o desempenho da sua internet Starlink Marine com dicas de força de sinal, posicionamento da antena, compatibilidade e cobertura. Aprenda com casos reais e melhore sua conexão a bordo com acessórios confiáveis da Tejoy.` |
| **68** | `Aprenda a proteger seu equipamento Starlink com os acessórios náuticos da Tejoy. Guia passo a passo sobre capas de grau náutico, tratamento anticorrosivo, suportes resistentes ao tempo e proteção contra surtos.` |
| **67** | `Acessórios Starlink Marine para quem mora a bordo: guia completo dos kits de instalação náutica e das soluções de conectividade. Aprenda a montar uma internet via satélite rápida e confiável no seu barco, com a Tejoy.` |
| **66** | `Descubra como escolher os melhores conectores de grau náutico para seus acessórios Starlink Marine. Conheça as características-chave, a manutenção e como os conectores garantem internet confiável no mar.` |
| **65** | `Procura acessórios Starlink Marine confiáveis para sua embarcação? Nosso guia de compra por atacado cobre equipamentos de internet via satélite, kits de conectividade para barcos e acessórios de comunicação náutica no atacado. Veja como economizar.` |
| **64** | `Veja como a fabricação OEM e a personalização de marca para acessórios Starlink Marine podem valorizar sua marca. Conheça opções de logotipo, estratégias de embalagem e como escolher um fabricante de confiança.` |
| **63** | `Guia completo comparando os acessórios Starlink Marine oficiais e os kits de terceiros para barcos. Descubra os melhores equipamentos para internet marítima de alta velocidade, incluindo suportes e antenas para conexão confiável em alto-mar.` |
| **62** | `Normas de conformidade e segurança para acessórios Starlink Marine: guia completo de certificação e diretrizes de segurança.` |

---

## ⚠️ 关于译文的 4 条说明（**我是 pt 真源,这些是判断不是直译**）

1. **`boat` 拆成两个词**:`#74`/`#72` 的 `Small Boat vs Large Vessel` → **`Lanchas vs Embarcações Grandes`**
   —— 葡语里 `barco` 泛指,`lancha`(小艇) vs `embarcação`(船舶) **才是巴西人真实的区分方式**。
   直译成 `barco pequeno vs barco grande` 是英文语序,不是葡语。
2. **`Liveaboard`（`#67`）→ `Quem Mora a Bordo`** —— 葡语**没有对应的单词**。
   `liveaboard` 直译不存在;`Quem Mora a Bordo`(住在船上的人) 是巴西人真会说的。
3. **`Cable Management` → `Organização de Cabos`** —— 不是 `Gerenciamento de Cabos`（那是 IT 术语直译,听着像企业软件）。
4. **`#62` 的摘要 = 标题**（en 侧就是如此）→ **我如实照译,没有替它编一段摘要**。
   ⚠️ **这是 en 侧的缺陷,不是我的**。**挂账,别让它在 pt 侧被"修好"而掩盖掉。**

---

## 📋 待办
| # | 事 | 归谁 |
|---|---|---|
| 1 | **A/B/C 裁决**（我判 **C**;**B 出局** —— 它是分页 bug 的残留） | **总调度 / Joe** |
| 2 | **派生语言标注机制**（`!exists(pt/marine/NN)` → `em inglês` + 链英文 URL） | **dev**（渲染逻辑） |
| 3 | 上面 40 条译文落地 | **dev**（我只出译文） |
| 4 | `#62` 摘要=标题(en 侧缺陷) | 挂账 |

*多语言窗（pt 真源）· 40 条译文 + 一个判断 · **零代码改动***
