# OmniMind interface surface inventory

Observed: 2026-08-10

Status: local source observation; not an architecture contract, API promise, release claim, or activation record

## 1. Purpose and authority

本文记录 OmniMind 仓库当前可以观察到的接口表面，供后续开发 Desktop、公共网站、反馈服务、下载发行、
MCP 集成或未来 Developer API 时快速判断：一项能力属于哪个信任域、是否允许公开、由谁拥有，以及什么变化
需要重新核对。

本文不拥有稳定产品设计。发生冲突时必须按以下 sole owner 裁决：

- 公共 origin、产品内公共出口、反馈边界、下载和更新 authority separation：
  [`../architecture/public-surface.md`](../architecture/public-surface.md)；
- 用户可见 UI、Agent/Chat、Workbench、Settings、扩展、双语与可访问性：
  [`../architecture/workbench.md`](../architecture/workbench.md)；
- Project、Thread、Space、Conversation、Queue、receipt、恢复与私有状态：
  [`../architecture/product.md`](../architecture/product.md)；
- Product Orchestration、Provider Registry、Session、进程、MCP 与执行拓扑：
  [`../architecture/execution.md`](../architecture/execution.md)；
- 当前发行和验收状态：[`../missions/independent-omnimind-v1.md`](../missions/independent-omnimind-v1.md)。

本文件只能保存 source observation、分类建议和复验触发器。稳定裁决被接受后必须修改对应 owner，而不是把
本文晋升成第二 API registry。

## 2. Executive conclusion

OmniMind 当前存在五类容易被统称为“接口”、但不能混用的表面：

1. 人类访问的公共网站；
2. 用户显式提交的反馈服务；
3. Desktop 下载、发行与自动更新；
4. OmniMind App 的本地 HTTP、WebSocket/RPC、IPC 与 MCP 控制面；
5. Provider-native protocol、Session、Tool、Skill、Plugin、Prompt、MCP 与 private state。

只有第一类天然属于公共网站。第二、三类各自需要独立激活与 proof。第四、五类主要是本地产品神经系统，
不能因为它们使用 HTTP、WebSocket、JSON-RPC 或 MCP 就推断为互联网 Public API。

设计或开发新接口前必须先回答：

- 消费者是人类、已安装 App、当前本机 Engine、受配对的本机集成，还是第三方互联网开发者？
- authority 来自 public site、feedback、distribution/update、Desktop Host、Product Orchestration 还是 Provider？
- 数据是否包含 credential、token、本机路径、workspace、Conversation、Session 或 Provider private state？
- 失败时是否只关闭自身，还是可能改变本地任务、文件、Package、Session 或更新状态？
- 这是当前已激活合同、仓库内部实现，还是未来候选？

回答不唯一时不得先发布 endpoint 或 SDK。

## 3. Exposure classes

| Class | 含义 | 默认处理 |
| --- | --- | --- |
| P0 Human public | 无需登录的人类网站页面 | 可公开；内容和链接仍需真实 activation proof |
| P1 Explicit public submission | 用户主动提交、边界明确的公共请求 | 逐项激活；强制 allowlist、限流、隐私披露与 delivery proof |
| P2 Distribution | 安装包、校验、release metadata 与更新发现 | 只由发行 identity、签名、channel/feed 和 artifact proof 激活 |
| L0 Local product transport | App renderer、Desktop、bundled Server 之间的本地 transport | 内部实现；不进入官网 API 文档 |
| L1 Paired local integration | 经 owner 配对的本机外部集成 | 可以有专门集成文档；不得宣传为互联网公共 API |
| N0 Provider-native | Engine 原生 SDK、wire、Session、Tool 与生态 | 保留 provenance；不由官网或 Host 重新拥有 |
| R0 Reserved | 路由或概念已预留但尚未激活 | 可以说明未来方向；不得提供假入口、假成功或兼容承诺 |

“公开介绍产品能力”不等于“公开底层接口”。网站可以介绍 Agent、Chat、MCP、Skills、Tools、Browser、
Terminal、Git 和多 Engine，但不应发布内部 RPC method、token、Session cursor、private path 或 bearer URL。

## 4. Human public site surfaces

### 4.1 Current canonical registry

当前 source 把公共网站 origin 固定为 `https://omnimind.wisdomeyes.cn`，并定义以下人类路由：

