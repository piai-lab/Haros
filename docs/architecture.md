# Architecture

Haros is organized around ownership boundaries rather than screens or feature names.

## Product orchestration

Project, Thread, Space, Queue, Timeline, and recovery are product facts. They remain independent
from any Engine's native session identifiers or private state. Agent, Chat, and Studio consume the
same orchestration owner with different workspace lifecycles.

## Engines

An Engine is a complete agent runtime. `ENGINE_DESCRIPTORS` is the single owner of Engine identity,
display name, registration, capability projection, and Settings discovery. Codex is the default for a fresh setup. Runnable descriptors exclude the retired OA identity, which remains decodable for historical records.

Engine selection freezes the exact Engine, model, and options admitted to a queued turn. Changing
Engine is stop-first. A launch failure preserves the prompt and Queue and never silently selects a
different Engine.

Native Engine sessions are not product Threads. Haros does not copy or fabricate native
continuation across Engines.

## HostGateway

HostGateway owns the catalog and authorization boundary for local system capabilities. File, Git,
terminal, browser, and device services remain the real capability owners; Engine adapters receive
only a typed projection.

HostGateway also owns exact-turn authority, permission checks, cancellation, timeout, idempotency,
and receipts. Engine adapters do not duplicate those responsibilities.

## Retired OA Engine

The OA runtime, package management, and bundled web access are removed. Independent Pi retains its own SDK, resource discovery, and shared user-input bridge. No replacement Engine is silently selected for an existing OA task.

The first-run setup wizard is also removed. The workbench opens directly; existing OA records remain readable only. Independent Pi, external Engines, and the shared workbench keep their existing boundaries. AppSnap welcome is a separate optional overlay, not Engine setup.

首次设置向导和 OA 运行能力已移除。工作台直接启动；旧 OA 记录只保留读取能力，独立 Pi、外部引擎及共享工作台继续使用原有边界。AppSnap 欢迎介绍不是引擎设置。

## Model services

Haros owns the model-service settings, credential-blind RPC projections, authentication workflows, and configuration mutations. They use the same pinned SDK as the independent Pi Engine and its configured agent directory. Each operation freezes that directory, including pending authentication. Model changes invalidate Pi snapshots before the next turn; destructive removal shares EngineService admission fences. Other Engines keep their native configuration. This does not register OA, restore its package, or read or migrate its retired state.

Haros 保留模型服务设置、凭据保护、认证和配置读写能力，使用独立 Pi 引擎的 SDK 及其配置目录。每项操作绑定发起时的目录；模型变更在 Pi 下一回合前刷新，删除操作与引擎启动共享并发保护。其他引擎继续使用原生配置。不会恢复 OA 引擎或自动读取、迁移它的旧状态。

## State boundaries

- Product state is owned by Haros persistence.
- Existing OA state is retained without runtime activation or automatic cleanup.
- Other Engines retain their own private configuration and session state.
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

## Change-radius rule

Adding an Engine may change its descriptor, adapter, necessary assets or copy, and focused tests.
It must not require a new Engine list in ChatView, Sidebar, Settings, or persistence. If a change
requires those edits, the canonical owner is incomplete.
