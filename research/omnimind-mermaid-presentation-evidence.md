# Mermaid presentation evidence

本文件绑定 `mermaid@11.17.2`、2026-08-25 至 2026-08-26 的 npm/upstream/advisory 观察、OmniMind `d8e90f7133b7564046a15bdf7bc1c33ad20e6b45` 实现基线，以及本轮完成时记录的精确测试环境。它只拥有来源、安全反证、donor disposition 与可复验证据，不拥有当前产品设计、施工状态或准入；接受后的稳定合同位于 [`architecture/workbench.md`](../architecture/workbench.md)。

## 精确依赖与权利

- package：`mermaid@11.17.2`
- npm integrity：`sha512-V6K3C8EBdEsPFZXSKMJe6ppQOENxuHARr9GvHX4hh47lAbhMRD9qf4oEK7LoaRQxULMa80/qt5gHO73aCleBBg==`
- license：MIT；npm package 包含上游 license
- 观察到的 `v11.17.2` tag commit：`dcb694ddb58dc5ad3502e7e903cac05fd812eac3`
- 版本理由：`11.17.2` 修复 `11.17.1` 的 edge class 回归，同时保留官方完整 lazy diagram closure、mindmap 与 KaTeX 路径

`@mermaid-js/tiny` 被否决：其 package 自述不建议作为直接 npm 集成，且有意缺少 lazy loading、mindmap 与完整 KaTeX 支持。没有复制 donor 源码，因此 `source-adoptions.json` 不增加 adoption；发行 inventory、notices 与 SBOM 继续从 lockfile 派生，避免第二份依赖清单。

Bun 1.3.12 的 fresh resolution 把 Web direct range `katex@^0.16.45` 与 Mermaid 的 `^0.16.47` 收敛到 root `katex@0.16.47`，同时为 `rehype-katex` 与 `micromark-extension-math` 保留 nested `katex@0.16.45`。这构成公式、表格、footnote 与 production build 必须复验的反证，不能以 resolver 会自动去重或只存在单一 KaTeX 闭包为前提。

## 安全反证与 disposition

设计阶段复核的官方历史 advisory 包括：

- `GHSA-6x64-9x62-f2gx`：CSS sibling escape；
- `GHSA-87f9-hvmw-gh4p`：configuration CSS injection；
- `GHSA-3rrr-jr9j-h3q3`、`GHSA-c4c3-pg64-4m4v`：prototype-pollution 路径；
- `GHSA-rhh3-jpg6-66xh`、`GHSA-2v8p-3f2j-5mp7`：diagram denial-of-service 路径；
- 历史 class/state XSS 修复。

这些事实否定了“`securityLevel` 或 DOM sanitizer 等于 Host boundary”。`11.17.2` 的官方 `securityLevel: "sandbox"` 返回值本身是带 `allow-top-navigation-by-user-activation allow-popups` 的 iframe。OmniMind 只把它作为需严格核验的上游 serialization：验证单 iframe、精确 attributes、data HTML、数值高度与 body 形态后解码，再重建 Host document。最终 document 使用 `default-src 'none'`，禁用 connect/frame/font/media/object/form/base，仅允许 inline style 与 data image；最终 iframe 使用 `sandbox=""`、`referrerPolicy="no-referrer"`、无 `allow-*`、无 bridge 且 pointer events disabled。返回的 SVG/HTML 不进入 Host DOM，`bindFunctions` 不执行，未知输出形态直接保留源码。

输入只允许 flowchart/graph、sequence、class、state、ER 与 mindmap；拒绝 init/config directive、frontmatter config、click/link/href behavior、network/data/file/javascript URI scheme、资源型 HTML 以及除 `<br>` 外的 HTML tag。自动路径在 import 前限制 20,000 UTF-16 source units、240 个非空行、240 个 connector token、每消息 8 图；输出限制 1 MiB 与 4096px，高于 720px 的结果不进入 transcript inline presentation。

## Donor disposition

| Source            | Disposition                 | 固定理由                                                                                                                              |
| ----------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Proma             | mechanism-only              | current-turn invalidation、rAF stream batching 与稳定历史 ref 可借鉴；same-DOM、无标签猜测、全局主题观察与 fallback renderer 被否决。 |
| AionUi            | reference-only              | static import、same-DOM SVG 与平行 modal 不兼容 lazy loading、隔离和既有 Dialog owner。                                               |
| Hermes            | mechanism-only              | explicit fence、lazy settled render 与局部失败可借鉴；same-DOM output 被否决。                                                        |
| cc-haha           | reference-only              | 错误与交互覆盖可参考；static import、same-DOM 与硬编码英文被否决。                                                                    |
| BitFun            | rejected                    | loose security 与无界/global cache 与威胁和生命周期模型冲突。                                                                         |
| Pi `grok-mermaid` | reference-only              | explicit fence、stream/final 与 over-limit fallback 语义可参考；TUI Unicode renderer 不是 Web donor。                                 |
| HTML prototype    | visual/state reference only | 静态 SVG 与 demo controls 不证明 Mermaid、安全、性能或 packaged integration。                                                         |