| Surface | Route | Exposure | Current observation |
| --- | --- | --- | --- |
| Home | `/` | P0 | route 固定；是否在线由 public-surface owner 与真实 probe 决定 |
| Docs | `/docs` | P0 | App Help 菜单已有 fail-closed 出口 |
| Changelog | `/changelog` | P0 | 需要真实 release content 才能激活 |
| Download | `/download` | P2 + P0 presentation | 只有精确、已发布、可验证 artifact 才能提供下载 |
| Privacy | `/privacy` | P0 | 必须对应实际数据流和有效政策 |
| Support | `/support` | P0 | 必须有真实受理 owner 与隐私边界 |

Source anchors:

- `apps/web/src/publicSurface.ts`：canonical origin、固定 route、production configuration gate；
- `apps/web/src/components/Sidebar.tsx`：Docs、Changelog 与 Feedback 的产品入口；
- `architecture/public-surface.md`：唯一稳定 registry 与 activation contract。

### 4.2 Website-only content routes

产品介绍、Research、Tutorials、Team 等页面目前不在 Desktop Public Surface Registry 中。网站可以规划这些内容，
但需要区分两种情况：

- 仅作为 website internal navigation：由网站 IA/content owner 管理；
- 需要 App Help/About/deep link 直接进入：必须先更新 `architecture/public-surface.md`，再增加 resolver 与真实
  link probe。

当前推荐但尚未成为稳定 contract 的内容路径：

| Candidate | Suggested route | Note |
| --- | --- | --- |
| Product | `/product` | 解释 Agent/Chat、Workbench、多 Engine 与本地优先 |
| Research | `/research` | 展示科研内容、场景与可验证成果，不暴露内部控制面 |
| Tutorials | `/docs/tutorials` | 优先作为 Docs 子树，避免平行文档 authority |
| Team | `/team` | 只使用真实成员、职责、作品与组织关系 |

这些路径是信息架构建议，不是当前激活声明。

### 4.3 Public-site configuration

Desktop renderer 只在 production build 中显式配置 `VITE_PUBLIC_SITE_ORIGIN`，且该值严格等于 canonical HTTPS
root origin 时，才解析人类公共链接。配置缺失、非 production、origin 不一致、带 path/query/fragment 或 credential
时，链接必须保持 disabled，不 fallback 到猜测地址。

这项配置只授权人类页面，不授权反馈、更新、App remote access 或任何产品状态 API。

## 5. Name collision: two different “public URL” concepts

仓库当前有两个名称接近但责任完全不同的配置，后续网站或部署工作最容易在这里犯错：

| Configuration | Owner/process | Meaning | Must not imply |
| --- | --- | --- | --- |
| `VITE_PUBLIC_SITE_ORIGIN` | Desktop renderer build | 人类官网公共 origin | Server remote access、feedback endpoint、update feed |
| `OMNIMIND_PUBLIC_URL` / `--public-url` | `apps/server` runtime | OmniMind Web/Server 经 TLS reverse proxy 暴露时的 HTTPS root origin | marketing website origin、canonical Docs/Download、feedback 或 updater authority |

`OMNIMIND_PUBLIC_URL` 在 `apps/server/src/config.ts` 与 `apps/server/src/main.ts` 中用于远程访问策略；非 loopback
bind 或 public URL 还要求独立 auth token，并拒绝不安全组合。它不是 `omnimind.wisdomeyes.cn` 官网的配置别名。

建议未来实现中保持语义可区分：讨论、文档和部署变量必须明确写成 **public site origin** 或
**server remote-access origin**，不能只说 “public URL”。若未来重命名环境变量，需按兼容义务另行裁决，本文不
授权机械改名。

## 6. Feedback surface

> **历史快照提示（2026-08-18 补记）**：本节记录的是 2026-08-10 source snapshot，下面“仅预留”的状态已经 superseded。当前 activation truth 只见 `architecture/public-surface.md`：截至 2026-08-13，Website 与 Feedback 已分别通过其 production gate，canonical endpoint、CORS、持久化、通知与管理面隔离已有真实证据。以下 payload 边界和复验触发器仍作为历史研究保留，但不得再读成当前 Feedback 未激活。

### 6.1 Current status

在该历史 snapshot 中，Feedback 是 R0/P1，而不是普通 website form 的既成 API，当时仅预留：

```text
POST /api/v1/feedback
```

