# Public Surface

本文件是 OmniMind 公共表面的唯一架构 owner。它定义人类访问的公共 origin、产品内公共出口、激活门、
不可用行为、允许离开本地产品的数据和发行/更新权威边界；不定义网站页面设计、运行时 topology、产品状态
对象或 Campaign 状态。

## 1. 当前事实

V1 canonical public origin 是 `https://omnimind.wisdomeyes.cn`。截至 2026-08-18，Public site origin 与 Feedback
service 已经激活：canonical HTTPS origin、`/`、`/product`、`/research`、`/ecosystem`、`/learn`、`/docs`、`/team`、
`/changelog`、`/download`、`/privacy`、`/support` 和 `/api/health` 已通过外网真实 probe；Desktop 允许来源的 Feedback
CORS preflight、持久化、SMTP 通知与管理面隔离
也已完成真实 proof。网站源码和部署实现由 `[SolvingLab/OmniMind-Web](https://github.com/SolvingLab/OmniMind-Web)`
拥有。当前尚无 public Desktop artifact；因此 Desktop 的官网/反馈接线已有 source 与 release-workflow candidate，不能
冒充已随公开安装包交付。private upstream 只服务反向代理，始终不是用户入口，也不得成为产品 URL、文案、配置、
重定向或 fallback。

独立的 public distribution authority `[SolvingLab/OmniMind-Releases](https://github.com/SolvingLab/OmniMind-Releases)`
已建立，Desktop release workflow、website Changelog 与 Download 已接到该 authority；当前没有已发布 release、
artifact 或 update manifest，因此 Download 的信息页面可以访问，但 artifact actions 与 Update discovery 仍未激活。
产品不得把官网上线、构建时配置、空发行仓库或单项 proof 推断为另一项公共能力已激活。

下列 fixed-source destinations 只允许留在本 owner、来源证据和法定披露，不得进入 authored/built product
surfaces：

```public-surface-denylist
tryomnimind.com
trysynara.com
@trySynara
```

该 denylist 约束的是 authored/built 产品出口，不授权全仓字符串替换。URL 必须按责任处理：

- OmniMind 自有 Home、Docs、Changelog、Download、Privacy、Support 与 Feedback 只使用本文件的 canonical origin、固定 route 和各自激活门；
- adopted source、license、About/Licenses 与可追踪 provenance 保留真实 upstream URL，不能改写成 OmniMind 自有来源；
- Provider 官方文档、认证、usage 与技术详情保留该 Provider 的真实 destination，不经 OmniMind public origin 代理或冒充；
- release/update URL 只来自独立的 artifact、签名、channel/feed authority，不能由 public site origin、源码仓库链接或 donor destination 推导。

因此只有第一类人类公共出口经过 Public Surface resolver。实现与 focused falsifier 必须从本 owner 的唯一 denylist 读取规则，阻止被禁 destination 重新进入 production source/built surface；不得为此恢复 generic identity-governance 平台，也不得拦截合法 upstream provenance 或 Provider-native URL。

OmniMind 即使完全没有公共网络能力，也必须保持本地 Agent/Chat、已有 Conversation 和 Settings 可用。
公共表面失败只能关闭自身，不得阻塞 renderer、Composer、Run、Queue、Session、Package、credential 或用户文件。

## 2. 三条独立信任边界

1. **Public site origin** 只决定人类可浏览页面的根 origin。它不授权提交反馈、下载更新或读取产品状态。
2. **Feedback endpoint** 只接收用户显式提交的反馈和已披露的最小诊断。它不从 public origin 推导，也不拥有
   Conversation、Run、Queue、Session、Package private state、credential、workspace 或文件。
3. **Release/update authority** 只由 Desktop 发行身份、签名、channel/feed 配置和 artifact proof 建立。它不从
   website 或 feedback endpoint 推导，public download page 也不能替代 update manifest/signature authority。

三者可以独立激活、撤销和失败。不得建立把它们折叠为一个 generic endpoint registry 的公共本体。

## 3. Public Surface Registry

