# Architecture

HarnessOS is organized around ownership boundaries rather than screens or feature names.

## Product orchestration

Project, Thread, Space, Queue, Timeline, and recovery are product facts. They remain independent
from any Engine's native session identifiers or private state. Agent, Chat, and Studio consume the
same orchestration owner with different workspace lifecycles.

## Engines

An Engine is a complete agent runtime. `ENGINE_DESCRIPTORS` is the single owner of Engine identity,
display name, registration, capability projection, and Settings discovery. OA is the default
Engine.

Engine selection freezes the exact Engine, model, and options admitted to a queued turn. Changing
Engine is stop-first. A launch failure preserves the prompt and Queue and never silently selects a
different Engine.

Native Engine sessions are not product Threads. HarnessOS does not copy or fabricate native
continuation across Engines.

## HostGateway

HostGateway owns the catalog and authorization boundary for local system capabilities. File, Git,
terminal, browser, and device services remain the real capability owners; Engine adapters receive
only a typed projection.

HostGateway also owns exact-turn authority, permission checks, cancellation, timeout, idempotency,
and receipts. Engine adapters do not duplicate those responsibilities.

## OA

OA is the built-in default Engine and uses HarnessOS-owned state. Its runtime composition is
explicit and bounded: planning guard, todos, user questions, web access, and HostGateway tools.
Those resources are not ambiently injected into other Engines.

OA's model services remain internal to OA. The product UI receives a typed, credential-blind
projection and never becomes a second credential, package, or model-catalog owner.

## State boundaries

- Product state is owned by HarnessOS persistence.
- OA global and project-local state uses HarnessOS-owned paths.
- Other Engines retain their own private configuration and session state.
- System capabilities never write their authority state into an Engine's private directory.
- HarnessOS does not import or mutate retired product namespaces.

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