Renderer 通过独立 `VITE_FEEDBACK_ENDPOINT` 配置解析 endpoint。它不能从 `VITE_PUBLIC_SITE_ORIGIN` 自动拼接。
只有 production build、approved canonical HTTPS origin 与精确 reserved path 同时成立时，底层才允许发请求。

### 6.2 Allowed payload boundary

当前 source 允许的方向是：

- 用户主动填写的 category/details；
- app version、platform、language、viewport；
- Provider/Model、产品模式和非内容状态的逐字段 allowlist diagnostics；
- 有界长度、shape validation、timeout、cancel、失败保留 draft。

明确不允许隐式发送：

- prompt、message、reasoning、code、file content；
- 本机完整路径、workspace、terminal、log、screenshot；
- credential、environment variable、Session cursor、native identifier；
- 隐式附件或调用方未经清洗的 derivative summary。

### 6.3 Activation requirements

正式启用反馈至少需要：

- 明确 backend owner 与收件证明；
- privacy 文案和实际数据流一致；
- CORS、body limit、timeout、cancel、rate limit/abuse protection；
- 服务端再次执行 schema validation 和最小存储/retention policy；
- 一次真实 delivery proof；
- 失败不清空 draft、不显示假 success、不后台静默重试。

公共网站自身的 Contact form 若未来出现，不能默认复用 Desktop Feedback payload。二者的用户、目的和数据边界
不同，是否共用 backend 需要显式设计。

## 7. Download, release and updater surfaces

### 7.1 Current target matrix observation

构建与 workflow 当前包含：

| Platform | Architecture | Primary artifact |
| --- | --- | --- |
| macOS | arm64 | DMG/ZIP and updater metadata |
| macOS | x64 | DMG/ZIP and updater metadata |
| Windows | x64 | NSIS EXE and updater metadata |
| Linux | x64 | AppImage and updater metadata |

Source anchors: root `package.json`、`.github/workflows/release.yml`、Desktop updater implementation 与 release scripts。

### 7.2 Three separate responsibilities

| Responsibility | Human website | Release pipeline | Desktop updater |
| --- | --- | --- | --- |
| 展示平台、版本、说明 | owns presentation | supplies verified metadata | may link to manual recovery |
| 生成 artifact | no | owns | no |
| 签名/公证 | no | owns | verifies applicable identity |
| update manifest/channel | must not own | generates/publishes | consumes |
| 自动下载/安装/重启 | no | no | owns |
| 校验值、SBOM、notices | displays verified output | generates and proves | may use artifact identity |

公共 `/download` 页面不能替代 signed feed、manifest、publisher identity 或 update artifact verification。反过来，
GitHub Release 或 updater feed 存在也不自动激活官网 Download 页面；页面仍需内容、TLS、链接与可用性 proof。

### 7.3 Truthful pre-release behavior

当前 Campaign 的 F-18 仍为 blocked，不存在可宣称为 production-ready 的 V1。网站可以先实现完整下载 IA，
但没有精确、已发布、可验证 artifact 时必须：

- 不渲染可点击的假下载 URL；
- 显示 Coming soon、Unavailable 或真实预发布状态；
- 不声称 signed、notarized、stable 或三平台 ready；
- 不从本地 candidate、Actions artifact、源码仓库或 public origin 猜下载地址。

## 8. Local HTTP surface

`apps/server` 当前将普通 HTTP、WebSocket/RPC、Agent Gateway MCP 和 External MCP route 合并到同一个运行时
HTTP server。共享 listener 不表示共享 authority。

### 8.1 Operational and local product routes

以下为 source 中可观察到的主要类别，不是 Public API 承诺：

| Surface | Example path/pattern | Exposure | Boundary |
| --- | --- | --- | --- |
| Readiness | `/health` | L0 | process/startup observation；不应携带用户内容 |
| Desktop shutdown | `/api/desktop/shutdown` | L0 | desktop + loopback + dedicated bearer；其他部署隐藏为 404 |
| Auth/session | `/api/auth/*` | L0 | bootstrap、cookie/bearer Session、WS token、pairing 与 client revocation |
| Project/site/editor icons | `/api/project-favicon` 等 | L0 | authenticated or bounded asset projection |
| Thread export | `/api/thread-export` | L0 | authenticated、用户显式导出与 export blocking rules |
| Local preview | `/api/local-image` | L0 | 只允许经解析的本地预览文件 |
| Attachments | `/api/attachments/upload`, `/api/attachments/cancel` | L0 | authenticated principal、size/admission、managed storage |
| Voice upload | `/api/voice/transcribe` | L0 | bounded upload 与当前本地产品 flow |
| Static/dev UI | catch-all renderer route | L0 | serves installed/web product UI；不是 marketing website |