| Surface          | Canonical route                                      | Product entry                                                                      | Direction                                    | Data                                                                                                                    | Activation gate                                                                                                         | Unavailable behavior                                                                              | Authority/owner                                       |
| ---------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Home             | `/`                                                  | 无常驻 Desktop 入口；未来仅在 About 明确需要时接线                                 | browser → website                            | 无产品状态                                                                                                              | canonical origin 的部署、DNS/TLS、内容 owner 与真实 link probe                                                          | 不增加 Desktop 入口；网站不可用时不猜 URL                                                         | Public site origin                                    |
| Docs             | `/docs`                                              | Help 菜单的 Docs                                                                   | app → browser                                | 无                                                                                                                      | canonical origin 激活且 route 存在并通过 link probe                                                                     | 保持可发现但 disabled，解释尚不可用                                                               | Public site origin                                    |
| Changelog        | `/changelog`                                         | Help 菜单的 What’s new                                                             | app → browser                                | 无                                                                                                                      | canonical origin 激活且 route 有真实发布内容                                                                            | 保持可发现但 disabled，解释尚不可用                                                               | Public site origin + release content owner            |
| Download         | `/download`                                          | 官网独立发行信息面；Desktop 更新失败直接使用 distribution authority 的手动恢复链接 | browser → website；app → release authority   | platform、arch、目标版本可作为显式路径选择；不得包含 credential 或本机路径                                              | 已发布、可验证的精确 artifact，适用 license/notice，TLS 与下载校验                                                      | 官网不提供 artifact action；Desktop 保留本地使用、更新诊断与 authority-owned 恢复                 | Distribution authority                                |
| Privacy          | `/privacy`                                           | 网站常驻；Desktop 仅在 Feedback/About 的真实披露上下文接线                         | browser → website                            | 无                                                                                                                      | 对实际产品数据流有效的已发布政策与真实 link probe                                                                       | 不增加无上下文 Desktop 入口；未激活时不得声称已有在线政策页                                       | Public site origin + product privacy owner            |
| Support          | `/support`                                           | 网站常驻；Desktop 仅在安装、更新或反馈失败恢复上下文接线                           | browser → website                            | 默认无；用户主动发起的支持内容另行确认                                                                                  | 真实受理渠道、owner、隐私边界与 link probe                                                                              | 不增加无上下文 Desktop 入口；不得借用 donor 账号                                                  | Public site origin + support owner                    |
| Ecosystem        | `/ecosystem`                                         | 官网独立的能力发现与上游分发入口；无 Desktop 入口                                  | browser → website → upstream source/artifact | 浏览与筛选不读取产品状态；下载只携带浏览器对已列明上游 artifact 的显式请求                                              | curated allowlist、真实 publisher/source、精确 version/license/integrity、官方上游 artifact 与 link probe               | 缺少任一来源事实时不展示对应资源或禁用 action；不镜像、不重打包、不猜测替代地址                   | Public site catalog + upstream distribution authority |
| Feedback         | `POST /api/v1/feedback`                              | Help、Composer command 与全局 palette 的 Feedback dialog                           | app → separately configured endpoint         | 用户填写的 details；app/version、platform、language、viewport、Provider/Model、模式与非内容状态的 allowlist diagnostics | production build 中显式配置 approved canonical endpoint，且具备 CORS/timeout/cancel、隐私文案、滥用防护与真实收件 proof | endpoint 缺失、非法或不可达时保留 dialog 与 draft；Submit fail closed，不后台重试、不假报 success | Feedback endpoint                                     |
| Share/social     | 未分配；由具体 destination 决定                      | 未来的显式分享动作                                                                 | app → browser/service                        | 仅用户预览并确认的导出物；默认无自动上传                                                                                | 真实账号/目标、rights、隐私预览、撤销/失败语义与 delivery proof                                                         | 不显示假账号、假卡片或假 success；能力 lineage 保留                                               | Share destination authority                           |
| Update discovery | 不是 public-site route；使用独立 signed channel/feed | Desktop update check、download、install、retry 与手动恢复                          | app ↔ update feed                            | app identity、platform、arch、current version、channel；不含用户内容或 credential                                       | 签名与 artifact identity、channel/feed、manifest、install、失败重试和重新安装恢复 proof                                 | 不检查猜测 feed；应用继续本地运行并提供诊断和手动下载入口                                         | Release/update authority                              |
| Future deep link | reserved；scheme/path 尚未分配                       | 未来 public-to-app 跳转                                                            | browser/OS → app                             | 仅版本化 route 与不含秘密的 resource identifier                                                                         | 已注册 scheme/universal link、签名 app ownership、输入验证、未知 route 拒绝与恢复 proof                                 | 不注册、不解析、不接管 OS 链接                                                                    | Deep-link authority                                   |

Registry 描述产品责任和激活条件，不宣称任一条当前在线。具体网站内容、反馈后端与发行系统只有在各自
proof 成立后才能更新本节的当前事实；不能用产品内按钮或配置项自证激活。

## 4. Product behavior

