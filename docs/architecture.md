# Architecture

Haros is organized around ownership boundaries rather than screens or feature names.

## Product orchestration

Project, Thread, Space, Queue, Timeline, and recovery are product facts. They remain independent
from any Engine's native session identifiers or private state. Agent, Chat, and Studio consume the
same orchestration owner with different workspace lifecycles.

## Engines

An Engine is a complete agent runtime. `ENGINE_DESCRIPTORS` is the single owner of Engine identity,
display name, registration, capability projection, and Settings discovery. Pi is the default for a
fresh setup. A welcome tour can introduce Engines, appearance,
and the first project, but it does not freeze a model. The user still chooses one in Settings or
Composer before sending.

Engine selection freezes the exact Engine, model, and options admitted to a queued turn. Changing
Engine is stop-first. A launch failure preserves the prompt and Queue and never silently selects a
different Engine.

Native Engine sessions are not product Threads. Haros does not copy or fabricate native
continuation across Engines. Bundled OA web access is removed; public search belongs to the
selected Engine or an explicit connector, not a Haros-owned web-access package.

ACP fresh-session setup drains its already received notifications before returning. The first prompt
therefore closes the startup message segment only after its early content has been applied; prompt
completion uses the same drain boundary. **简体中文。** ACP 新会话建立后先处理完已收到的通知，
再交还控制权，防止早期消息与首轮输出因异步处理顺序而合并或丢失结束事件。

Managed Engine installation follows the descriptor's distribution kind. Native packages use
verified platform archives; DeepSeek uses a verified npm package and an isolated local dependency
prefix, with lifecycle scripts disabled. It requires Node.js and npm on the host PATH. Neither path
uses a global package install. Failed attempts remove only their own staging directory; previous
versions remain intact because existing sessions may still use them. A broken cached executable is
reinstalled on retry. EngineHealth owns activation, health verification, restoration and the terminal
operation state; an executable selection edited during the download is preserved.

**简体中文。** 托管安装按 Engine 描述选择分发方式：原生包校验平台归档，DeepSeek 校验 npm 包后
在独立目录安装依赖，禁用生命周期脚本，需要本机 PATH 中的 Node.js 和 npm。安装不写入全局包目录。
失败或取消只清理本次暂存文件；旧版本可能仍由会话使用，因此保留。缓存中的可执行文件损坏时，重试会重新
安装。EngineHealth 统一负责启用、健康验证、恢复和最终操作状态，并保留下载期间用户修改的可执行文件选择。

## HostGateway

HostGateway owns the catalog and authorization boundary for local system capabilities. File, Git,
terminal, browser, and device services remain the real capability owners; Engine adapters receive
only a typed projection.

HostGateway also owns exact-turn authority, permission checks, cancellation, timeout, idempotency,
and receipts. Engine adapters do not duplicate those responsibilities.

## State boundaries

- Product state is owned by Haros persistence.
- Engines retain their own private configuration and session state.
- System capabilities never write their authority state into an Engine's private directory.
- Haros does not import or mutate retired product namespaces.

## Processes

```text
Desktop shell
  ├─ Web workbench
  └─ Server
       ├─ Product orchestration
       ├─ Engine adapters
       ├─ HostGateway
       └─ Persistence
```

The Web workbench consumes typed projections. It does not read secrets, parse private Engine
configuration, own native processes, or maintain a parallel product store.

## Desktop browser lifecycle

`BrowserVault` owns login protection and pending save decisions. Status subscriptions are lightweight;
account metadata is read only while the management panel needs it. A save prompt belongs to one
Thread, tab, and page generation. Navigation and tab closure invalidate that authority. Capture
recovery disposes the old installation before replacing it; retired callbacks cannot change status.

`BrowserCookieImport` owns one operation across preflight, shared-session exclusion, transfer,
persistence, and cleanup. Its 60-second deadline starts at entry. Invalid preflight cannot interrupt
agents. Cancellation revokes the transport and drains persistence before releasing exclusion; it does
not pretend to undo cookies already written. A cleanup failure keeps the session blocked and prevents
a clean-shutdown checkpoint. Quit closes IPC admission, drains imports and automation, stops capture,
persists the session only when cleanup succeeded, then releases keys and browser resources.

The workbench becomes interactive when existing transport and settings readiness settle. Engine
configuration is independent. The splash never imposes a minimum dwell; its exit is at most 160 ms,
or immediate with reduced motion. Source launches use the installed Electron bundle unchanged;
editing a signed macOS bundle's metadata can prevent helper processes from launching.

**简体中文。** 登录状态、按需账号列表与保存决定归 `BrowserVault`；提示绑定真实线程、标签页和页面代次。
导航与关页使旧授权失效。捕获重试先释放旧安装，过期回调不能覆盖新状态。Cookie 导入由
`BrowserCookieImport` 贯穿校验、共享会话互斥、写入、持久化和清理；总期限从请求开始计时，
取消不承诺回滚已经写入的 Cookie。未安全释放的操作继续阻止写入，退出失败不记录为干净退出。
工作台沿用现有 readiness，就绪立即可操作；未配置 Engine 不阻塞整个界面。

## Local responsiveness evidence

On 2026-09-19, an unsigned production build on macOS / Apple M4 Pro / 64 GiB / Electron 43.4.1
was exercised in an isolated home with 3,000 stored drafts, 1,000 messages, and synthetic 20 Hz
stream updates through the real backend subscription. Each of three rounds measured 60 input,
20 menu, 20 local-thread switch, and 40 scroll interactions using event time to the second animation
frame after visible feedback. Thread-switch measurements cover usable local feedback, not complete
transcript rendering or remote Engine execution.

| Round | Input p95 | Menu p95 | Thread switch p95 | Scroll p95 | Long tasks / maximum |
| ----- | --------- | -------- | ----------------- | ---------- | -------------------- |
| 1     | 33.5 ms   | 63.2 ms  | 188.5 ms          | 81.7 ms    | 10 / 93 ms           |
| 2     | 32.6 ms   | 71.5 ms  | 184.2 ms          | 76.2 ms    | 10 / 90 ms           |
| 3     | 32.2 ms   | 63.3 ms  | 186.4 ms          | 89.0 ms    | 10 / 91 ms           |

All three rounds met the local input/menu/switch targets of 50/100/200 ms. Long tasks remain;
these measurements do not establish zero jank. Other desktop workloads were present, and Windows,
Linux, lower-end hardware, real provider latency, and signed distribution artifacts were not measured.

**简体中文。** 同一台 M4 Pro / 64 GiB 上，以隔离的生产构建、3,000 份草稿、1,000 条消息和
20 Hz 合成流式更新连续测量三轮。输入、菜单、本地线程切换的 p95 均满足 50/100/200 ms 目标。
线程切换测量的是可操作反馈，不代表全文完成绘制；仍观察到 90–93 ms 长任务。本机存在其他工作负载，
结果不能外推到 Windows、Linux、低配置设备、真实模型服务或签名发行包。

## Change-radius rule

Adding an Engine may change its descriptor, adapter, necessary assets or copy, and focused tests.
It must not require a new Engine list in ChatView, Sidebar, Settings, or persistence. If a change
requires those edits, the canonical owner is incomplete.