这些 route 可能在 Web runtime 中经 HTTPS reverse proxy 使用，但仍属于安装产品/私有部署表面，不因此成为匿名
互联网 API。

### 8.2 Authentication and remote exposure

Observed rules include:

- Desktop default prefers loopback binding；
- non-loopback 或 configured server remote origin 需要 auth token；
- HTTPS public origin 必须是 credential-free root origin；
- 不安全 LAN 访问需要显式 opt-in；
- mutating auth management 检查 trusted origin；
- owner role 才能管理 pairing links、client sessions 和部分外部集成；
- credential、raw token 与 private paths 不应进入日志、网页或证据。

未来若要发布真正互联网服务端 API，不能直接把现有 local server 打开。需要重新定义 threat model、tenant、
identity、authorization、rate limit、data residency、audit、retention、billing、abuse 和 versioning；这是新产品边界，
不是部署参数调整。

## 9. WebSocket/RPC surface

Renderer 与 Server 之间存在 authenticated WebSocket/RPC transport，承载 Product Orchestration、provider、project、
terminal、Git、browser 和其他产品操作。当前 source 还包含 HTTP negotiation、feature socket、旧 bootstrap socket
兼容入口与 protocol compatibility checks。

Orchestration contract 中可观察到的操作包括：

- snapshot/shell/thread detail 获取；
- command dispatch；
- thread import、diff、event replay；
- provider delivery diagnostics/reconciliation；
- shell/thread subscribe/unsubscribe；
- canonical domain/shell/thread event channels。

Exposure: L0。

公开约束：

- 不在官网 Developer Docs 中逐项发布当前 RPC method；
- 不把 Product command receipt 表述成 Provider native settlement；
- 不暴露 WebSocket ticket、legacy token、Session key 或 compatibility query；
- 不承诺内部 method 名稳定；
- 不让网站直接读取 Project、Thread、Queue、Session、Package 或 workspace。

若未来出现真正 Developer API，应从稳定用户结果重新设计资源、权限和版本，而不是给内部 RPC 加公网入口。

## 10. Agent Gateway MCP

OmniMind Server 当前有一个内部 Agent Gateway，以 MCP/JSON-RPC 将 thread-scoped OmniMind 能力注入当前 Provider
Session。主要可观察入口：

```text
POST /mcp
POST /mcp/bootstrap
```

Exposure: L0 / N0 bridge。

关键边界：

- 每个 Provider Session 使用短时或 thread-scoped credential；
- HTTP-capable Engine 使用 bearer；stdio-only client 通过受控 proxy 交换一次性 bootstrap；
- bearer 应留在内存或受控进程环境，不进入普通子进程、日志、Timeline 或网站；
- Gateway 只服务当前 Agent/Thread/Tool provenance，不形成跨 Provider Package authority；
- MCP endpoint 使用 HTTP 不等于可发布到互联网。

官网可以介绍“OmniMind 支持 MCP”和真实用户能力，但不能公布内部 gateway 地址、token 获取方式或把它包装成
云 MCP 服务。

## 11. External MCP integration surface

当前另有面向本机外部集成的 External MCP：

```text
POST /mcp/external
GET  /api/mcp/external/integrations
POST /api/mcp/external/integrations
POST /api/mcp/external/integrations/revoke
POST /api/mcp/external/integrations/pairing
POST /api/mcp/external/runtime-challenge
POST /api/mcp/external/pair
```

Exposure: L1，不是 P1。

Source observation:

- 仅 loopback-only 且未配置 Server remote public origin 时可用；否则返回不可用；
- transport 使用独立 external credential；
- integration management 需要 owner Session；
- mutation 需要 trusted origin；
- pairing、revoke、body size、read timeout 和 per-integration concurrency 有独立约束。

这类接口未来可以有“本地集成指南”，但文档必须明确：

- client 与 OmniMind 在同一受控机器；
- 用户显式创建、配对、查看和撤销 integration；
- credential 不写进教程截图、命令历史或网站；
- 它不是 SaaS API，也不是匿名远程 MCP server；
- remote exposure 需要新的 architecture/security decision。

## 12. Desktop IPC surface

Electron main/preload/renderer 使用 data-only IPC contract。可观察类别包括：