公共链接通过一个 focused resolver 形成。未提供 production-approved public-site origin，或配置不是唯一
canonical HTTPS origin 时，Docs/Changelog 等动作没有 URL、没有 external open，也没有 fallback。不可用项
保持真实 label、disabled 语义和简短原因；不得变成点击后失败的假入口。

Feedback endpoint 必须在 production build 中显式、独立配置为 approved canonical HTTPS origin 下的 reserved
candidate path；它不能由 public-site 配置自动推导。无配置或非法配置时，UI 从首次渲染直接显示 unavailable，
Submit 保持 disabled 且不发请求；底层提交也在调用 `fetch` 前失败。未激活时文案只能说明未来显式提交才会
发送，不能声称 recipient 已存在；激活后才显示 recipient 和完整发送/不发送清单。失败不关闭 dialog、不清空
draft、不显示 success、不后台重试。一次显式提交最多产生一次 request，并受 timeout/cancel 约束。请求只能包含
Registry 列出的 user-authored details 与逐字段 allowlist diagnostics；summary 必须由已清洗字段重新生成，不能信任
调用方传入的 derivative。details 与最终序列化 body 都有独立硬长度上限，不能只依赖 textarea `maxLength`；
prompt、message、code、file content/path、workspace、credential、environment variable、terminal、log、screenshot
和隐式附件一律不得加入。

allowlist 不是 TypeScript 类型声明：发送前必须对每个 runtime 字段验证 object shape、nullable enum、bounded string、
finite non-negative integer、boolean、timestamp、viewport 与 control character，未知或畸形值 fail closed。请求不得携带
credential 或 referrer，不跟随 redirect；用户点击 `Cancel sending` 必须中止同一 in-flight request、保留 draft，并把取消
作为 delivery failure 呈现，不能伪报 success。

网络失败、4xx/5xx、timeout 与 invalid response 都是反馈 delivery failure。它们只能在恢复发生的位置呈现；
用户可以修改 draft 后再次显式提交。不得把请求进入浏览器队列、收到 2xx 之前或本地序列化完成误报为成功。

每个 Desktop release target 必须从其 staged production dependency closure 生成 machine-readable inventory、CycloneDX
SBOM 与 third-party notices，并在 artifact 形成后将 inventory 的 exact `name@version` 集合与实际 ASAR 双向比对；漏报和
phantom 记录都阻断发行。缺少随包 legal text 的依赖只有在 package ID、installed manifest digest、声明许可证、exact
source revision 与 vendored legal-text digest 同时匹配时才能使用补充文本，否则 fail closed。仓库 Web 中的副本只是明确
标注 platform/arch 的 development-host snapshot，不代表其他发行平台；正式 artifact 必须按自身 target 重新生成。

## 5. Source lineage and activation

固定 UI 母体中 exact 14 条 `apps/marketing/`\*\* path 是 public capability lineage；donor domain、账号、内容、
品牌资产、backend 和发布历史不属于 adoption。现存 Sidebar/Feedback/release 代码是 Product re-entry anchors，
继续保持它们原有的 adapted disposition，不混入这 14 条 fixed marketing path。

`scripts/check-source-closure.mjs` 是固定路径 disposition 的唯一机器 owner：这 14 条 path 必须被精确标为
`public-surface-lineage`，指向本 owner，并进入完整计数与排序 digest。不能以 `excluded-non-product` 或普通
`adapted-removed` 洗掉这条 lineage，也不能把现存 re-entry anchors 误重分类为 marketing lineage。

激活任何 capability 需要一次独立、可撤销的生产变更与对应 proof。Website 与 Feedback 当前已按各自 gate 激活；这
不激活 Download artifact actions、Update discovery、deep link 或任何 Developer API。真实 release artifact、签名、
manifest 与安装 proof 仍按 Registry 独立裁决。未激活表面继续 fail closed，不使用 private upstream，不提供虚假下载，
也不把 Changelog 页面替代 update authority。当前工作不注册 deep link，也不改变 Pi 或 Runtime topology。

## 6. 仓库与开发接线路由

这张表只路由实现责任；本文件仍是公共表面合同的唯一 owner，网站仓库不得复制或改写产品边界。