没有 donor implementation 被 ship 或 fork；唯一进入 production closure 的外部 executable source 是上述普通 npm dependency。

## 固定复验证据

在 macOS arm64、Chromium、Bun 1.3.12 与仓库声明 Node toolchain 上观察到：

- 纯策略测试覆盖 type allowlist、危险输入、line/connector budgets、SHA-256 identity 与 count/byte LRU eviction；
- 真实 Chromium 通过精确官方包渲染六类允许图，并核验重建后的 CSP document；
- hostile returned script/navigation/remote-image markup 放入最终 opaque sandbox 后，不能改写 parent、导航 parent 或发出外部请求；
- light/dark concurrent render 保持各自配置，证明 initialize+render transaction 没有主题串扰；pre-aborted work 不加载或渲染；
- ChatMarkdown browser journey 观察到 streaming 与 unsafe input 不加载 Mermaid resource；settled source ready 后切换、源码可恢复、Dialog 使用相同 `srcDoc`、Esc 返回 trigger focus；
- Timeline SSR 只在 canonical Assistant body 产生 opt-in，User 与其他 Markdown consumer 保持原路径。

2026-08-26 的 production-mode transcript harness 固定观察如下：

- 120-message、80-edge、10 个 fresh Chromium context 中，每图只进入一次 render transaction；settled-to-ready p95 为 `496.9ms`，最长 Mermaid render measure 为 `197.0ms`，从真实 queued mark 起观察到的最长 Long Task 为 `154ms`；
- 300-edge compressed fixture 在 policy connector guard 被拒绝，源码仍可读，queued/import/render/Mermaid resource/diagram frame 均为 `0`；
- 20 个不同 source+theme cache key 的 80-edge 图经停读式往返遍历后恰好 render 20 次，第二轮不增加 render；强制 GC 后 heap 从 `22,689,927B` 增至首轮 `29,109,453B`、第二轮 `30,420,435B`，第二轮增量 `1,310,982B`，没有按图数重复首轮增长；count/byte LRU 硬边界另由纯逻辑测试直接证伪；
- 无 Mermaid 的初始 route、streaming Mermaid 与 300-edge 拒绝路径均观察到 `0` Mermaid resource 和 `0` import mark；production HTML 只 module-preload pipeline/runtime/workload，Mermaid core 与各 diagram implementation 保持独立 lazy chunks；
- 五组相同字节的 plain-fence / Mermaid-fence streaming 对照中，两者 Mermaid import、resource 与 Long Task 均为 `0`；Mermaid fence 的 React commit count 中位增量约 `0.7%`，commit time 中位数没有回退，frame p95 中位数没有回退。
- release legal owner 纳入 shipped Web manifest 后，development-host inventory/notices/SBOM 从 242 个运行时组件扩展为 541 个 Web/Server/Desktop 生产组件；`licenses:generate` 与 `licenses:check` 确定性闭合，并精确包含 `mermaid@11.17.2`、root/nested KaTeX 及 Mermaid 生产依赖；
- 仓库未为 `bun pm scan` 配置 scanner，该命令不能提供安全结论；同一 lockfile 的 `bun audit --audit-level=high` 报告 1 critical 与 23 high 的既有跨仓 advisory，路径中没有 Mermaid closure。该观察只证明未新增被 audit 命中的 Mermaid advisory，不把项目级 audit 非绿色改写成通过。

以上数值只绑定该日期的 production bundle、fixture 和机器环境，不形成跨机器 SLA；重开条件中的 dependency、browser、theme、budget 或 transcript lifecycle 变化后需重测。

## 重开条件

Mermaid 版本或官方 sandbox serialization 变化、相关 advisory、新增/删除 diagram allowlist、请求 HTML labels/link/interactivity、预算变化、renderer 需要 worker/Server/bridge、主线程 stop-loss 被击穿，或第二个真实 diagram implementation 出现时重读本文件。第二个 renderer 只是重新裁决共同责任的证据，不自动授权预建平台。