- folder picker、save file、confirm、theme、app icon；
- external link、show in folder、clipboard；
- native window state；
- update check/download/install/state；
- notification、zoom、Server WS URL、voice transcription；
- AppSnap capture lifecycle；
- embedded Browser open/navigation/tabs/screenshot/annotation。

Exposure: L0。

这些 channel 是 installed Desktop capability，不是网页 JavaScript API。公共网站不能依赖 preload、Electron IPC 或
本地 WS URL。未来若官网需要“Open in OmniMind”，必须先完成独立 deep-link authority、scheme ownership、输入
验证和 unknown route rejection，不能从 IPC channel 名推导 deep link。

## 13. Provider-native surfaces

当前 Provider Registry 包含多个真实 Engine identity；每个 Provider 保留自身：

- process/SDK/wire/auth；
- native Session、resume cursor、transcript、compaction 和 branch；
- Model、Thinking、usage、rate limit；
- Tool schema、approval、structured input 与 command；
- Skill、Plugin、Prompt、MCP 与 package lifecycle；
- error、raw event 与 cancellation acknowledgement。

Exposure: N0。

官网可按真实、已验证能力介绍支持的 Engine 与生态，但必须遵守：

- 不把所有 Provider 宣传为能力齐平；
- 不把 OmniMind Agent 的 lifecycle 归给 stock Pi 或其他 Engine；
- 不将 Provider credential、home、Session 或 Package state同步到网站；
- 不从某个 Engine 的偶然行为推导统一 Public API；
- Provider 官方认证、usage 和技术文档保留真实 destination，不经 OmniMind 官网冒充。

## 14. Temporary Engine web surfaces and Browser

Engine native Tool/Extension 可以在当前 Session 产生短时 Web UI。Desktop Host 只在观察到 exact
Engine/Thread/Tool provenance 且 intent 仍有效时，把它呈现在当前 Thread 的 OmniMind Browser 中。

Exposure: N0 → L0 presentation。

禁止：

- 将短时 bearer URL 写入 Product facts、Timeline raw payload、日志、Campaign、官网或截图；
- 把任意 localhost/dev server 拦截为 OmniMind Tool；
- App 重启后恢复过期 URL；
- Host 失败时 silent fallback 到系统浏览器；
- 将临时 Web UI 当成可分享的公共 website route。

若未来需要分享结果，应设计显式导出/发布流程，用户预览并确认 payload，不能分享短时内部 URL。

## 15. Website capability language versus interface disclosure

| Website may say | Website must not imply |
| --- | --- |
| OmniMind 提供 Agent 与 Chat | 两者拥有独立数据库或可以无损复制 Provider Session |
| 支持多种 AI Engine | 所有 Engine 功能齐平、自动 fallback 或共享 credential |
| 集成 Files、Diff、Terminal、Git、Browser | 网站可以直接访问用户本机文件、Terminal 或 browser state |
| 支持 Skills、Plugins、Tools、MCP | 存在统一跨 Provider Package lifecycle 或公共 MCP cloud endpoint |
| 本地优先 | 绝对不联网、OS sandbox 或未经证明的安全保证 |
| 支持恢复与 continuation | unknown operation 会自动 replay，或跨 Provider 原生 continuation |
| 提供三平台下载 | 当前三个平台均已签名、验证并可发布，除非 F-18 和 artifact proof 已闭合 |

网站表达应使用用户结果和真实场景，不展示内部 route map、schema、token flow 或 process topology 作为营销卖点。

## 16. Future Developer API decision gate

当前仓库没有已激活的互联网 Developer API。未来提出 API 时，先为每个候选填写：

| Question | Required answer |
| --- | --- |
| User result | 外部开发者具体能完成什么？ |
| Consumer | website backend、installed App、local integration 还是 third-party cloud client？ |
| Resource owner | public service、Product Orchestration、Provider 还是 filesystem？ |
| Data boundary | 哪些字段允许出机、保存多久、如何删除？ |
| Identity | user、organization、device、integration 还是 Provider account？ |
| Authorization | scope、role、consent、revocation 和 least privilege 是什么？ |
| Protocol | HTTP/MCP/WebSocket/deep link 为什么是最小完整选择？ |
| Versioning | 哪些字段稳定，弃用和兼容窗口是什么？ |
| Failure | timeout、duplicate、unknown settlement、retry 和 idempotency 怎么表达？ |
| Abuse/cost | rate limit、quota、billing、payload bound 和高费用动作怎么限制？ |
| Audit/privacy | 用户能否查看、导出、撤销，服务端记录什么？ |
| Owner | 哪个唯一文件和模块拥有合同与 lifecycle？ |
| Proof | 哪个真实 consumer journey 能证伪接口已完成？ |