| 变更目标                                                      | 修改位置                                                                    | 既有接线                                                                           | 不得顺手做                                                                             |
| ------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 官网页面、双语内容、Ecosystem catalog、网站反馈接收与生产部署 | `SolvingLab/OmniMind-Web`                                                   | canonical routes、`POST /api/v1/feedback`、`GET /api/health`、release presentation | 读取 Desktop 本地状态、复用内部 RPC/MCP/IPC、镜像第三方 package、发布 updater manifest |
| Desktop 的官网/Docs/Changelog/Privacy/Support 出口            | 本仓库 `apps/web/src/publicSurface.ts` 与真实 UI consumer                   | `VITE_PUBLIC_SITE_ORIGIN` 只在 production release build 中注入 canonical origin    | 把 public site origin 当 feedback、remote Server 或 updater authority                  |
| Desktop Feedback dialog 与诊断 allowlist                      | 本仓库 `apps/web/src/feedback.ts` 及其 UI consumer                          | `VITE_FEEDBACK_ENDPOINT` 独立注入 exact canonical endpoint                         | 自动附带 prompt、文件、路径、日志、credential 或 private Provider state                |
| Release notes、artifact、签名、SBOM、notices 与 update feed   | 本仓库 `release-notes/`、`.github/workflows/release.yml` 与 Desktop updater | 发布到 `SolvingLab/OmniMind-Releases`；网站只读取 reviewed public release record   | 让网站生成 artifact、签名、feed 或替代 Desktop updater                                 |
| 网站到 App 的打开/分享                                        | 尚未分配                                                                    | Future deep-link gate                                                              | 从现有 Electron scheme、IPC channel 或内部 URL 猜公开协议                              |

开发任何相关能力前按以下真实链路定位，不从页面名称猜 owner：

```text
用户入口
→ route / command
→ production build configuration
→ publicSurface / feedback resolver
→ canonical website endpoint 或 release authority
→ unavailable / failure behavior
```

当前 production release workflow 已分别注入 canonical `VITE_PUBLIC_SITE_ORIGIN` 与 exact
`VITE_FEEDBACK_ENDPOINT`。普通开发构建没有 approved production 配置时，这些网络能力保持不可用；不得为了本地
方便增加 private upstream 或非 canonical fallback。

### 6.1 产品出口意图

官网拥有 OmniMind 的完整公共信息世界；Desktop 只在用户当前任务确实需要时提供最少出口。resolver 中存在 route
只表示该 destination 有统一校验与失败行为，不构成必须在 Desktop 增加入口的产品需求。

| 分类             | Surface                                                       | Desktop 意图                                                                                            |
| ---------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Desktop 必需     | Docs、What’s New、原生 Feedback、更新连续失败后的手动下载恢复 | 保持当前 Help/Feedback/updater journey；不扩成官网导航                                                  |
| 按真实上下文可选 | Privacy、Support、Home                                        | 只在 Feedback 数据披露、安装/更新/反馈失败恢复或未来 About 的明确需求中接线；没有当前 consumer 时不展示 |
| 官网专属         | Product、Research、Ecosystem、Learn、Team                     | 留在网站信息架构，不进入 Desktop 主导航；Ecosystem 也不成为 App package lifecycle 或 runtime authority  |

### 6.2 当前交付证据

| 能力                                      | 源码实现                                                          | 线上服务                                       | Public Desktop artifact 验收                                          |
| ----------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------- |
| Public website 与健康检查                 | 网站 route 与部署实现已存在                                       | canonical HTTPS 页面与 `/api/health` 在线      | 不适用                                                                |
| Desktop Docs / What’s New                 | Help 菜单经 `resolvePublicSiteLink` 打开 `/docs`、`/changelog`    | 两个 route 在线                                | 尚无 public Desktop artifact；首发复验 external-open journey          |
| Desktop Feedback                          | dialog、命令入口、diagnostic allowlist 与独立 endpoint 配置已存在 | receiver、CORS、持久化与通知已在线             | 尚无 public Desktop artifact；首发复验真实提交、失败保留 draft 与重开 |
| Manual Download recovery                  | updater 已有失败恢复入口；目标来自 release authority              | `/download` 只有诚实信息页，无 artifact action | 尚无已发布 artifact、manifest 或安装 proof；F-18 闭合后独立激活       |
| Website Changelog / Download presentation | 页面读取 public release authority，无记录时 fail closed           | 页面在线，当前没有 public release              | 首个 reviewed public release 后复验展示，但不替代 updater proof       |
| Website Ecosystem catalog                 | 双语检索、分类、来源详情与 reviewed manifest 已存在               | `/ecosystem` 在线，官方上游链接已真实 probe    | 不适用；不成为 Desktop package lifecycle、兼容或 runtime authority    |
| Public deep link / Developer API          | 只有 decision gate，没有公开合同                                  | 未部署                                         | 出现真实 consumer 后重新裁决                                          |
