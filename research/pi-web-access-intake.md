# `pi-web-access` → OmniMind Web Access：exact-source intake、产品裁决与长期维护合同

> 观察与收口日期：2026-08-22
>
> OmniMind 首轮观察基线：`codex/host-tools-product-surface-policy@5451e22ce80b34e0d1d9f6fe4143b7760564d659`；2026-08-22 double check 基线：`main@d5bd737d96008733d6ba854c6bbce2ad880f1bc1`。candidate 已在任务分支形成有序实现提交，并从exact pushed SHA完成Desktop重建、替换安装、fresh-profile Settings/Provider-asset gate，以及真实DeepSeek + keyless Exa的默认`auto-summary`、显式Curator和non-review observer packaged局部门；真实MiMo stored search responseId衔接已由exact pushed implementation SHA `3f4d673bce30465cba387df2667d2488a744c05f`完成复验。独立observer/review presentation与V7适配最终由exact pushed implementation SHA `ff67a21a97f9071bd9162dfb61e9f4b632a903a8`完成隔离packaged复验；同一安装候选现已补齐keyed Tavily draft/named route与A/B多Thread background attention/exact reopen journey。新的truthful Provider/Curator projection与低压力Settings source candidate为`7335df428655fcb67919bc2e24fa52651abaed8a`，source gates已通过，packaged视觉探针发现的raw enum泄漏也已收口，尚待从该精确SHA重建packaged证据。Host Tools事实仍不能外推为Web Access证据。
>
> 上游 exact source：[`nicobailon/pi-web-access@fbbd0cb3b3eb918c8833906aa0b41e257fffe979`](https://github.com/nicobailon/pi-web-access/tree/fbbd0cb3b3eb918c8833906aa0b41e257fffe979)
>
> 上游 exact artifact：[`pi-web-access@0.24.1`](https://www.npmjs.com/package/pi-web-access/v/0.24.1)
>
> 文档性质：fixed-source fact + current OmniMind source observation + maintainer-confirmed product decision + bounded implementation reference。
>
> 权威边界：本文是 `pi-web-access` / `@omnimind/om-web-access` 唯一 package-specific research owner。它保存来源、能力、反证、fork patch inventory、维护方式和实施 falsifier；稳定 UI 与 runtime 合同仍分别由 [`architecture/workbench.md`](../architecture/workbench.md) 和 [`architecture/execution.md`](../architecture/execution.md) 拥有，当前施工只看 [`execution-brief.md`](../execution-brief.md)，production adoption 只有进入根 [`README.md`](../README.md) 的 `source-adoptions` 后才成立。

> [!IMPORTANT]
> **当前 disposition：`Fork narrowly`；monorepo-owned candidate 已实现，状态为`source-candidate-pending-packaged-with-prior-evidence`。** Package 名是 `@omnimind/om-web-access`，产品名是 **OmniMind Web Access**。它只作为 OmniMind Agent 随产品内置的 Pi-native Extension 受支持；不进入 AgentGateway，不增加第七组 Host Built-in capability，不跨 Engine 分发，也不承担通用 stock Pi package 的安装、兼容或支持责任。默认`auto-summary`、Settings/Provider-asset、显式Curator、non-review observer、真实MiMo stored result continuation、keyed Tavily route与A/B多Thread lifecycle均已有exact-SHA安装证据；当前packaged证据对应`ff67a21a97f9071bd9162dfb61e9f4b632a903a8`，新的source candidate `7335df428655fcb67919bc2e24fa52651abaed8a`收口Provider prerequisite、Curator并行结果真相、Browser本地化标题、Settings信息压力与选中值本地化，尚待从该精确SHA重建安装证据。这不等于签名、公证、Release、update feed或整个OmniMind产品已经发行。

> [!IMPORTANT]
> 2026-08-22维护者重新裁决默认体验：canonical默认workflow是`auto-summary`，普通联网后台摘要并同turn继续；Curator不再是日常默认，只在Settings显式选择、per-call override或用户明确要求审查/挑选来源时以`summary-review`进入。该决定supersede本文此前“Curator默认开启”的旧结论，但不删除P4或显式review能力。

## 0. 新会话先读这里

### 0.1 一句话结论

OmniMind 不需要自造通用 `web_search` Host 能力；应当深 fork 成熟的 `pi-web-access`，让它作为 OmniMind Agent 的一级 Pi-native Extension 进入 Pi Registry / active set，并只对六处确实不适配 OmniMind 的生命周期边界做手术。

### 0.2 已确认决策

| 事项 | 最终裁决 |
| --- | --- |
| 产品名 | `OmniMind Web Access` |
| package 名 | `@omnimind/om-web-access` |
| 来源模式 | OmniMind monorepo 私有 workspace package 内的有界深 fork；集中保留 exact 上游结构、作者测试、license 与可重复 diff，不建立独立 GitHub fork |
| 受支持宿主 | 仅 OmniMind 官方发行版内的 bundled OmniMind Agent exact runtime |
| stock Pi | 不安装、不注册、不测试、不承诺兼容；stock Pi 用户继续使用上游 `pi-web-access` |
| Engine 范围 | 仅 canonical `provider === "omnimind"`；Codex、Claude、OpenCode、stock Pi 等保留各自 native web 能力 |
| Runtime owner | Pi `AgentSession`、`ResourceLoader`、Tool Registry / active set 和 Extension lifecycle |
| 明确非 owner | AgentGateway、Host Built-in policy、跨 Engine Tool Registry、Product Orchestration、Thread、Timeline、Workbench |
| 工具名 | 保留 `web_search`、`source_check`、`fetch_content`、`get_search_content`，不允许产品 profile 改名 |
| 结果处理 | workflow与展示独立：默认`auto-summary`且展示关闭；`auto-summary/none`在展示开启时可进入非阻塞observer，`summary-review`进入pending审查；不自动打开系统浏览器 |
| Web Search / Curator Tab | observer与review都使用独立、短时、非历史Browser Tab；只有pending review按exact tool call进入Timeline聚焦/重开，observer terminal后无reopen；控制台internal-only |
| 关闭语义 | 关闭 Curator Tab、Right Dock 或隐藏 Browser 只关闭展示；call terminal 只清理该 call，Run abort 只中止该 Run，Session shutdown 才清理整个 Extension instance |
| Curator 语言/主题 | 创建时消费当前 OmniMind locale 与 resolved light/dark theme 的短时展示快照，不跟随 OS/browser 猜测，也不建立第二设置 owner |
| Slash commands | OmniMind profile 不注册 `/websearch`、`/curator`、`/search`、`/google-account` |
| TUI shortcuts/widget | OmniMind profile 不注册 `Ctrl+Shift+S`、`Ctrl+Shift+W` 或 TUI activity widget |
| Settings 主开关 | 不提供“启用网络搜索”总开关；一级能力一直可见，当前不可用时准确说明并提供配置/重试 |
| 配置真相 | `.omnimind/agent/web-search.json` 是唯一 canonical 配置；UI 与文件双向同步，不建数据库副本 |
| 默认文件创建 | 首次进入 Web Search Settings 或首次启动 OmniMind Agent Session 时创建，谁先发生谁创建；App 启动本身不 ambient write |
| API Key | Settings 可读取、完整显示、复制和编辑 literal key；`$ENV`、`!command` 也显示其原始配置表达式 |
| 零配置 | 保留 keyless Exa MCP 等上游路径，但绝不宣传为无限免费或永久可用 |
| 自动检测 | 惰性真实检测：不在 App/Session 启动时探测；首次真实搜索或用户显式“重新检查”才运行 canonical route，可能消耗额度 |
| 不可用处理 | 真正没有可用搜索路径时，只从该 Pi Session 的 active set 移除 `web_search` 与 `source_check`；保留两个 content 工具 |
| `source_check` | 保留结构化 ResearchArtifact 与精确 passages；把 claim 判断明确降级为 heuristic，并补 Unicode/中文匹配 |
| 能力图标 | OmniMind Web Access 的通用图标固定为现有 `globe`；不为同一功能发明第二个图标 |
| 服务品牌 | 具体搜索服务使用各自品牌标记；Parallel 与 Parallel MCP 共享 Parallel 标记，连接方式用文字区分 |
| 图标来源 | runtime Provider定义与presentation字段同源；26家全部使用本地固定、保持原色的品牌资产并记录source snapshot/hash/已知约束，不能运行时热取favicon |
| 上游同步 | 精确版本、人工 intake、最小 patch inventory；不自动追 `latest` |
| 当前实施状态 | 已进入private workspace package、bundled Agent composition、typed Curator/Browser/Timeline seam与Settings candidate；26家原色品牌资产、默认`auto-summary`、MiMo stored-result continuation、observer/review分层、keyed Tavily route及A/B多Thread lifecycle均已有exact-SHA packaged证据。当前已测试安装候选是`ff67a21a97f9071bd9162dfb61e9f4b632a903a8`；新的source candidate `7335df428655fcb67919bc2e24fa52651abaed8a`已通过source gates、等待packaged复验，不能冒充已安装或整个产品已发行 |

### 0.3 唯一 owner 图

```text
用户用自然语言要求联网研究
            │
            ▼
OmniMind Agent / Pi AgentSession
            │
            ├─ Pi Tool Registry / active set
            │      └─ @omnimind/om-web-access
            │             ├─ web_search
            │             ├─ source_check
            │             ├─ fetch_content
            │             └─ get_search_content
            │
            ├─ Extension-owned config
            │      └─ .omnimind/agent/web-search.json
            │
            └─ Curator short-lived web surface
                   └─ current Thread Right Dock Browser

不经过：AgentGateway → Host Built-in groups → cross-Engine projection
```

### 0.4 产品方向已收敛，仍有发布前证据门

维护者已经裁决 package identity、支持范围、workflow默认、Settings key 可见性、配置双向同步、零配置失效处理、`source_check` 保留方式以及非 Host 边界。后续允许实现者在既有 owner 内选择局部可逆写法，但不得重新打开以下已否决方向：

- 第七组 `Web` Host capability；
- AgentGateway 中的通用 Web Search；
- 给所有 Engine 强行投影同一套搜索工具；
- stock Pi 双运行时兼容 profile；
- OmniMind 自建搜索 Provider Registry、健康 daemon、结果数据库或第二 Extension Manager；
- 为保留 TUI 命令而占用 OmniMind 的 `/` 注意力。

这不等于“任何图片都可直接随产品发布”。Provider集合随上游演进、品牌资产再分发权、同源descriptor parity、多Thread隔离和真实route exhaustion仍是必须以exact upstream baseline与monorepo candidate证明的实施/发行门；它们不能被HTML原型或“官方网站能显示”替代。

2026-08-22维护者进一步裁决来源形态：不创建独立GitHub fork或第二发布管道，完整上游源码集中内置为OmniMind monorepo私有workspace package。这里的“保留来源”只表示记录exact upstream commit/version/license、保留原结构与作者测试并维护可重复upstream diff/P1–P6 inventory，不暗示存在GitHub fork ancestry；`research/pi-web-access-intake.md`继续作为未来升级的唯一package-specific入口。

2026-08-22维护者进一步确认Curator ephemeral Tab完全internal-only：只对该控制台隐藏`Open externally`、raw-link copy与raw token展示；普通Browser Tab不受影响，结果来源链接先进入普通OmniMind Browser Tab后仍可由用户显式外部打开。该收口属于P4 Host presentation，不增加第七个fork patch seam。

## 1. 为什么要 fork，但不能重写

### 1.1 用户结果

真实目标不是“OmniMind 也有一个叫 Web Search 的工具”，而是让 OmniMind Agent 原生获得一套已经成熟的网络研究能力：多 Provider 搜索、顺序 fallback、显式并发聚合、网页与多媒体读取、可审查来源、结构化证据和按 Session 恢复，同时保持 OmniMind 的产品语言、Right Dock、private home 与多 Thread 隔离。

### 1.2 为什么不是 Host capability

Browser 成为 Host capability有意义，因为许多 Engine 没有同等、可控、用户可接管的浏览器执行面；Goal 也可以补 Engine 边界。Web Search 不同：多数现代 Engine 已经拥有 native search，强行做 Host 版本只会形成重复工具、同名冲突、跨 Engine 假平权和第二 Provider routing owner。

`pi-web-access` 的价值不是补所有 Engine，而是兑现 OmniMind Agent 的产品路线：**把成熟 Pi 生态作为自身一级能力吸收进来。** 因此它属于 OmniMind Agent 的 Pi ecosystem，不属于所有 Engine 的 Host common denominator。

### 1.3 为什么不能直接原装

上游是高质量成熟实现，但它的默认宿主假设与 OmniMind 冲突：

| 上游假设 | OmniMind 事实 | 若不修会怎样 |
| --- | --- | --- |
| 一个 Pi TUI 进程只有一个当前 Session | 同一 Server 可同时承载多个 Thread / Pi Session | 一个 Thread 的 session event 会清理另一个 Thread 的请求、Curator、缓存和 widget state |
| 配置由 process-global `PI_CODING_AGENT_DIR` / `XDG_CONFIG_HOME` / `~/.pi` 决定 | OmniMind Agent 与 stock Pi 同进程且 private home 必须隔离 | 可能读取或写入 stock `.pi`，也无法为每个产品 runtime instance 安全选路径 |
| `ctx.hasUI === false` 代表不能呈现 Curator | OmniMind 没有 Pi TUI，但有 Host-presentable Right Dock Browser | 用户显式选择 `summary-review` 时会被强制降成 `none`，专业审查路径失效 |
| Glimpse 或系统浏览器是 UI 宿主 | 当前 Thread 的 OmniMind Browser / Workbench 是唯一默认宿主 | 用户离开 OmniMind，丢失 Thread provenance，甚至 silent fallback 外部浏览器 |
| `/commands`、快捷键和 widget 是主要人工入口 | OmniMind 用自然语言、Settings、Timeline 与 Right Dock | 重复入口、占用 `/` 注意力、引入第二套 TUI 交互 |
| 多个模块各自读取并缓存同一 JSON | Settings 会在 App 运行中编辑配置 | UI 保存后部分 Provider 仍使用陈旧 cache，形成多份配置真相 |

### 1.4 为什么不能重写

上游已经拥有 26 个搜索 Provider、内容提取 fallback、GitHub、PDF、视频、Curator、SSE、请求取消、缓存、SSRF、credential source 和 64 个作者测试文件。把它降格为“几段 search API 调用”后重建，等于主动接管作者已经承担的水下生命周期，长期成本远高于维护六个窄 patch seam。

## 2. Exact source、artifact 与权利

### 2.1 固定身份

| 字段 | Exact value |
| --- | --- |
| upstream package | `pi-web-access@0.24.1` |
| npm latest（观察时） | `0.24.1` |
| repository | `https://github.com/nicobailon/pi-web-access.git` |
| gitHead | `fbbd0cb3b3eb918c8833906aa0b41e257fffe979` |
| author | Nico Bailon |
| license | MIT |
| npm integrity | `sha512-kNYVqPT2wbWbDKD2mfMsrCie1DyVsE/KYNVgpp7yqq072sG2PciKAB28PG4h0+klSO3MtCFRoPWAyA+l0CS7/A==` |
| npm shasum | `78449966e7f682f707bb9964c3e62d5f04318d8c` |
| downloaded tgz SHA-256 | `d82adba93034bdbd3d4f3ffb092fb57789069441723a3f9d582faa4aab68b054` |
| source/artifact relation | npm `gitHead` 指向 exact commit；发布物中的 runtime TypeScript 与 exact source 对应文件逐字节一致 |
| evidence maturity | `source-candidate-pending-packaged-with-prior-evidence`；新source candidate正确package runner 557/557、root typecheck、focused Server/Web/Curator/Settings gates已通过；`ff67a21a…`的exact-SHA安装Settings/Provider-asset、真实DeepSeek + keyless Exa、真实MiMo stored-result continuation、keyed Tavily与A/B多Thread background attention/exact reopen证据仍有效，但不能证明新shipped bytes；仍不是签名、公证、Release、update feed或整个OmniMind `packaged-product-proven` |

### 2.2 发布物结构

| 指标 | 观察 |
| --- | --- |
| npm tgz | 6,552,132 bytes |
| unpacked | 约 7.46 MiB |
| runtime `.ts` | 62 files，26,029 lines，935,248 bytes |
| 作者测试 | source tree 中 64 files；npm 发布物不包含 tests |
| `banner.png` | 1,276,766 bytes |
| `pi-web-fetch-demo.mp4` | 5,126,335 bytes |
| 非 runtime 媒体 | 合计约 6.4 MB，占发布包绝大多数 |

Fork source 应保留作者 tests、README、CHANGELOG、SECURITY 和 demo 资产以便追溯；OmniMind 实际 shipped package 应排除 banner 和 demo video。**源码保留、发行字节、运行时激活是三件不同的事。**

### 2.3 依赖闭包

Direct runtime dependencies：

- `@mozilla/readability@^0.6.0`
- `linkedom@^0.16.0`
- `p-limit@^6.1.0`
- `promise.try@^2.0.1`
- `turndown@^7.2.0`
- `typebox@^1.1.38`
- `unpdf@^1.6.2`
- `undici@^8.9.0`

Peer dependencies 当前都是 wildcard：

- `@earendil-works/pi-ai@*`
- `@earendil-works/pi-coding-agent@*`
- `@earendil-works/pi-tui@*`

上游 README 声称 Pi `v0.37.3+`，但 OmniMind 不能把 wildcard 或 README 范围当成自己的支持合同。Fork 只验证 bundled Pi baseline `0.84.2` 及后续每个明确 adopted runtime。

### 2.4 权利与署名

- 保留 Nico Bailon、upstream repository、exact base、MIT LICENSE 和修改边界。
- 普通产品 UI 只使用 OmniMind Web Access 品牌；不在 Curator、Settings 或普通 Tool 文案中显示 `pi-web-access`。
- 上游名称与作者进入 fork README、LICENSE/NOTICE、source headers、About/Licenses、诊断和本 intake。
- package 改名不抹掉 lineage，也不把上游代码伪装成从零第一方原创。
- Provider logo、app icon与favicon不是上游MIT自动覆盖的代码资产。每个实际随App分发的品牌文件仍要记录source snapshot、内容hash、已知许可或trademark约束和本地shipped path；不能因为来自官网就伪称已获授权、合作或背书。
- Bright Data的官方[Trademark Usage Guidelines](https://media.brightdata.com/2022/12/Permitted-Use-of-Bright-Datas-Trademark-Name.pdf)明确把logo使用置于书面同意之下。维护者已明确接受该约束并裁决：本轮26家准确指称性的原色品牌展示优先，书面许可不是视觉交付阻塞门；已知约束必须继续记录，不能改写成“已获许可”。

## 3. 上游能力全图

### 3.1 四个工具

| Tool | 上游真实职责 | OmniMind disposition |
| --- | --- | --- |
| `web_search` | 单 query 或多 queries；auto/named/routing/array/all Provider；recency/domain；可后台抓全文；可进入 Curator 或自动摘要 | 保留 canonical name 与 schema；默认自动摘要，显式审查才进入 Curator；搜索全局不可用时从当前 Session active set 移除 |
| `source_check` | 对 claim 搜索并构造 machine-readable `ResearchArtifact`、sources、passages、hash、quality 和 heuristic assessment | 保留；证据结构是一等价值；判断字段明确标注 heuristic，补 Unicode/中文 |
| `fetch_content` | URL/多 URL、readable/raw/answer；GitHub clone、HTML、PDF、YouTube、本地视频、图片、认证页面和多级 extraction fallback | 保留；搜索 Provider 不可用时仍 active |
| `get_search_content` | 按 responseId/query/url/urlIndex 检索搜索、抓取或 research artifact；支持 offset/limit/findText | 保留；搜索 Provider 不可用时仍 active |

工具名必须固定。上游 `toolNames` override 在 OmniMind product profile 中不支持，因为当前 Timeline 分类、Curator Web-surface provenance、availability active-set 管理和模型提示都以 canonical identity 为稳定接口。未来若同名 foreign Extension 按 Pi precedence 胜出，应准确将本 Extension 对应能力标为 collision/unavailable，不能强行覆盖。

### 3.2 搜索 Provider：26 个 resolved identities

| Provider | 上游可用条件 | `auto` | `all` | 备注 |
| --- | --- | ---: | ---: | --- |
| OpenAI | Pi Codex/OpenAI auth 或 `openaiApiKey`；可覆写 Responses URL/model/auth provider order | 是 | 是 | `auto` 只在请求参数适配时优先尝试 |
| Exa | direct key 或 keyless hosted MCP | 是 | 是 | `isExaAvailable()` 仅返回 `true`，不代表真实额度可用 |
| Brave | API key | 是 | 是 | 可覆写 compatible HTTPS base URL |
| Parallel | REST API key | 是 | 是 | 与 Parallel MCP 是两个 provider |
| Parallel MCP | hosted MCP；key 可选 | 否 | 否 | explicit-only；避免无意改变默认路由 |
| TinyFish | API key | 是 | 是 | Search/Fetch 独立 timeout/limit |
| Search1API | API key | 是 | 是 | credit-based；`includeContent` 会增加抓取成本 |
| Searchinfinity | API key | 是 | 是 | 有 shared monthly quota/QPS |
| Querit | API key | 是 | 是 | Search 与 Contents 订阅可能不同 |
| Tavily | API key | 是 | 是 | 可覆写 compatible HTTPS base URL |
| Firecrawl | configured base URL；key/version 可选 | 是 | 是 | 也参与 fetch fallback；fresh scrape 单独 opt-in |
| Jina Search | API key | 是 | 是 | Jina Reader fetch fallback 可有不同可用语义 |
| SERPdive | API key | 是 | 是 | 默认 free-tier model，模型可配置 |
| Kagi | API key | 是 | 是 | Search + Extract |
| Bocha | API key | 是 | 是 | 搜索 Provider |
| Ollama Cloud | account API key | 是 | 是 | Cloud Web Search/Fetch，不要求本地 daemon |
| SearXNG | self-hosted base URL | 是，且 configured 时最优先 | 是 | endpoint/redirect 仍受 SSRF 校验 |
| DuckDuckGo | keyless HTML | 否 | 否 | explicit-only；recency 无稳定保证 |
| Perplexity | API key | 是 | 是 | 上游 client-side 10 req/min |
| Gemini | Gemini API/gateway，或显式启用浏览器 cookies | 是 | 只有 API/gateway | browser-cookie alone 不进入 `all` |
| AnySearch | anonymous 或可选 API key | 否 | 否 | explicit-only；参数能力较窄 |
| xAI | SuperGrok/X auth 或 xAI key | 否 | 否 | explicit-only |
| Bright Data | API key + SERP zone | 否 | 否 | paid explicit-only；fetch unlocker zone 是另一产品 |
| SerpBase | API key | 否 | 否 | paid explicit-only |
| Serper | API key | 否 | 否 | explicit-only |
| Valyu | API key | 否 | 否 | explicit-only research search |

上游实际不止一条 keyless 路径：Exa MCP、Parallel MCP、DuckDuckGo 和 AnySearch 都可能无需 key；但默认 `auto` 只把 Exa 放进零配置 fallback，其他三项都是 explicit-only。OmniMind 的“搜索是否可用”应以**当前 configured/default contract**为准，而不是为证明每个 dormant explicit-only endpoint 都失败而偷偷发探测请求。用户把 explicit-only Provider 设为默认或加入 routing 后，它才进入该 Session 的正式 candidate set。

### 3.3 四种 routing 不是一回事

#### `auto`：顺序 fallback，通常只成功调用一个 Provider

默认顺序是：configured SearXNG → 适配且可用的 OpenAI → Exa → Brave → Parallel → TinyFish → Search1API → Searchinfinity → Querit → Tavily → Firecrawl → Jina → SERPdive → Kagi → Bocha → Ollama → Perplexity → Gemini。

它不是把所有已配置 Provider 一起搜索。前一个成功后停止，所以默认经济性最好。

#### named Provider：严格单 Provider

`provider: "tavily"` 只调用 Tavily。失败不会偷偷冒充另一 Provider 的成功。显式 named failure 也不能被解释为整个 Web Access 不可用。

#### Provider array：显式并发聚合选中的 Provider

`provider: ["brave", "exa"]` 会并发调用这两个 Provider，保留各自回答，URL/inline content 去重，并将失败附在聚合结果中。这是用户/Agent 主动购买的覆盖率与成本，不是“配置了多个 key 就自动聚合”。

#### `all`：显式并发调用所有 eligible Provider

`all` 会并发运行 eligible Provider，但永远排除 Parallel MCP、DuckDuckGo、AnySearch、Valyu、xAI、Bright Data、SerpBase 和 Serper；这样不会因为 `all` 无意消耗 paid Google SERP 或显式-only 服务。Gemini 只有 API/gateway 能进入 `all`。

#### `searchRouting`：有类型条件的顺序 fallback

`searchRouting.providers` 是自定义顺序，不允许包含 `all`。只有 `fallbackOn` 显式列出的 `transient / quota / network / invalid-response` 才继续下一个 Provider；credential/config/auth/invalid-request 等失败保持严格。没有 random、weighted、sticky、cooldown routing。

**产品结论：** Settings 默认展示并推荐 `Auto`，把“并发选定 Provider”和“All providers”放在明确的覆盖率/费用高级选择中。仅仅保存多个 key 不会自动并发或花多份钱。

### 3.4 Curator 到底是什么

Curator 不是搜索引擎，也不是搜索结果仓库；它是一次 `web_search` 调用的**人工来源审查与摘要批准页面**：

1. 搜索结果按 query/Provider 流式进入；
2. 用户选择或取消结果卡；
3. 可以补充 query、换 Provider、对某条 query 再搜；
4. 可以直接“发送所选原始结果”；
5. 也可以让当前可用 Pi summary model 生成 draft；
6. 用户编辑、预览、带反馈重新生成并批准；
7. 批准后的 summary 或所选结果回到当前 Agent tool result；
8. idle timeout 到期时按上游规则自动提交，并在无已批准 draft 时使用 deterministic summary。

上游 workflow：

| 值 | 行为 | OmniMind |
| --- | --- | --- |
| `auto-summary` | 后台生成 summary，同一turn继续；可按独立展示设置打开非阻塞观察Tab | canonical默认；推荐的日常无打扰路径 |
| `summary-review` | 打开 Curator，生成 draft，等待用户审查 | Settings显式选择；用户明确要求审查时Agent可per-call |
| `none` | 直接返回 raw results | Settings 可选；Agent 可 per-call |

OmniMind 不是每次都弹一个“选择工作流”的表单。默认值来自 Settings；Agent 在单次 tool call 可覆盖。用户说“帮我查一下”时按`auto-summary`搜索、保存完整结果/responseId、后台摘要并继续；用户说“直接给原始结果”时可用`none`；用户说“我要审查/挑选来源”时才使用`summary-review`。独立的“自动显示搜索过程”只决定是否在Right Dock打开非阻塞观察Tab，不改变这三种结果处理语义。

### 3.5 `/commands` 在上游是什么，OmniMind 为什么不注册

| 上游命令 | 上游用途 | OmniMind 对应路径 |
| --- | --- | --- |
| `/websearch` | 用户绕过 LLM 直接打开 Curator并搜索 | 自然语言 → Agent-native tool call；不占 `/` |
| `/curator` | toggle/persist workflow | Settings 的“搜索结果处理” |
| `/search` | TUI 交互浏览当前 Session stored results | Timeline + `get_search_content`；不建第二结果管理页 |
| `/google-account` | 查看 Gemini Web 当前 Chromium profile/account | Gemini Web provider detail/技术诊断，只有启用 cookie 路径时显示 |

禁用注册不等于删除源码。Fork 保留上游模块和作者测试，OmniMind runtime profile 不把这些 TUI 入口装进 Session；未来 upstream sync 仍能清楚比较。

### 3.6 快捷键与 Activity Monitor

- `Ctrl+Shift+S`：上游在仍有 pending search 时打开/重新打开最后一个 Curator。
- `Ctrl+Shift+W`：显示 TUI widget，逐条列 API/GET、目标、状态码、耗时和成功/失败。

OmniMind 已有 Right Dock、Timeline、错误与技术详情；注册 TUI shortcut/widget 会形成第二呈现面。因此 runtime profile 禁用它们。`summary-review`在owning Thread前台自动呈现，关闭后仍pending时可从对应Timeline activity重开；observer只在展示开启且owning Thread前台时自动呈现，terminal后不进入Timeline reopen。网络活动只在现有diagnostics/technical detail有真实用户用途时薄投影，不新建常驻监控器。

### 3.7 Session events 的通俗解释

| Event | 上游做什么 | 正确的 OmniMind 语义 |
| --- | --- | --- |
| `session_start` | 进入一个 Session 时，中止旧 pending fetch、关闭旧 Curator、清 clone cache、从 Session branch 恢复 stored results、清 activity | 只重置**当前 Extension instance / 当前 Pi Session**，绝不能碰其他 Thread |
| `session_tree` | 当前 Session 切 branch/tree 时执行同样切换与恢复 | 当前 Session branch 改变后，只恢复该 branch 的搜索结果 |
| `session_shutdown` | 中止请求、关闭 Curator、清 results/cache/widget | 当前 Pi Session 退出时完成实例级 cleanup；不能清其他 Session singleton |

上游这些事件本身是正确的；错误在于相关 map/cache/widget 是 module-global。在 OmniMind fork 中应把 mutable state 移入每次 Extension factory 创建的 instance，继续使用原生 events，不把 lifecycle 搬到 PiAdapter 或 Product Thread manager。

### 3.8 `fetch_content` 的真实范围

- 普通 HTTP(S)：readable Markdown、raw textual body 或基于页面内容的 answer；
- HTML：direct fetch → Readability → Next.js RSC → configured Firecrawl → 只有显式允许时才使用 remote hosted fallbacks；
- GitHub：repo URL clone/API view，返回真实本地路径与内容；大仓库阈值默认 350MB；
- PDF：Datalab → Gemini → local `unpdf`；默认 20MB、100页，provider 可 pin；
- YouTube：Gemini Web → Gemini API → Perplexity；
- 本地视频：Gemini Files/API → Gemini Web；frame extraction 依赖 `ffmpeg`，YouTube frame 还依赖 `yt-dlp`；
- 图片：直接图像结果；
- authenticated fetch：只在显式 `authFetch` profile 下读取本地浏览器 cookie，并限制 host/redirect/cache；
- blocked/JS pages：Jina、TinyFish、Search1API、Querit、Kagi、Ollama、Parallel、Bright Data、Gemini 等各有独立成本与隐私语义。

OmniMind 不把这些能力误命名为“只有搜索”。Settings 导航可以用用户易懂的“网络搜索”，但页面 identity 与技术范围必须说明它同时管理网页读取、来源审查、PDF/视频和高级抓取。

### 3.9 存储与缓存

- 搜索、fetch 与 research result 通过 response ID 放在 Session-owned custom entries 中，可随 branch 恢复；
- fetched full content 进入 config dir 下的 `web-search-cache`，TTL 1小时，最多 128 entries / 128 MiB，超限 oldest-first；
- `get_search_content` 只按 bounded slice/findText 取回，不把整页默认塞回模型上下文；
- GitHub clone cache 当前是 module-global map，Session 切换时清理；fork 后必须 instance-scoped；
- `session_shutdown` 清 Session results；这不是跨 Thread 搜索历史数据库；
- OmniMind 不新增 `/search` archive、Artifact store、搜索数据库或长期索引。

## 4. `source_check`：为什么作者接受它，OmniMind 怎么保留

### 4.1 来源

`source_check` 最初不是 Nico Bailon 自己提出。Clark Everson（GitHub `gr3enarr0w`）在 [issue #108](https://github.com/nicobailon/pi-web-access/issues/108) 提议：Pi 已有 `pi-web-access`，更丰富的 search/RAG 应进入同一个 package，而不是再造一个搜索包；workflow/accountability 需要稳定 JSON、provenance、exact passages、hash、rank 和 response/session ID retrieval，不能抓 terminal 文本。

[PR #111](https://github.com/nicobailon/pi-web-access/pull/111) 提交了首版设计和实现，但没有 merge。Nico 随后用 [PR #156](https://github.com/nicobailon/pi-web-access/pull/156) 的 replacement 落地，修复 execution context、configured-provider semantics、cancellation、query/fetch errors、empty snippet passages、真实 SHA-256 和 substring polarity 等问题。

### 4.2 真正价值

它最值钱的不是“自动判真伪”，而是把一次 research 变成可重复读取的 evidence artifact：

- source URL/title/rank/snippet；
- fetch timestamp、fetch error、是否 fetched；
- full content / passage SHA-256；
- exact passage text；
- page extraction span；
- stable passage ID；
- recency/domain filters；
- Provider、summary、search/fetch errors；
- response ID 与 bounded retrieval。

这些是硬证据结构，Agent、workflow、审计和后续回答都能消费。

### 4.3 当前 heuristic 的硬限制

- tokenizer 是 `/[^a-z0-9]+/`，只保留长度大于 3 的英文/数字 token；中文 claim 很容易直接变成 `missing-evidence`；
- source quality 只是 hostname/path regex，不是内容或机构真实性验证；
- `supported/contradicted` 依赖 `confirmed/true/false/debunked/...` 等英文 marker 与词项 overlap；
- confidence 是固定规则计数，最高 0.85，不是语义模型置信度；
- passage extraction 主要依赖英文句号模式与 search snippet hint；
- 它不能判断研究设计质量、来源独立性、时间因果、数字口径或复杂条件句。

### 4.4 OmniMind disposition

1. 保留完整 `ResearchArtifact`、sources、passages、hash、span、error 和 retrieval。
2. `claims[].status/rationale/confidence` 为兼容可以保留，但 schema/tool description/UI 必须标记 `assessmentKind: "heuristic"` 或等价清楚字段。
3. Tool description 明确告诉 Agent：它负责收集与组织 exact evidence，最终 claim 判断必须由 Agent结合 passages 与来源独立完成。
4. 改善 Unicode/中文 tokenization、句界和 passage matching；用中英 fixtures 防止中文永远 missing-evidence。
5. 不再为它增加第二个 verification model、consensus engine 或独立事实核验控制面。
6. 当搜索全局不可用时与 `web_search` 一起 inactive；当搜索恢复时一同恢复。

## 5. OmniMind fork 的六个必要 patch seam

Fork patch inventory 必须保持有限。新增第七类长期 patch 前，先证明不能归入以下 seam，也不能通过 upstream public API 删除。

### P1. Per-Session instance state

移入 Extension factory instance：

- `pendingFetches`
- `pendingCurates`
- `activeCurators`
- `glimpseWins` 或其 OmniMind Host-presentation handle
- `sessionActive`
- activity/widget state
- `storedResults`
- `activityMonitor`
- `cloneCache`
- 其他会被 session events 清理的 mutable cache

目标：Thread A 的 start/tree/shutdown/abort 不能改变 Thread B。Pi Session 继续是 lifecycle owner；不新增 OmniMind Session manager。

### P2. Instance-owned config path + 单一 config owner

上游 `getWebSearchConfigDir()` 依赖 process-global 环境，且 30 个模块各自拥有 `cachedConfig`，只有 4 个暴露 reset/clear。Fork 必须：

- 从 Session composition 显式注入 `.omnimind/agent/web-search.json`；
- fork package 导出一个 package-owned config read/mutation service；Settings 可在没有 Pi Session / Extension instance 时调用，同一服务也由每个 Extension instance 消费；
- 所有 Provider 通过该单一 config reader/snapshot 读取；
- 删除 module-local 配置真相；
- 保留 unknown fields；
- 支持 schema validation、revision/digest conflict 和同目录 atomic replace；
- 不依赖修改 process env；
- 不读取、迁移或写入 `.pi`。

### P3. OmniMind product runtime profile

源码保留但 runtime 不注册：

- 四个 slash commands；
- 两个 TUI shortcuts；
- TUI activity widget；
- `curatorRemote`；
- 系统浏览器/Glimpse fallback；
- `toolNames` override。

OmniMind profile继续尊重上游`webSearch.enabled`与`tools.webSearch/sourceCheck/fetchContent/getSearchContent.enabled`的file-level细粒度注册语义；普通Settings不提供master switch，但高手在唯一canonical文件中显式关闭哪个工具，Pi注册时就不注册哪个工具。搜索依赖工具的动态临时收缩仍来自P5，文件开关不进入Host/AgentGateway，也不形成第三套runtime controller。

这不是把成熟 package 削成四个 API；search/fetch/provider/Curator/storage/tests 全部保留。它只移除不适配 OmniMind 宿主的入口和第二呈现面。

### P4. Host-presentable、双语、自包含 Curator

- `ctx.hasUI === false` 不能再强制 `summary-review → none`；应区分 Pi TUI 与 OmniMind Host-presentable Web surface；
- 继续使用 ephemeral loopback server + token，但 fork 的主合同必须通过 typed Curator presentation seam 交给现有 engine-web-surface intent bridge；递归扫描任意 tool-result 字符串只能是旧兼容证据，不能成为 `@omnimind/om-web-access` 的长期接口；
- 当前 Thread、Engine、Tool call provenance 和 TTL 必须齐全；
- review页面在Right Dock提供可操作审查；展示开关开启时，`auto-summary/none`可在owning foreground Thread创建非阻塞observer。两者第一次都为该tool call创建独立Tab，不能`reuse`并导航用户当前Tab；只有仍pending的review按exact tool call聚焦原Tab或在原Tab已关闭时重建；
- Browser owner 的内部 typed presentation seam 返回并复用 `tabId`，原子标记该 Tab 为 ephemeral/non-history；不得为此扩张 Agent 可见的 `browser_open` schema，也不得建立 Curator tab store；
- ephemeral Curator Tab由同一presentation metadata派生internal-only chrome：隐藏external-open、raw-link copy与raw token地址，不创建第二toolbar状态；来源链接打开为普通Browser Tab，之后服从普通Browser行为；
- per-call presentation handle只在当前运行内存保存`threadId/toolCallId/tabId/url/expiry`等最小事实；只有review的pending Timeline action携带exact tool call identity，不能只展开通用Browser pane；observer不进入waiting/reopen；
- 关闭Tab、关闭Right Dock或隐藏Browser只关闭展示，不取消tool call。review继续等待合法settlement且在token仍有效时可从对应Timeline activity重开；observer继续自动完成，terminal后不保留reopen；
- 单个tool call terminal只清理该call自己的Curator server、stream、timer、request、presentation handle与临时资源，不能清理同Session其他并发call或revision listener；Run abort只中止属于该Run的in-flight calls；`session_start/session_tree`保留上游语义但只作用于当前Extension instance及对应branch；`session_shutdown`才清理整个instance的剩余请求、cache、storedResults、listener与临时资源；
- review的可恢复presentation失败保持pending并允许retry；Curator server/protocol或Host handoff不可恢复失败必须typed-error settle并按call scope cleanup，不能永久pending或只等idle timeout。observer展示失败不能把自动workflow变成waiting，terminal后两者都不保留可重放协议或Timeline入口；
- ephemeral Tab 的token URL不得进入Browser recent history、localStorage、持久tab restore、Product event、Timeline raw payload、log、screenshot或diagnostics；loopback response必须使用no-store/no-referrer等短时页面边界，persistent Browser partition也不得把它变成恢复数据；
- Curator创建时接收当前OmniMind locale与resolved light/dark theme的短时presentation snapshot；不依赖OS `Accept-Language` / `prefers-color-scheme`，不监听全局设置，也不建立第二locale/theme owner；
- 页面不能抢 Composer focus、覆盖 route 或自动外部打开；
- 只有owning Thread正处于前台时才自动呈现。后台review只投影既有waiting-for-user activity/attention，用户进入该Thread后可按exact activity打开，若一直忽略则继续服从上游idle timeout与deterministic settlement；后台observer不投影waiting/reopen。两者都不能切换route或抢占当前Right Dock，也不建立后台Curator调度器；
- `curatorRemote` 在 OmniMind profile 恒不可用；作者的`autoOpenBrowser` intent在OmniMind profile只被解释为默认关闭的typed Right Dock搜索过程展示，不恢复系统浏览器或raw-token fallback；
- 页面改为 OmniMind 品牌和现有 Workbench tokens，完整简中/英文；
- 移除 Google Fonts 和 jsDelivr `marked` CDN，改用本地/系统字体与 pinned local markdown renderer；
- 把 presentation/copy/token adapter 从 3,577 行页面生成器中分离，避免每次 upstream sync 手改整页；
- 多个同时页面各自属于tool call；只有pending review可通过Timeline对应activity精确重开，observer terminal后无reopen。

### P5. Provider availability → Pi active set

不建 health daemon、后台轮询、App/Session启动探测、cooldown service 或 Host loader。自动检测固定为惰性真实检测：Session init只计算结构候选，不发网络请求；第一次真实`web_search`沿canonical route得到availability证据。用户显式点“重新检查”时运行同一最小真实route，并在动作前说明可能消耗Provider额度；它不是无成本ping，也不生成永久“已连接”结论。

状态只来自两类证据：

1. Session init与Settings的结构候选：package按当前`auto/named/array/all`选择及descriptor-owned prerequisite投影“可能可用/需要设置/文件关闭”；named缺少或部分配置不得显示可用，Web不得重写这套判断；
2. 真实 tool call 的结果：实际成功或 typed failure。

`isExaAvailable() === true` 只能说明零配置 route 存在，不能说明额度可用。正确状态语义：

| 状态 | Tool active 行为 |
| --- | --- |
| unknown / structurally possible | 四个工具照常 active，允许第一次真实调用 |
| ready | 四个工具 active |
| degraded/transient | 搜索工具仍 active，返回准确错误；单次 network/transient 不能证明全局永久不可用 |
| unavailable | 当前 configured/default candidate set 已实际穷尽，且没有成功路径；从本 Session active set 移除两个 search-dependent tools |

全局 unavailable 只能来自 `auto` / configured routing 的完整 candidate exhaustion，或 Settings 明确证明没有 candidate；named Provider 单点失败不能触发。`quota/credential/config/auth` 等可形成不可用证据；只有 transient/network 时保持 degraded，避免一次抖动永久藏掉工具。

调用 Pi `getActiveTools()` / `setActiveTools()` 时必须：

- 保留所有其他 Pi native、Todo、Host、用户/Project Extension tools；
- 只跟踪并恢复本 Extension 自己移除的 `web_search` / `source_check`；
- 不覆盖用户或 foreign owner 对 active set 的显式改变；
- 工具表变化按 Pi native prompt rebuild 进入下一 turn，不自建 per-turn schema controller。

恢复触发：Settings 成功保存、用户点“重新检查”、native reload 或新 Session。package-owned config service只有在atomic commit/显式refresh成功后发布一次进程内revision invalidation；当前live Extension instances各自重新评估并只恢复自己移除的两个工具，listener随Session cleanup，不持久化availability、不维护Session registry。外部文件编辑没有watcher，必须由Settings refresh、native reload或新Session重新读入。没有后台 timer。`fetch_content` 与 `get_search_content` 始终保留，因为本地 PDF、GitHub、direct URL、缓存读取等不依赖 search Provider。

### P6. `source_check` honest evidence contract

保留 hard evidence，修 Unicode/中文，软化 heuristic judgment；详见 §4.4。不要把这项 patch 扩成事实核验平台。

## 6. 配置文件与 Settings：一个事实、两个入口

### 6.1 Canonical 文件

```text
<resolved OmniMind Agent directory>/web-search.json
```

当前 canonical directory 是 OmniMind private home 下的 `.omnimind/agent`，因此普通本机形态等价于 `~/.omnimind/agent/web-search.json`；精确根仍由现有 `resolveOmniMindAgentDir` / bundled runtime owner 解析，不能由 Renderer 提交绝对路径，也不能从 `HOME`、cwd 或 stock `.pi` 猜测。

首次进入 Web Search Settings 或首次启动 bundled OmniMind Agent Session 时，谁先发生谁通过同一个 package-owned config service 在文件缺失时原子创建最小配置：

```json
{
  "schemaVersion": 1,
  "provider": "auto",
  "workflow": "auto-summary",
  "autoOpenBrowser": false
}
```

App 启动、普通 Chat/Agent 页面和被动 readiness 投影本身不创建文件。Settings 创建路径不得实例化 Pi Session、执行 Extension、探测 Provider 或发网络请求；Session 创建路径也不能拥有第二套 writer。创建失败不伪装成功：runtime 可继续使用同值内存默认，但 Settings 要显示文件不可写与恢复动作。读取或重复打开 Settings 不得持续改写 mtime；已存在文件不做格式化重写。

### 6.2 双向同步语义

```text
Settings UI ─┐
             ├─ one Extension config read/mutation owner ─ web-search.json
高级用户文件 ┘
```

- UI snapshot 返回完整配置、unknown fields、safe display path、revision/digest 和 Provider presentation manifest；Renderer不得提交绝对路径，“打开配置文件”由Server/package从resolved OmniMind Agent directory重新推导；
- UI 保存携带 expected revision，Server/Extension在同一临界区重读、校验、合并 unknown fields、atomic replace；
- package唯一拥有`schemaVersion`、known-schema parser与有界migration；已知旧版本只在显式保存/变更的原子commit中升级，单纯read不改写文件；
- unknown fields必须round-trip；损坏JSON或高于当前实现的schema fail closed并保留原文件，返回typed error与打开文件/刷新等恢复动作，不得自动覆盖、降级或另建Host迁移/quarantine数据库；
- 外部文件编辑在下次 tool call 一定生效；Settings reopen、窗口重新聚焦或显式“刷新”时重新读取；
- 页面已修改且文件外部变化时保留 draft并显示 conflict，不能静默覆盖、自动更新expected revision或自动重试；只有用户明确重新加载或以当前草稿继续时才能再次mutation；
- 不做常驻 file watcher、daemon、双写 DB 或 periodic sync；
- provider/routing/workflow/key 等普通运行参数在下一次 tool call 生效；
- OmniMind product profile 的commands、shortcuts、tool names与remote Curator是固定结构；file-level tool enabled字段继续服从作者注册语义，`autoOpenBrowser`只控制独立的Right Dock过程展示。配置在下一次Session注册或现有owner明确的reload边界生效，不因此新增watcher或per-turn controller。
- 首次创建使用no-clobber原子创建，竞态中不覆盖已经出现的文件；mutation使用同目录atomic replace与private file mode（支持的平台为`0600`）；no-op保存不写文件、不改mtime、不发布revision invalidation。这只保护literal key所在的唯一canonical文件，不改变维护者已确认的完整key回读产品行为。

从上游配置复制来的以下字段应保留 bytes 但准确标为 OmniMind profile 不支持，不能静默取得运行权：

| 上游字段 | OmniMind 处置 |
| --- | --- |
| `webSearch.enabled` / `tools.*.enabled` | 尊重作者file-level细粒度注册语义；P5仍只负责route exhaustion的动态active-set收缩 |
| `commands.*` | 不注册 slash commands |
| `shortcuts.*` | 不注册 Pi TUI shortcuts |
| `toolNames` | 不改 canonical tool identities |
| `curatorRemote` | 不允许非 loopback Curator |
| `autoOpenBrowser` | OmniMind profile解释为默认关闭的“自动显示搜索过程”，只走provenance-backed Right Dock handoff；不外跳系统浏览器 |

### 6.3 Key 的产品决定

维护者明确要求 Settings 可用于找回自己的 keys：

- literal key 可以由本地 Settings API 完整返回，提供 show/hide、copy、edit 和 clear；
- `$NAME`、`${NAME}` 与 `!absolute-command ...` 显示原始表达式；
- 保存后不把 key 永久替换成不可找回的 `••••••`；
- 不把 Web Access key 复制进通用 `ServerSettingsView`、Timeline、日志、diagnostics、截图证据或 Product events；
- 这项局部可回读合同不扩张到其他 credential owner。

上游 credential source 的关键语义继续保留：`$ENV` 在请求时取一个环境变量；`!command` 每次选中 Provider request 时执行，5秒 timeout、16 KiB output、最小环境、必须单行非空；command source 在 Extension load/tool registration 时不运行。

### 6.4 Settings IA

进入现有 Settings 最接近的 `Development / 开发` 分组，导航 label 使用 `Web search / 网络搜索`，页面技术 identity 为 `OmniMind Web Access`。不增加顶层 Settings taxonomy，也不塞入 `Built-in tools`。

页面复用现有 Settings shell、search/deep-link、`SettingsCard`、form、focus、dialog 和概览→添加→详情模式。结构：

1. **Overview / 概览**
	- 首屏依次回答：能否搜索、默认服务选择、结果处理、是否自动显示过程；
	- file-level四工具状态只在高级区准确投影，不能把`fetch_content/get_search_content`从workflow或search route猜出来；
   - 当前 routing：Auto / 单 Provider / ordered fallback / selected parallel / All；
   - 搜索结果处理：自动摘要（推荐默认）/ 摘要审查 / 直接返回；
   - 独立展示选择：自动显示搜索过程（默认关闭；不暂停Agent、不要求批准）；
   - 已配置 Provider rows；
   - `添加搜索服务`、`重新检查`、`打开配置文件`。
2. **Add provider / 添加搜索服务**
	- 搜索 26 个 Provider；
	- 一行一个，不做卡片墙；
	- 先显示当前/已配置（当前路由即使不完整也保留），再按descriptor同源的无需Key、需要凭据、MCP/自建/高级connection role分组；不能用可选endpoint字段等UI heuristic猜分组，keyless写明共享额度/服务状态限制，不承诺永久免费；
	- 显示 `无需配置`、`依赖当前Agent会话`、`未配置`、`配置不完整（缺少的必填角色）`、`结构完整但未检查` 等descriptor同源真实prerequisite；多字段Provider不能以任意字段非空冒充已配置，OpenAI/xAI的key-or-Session和Gemini的API key/gateway pair/browser cookie替代路径由descriptor evaluator拥有，Settings不实例化Session；
   - 选择后进入 Provider detail。
3. **Provider detail / 服务详情**
   - provider-specific fields；
   - key 完整 reveal/copy/edit；
   - base URL/model/zone/profile 等真实字段；
   - 保存、取消、清除、测试；
   - 测试把当前完整未保存Provider draft作为request-scoped candidate snapshot，走同一正式Provider runtime发起最小真实request；明确提示“不会保存，可能消耗额度”，不写canonical文件、不改变默认routing/active set、不生成永久“已连接”状态，成功后仍由用户主动保存；
	- 同一次显式测试按request identity single-flight；不合并正常`web_search`、不跨Session共享请求或取消语义，config service不接管Provider请求生命周期；外部文件冲突时draft仍可测试，但保存继续服从expected revision/conflict。
	- pending/success/error/cancel绑定request identity与Provider ID，切换详情后迟到结果不跨Provider显示；credential/quota/network/missing-field错误只给对应下一步，不生成永久connected truth。
4. **Routing / 搜索方式**
   - `Auto` 为推荐默认；
   - 单 Provider严格模式；
   - ordered fallback + typed `fallbackOn`；
   - selected parallel 和 `All` 明确写“会同时请求多个服务，可能消耗多份额度”；
   - 配置多个 key 本身不自动并发。
5. **Search result handling / 搜索结果处理**
   - `Generate summary automatically / 自动生成摘要`（`auto-summary`，推荐且默认；不打断当前turn）；
   - `Review summary and sources / 审查摘要与来源`（`summary-review`；会暂停等待用户批准）；
   - `Return results directly / 直接返回结果`（`none`）；
   - 用普通语言解释，普通用户不需要理解 `Curator workflow`。
6. **Content & advanced / 网页读取与高级选项**
   - GitHub clone、PDF、video、max inline content、domain policy、remote hosted fetch opt-in；
   - Gemini browser-cookie、`authFetch`、SSRF ranges、custom headers、command credential source 等高风险/复杂结构可以只提供清楚的 file-only 标识和“打开配置文件”，不伪造半套 GUI；
   - `curatorRemote`、slash commands、shortcuts、tool names 永远不显示，因为 OmniMind profile 不支持；
   - Gemini Web启用cookie路径时，在Provider detail/技术诊断显示当前Chromium profile/account，作为不注册`/google-account`后的产品替代；不恢复slash command。

Settings不建设任意JSON Schema/form DSL。package presentation只使用满足当前26个Provider常用路径的closed field vocabulary（`secret/text/url/select/boolean/integer`及key/endpoint/model/zone/profile等稳定field identity）；无法诚实表达的复杂结构保持file-only。未来真实第二种表单消费者出现前，不抽象通用配置平台。

### 6.5 Provider descriptor 是同源 presentation 投影，不是第二 Registry

Fork 应让presentation字段附着在runtime Provider定义的同一exact descriptor/index上，并导出versioned、credential-blind projection，至少包含：

- stable provider ID / display name；
- zero-config / auth / key / endpoint prerequisite；
- auto/all/explicit-only participation；
- UI-supported fields 与 advanced-file-only fields；
- cost/remote-fetch hints；
- optional local icon identity与asset-admission状态。

Server只把这份projection投影给Web。Web不再手写第二个26-Provider清单；Curator合法ID校验与Agent tool description/schema也必须由descriptor的窄projection派生，不得另外维护会独立增删Provider的静态manifest或白名单。presentation字段也不决定runtime availability、路由或credentials，不是Provider Registry。测试必须保证所有`RESOLVED_SEARCH_PROVIDERS`恰好被descriptor覆盖一次，并锁定作者auto/all/array/named顺序；新增/删除Provider若缺少presentation信息只能使用明确fallback，不能从UI消失或阻塞runtime。

### 6.6 本轮图标调研结论与生产准入

本轮先完成26个resolved identity的HTML视觉原型，再由维护者明确裁决26家全部采用身份准确、保持原色的本地品牌资产。exact pushed SHA `4df9de2474021c1b9396931307acbdb91ee16094`已把固定研究快照逐字节提升到[`packages/om-web-access/assets/provider-icons/`](../packages/om-web-access/assets/provider-icons/README.md)：26个runtime identity映射到25份物理文件，唯一复用为`parallel-mcp → parallel.svg`。runtime descriptor唯一决定identity→asset投影，Web build机械复制`.svg/.png/.ico`，UI不再反色、重染或运行时热取。由该SHA生成并安装的arm64 DMG已在任务专用profile中证明light/dark与关闭重开后26个identity全部加载、0中性fallback、0主题反色。该交付准确记录来源与已知权利约束，但不把准确指称性使用伪装成已获授权。

| Provider identity | 接受的视觉映射 | 本轮候选来源 | Production disposition |
| --- | --- | --- | --- |
| SearXNG、OpenAI、Exa、Brave、Search1API、Tavily、Firecrawl、Jina Search、Kagi、Bocha、Ollama Cloud、Perplexity、Gemini、xAI | 对应服务品牌标记 | exact `@lobehub/icons-static-svg@1.94.0` color/brand asset | 已逐字节本地固定；xAI内部title异常保留在source记录，不改写runtime identity |
| Parallel、Parallel MCP | 同一个Parallel品牌标记；`MCP`只用名称/说明表达 | Parallel官方symbol候选 | 两个runtime ID共享一个asset identity并已本地固定 |
| DuckDuckGo | DuckDuckGo品牌图标 | exact `simple-icons@16.28.0` | exact package字节匹配后本地固定 |
| TinyFish、Searchinfinity、Querit、SERPdive、AnySearch、Bright Data、SerpBase、Serper、Valyu | 各服务官方站点/app/favicon mark | commit `563423d140e0fce6b1833f937f5c0a51ff313fa3`固定研究快照 | 已逐字节本地固定；已知许可/trademark约束记录但不阻塞本轮交付 |

稳定规则：

- 能力级`Web search`只使用现有`globe`；服务级品牌标记不能再用`globe`兜底，否则会把“能力”和“供应商身份”混成一件事；
- Provider name、role、auth前提与状态始终有文字，图标不能独自传达事实；
- status使用文字/tone，不能通过把logo变灰来暗示唯一状态；
- Settings、Curator、Timeline/technical detail只消费同一asset identity；Curator不得复制自己的logo表；
- shipped asset全部本地、固定hash、无CDN/favicon热链；品牌更新只在新一轮source intake中发生，不在用户机器自动漂移；
- 当前26家不得出现中性fallback；未来新增Provider在身份或资产尚未确定时才使用中性字母标记或统一provider glyph，且视觉缺口不能升级成runtime unavailable。

### 6.7 明确不提供的 UI

- Web Search master enable switch；
- `/search` 对应的持久结果中心；
- TUI Activity Monitor 的复制版；
- Provider 健康大盘/后台轮询；
- 逐 tool 开关或 tool-name 编辑；
- remote Curator；
- 另一套 Extensions/Marketplace 页面。

## 7. Curator 的 OmniMind 产品合同

### 7.1 正常 journey

```text
用户要求联网研究
  → Agent 调 web_search
  → results 流式产生
  → 当前 Thread Right Dock 为该 tool call 创建独立 OmniMind Web Access Tab
  → 用户选来源 / 加搜索 / 生成或编辑 summary
  → Approve 或发送原始结果
  → tool call settlement 回到同一 Pi turn
  → pending期间Timeline可精确聚焦/重开；terminal后只保留普通tool result/activity
```

### 7.2 展示与生命周期

- loopback URL 必须是 exact tokenized intent，不拦截任意 localhost；
- existing `engineWebSurfaceHost.ts` 继续校验 URL、Thread/Engine/Tool provenance、TTL 与一次性 claim；
- fork 主路径直接发送typed Curator URL/details，不依赖对任意result字符串的递归URL扫描；Host claim失败在OmniMind profile中fail closed/unavailable，不能触发Glimpse或系统浏览器fallback；
- URL/token 只在内存 handoff，不能进入 Product facts、raw Timeline payload、Browser recent history/localStorage/tab restore、日志、诊断或截图；页面响应禁用缓存与referrer传播；
- 第一次打开使用独立ephemeral Browser Tab，不能覆盖用户当前Tab。review时Host保存pending tool call的短时tab handle，Timeline按exact tool call聚焦原Tab或在已关闭时重建；多个pending review互不覆盖。observer只保存当前call的短时展示handle，不进入Timeline reopen；
- 关闭Tab、Right Dock或Browser pane只隐藏，不取消tool call。review对应Timeline row在仍pending时保持可操作；Approve、Cancel、idle timeout、Run abort或Session shutdown才settlement并清理。observer由tool call自行继续，terminal时清理活跃server/token/presentation且不保留reopen；
- Right Dock 不抢 Composer focus，不切换当前 route；
- Curator控制台internal-only：不提供`Open externally`、raw-link copy或raw token展示；结果来源链接打开为普通OmniMind Browser Tab，之后仍可由用户显式外部打开；
- Host presentation unavailable 时 tool result 准确说明无法展示，不 silent external fallback；
- review的Approve、Cancel、timeout、abort、Session shutdown关闭对应server/stream/timer与presentation handle；observer在tool terminal/abort/Session shutdown关闭对应活跃资源；
- 多 Session、多 Curator互不清理。
- 只有owning Thread当前可见时自动展示；后台review只留下既有waiting activity/attention，用户进入后再精确打开，未处理则按上游idle timeout settlement；后台observer不投影waiting或reopen，也不抢Right Dock。

### 7.3 UI 产品化

必须完整保留作者已经做好的交互能力：Provider buttons、query 输入/改写、streaming result cards、单项选择、替代 Provider、timer 调整、raw-send、summary model选择、生成、编辑、feedback regenerate、preview、approve、keyboard 与 reduced motion。

Provider切换同时触发当前结果重搜与canonical默认写入，但二者必须分别建模：只有expected-revision mutation提交成功才宣称默认已保存；冲突/损坏/权限失败不丢本次重搜结果，不静默重试或更新revision，并引导用户进入同一Settings config owner恢复；multi-query只有部分重搜成功时保留成功与失败卡片并明确partial，无query时只报告默认写入结果，不能虚构“已重搜”。Browser Tab标题来自创建时locale snapshot；Curator普通错误使用stable typed code与页面双语catalog，不能把Server原始英文直接拼入中文表面。

只改产品归属和宿主适配：

- title/copy/logo/tokens 使用 OmniMind；
- 简中/英文完整 catalog；
- locale与resolved light/dark theme来自创建该Curator时的OmniMind presentation snapshot，不从OS/browser推断；
- 页面 self-contained/offline；
- 响应式适配 Right Dock 的真实窄宽度；
- 不出现 Pi、`pi-web-access`、Glimpse、TUI、外部浏览器或 internal runtime 术语；
- Provider 名、URL、query、原始结果与 diagnostics 保持来源事实。

## 8. Fork、版本、分发与同步管理

### 8.1 仓库形态

- 在OmniMind monorepo中建立私有workspace package，集中导入exact upstream source、原目录、作者测试与license；不建立独立GitHub fork、不发布npm package、不生成第二tgz或同步控制面；
- untouched upstream baseline独立commit保留exact `fbbd0cb…`字节；之后的monorepo commits形成可审计P1–P6 diff，不能把“来源可追溯”写成不存在的GitHub fork ancestry；
- package改为`@omnimind/om-web-access`，首个候选版本建议`0.24.1-omnimind.1`并保持private；
- 官方支持合同只覆盖bundled OmniMind Agent；
- stock Pi 用户问题指向 upstream，不为其保留 `.pi`、Glimpse、commands、shortcuts 第二 profile。

### 8.2 每轮 upstream sync

1. 锁定新 upstream tag、commit、npm tgz、integrity、shasum、SHA-256 和 dependency closure；
2. 检查 artifact/source 对应、license、install scripts、发布物增量；
3. 先运行 upstream 原作者完整 tests；
4. 按 P1–P6 逐项判断：upstream 已解决则删除 patch，发生冲突则说明用户影响；
5. 在独立untouched baseline上重放或重做最小P1–P6差异，生成可重复upstream diff/patch inventory；不以目录重排或“干净架构”扩大修改半径；
6. 运行 OmniMind conformance、isolated runtime、real-provider、packaged journey；
7. 只有 exact pushed SHA 全链通过后才更新产品 pin、README adoption、license/SBOM 和 evidence；
8. 不自动追 latest，不因 README 新功能直接扩大 Settings 或 runtime activation。

候选交付使用两段事实链：实现、authority、research与execution status先在本地共同冻结为`candidate/pending-packaged`后才推送任务分支；Desktop必须从该次已pushed的exact implementation SHA构建。packaged journey通过后再以evidence/status commit记录被测implementation SHA、产物与结果，并明确evidence-recording SHA不属于Desktop shipped bytes；不在commit内容中嵌入自身SHA，也不制造尾随提交循环。

### 8.3 Patch 预算与 stop-loss

出现以下任一情况必须重新 intake，而不是继续堆 patch：

- 六个 seam 之外出现新的长期 owner；
- fork 开始复制 Pi Session、ResourceLoader、Tool Registry 或 active set；
- Settings 与 JSON 变成两个配置 store；
- Provider manifest 开始决定 runtime truth；
- 为可用性增加 background daemon、付费 probe、cooldown DB 或全局 loader；
- Curator 产品化需要持续重写 3,000+ 行页面而无法形成窄 presentation seam；
- upstream 更新长期无法合并，或作者 tests 被大面积删除；
- 用户结果不再明显优于 Engine-native search + Browser 的简单基线。

### 8.4 回滚

- 产品依赖回退到上一 exact monorepo implementation commit；
- Session composition 移除该一项 Extension 即可停用，不触碰 AgentGateway/Host catalog；
- 不迁移、不删除用户 canonical config 和 cache；旧字节保持原位，未来兼容重新进入另行裁决；
- rollback 后 stock Pi、其他 Engine、Host Browser 与六组 Built-in 不受影响。

## 9. 实施接缝：必须复用的当前 OmniMind owner

| 责任 | 当前真实接缝 | Web Access 允许做什么 |
| --- | --- | --- |
| product-bundled Extensions | `apps/server/src/provider/omnimindSessionExtensions.ts` 的显式有限 composition | 增加一个独立 inline Extension factory；不能让 PiAdapter拥有其业务逻辑 |
| Pi Session | `apps/server/src/provider/Layers/PiAdapter.ts` | 传入窄依赖、接收 events/provenance；不实现 Provider routing/config/active truth |
| temporary Web UI | `apps/server/src/engineWebSurface/engineWebSurfaceHost.ts` | 扩展exact typed Curator intent与per-call ephemeral handle；不加新route、arbitrary localhost interception或字符串扫描主合同 |
| Browser presentation | existing Desktop BrowserManager/Right Dock + internal presentation seam | 创建/聚焦exact ephemeral tab并排除history/restore；不扩张Agent-visible `browser_open` schema，Browser仍拥有tab/pane lifecycle |
| Timeline classification | canonical `web_search` item type 与 tool result projection | pending row按tool call触发exact reopen；terminal只留普通result，不存bearer URL |
| Settings shell | existing Settings IA/primitives/search/deep-link | 新增最接近的页面，复用 overview→add→detail；不建第二settings framework或form DSL |
| config read/mutation | fork package-owned config service | Settings与Extension共享同一reader/writer；Settings不为读配置启动Session |
| private home | bundled OmniMind runtime `.omnimind/agent` owner | 注入 exact config path；零读取 `.pi` |
| tool activation | Pi registered/active truth | 只调整本 Extension 自己两个 search-dependent names |

当前 `extractPiCuratorWebSurfaceUrl()` 只接受 tool name `web_search`，这进一步证明 canonical tool name 不应在 product profile 暴露 override。

## 10. Required proof

### 10.1 Source 与 package

- exact artifact/source/dependency/license re-check；
- upstream 64 test files 全量运行；
- package dry-run证明 demo media 不进入 shipped tgz；
- fork README/NOTICE/License 与 package identity准确；
- Pi 0.84.2 exact typecheck/runtime compatibility。

### 10.2 Session 隔离

- 两个并发 OmniMind Thread，各自 search/fetch/Curator/cache；
- Thread A `session_start/tree/shutdown/abort` 不改变 Thread B；
- multiple Curators各自 approve/cancel/timeout；
- restart/branch restore 只恢复对应 Session entries；
- process cleanup 无 orphan HTTP server、timer、clone 或 pending request。

### 10.3 Config 与 Settings

- 首次Settings进入与首次OmniMind Agent Session两条路径谁先发生谁创建default file，且只使用同一writer；App启动/被动readiness不创建；
- Settings创建/读取不实例化Session、不执行Extension、不发Provider请求；existing file不ambient rewrite；
- UI save → next tool call生效；file edit → refresh/next tool call生效；
- unknown fields round-trip；
- concurrent UI/file edit typed conflict且 draft 不丢；
- atomic write failure不先发布内存成功；
- full literal key 与 `$ENV`/`!command` 可回读、copy/edit；
- key 不进入 generic settings stream、Timeline、log 或 screenshot；
- `.pi` 零枚举、零读取、零写入。
- Provider“测试”和全局“重新检查”均明确执行最小真实请求、可能消耗额度，结果不被保存为永久connected truth。
- 同一测试/重新检查在pending期间single-flight；连点、重渲染或客户端超时恢复不得自动重发真实请求。

### 10.4 Routing 与费用

- 多个已配置 Provider + `auto` 只依次尝试直到首个成功；
- named 严格失败；
- array 只并发指定集合；
- `all` 排除 explicit-only/paid excluded set；
- ordered routing只在 configured `fallbackOn`继续；
- Curator 切 Provider与文件/UI真实同步；
- single Provider failure 不触发全局 inactive。

### 10.5 Availability / active set

- App启动与Session初始化不发health/search probe；结构候选只投影unknown/possible；
- 第一次真实search按canonical route惰性得出availability证据；显式“重新检查”才主动运行同一最小route；
- 单服务“测试”与页面级“重新检查”在各自pending期间single-flight，避免重复额度消耗；
- keyless Exa 429 + 其他 auto candidates 成功：工具保持 active；
-完整 candidate exhaustion：下一 turn 只移除 `web_search/source_check`；
- `fetch_content/get_search_content` 保留；
- transient-only/network failure 保持 degraded active；
- Settings 保存/重新检查/new Session 可恢复；
- foreign/user tools 与用户显式 active choice 不被覆盖；
- inactive 后 system prompt/tool schema 真正不再携带两个工具。

### 10.6 Curator 与产品 UI

- 显式`summary-review`在OmniMind runtime能通过Host-presentable surface呈现；`auto-summary`默认展示关闭时不创建Tab，展示开启时可创建observer但不产生pending用户操作；
- `auto-summary/none`在展示关闭时不创建Right Dock Tab；展示开启时创建非阻塞observer Tab但不进入waiting-for-user、不要求Approve，terminal后清理活跃token/settlement且Timeline无假reopen；
- current Thread Right Dock为每个tool call创建独立Tab，不复用/覆盖当前用户Tab，不外跳、不抢Composer focus；
- Curator控制台隐藏`Open externally`、raw-link copy与raw token地址；来源链接进入普通OmniMind Browser Tab，普通Tab仍可显式外部打开；
- 只有owning Thread前台时自动呈现；后台review投影既有waiting activity/attention并可在进入Thread后按exact activity打开，后台observer不投影waiting/reopen；两者都不切route、不抢Right Dock；
- 多个pending Curator映射到不同tool call/Tab；Timeline按exact row聚焦，Tab已关闭时重建，不能只展开Browser pane；
- 关闭Tab/Right Dock只隐藏、不取消tool call；review由Approve/Cancel/timeout/abort/Session shutdown settlement，observer由tool terminal/abort/Session shutdown cleanup；terminal后reopen action消失；
- loopback token不进入Browser recent history、localStorage、tab restore、cache/referrer、Product payload或日志；persistent Browser partition下仍满足memory-only；
- Curator使用OmniMind当前locale与resolved theme snapshot，而不是OS/browser默认；
- typed presentation claim失败fail closed，不触发Glimpse/系统浏览器fallback；
- 简中/英文、keyboard、screen reader、390px/Right Dock窄宽、dark/light、reduced motion；
- 无 Google Fonts/jsDelivr/运行时 CDN；
- 26个exact Provider descriptor全部有且只有一个presentation identity；Parallel/Parallel MCP共享品牌asset但保留两个runtime ID；
- 能力级入口固定`globe`，当前26个服务identity全部使用descriptor同源的本地品牌资产；未来新增但身份未定的服务才使用中性fallback；
- shipped品牌资产具备source snapshot/hash与已知license/trademark约束记录；Bright Data等书面许可约束不被伪写成已获许可；
- Settings、Curator、Timeline/technical detail消费同一presentation projection，没有第二logo表或remote hotlink；
- 损坏/未来schema不被默认值覆盖，unknown fields round-trip，known旧schema只在显式mutation时原子升级；
- Settings保存/refresh的revision invalidation只唤醒live Extension实例自治恢复，不产生全局Session registry、file watcher或第二持久状态；
- Provider测试/重新检查pending期间single-flight，没有重复额度消耗；
- provider result、summary generation、edit/regenerate/raw send/approve/timeout/abort 全链。

### 10.7 `source_check`

- exact passage/hash/span/provenance 与 pagination；
- search/fetch error 保留；
- 英文与中文 claim 都能产生相关 passages；
- heuristic assessment 不被 Tool 文案宣称为事实裁决；
- Agent 能使用 passages 做独立判断；
- 搜索 inactive 时它一同 inactive，恢复后回归。

### 10.8 Real-provider 与 packaged product

- 历史局部门：exact pushed implementation SHA `286df13768de943a2db4df033180251c2f353aca`的fresh任务profile曾证明13个品牌asset与13个中性fallback可渲染；维护者随后把标准提升为26家全部原色品牌asset，因此该视觉证据已经失效。exact pushed SHA `4df9de2474021c1b9396931307acbdb91ee16094`已完成26个identity→25份原色本地资产的fresh隔离Settings/Provider-asset gate。
- exact pushed implementation SHA `52c8a25e75f702baef36b93fb1f8cc42f270897e`生成DMG SHA-256 `118b55370cbec44308ec68ecbeb5a0efd3bd0d50b88665284e3274aca09c2931`，安装版`app.asar` SHA-256为`018d004a888344e395fa9885f3be2493a1efd9ec0cc15cbaa0c32d4dc26eaeb4`。当时尚未实现独立展示设置，fresh任务profile证明真实DeepSeek Agent经keyless Exa走默认`auto-summary`时不创建Curator并在同一turn继续；显式`summary-review`创建dedicated ephemeral Tab、批准后terminal cleanup并让同一turn继续；关闭重开仍投影`auto-summary`默认且无假Curator入口。DeepSeek最终措辞未完全满足“一句话总结”，故这里只关闭旧候选的工具/Curator lifecycle与continuation门，不把模型答案质量或新observer合同写成通过。
- exact pushed implementation SHA `3f4d673bce30465cba387df2667d2488a744c05f`生成arm64 DMG SHA-256 `4160ec9594e0cbc185b970a645be0e05695344682c255aa9f5bcaed02f831e18`，DMG内与安装后`app.asar` SHA-256均为`3d909eba51ea301e66f8ca71f522fbc1eccf7c98905ca4c46c906e06f767be4`。任务隔离profile复证Main、Renderer与bundled Server均未使用真实用户profile，canonical文件保持`0600`及显式`provider: auto` / `workflow: auto-summary`。真实MiMo-V2.5-Pro从非错误`web_search` tool result读取agent-visible Artifact responseId，随后以该ID成功调用`get_search_content`取回stored result；当时默认展示关闭且尚无observer实现，因此未创建Curator。同一安装候选下的DeepSeek V4 Flash显式`summary-review`又一次完成dedicated ephemeral Tab、批准、terminal cleanup与same-turn continuation；这条证据不证明后续observer合同。
- exact pushed implementation SHA `ff67a21a97f9071bd9162dfb61e9f4b632a903a8`生成arm64 DMG SHA-256 `16386d1d8e01c2bd0ca5b2903485bfb5f7651c0fb867df348df458e00084cf1e`，DMG内与安装后`app.asar` SHA-256均为`59e6183a0a2e19e4aaa3886249e049fe77dc7f78d4f034ef8b6ccbc892b25844`。fresh任务profile复证Main、Renderer与bundled Server全部隔离，并完成`auto-summary`与`none`各自展示关/开、显式`summary-review`批准、observer in-flight关闭不取消、agent-visible responseId继续取回、关闭重开无waiting/假reopen/过期observer。observer页面使用正式协议和本地原色Provider资产，不出现review settlement控件或临时审查Browser chrome；作者完整套件549/549通过。该证据关闭observer/presentation安装门，但不证明keyed搜索成功或多Thread packaged生命周期。
- replacement Tavily凭据在同一安装候选与任务profile中先通过Settings“测试当前未保存草稿”走正式runtime成功；UI明确“不保存、可能消耗额度”，pending期间按单一request identity禁用重复提交，canonical bytes/mtime、routing、默认Provider与当前Session搜索工具均未改变。随后只在任务profile显式保存并执行named Tavily搜索，真实结果带Tavily attribution与agent-visible responseId，同一Run以`get_search_content`成功继续取回；测试后canonical文件经同一Settings owner恢复原始bytes、删除Tavily字段且保持`0600`，剪贴板已清空。凭据值、endpoint与原始响应未进入argv、日志、截图、artifact、Git或本文。
- A/B双Thread安装journey中，A以前台`auto-summary`多query observer运行；B在有界延迟后于后台进入`summary-review` waiting，没有切route、抢A Right Dock或自动打开review。关闭A observer后B仍pending；进入B后Timeline显示exact waiting activity，从该动作重建正确review Tab并批准，只settle B，A/B分别继续到各自terminal。terminal立即移除reopen；App关闭重开后CDP只存在主页面，A/B均无waiting/reopen或ephemeral Web Surface，bundled Server仍只打开任务profile state DB。
- 已通过zero-config route、keyed named route、MiMo/DeepSeek model锚点、exact pushed SHA构建安装、fresh/复用任务隔离profile，以及search → observer/review → approve/continuation → close/exact reopen → cleanup主路径；route exhaustion、timeout/fatal与生命周期scope另有确定性source测试。这里关闭的是Web Access候选此前剩余的keyed Provider与multiThread安装门，不自动升级为Release或整个产品已发行。

## 11. 已拒绝的复杂度

- 自研统一 Web Search service；
- 第七组 Host Web；
- AgentGateway Provider routing；
- 所有 Engine 同名 Web tools；
- stock Pi compatibility profile；
- Provider health daemon / periodic probe；
- 搜索结果数据库、长期 archive、vector index；
- 第二 Settings store；
- keychain 强迁移或“不允许用户找回 key”的产品规则；
- Curator 独立顶层 route；
- slash-command palette；
- 第二事实核验模型/consensus engine；
- fork 全面重写、按 OmniMind 目录重排 26k 行源码；
- 自动跟随 latest。

## 12. 反方压力测试

### Strategy：既然多数 Engine 已有 search，为什么还做？

因为它不是跨 Engine 搜索平台，而是 OmniMind Agent 的生态一级能力。若未来 bundled OmniMind Agent 的 native ecosystem 已提供更强且更低维护的等价能力，应重新比较并可能退出 fork；当前采用理由是 `pi-web-access` 已经覆盖 search + fetch + evidence + Curator 的完整组合，而不是工具名本身。

### Execution：最难、最脆的是 Provider，不是 UI吗？

不是。Provider 实现是上游最成熟部分；真正 P0 是 single-session globals、fragmented config caches 和 `hasUI=false` 导致 Curator失效。若先做漂亮 Settings 而不修这三点，产品会在多 Thread、热配置和默认 workflow 上系统性撒谎。

### Adoption：为什么不再默认 Curator？

因为普通搜索的第一指标是少操作、少等待、不中断。上游Curator成熟说明它值得保留为专业增强，不等于每次搜索都应暂停。canonical默认因此是`auto-summary`；`summary-review`只在用户明确选择或要求审查来源时进入，P4生命周期与token边界仍完整保留。

### Sustain：深 fork 会不会失控？

会，除非 patch inventory保持六类、上游 ancestry/tests完整、产品只支持一套 bundled runtime、Settings/file只有一个配置 owner。拒绝 stock Pi 双 profile正是控制长期矩阵的关键。

### Global：现在最大的长期风险是什么？

不是“图标还少几个”，而是把三个不同事实揉成一张表：runtime Provider、用户配置和品牌展示。正确管理方式是runtime定义拥有Provider identity/routing，canonical JSON拥有用户配置，presentation只附着同源descriptor并携带本地asset admission；三者通过stable ID汇合，但任何一层都不能反向接管另外两层。若未来更新需要同时手改fork Provider列表、Server DTO、Web列表、Curator列表和logo表，这个设计已经失败，应在合并前`SIMPLIFY`。

第二个风险是把“Web Access不可用”做成整包布尔值。搜索route exhaustion只影响`web_search/source_check`；direct URL、PDF/GitHub读取与已有result retrieval仍可能工作。反过来，某个fetch backend失败也不能让搜索消失。所有availability、文案和测试都按工具真实依赖收缩，不能为了UI简单牺牲能力边界。

第三个风险是把“官方favicon”误当成稳定运行时API。品牌站点可以改文件、阻断请求或改变条款；production只能消费fork/release中固定、有hash的本地资产。维护者接受已知许可约束不阻塞本轮交付，不等于可以建设运行时下载器，也不等于宣称第三方授权或背书。

第四个风险是品牌层级错位。当前`xai`固定glyph内部title仍标为Grok，Searchinfinity资产来自其BytePlus关联页面；维护者已接受当前准确指称性映射进入candidate，但这些异常必须保留在source记录中。不能为了图标漂亮改写runtime ID，也不能在未来更新时静默把母公司mark、产品mark和传输方式互换。

第五个风险是把搜索页面当成“打开一个URL”而忽略其两种生命周期：review Curator是pending tool call的短时交互面，observer是非阻塞typed页面。untouched baseline的三个反例是PiAdapter用`browser_open reuse:true`导航用户当前Tab、Timeline callback只展开Browser pane而不能定位对应review call、Browser recent-history把token URL写入localStorage；source candidate必须同时用typed dedicated ephemeral Tab、review exact pending reopen、observer terminal无reopen、call-scoped settlement/cleanup与non-history metadata闭合。只有pushed-SHA packaged journey通过后，才能把source事实提升为安装产品证据。

第六个风险是为了26个Provider表单发明通用配置DSL，或为了Curator Tab把内部presentation需求塞进Agent可见Browser tool schema。两者都会把一个fork接入升级成新的平台owner。正确边界是package-owned closed field vocabulary与Browser owner内部typed presentation seam；复杂Provider配置保持file-only，Agent-facing Browser schema保持不变。

第七个风险是把配置兼容升级做成Host级迁移平台。`web-search.json`属于package，schema、known migration与forward-compatibility也必须属于package；Host只调用typed service。高版本或损坏文件若被默认值静默覆盖，会直接丢掉高手的手工配置和literal keys，因此必须保留原文件并fail closed，不能为了“自动修好”另建quarantine数据库、通用migration registry或双读兼容层。

第八个风险是为了让Settings保存后立即恢复inactive tools，建立全局Session registry或持续file watcher。这会把一次owner-local失效通知升级成第二生命周期控制面。正确实现只有process-local revision invalidation：写入成功后发信号，live Extension instance各自重读、恢复自己移除的工具并在Session shutdown解绑；文件仍是唯一真相，外部编辑按显式刷新/native reload/new Session生效。

第九个风险是搜索页面在后台Thread抢占当前用户界面。`auto-summary`在默认展示关闭时不创建Tab；展示开启的observer也只在owning Thread前台呈现，后台不投影waiting/reopen。当`summary-review`被明确选择时，自动呈现仍只属于当前owning Thread，后台Thread复用既有waiting-for-user activity/attention并继续上游timeout，不切route、不抢Right Dock，也不为此建通知中心或后台Curator scheduler。

## 13. Reopen triggers

出现以下任一变化，重新执行 [`PI-ECOSYSTEM-INTAKE.md`](../PI-ECOSYSTEM-INTAKE.md)：

- upstream 新版本或 exact source/artifact/dependency/license/provenance 改变；
- bundled Pi runtime 从 0.84.2 升级；
- upstream 提供 instance config、per-session state、Host-presentable web surface 或统一 config cache seam，可删除 fork patch；
- Provider routing、Exa MCP、Curator protocol、ResearchArtifact schema 或 cache format 改变；
- OmniMind temporary Web surface、Settings IA、private home 或 composition owner 改变；
- 发生 secret leak、SSRF、跨 Session cleanup、错误付费、orphan server 或 `.pi` 触碰；
- Engine-native search + Browser 的简单基线在真实 journey 中达到同等或更好结果；
- 维护者改变 Curator 默认、key 可回读、stock Pi support 或非 Host 边界。

## 14. 新会话执行摘要

```om-web-access-intake
{
  "upstream": {
    "package": "pi-web-access@0.24.1",
    "commit": "fbbd0cb3b3eb918c8833906aa0b41e257fffe979",
    "license": "MIT",
    "author": "Nico Bailon"
  },
  "fork": {
    "package": "@omnimind/om-web-access",
    "productName": "OmniMind Web Access",
    "support": "bundled-omnimind-agent-only",
    "stockPiSupport": false,
    "disposition": "monorepo-owned-narrow-fork"
  },
  "runtime": {
    "owner": "pi-session-resource-loader-tool-registry-active-set",
    "agentGateway": false,
    "hostBuiltInGroup": false,
    "crossEngine": false,
    "tools": ["web_search", "source_check", "fetch_content", "get_search_content"],
    "commands": [],
    "tuiShortcuts": [],
    "workflowDefault": "auto-summary",
    "presentationDefault": "off",
    "observerWorkflows": ["auto-summary", "none"],
    "observerSemantics": "nonblocking-no-waiting-no-timeline-reopen",
    "curatorPresentation": "review-pending-or-observer-nonblocking-current-thread-right-dock-dedicated-ephemeral-tab",
    "curatorTabClose": "hide-only-tool-continues",
    "curatorReopen": "pending-tool-call-exact-tab-or-recreate",
    "curatorPresentationContext": "omnimind-locale-and-resolved-theme-snapshot",
    "curatorUrlDurability": "memory-only-no-browser-history",
    "curatorInternalOnly": true,
    "curatorAutoPresent": "owning-thread-foreground-only",
    "fileLevelToolEnables": "canonical-config-author-semantics",
    "providerPrerequisites": "descriptor-owned-and-or-session-dependent-evaluator",
    "providerAgentProjection": "canonical-ids-auto-all-explicit-only-and-route-conditions"
  },
  "config": {
    "authority": ".omnimind/agent/web-search.json",
    "owner": "fork-package-config-service",
    "creation": "first-web-search-settings-or-first-omnimind-agent-session",
    "uiFileBidirectional": true,
    "secondStore": false,
    "fullKeyReadback": true,
    "schemaOwner": "fork-package",
    "futureOrCorruptSchema": "preserve-file-fail-closed",
    "liveInvalidation": "process-local-revision-signal-no-session-registry",
    "draftProviderTest": "request-scoped-candidate-no-save-may-cost-quota",
    "draftProviderTestIdentity": "request-and-provider-bound-single-flight",
    "create": "no-clobber-private-0600",
    "noOpMutation": "no-write-no-revision"
  },
  "cleanup": {
    "toolCallTerminal": "call-owned-resources-only",
    "runAbort": "run-owned-inflight-calls-only",
    "sessionTree": "current-extension-instance-and-branch-only",
    "sessionShutdown": "whole-extension-instance"
  },
  "availability": {
    "detection": "lazy-real-search-or-explicit-recheck",
    "startupProbe": false,
    "backgroundHealthDaemon": false,
    "explicitProbeSingleFlight": true
  },
  "presentation": {
    "capabilityIcon": "globe",
    "providerDescriptors": "runtime-definition-co-located-credential-blind-projection",
    "providerSettingsGrouping": "descriptor-owned-connection-role-no-ui-heuristics",
    "providerSwitchTruth": "persistence-and-research-independent-with-partial-and-no-query-outcomes",
    "providerListInWeb": false,
    "runtimeRemoteAssets": false,
    "parallelBrandAssetSharedWithMcp": true,
    "providerBrandCoverage": "26-runtime-identities-to-25-local-original-color-assets",
    "knownTrademarkConstraintsBlockVisualDelivery": false,
    "missingAssetFallback": "future-unresolved-provider-only-neutral-provider-mark-not-globe"
  },
  "patchInventory": [
    "per-session-instance-state",
    "instance-config-and-single-reader",
    "omnimind-runtime-profile",
    "host-presentable-bilingual-curator",
    "provider-availability-to-pi-active-set",
    "source-check-honest-unicode-contract"
  ],
  "evidenceMaturity": "source-candidate-pending-packaged-with-prior-evidence",
  "implemented": true,
  "currentSourceImplementationSha": "7335df428655fcb67919bc2e24fa52651abaed8a",
  "supersededObserverImplementationSha": "2bf044049d7eeb419975d7426e5d6414d2136814",
  "testedImplementationSha": "ff67a21a97f9071bd9162dfb61e9f4b632a903a8",
  "previousTestedImplementationSha": "3f4d673bce30465cba387df2667d2488a744c05f",
  "testedDmgSha256": "16386d1d8e01c2bd0ca5b2903485bfb5f7651c0fb867df348df458e00084cf1e",
  "testedAppAsarSha256": "59e6183a0a2e19e4aaa3886249e049fe77dc7f78d4f034ef8b6ccbc892b25844",
  "sourceAuthorTests": "557/557",
  "packagedSettingsProviderAssetGate": true,
  "packagedDefaultAutoSummaryGate": true,
  "packagedExplicitReviewLifecycleGate": true,
  "packagedMiMoStoredSearchContinuationGate": true,
  "sourceObserverPresentationGate": true,
  "sourceFileLevelToolEnableGate": true,
  "packagedObserverPresentationGate": true,
  "packagedWorkflowPresentationMatrixGate": true,
  "packagedKeyedSearchProviderGate": true,
  "packagedMultiThreadGate": true,
  "packagedJourney": true,
  "releaseStatus": "not-released",
  "unresolvedMaintainerChoice": "none"
}
```

未来重新构建、升级上游、改变Provider/Curator协议或准备发行前仍必须实时读取`git status --short`、[`execution-brief.md`](../execution-brief.md)与相关architecture owner，并隔离真实用户profile及并发工作。当前packaged Web Access journey证明的是exact implementation SHA与安装候选，不替代签名、公证、Release、update feed或整个OmniMind产品发行证据。
