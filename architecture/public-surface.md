# Public Surface

本文件是 OmniMind 公共表面的唯一架构 owner。它定义人类访问的公共 origin、产品内公共出口、激活门、
不可用行为、允许离开本地产品的数据和发行/更新权威边界；不定义网站页面设计、运行时 topology、产品状态
对象或 Campaign 状态。

## 1. 当前事实

V1 canonical public origin 是 `https://omnimind.wisdomeyes.cn`。截至 2026-08-04，它只被保留，尚未激活。
仓库没有证据证明 website、Docs、Changelog、Privacy、Support、Feedback API、download service 或 update
service 已上线。产品不得把保留域名、构建时字符串、DNS 存在或某一发行配置推断为另一项公共能力已激活。

下列 fixed-source destinations 只允许留在本 owner、来源证据和法定披露，不得进入 authored/built product
surfaces：

```public-surface-denylist
tryomnimind.com
trysynara.com
@trySynara
```

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

| Surface          | Canonical route                                        | Product entry                                             | Direction                            | Data                                                                                                                    | Activation gate                                                                                                                                                  | Unavailable behavior                                                                  | Authority/owner                            |
| ---------------- | ------------------------------------------------------ | --------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------ |
| Home             | `/`                                                    | Help/About 中的产品主页入口                               | app → browser                        | 无产品状态                                                                                                              | canonical origin 的部署、DNS/TLS、内容 owner 与真实 link probe                                                                                                   | 隐藏或 disabled，明确 unavailable；不猜 URL                                           | Public site origin                         |
| Docs             | `/docs`                                                | Help 菜单的 Docs                                          | app → browser                        | 无                                                                                                                      | canonical origin 激活且 route 存在并通过 link probe                                                                                                              | 保持可发现但 disabled，解释尚不可用                                                   | Public site origin                         |
| Changelog        | `/changelog`                                           | Help 菜单的 What’s new                                    | app → browser                        | 无                                                                                                                      | canonical origin 激活且 route 有真实发布内容                                                                                                                     | 保持可发现但 disabled，解释尚不可用                                                   | Public site origin + release content owner |
| Download         | `/download`                                            | About/更新恢复中的手动下载入口                            | app → browser                        | platform、arch、目标版本可作为显式路径选择；不得包含 credential 或本机路径                                              | 已发布、可验证的精确 artifact，适用 license/notice，TLS 与下载校验                                                                                               | 不提供链接；保留本地使用与更新诊断                                                    | Distribution authority                     |
| Privacy          | `/privacy`                                             | Feedback/About 的 Privacy 入口                            | app → browser                        | 无                                                                                                                      | 对实际产品数据流有效的已发布政策与真实 link probe                                                                                                                | 未激活时不得声称已有在线政策页                                                        | Public site origin + product privacy owner |
| Support          | `/support`                                             | Help/About 的 Support 入口                                | app → browser                        | 默认无；用户主动发起的支持内容另行确认                                                                                  | 真实受理渠道、owner、隐私边界与 link probe                                                                                                                       | disabled 或隐藏；不得借用 donor 账号                                                  | Public site origin + support owner         |
| Feedback         | **Future reserved candidate:** `POST /api/v1/feedback` | Help、Composer command 与全局 palette 的 Feedback dialog  | app → separately configured endpoint | 用户填写的 details；app/version、platform、language、viewport、Provider/Model、模式与非内容状态的 allowlist diagnostics | production build 中显式配置 approved canonical origin + candidate route，且具备 CORS/timeout/cancel、隐私文案、滥用防护与一次真实收件 proof；当前不是 public API | 对话框可保留；Submit 从首次渲染即 disabled，不发请求；保留 draft 并准确报 unavailable | Feedback endpoint                          |
| Share/social     | 未分配；由具体 destination 决定                        | 未来的显式分享动作                                        | app → browser/service                | 仅用户预览并确认的导出物；默认无自动上传                                                                                | 真实账号/目标、rights、隐私预览、撤销/失败语义与 delivery proof                                                                                                  | 不显示假账号、假卡片或假 success；能力 lineage 保留                                   | Share destination authority                |
| Update discovery | 不是 public-site route；使用独立 signed channel/feed   | Desktop update check、download、install、retry 与手动恢复 | app ↔ update feed                    | app identity、platform、arch、current version、channel；不含用户内容或 credential                                       | 签名与 artifact identity、channel/feed、manifest、install、失败重试和重新安装恢复 proof                                                                          | 不检查猜测 feed；应用继续本地运行并提供诊断和手动下载入口                             | Release/update authority                   |
| Future deep link | reserved；scheme/path 尚未分配                         | 未来 public-to-app 跳转                                   | browser/OS → app                     | 仅版本化 route 与不含秘密的 resource identifier                                                                         | 已注册 scheme/universal link、签名 app ownership、输入验证、未知 route 拒绝与恢复 proof                                                                          | 不注册、不解析、不接管 OS 链接                                                        | Deep-link authority                        |

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

固定 UI 母体中 exact 14 条 `apps/marketing/**` path 是 public capability lineage；donor domain、账号、内容、
品牌资产、backend 和发布历史不属于 adoption。现存 Sidebar/Feedback/release 代码是 Product re-entry anchors，
继续保持它们原有的 adapted disposition，不混入这 14 条 fixed marketing path。

`scripts/check-source-closure.mjs` 是固定路径 disposition 的唯一机器 owner：这 14 条 path 必须被精确标为
`public-surface-lineage`，指向本 owner，并进入完整计数与排序 digest。不能以 `excluded-non-product` 或普通
`adapted-removed` 洗掉这条 lineage，也不能把现存 re-entry anchors 误重分类为 marketing lineage。

激活任何 capability 需要一次独立、可撤销的生产变更与对应 proof。当前 Work 只保全权威、lineage 与
fail-closed 产品行为；它不部署 website/backend，不改 DNS/TLS，不发布下载/更新，不注册 deep link，也不改变
Pi 或 Runtime topology。
