# `pi-web-access` → OmniMind Web Access：exact-source intake、产品裁决与长期维护合同

> 观察与收口日期：2026-08-22
>
> OmniMind 工作区基线：`codex/host-tools-product-surface-policy@5451e22ce80b34e0d1d9f6fe4143b7760564d659`；该分支当前另有 Host Tools / Settings 在途修改，本文不把它们写成 Web Access 已实施事实。
>
> 上游 exact source：[`nicobailon/pi-web-access@fbbd0cb3b3eb918c8833906aa0b41e257fffe979`](https://github.com/nicobailon/pi-web-access/tree/fbbd0cb3b3eb918c8833906aa0b41e257fffe979)
>
> 上游 exact artifact：[`pi-web-access@0.24.1`](https://www.npmjs.com/package/pi-web-access/v/0.24.1)
>
> 文档性质：fixed-source fact + current OmniMind source observation + maintainer-confirmed product decision + bounded implementation reference。
>
> 权威边界：本文是 `pi-web-access` / `@omnimind/om-web-access` 唯一 package-specific research owner。它保存来源、能力、反证、fork patch inventory、维护方式和实施 falsifier；稳定 UI 与 runtime 合同仍分别由 [`architecture/workbench.md`](../architecture/workbench.md) 和 [`architecture/execution.md`](../architecture/execution.md) 拥有，当前施工只看 [`execution-brief.md`](../execution-brief.md)，production adoption 只有进入根 [`README.md`](../README.md) 的 `source-adoptions` 后才成立。

> [!IMPORTANT]
> **当前 disposition：`Fork narrowly`，维护者已确认完整产品方向，但代码、依赖、发行物与 packaged journey 尚未实施。** Fork 的 package 名是 `@omnimind/om-web-access`，产品名是 **OmniMind Web Access**。它只作为 OmniMind Agent 随产品内置的 Pi-native Extension 受支持；不进入 AgentGateway，不增加第七组 Host Built-in capability，不跨 Engine 分发，也不承担通用 stock Pi package 的安装、兼容或支持责任。

> [!IMPORTANT]
> 本文 supersede [`omnimind-agent-core-ecosystem-orchestration-review.md`](omnimind-agent-core-ecosystem-orchestration-review.md) §8.4 中“机器调用默认关闭 Curator、只有用户明确要求才打开”的历史建议。维护者当前决定是：**Curator 默认开启**；用户可在 Settings 改为关闭，Agent 也可按单次调用选择不打开或在用户要求审查来源时主动打开。

## 0. 新会话先读这里

### 0.1 一句话结论

OmniMind 不需要自造通用 `web_search` Host 能力；应当深 fork 成熟的 `pi-web-access`，让它作为 OmniMind Agent 的一级 Pi-native Extension 进入 Pi Registry / active set，并只对六处确实不适配 OmniMind 的生命周期边界做手术。

### 0.2 已确认决策

| 事项 | 最终裁决 |
| --- | --- |
| 产品名 | `OmniMind Web Access` |
| package 名 | `@omnimind/om-web-access` |
| 来源模式 | 保留 Git ancestry 的有界深 fork，不把 26k 行源码散抄进 OmniMind monorepo |
| 受支持宿主 | 仅 OmniMind 官方发行版内的 bundled OmniMind Agent exact runtime |
| stock Pi | 不安装、不注册、不测试、不承诺兼容；stock Pi 用户继续使用上游 `pi-web-access` |
| Engine 范围 | 仅 canonical `provider === "omnimind"`；Codex、Claude、OpenCode、stock Pi 等保留各自 native web 能力 |
| Runtime owner | Pi `AgentSession`、`ResourceLoader`、Tool Registry / active set 和 Extension lifecycle |
| 明确非 owner | AgentGateway、Host Built-in policy、跨 Engine Tool Registry、Product Orchestration、Thread、Timeline、Workbench |
| 工具名 | 保留 `web_search`、`source_check`、`fetch_content`、`get_search_content`，不允许产品 profile 改名 |
| Curator | 默认 `summary-review`；进入当前 Thread 的 Right Dock Browser；不自动打开系统浏览器 |
| Slash commands | OmniMind profile 不注册 `/websearch`、`/curator`、`/search`、`/google-account` |
| TUI shortcuts/widget | OmniMind profile 不注册 `Ctrl+Shift+S`、`Ctrl+Shift+W` 或 TUI activity widget |
| Settings 主开关 | 不提供“启用网络搜索”总开关；一级能力一直可见，当前不可用时准确说明并提供配置/重试 |
| 配置真相 | `.omnimind/agent/web-search.json` 是唯一 canonical 配置；UI 与文件双向同步，不建数据库副本 |
| API Key | Settings 可读取、完整显示、复制和编辑 literal key；`$ENV`、`!command` 也显示其原始配置表达式 |
| 零配置 | 保留 keyless Exa MCP 等上游路径，但绝不宣传为无限免费或永久可用 |
| 不可用处理 | 真正没有可用搜索路径时，只从该 Pi Session 的 active set 移除 `web_search` 与 `source_check`；保留两个 content 工具 |
| `source_check` | 保留结构化 ResearchArtifact 与精确 passages；把 claim 判断明确降级为 heuristic，并补 Unicode/中文匹配 |
| 上游同步 | 精确版本、人工 intake、最小 patch inventory；不自动追 `latest` |
| 当前实施状态 | 尚未进入产品依赖、composition、Settings 或发行物；本文不能被引用为“功能已经可用” |

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

### 0.4 没有剩余产品级问题

维护者已经裁决 package identity、支持范围、Curator 默认、Settings key 可见性、配置双向同步、零配置失效处理、`source_check` 保留方式以及非 Host 边界。后续允许实现者在既有 owner 内选择局部可逆写法，但不得重新打开以下已否决方向：

- 第七组 `Web` Host capability；
- AgentGateway 中的通用 Web Search；
- 给所有 Engine 强行投影同一套搜索工具；
- stock Pi 双运行时兼容 profile；
- OmniMind 自建搜索 Provider Registry、健康 daemon、结果数据库或第二 Extension Manager；
- 为保留 TUI 命令而占用 OmniMind 的 `/` 注意力。

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
| `ctx.hasUI === false` 代表不能呈现 Curator | OmniMind 没有 Pi TUI，但有 Host-presentable Right Dock Browser | 默认 `summary-review` 会被强制降成 `none`，用户永远看不到 Curator |
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
| evidence maturity | `source-matched`；尚未达到 OmniMind `isolated-runtime-observed`、`product-journey-proven` 或 `packaged-product-proven` |

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

## 3. 上游能力全图

### 3.1 四个工具

| Tool | 上游真实职责 | OmniMind disposition |
| --- | --- | --- |
| `web_search` | 单 query 或多 queries；auto/named/routing/array/all Provider；recency/domain；可后台抓全文；可进入 Curator 或自动摘要 | 保留 canonical name 与 schema；默认 Curator；搜索全局不可用时从当前 Session active set 移除 |
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
| `summary-review` | 打开 Curator，生成 draft，等待用户审查 | 默认 |
| `auto-summary` | 后台生成 summary，不打开 Curator | Settings 可选；Agent 可 per-call |
| `none` | 直接返回 raw results | Settings 可选；Agent 可 per-call |

OmniMind 不是每次都弹一个“选择工作流”的表单。默认值来自 Settings；Agent 在单次 tool call 可覆盖。用户说“帮我查一下”时按默认走，用户说“直接给结果，别让我审查”时可用 `none/auto-summary`，用户说“我要审查来源”时必须使用 `summary-review`。

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

OmniMind 已有 Right Dock、Timeline、错误与技术详情；注册 TUI shortcut/widget 会形成第二呈现面。因此 runtime profile 禁用它们。Curator 自动呈现，关闭后可从对应 Timeline activity 重开；网络活动只在现有 diagnostics/technical detail 有真实用户用途时薄投影，不新建常驻监控器。

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
- 所有 Provider 通过一个 Extension-owned config reader/snapshot 读取；
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

同理，上游 `webSearch.enabled`、`tools.*.enabled` 只保留在 fork source 便于同步，不成为 OmniMind product profile 的用户 activation authority。OmniMind 的四工具注册来自显式 bundled composition，搜索依赖工具的临时收缩来自 P5；不通过文件制造第三套 tool-enabled truth。

这不是把成熟 package 削成四个 API；search/fetch/provider/Curator/storage/tests 全部保留。它只移除不适配 OmniMind 宿主的入口和第二呈现面。

### P4. Host-presentable、双语、自包含 Curator

- `ctx.hasUI === false` 不能再强制 `summary-review → none`；应区分 Pi TUI 与 OmniMind Host-presentable Web surface；
- 继续使用 ephemeral loopback server + token，但交给现有 engine-web-surface intent bridge；
- 当前 Thread、Engine、Tool call provenance 和 TTL 必须齐全；
- 页面默认在 Right Dock，不能抢 Composer focus、覆盖 route 或自动外部打开；
- `curatorRemote` 在 OmniMind profile 恒不可用；
- 页面改为 OmniMind 品牌和现有 Workbench tokens，完整简中/英文；
- 移除 Google Fonts 和 jsDelivr `marked` CDN，改用本地/系统字体与 pinned local markdown renderer；
- 把 presentation/copy/token adapter 从 3,577 行页面生成器中分离，避免每次 upstream sync 手改整页；
- 多个同时 Curator 各自属于 tool call；最新一个可自动显示，其余通过 Timeline 对应 activity 重开。

### P5. Provider availability → Pi active set

不建 health daemon、后台轮询、付费 startup probe、cooldown service 或 Host loader。

状态只来自两类证据：

1. Session init 的结构候选：配置/凭据 source/endpoint/native auth 表明“可能可用”；
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

恢复触发：Settings 成功保存、用户点“重新检查”、native reload 或新 Session。没有后台 timer。`fetch_content` 与 `get_search_content` 始终保留，因为本地 PDF、GitHub、direct URL、缓存读取等不依赖 search Provider。

### P6. `source_check` honest evidence contract

保留 hard evidence，修 Unicode/中文，软化 heuristic judgment；详见 §4.4。不要把这项 patch 扩成事实核验平台。

## 6. 配置文件与 Settings：一个事实、两个入口

### 6.1 Canonical 文件

```text
<resolved OmniMind Agent directory>/web-search.json
```

当前 canonical directory 是 OmniMind private home 下的 `.omnimind/agent`，因此普通本机形态等价于 `~/.omnimind/agent/web-search.json`；精确根仍由现有 `resolveOmniMindAgentDir` / bundled runtime owner 解析，不能由 Renderer 提交绝对路径，也不能从 `HOME`、cwd 或 stock `.pi` 猜测。

首次 bundled Extension 初始化且文件缺失时，按维护者“默认出一个文件”的决定原子创建最小配置：

```json
{
  "schemaVersion": 1,
  "provider": "auto",
  "workflow": "summary-review"
}
```

创建失败不伪装成功：runtime 可继续使用同值内存默认，但 Settings 要显示文件不可写与恢复动作。读取或打开 Settings 不得持续改写 mtime；已存在文件不做格式化重写。

### 6.2 双向同步语义

```text
Settings UI ─┐
             ├─ one Extension config read/mutation owner ─ web-search.json
高级用户文件 ┘
```

- UI snapshot 返回完整配置、unknown fields、safe path、revision/digest 和 Provider presentation manifest；
- UI 保存携带 expected revision，Server/Extension在同一临界区重读、校验、合并 unknown fields、atomic replace；
- 外部文件编辑在下次 tool call 一定生效；Settings reopen、窗口重新聚焦或显式“刷新”时重新读取；
- 页面已修改且文件外部变化时保留 draft并显示 conflict，不能静默覆盖；
- 不做常驻 file watcher、daemon、双写 DB 或 periodic sync；
- provider/routing/workflow/key 等普通运行参数在下一次 tool call 生效；
- OmniMind product profile 的 tools、commands、shortcuts、tool names、remote Curator 与 browser-open policy是固定结构，不从用户文件热改，也不因此形成 reload 设置。

从上游配置复制来的以下字段应保留 bytes 但准确标为 OmniMind profile 不支持，不能静默取得运行权：

| 上游字段 | OmniMind 处置 |
| --- | --- |
| `webSearch.enabled` / `tools.*.enabled` | 不作为 registration/active authority；四工具由 composition + P5 决定 |
| `commands.*` | 不注册 slash commands |
| `shortcuts.*` | 不注册 Pi TUI shortcuts |
| `toolNames` | 不改 canonical tool identities |
| `curatorRemote` | 不允许非 loopback Curator |
| `autoOpenBrowser` | 不控制呈现；只走 provenance-backed Right Dock handoff |

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
   - 搜索：ready / degraded / unavailable / checking；
   - 网页读取：ready 或具体缺失能力；
   - 当前 routing：Auto / 单 Provider / ordered fallback / selected parallel / All；
   - 搜索结果处理：默认审查 / 自动摘要 / 直接返回；
   - 已配置 Provider rows；
   - `添加搜索服务`、`重新检查`、`打开配置文件`。
2. **Add provider / 添加搜索服务**
   - 搜索 26 个 Provider；
   - 一行一个，不做卡片墙；
   - 显示 `无需配置`、`需要 API Key`、`需要 endpoint`、`需要账号登录` 等真实 prerequisite；
   - 选择后进入 Provider detail。
3. **Provider detail / 服务详情**
   - provider-specific fields；
   - key 完整 reveal/copy/edit；
   - base URL/model/zone/profile 等真实字段；
   - 保存、取消、清除、测试；
   - 测试只调用该 Provider 的最小真实 request，不改变默认 routing。
4. **Routing / 搜索方式**
   - `Auto` 为推荐默认；
   - 单 Provider严格模式；
   - ordered fallback + typed `fallbackOn`；
   - selected parallel 和 `All` 明确写“会同时请求多个服务，可能消耗多份额度”；
   - 配置多个 key 本身不自动并发。
5. **Search result handling / 搜索结果处理**
   - `Open review by default / 默认打开来源审查`（`summary-review`，默认 on）；
   - `Generate summary automatically / 自动生成摘要`（`auto-summary`）；
   - `Return results directly / 直接返回结果`（`none`）；
   - 用普通语言解释，普通用户不需要理解 `Curator workflow`。
6. **Content & advanced / 网页读取与高级选项**
   - GitHub clone、PDF、video、max inline content、domain policy、remote hosted fetch opt-in；
   - Gemini browser-cookie、`authFetch`、SSRF ranges、custom headers、command credential source 等高风险/复杂结构可以只提供清楚的 file-only 标识和“打开配置文件”，不伪造半套 GUI；
   - `curatorRemote`、slash commands、shortcuts、tool names 永远不显示，因为 OmniMind profile 不支持。

### 6.5 Provider manifest 是 presentation 投影，不是第二 Registry

Fork 应导出一份静态、versioned、credential-blind provider presentation manifest，至少包含：

- stable provider ID / display name；
- zero-config / auth / key / endpoint prerequisite；
- auto/all/explicit-only participation；
- UI-supported fields 与 advanced-file-only fields；
- cost/remote-fetch hints；
- optional local icon identity。

Server 只把这份 manifest 投影给 Web。Web 不再手写第二个 26-Provider 清单；manifest 也不决定运行时 availability、路由或 credentials，不是 Provider Registry。测试必须保证所有 `RESOLVED_SEARCH_PROVIDERS` 恰好被 manifest 覆盖一次。

### 6.6 明确不提供的 UI

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
  → 当前 Thread Right Dock 自动打开 OmniMind Web Access
  → 用户选来源 / 加搜索 / 生成或编辑 summary
  → Approve 或发送原始结果
  → tool call settlement 回到同一 Pi turn
  → Timeline 保留有意义的 activity 与 reopen action
```

### 7.2 展示与生命周期

- loopback URL 必须是 exact tokenized intent，不拦截任意 localhost；
- existing `engineWebSurfaceHost.ts` 继续校验 URL、Thread/Engine/Tool provenance、TTL 与一次性 claim；
- URL/token 只在内存 handoff，不能进入 Product facts、raw Timeline payload、日志或截图；
- Right Dock 不抢 Composer focus，不切换当前 route；
- 用户主动点 Browser 中的 `Open externally` 才能打开系统浏览器；
- Host presentation unavailable 时 tool result 准确说明无法展示，不 silent external fallback；
- close、approve、timeout、abort、Session shutdown 都关闭对应 server/stream/timer；
- 多 Session、多 Curator互不清理。

### 7.3 UI 产品化

必须完整保留作者已经做好的交互能力：Provider buttons、query 输入/改写、streaming result cards、单项选择、替代 Provider、timer 调整、raw-send、summary model选择、生成、编辑、feedback regenerate、preview、approve、keyboard 与 reduced motion。

只改产品归属和宿主适配：

- title/copy/logo/tokens 使用 OmniMind；
- 简中/英文完整 catalog；
- 页面 self-contained/offline；
- 响应式适配 Right Dock 的真实窄宽度；
- 不出现 Pi、`pi-web-access`、Glimpse、TUI、外部浏览器或 internal runtime 术语；
- Provider 名、URL、query、原始结果与 diagnostics 保持来源事实。

## 8. Fork、版本、分发与同步管理

### 8.1 仓库形态

- 建立专用 Git fork，保留 upstream remote 和完整 ancestry；
- fork package 改为 `@omnimind/om-web-access`；
- 首个候选版本建议 `0.24.1-omnimind.1`；
- OmniMind product repo exact pin 一个 tgz/commit/integrity，不依赖 floating npm range；
- 无论未来 package 是否公开发布，官方支持合同都只覆盖 bundled OmniMind Agent；
- stock Pi 用户问题指向 upstream，不为其保留 `.pi`、Glimpse、commands、shortcuts 第二 profile。

### 8.2 每轮 upstream sync

1. 锁定新 upstream tag、commit、npm tgz、integrity、shasum、SHA-256 和 dependency closure；
2. 检查 artifact/source 对应、license、install scripts、发布物增量；
3. 先运行 upstream 原作者完整 tests；
4. 按 P1–P6 逐项判断：upstream 已解决则删除 patch，发生冲突则说明用户影响；
5. merge/rebase 由 fork 维护策略执行，但不能 squash 掉 upstream lineage；
6. 运行 OmniMind conformance、isolated runtime、real-provider、packaged journey；
7. 只有 exact pushed SHA 全链通过后才更新产品 pin、README adoption、license/SBOM 和 evidence；
8. 不自动追 latest，不因 README 新功能直接扩大 Settings 或 runtime activation。

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

- 产品依赖回退到上一 exact `@omnimind/om-web-access` tgz/commit；
- Session composition 移除该一项 Extension 即可停用，不触碰 AgentGateway/Host catalog；
- 不迁移、不删除用户 canonical config 和 cache；旧字节保持原位，未来兼容重新进入另行裁决；
- rollback 后 stock Pi、其他 Engine、Host Browser 与六组 Built-in 不受影响。

## 9. 实施接缝：必须复用的当前 OmniMind owner

| 责任 | 当前真实接缝 | Web Access 允许做什么 |
| --- | --- | --- |
| product-bundled Extensions | `apps/server/src/provider/omnimindSessionExtensions.ts` 的显式有限 composition | 增加一个独立 inline Extension factory；不能让 PiAdapter拥有其业务逻辑 |
| Pi Session | `apps/server/src/provider/Layers/PiAdapter.ts` | 传入窄依赖、接收 events/provenance；不实现 Provider routing/config/active truth |
| temporary Web UI | `apps/server/src/engineWebSurface/engineWebSurfaceHost.ts` | 扩展/复用 exact Curator intent；不加新 route 或 arbitrary localhost interception |
| Browser presentation | 现有 AgentGateway Browser `browser_open` + Right Dock | 只呈现当前 Thread 页面；Browser 仍拥有 tab/pane lifecycle |
| Timeline classification | canonical `web_search` item type 与 tool result projection | 保持 tool name/provenance；不存 bearer URL |
| Settings shell | existing Settings IA/primitives/search/deep-link | 新增最接近的页面，复用 overview→add→detail；不建第二 settings framework |
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

- fresh 创建 default file；existing file 不 ambient rewrite；
- UI save → next tool call生效；file edit → refresh/next tool call生效；
- unknown fields round-trip；
- concurrent UI/file edit typed conflict且 draft 不丢；
- atomic write failure不先发布内存成功；
- full literal key 与 `$ENV`/`!command` 可回读、copy/edit；
- key 不进入 generic settings stream、Timeline、log 或 screenshot；
- `.pi` 零枚举、零读取、零写入。

### 10.4 Routing 与费用

- 多个已配置 Provider + `auto` 只依次尝试直到首个成功；
- named 严格失败；
- array 只并发指定集合；
- `all` 排除 explicit-only/paid excluded set；
- ordered routing只在 configured `fallbackOn`继续；
- Curator 切 Provider与文件/UI真实同步；
- single Provider failure 不触发全局 inactive。

### 10.5 Availability / active set

- keyless Exa 429 + 其他 auto candidates 成功：工具保持 active；
-完整 candidate exhaustion：下一 turn 只移除 `web_search/source_check`；
- `fetch_content/get_search_content` 保留；
- transient-only/network failure 保持 degraded active；
- Settings 保存/重新检查/new Session 可恢复；
- foreign/user tools 与用户显式 active choice 不被覆盖；
- inactive 后 system prompt/tool schema 真正不再携带两个工具。

### 10.6 Curator 与产品 UI

- 默认 `summary-review` 在 `ctx.hasUI === false` 的 OmniMind runtime仍能呈现；
- current Thread Right Dock 自动打开，不外跳、不抢 focus；
- Timeline 可重开；
- loopback token不落盘/日志；
- 简中/英文、keyboard、screen reader、390px/Right Dock窄宽、dark/light、reduced motion；
- 无 Google Fonts/jsDelivr/运行时 CDN；
- provider result、summary generation、edit/regenerate/raw send/approve/timeout/abort 全链。

### 10.7 `source_check`

- exact passage/hash/span/provenance 与 pagination；
- search/fetch error 保留；
- 英文与中文 claim 都能产生相关 passages；
- heuristic assessment 不被 Tool 文案宣称为事实裁决；
- Agent 能使用 passages 做独立判断；
- 搜索 inactive 时它一同 inactive，恢复后回归。

### 10.8 Real-provider 与 packaged product

- 使用最小真实资源覆盖至少一个 zero-config route、一个 keyed route、一个 route exhaustion；
- MiMo 与 DeepSeek 作为 OmniMind Agent model锚点验证模型能发现/调用/继续 `get_search_content`；
- exact pushed SHA 构建、安装、fresh task profile、隔离 `.omnimind` / `.pi`；
- launch → search → Curator → approve → continuation → close/reopen → cleanup；
- 只有这些完成后才能把 evidence maturity 提升到 `packaged-product-proven`。

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

### Adoption：默认 Curator 会不会烦？

会带来额外介入，但这是维护者明确接受的价值交换：默认把来源选择权交给用户；用户可在 Settings 永久改为自动摘要/直接返回，Agent也能 per-call选择。不能因为担心“可能烦”偷偷把默认改回 headless。

### Sustain：深 fork 会不会失控？

会，除非 patch inventory保持六类、上游 ancestry/tests完整、产品只支持一套 bundled runtime、Settings/file只有一个配置 owner。拒绝 stock Pi 双 profile正是控制长期矩阵的关键。

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
    "disposition": "fork-narrowly"
  },
  "runtime": {
    "owner": "pi-session-resource-loader-tool-registry-active-set",
    "agentGateway": false,
    "hostBuiltInGroup": false,
    "crossEngine": false,
    "tools": ["web_search", "source_check", "fetch_content", "get_search_content"],
    "commands": [],
    "tuiShortcuts": [],
    "curatorDefault": "summary-review",
    "curatorPresentation": "current-thread-right-dock-browser"
  },
  "config": {
    "authority": ".omnimind/agent/web-search.json",
    "uiFileBidirectional": true,
    "secondStore": false,
    "fullKeyReadback": true
  },
  "patchInventory": [
    "per-session-instance-state",
    "instance-config-and-single-reader",
    "omnimind-runtime-profile",
    "host-presentable-bilingual-curator",
    "provider-availability-to-pi-active-set",
    "source-check-honest-unicode-contract"
  ],
  "evidenceMaturity": "source-matched",
  "implemented": false,
  "unresolvedMaintainerChoice": "none"
}
```

开始施工前仍必须实时读取 `git status --short`、[`execution-brief.md`](../execution-brief.md) 与相关 architecture owner，确认当前 Host Tools / Settings 在途分支已经合并、隔离或明确让路。该并发事实只决定何时安全施工，不重新否决本文已经由维护者确认的产品 decision surface。