如果 consumer 只是当前 Desktop renderer 或 Provider Session，优先接线现有 typed contract；不要为“以后开放”再建
一套公共抽象。如果目标是互联网第三方，不能直接复用 local auth、owner pairing、internal RPC 或 Provider token。

## 17. Interface change checklist

### Public website route

- 更新 `architecture/public-surface.md` 中适用的 registry/activation 事实；
- 确认 route owner、内容 owner、双语、TLS 与 link probe；
- 未激活入口 fail closed；
- 不自动获得 feedback、download、update 或 deep-link authority。

### Feedback or contact

- 区分 Desktop feedback 与 website contact；
- 明确 allowlist、隐私、retention、abuse protection 和真实 recipient；
- client 与 server 双重 validation；
- 失败保留用户输入，不假报成功。

### Download/release

- 精确 artifact、platform/arch、version、digest、license/notices/SBOM；
- signing/notary/publisher 与 Campaign claim 状态真实；
- website presentation 与 updater feed 分离；
- 无 proof 不提供链接。

### Local HTTP/RPC/IPC

- 保持 authentication、origin、role、loopback 与 body limits；
- 不把 token、path、Session 或 raw payload放进日志和 UI；
- 新 consumer 是否真的需要公共合同；
- shipped Desktop behavior 改变时执行 packaged fresh-profile journey。

### MCP/integration

- 区分 internal Agent Gateway 与 paired External MCP；
- credential scope、TTL、revocation、concurrency、cancellation；
- local-only contract 不被反向代理意外公开；
- Provider provenance 与 private home 不被 Host 接管。

### Provider adapter

- capability data 真实，optional 不伪造；
- Session、cursor、state、Package lifecycle 不跨 Provider；
- unknown 不 replay、不 silent fallback；
- website claim 只覆盖真实验证结果。

## 18. Revalidation triggers

出现以下任一变化时重新核对本文受影响章节：

- `architecture/public-surface.md` 的 origin、route、activation gate 或 trust boundary 改变；
- `apps/web/src/publicSurface.ts`、feedback payload 或环境变量改变；
- Server bind/auth/remote-access policy 改变；
- 新增或删除 HTTP、WebSocket、MCP、IPC route；
- Agent Gateway 或 External MCP 从 loopback/thread-scoped 模式改变；
- Provider Registry、Session binding 或 package lifecycle 改变；
- deep link、share、cloud sync、team account 或 organization boundary 被激活；
- release target、signing、channel/feed、artifact host 或 download backend 改变；
- 网站开始提供登录、云任务、同步、在线 Workspace 或 Developer API；
- F-18 或其他 Campaign claim 从 blocked/candidate 进入 verified，或 source SHA 改变。

复验时只更新真实变化的观察，不把历史 route 或未激活候选改写成一直存在的稳定合同。

## 19. Source anchors

本次观察主要来自：

- `README.md`；
- `architecture/README.md`；
- `architecture/workbench.md`；
- `architecture/public-surface.md`；
- `architecture/product.md`；
- `architecture/execution.md`；
- `execution-brief.md`；
- `missions/independent-omnimind-v1.md`；
- `apps/web/src/publicSurface.ts`；
- `apps/web/src/feedback.ts`；
- `apps/web/src/components/Sidebar.tsx`；
- `apps/server/src/config.ts`；
- `apps/server/src/main.ts`；
- `apps/server/src/effectServer.ts`；
- `apps/server/src/http.ts`；
- `apps/server/src/wsRpc.ts`；
- `apps/server/src/agentGateway/httpRoute.ts`；
- `apps/server/src/externalMcp/httpRoute.ts`；
- `apps/desktop/src/ipcChannels.ts`；
- `apps/desktop/src/electronUpdaterSecurity.ts`；
- `apps/desktop/src/updateArtifactIdentity.ts`；
- `packages/contracts/src/orchestration.ts`；
- `packages/shared/src/binaryTransfer.ts`；
- root `package.json` and `.github/workflows/release.yml`。

本文未通过 live production probe 宣称官网、反馈 backend、download service 或 update service 已上线；当前线上状态仍由
对应 activation proof 决定。
