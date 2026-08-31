# Haros Guidebook Plan

| Contract       | Decision                                                                    |
| -------------- | --------------------------------------------------------------------------- |
| Status         | Execution-ready editorial contract; production has not started              |
| Language       | English-only Guidebook publication, by explicit maintainer decision         |
| Primary reader | A junior software developer encountering Haros for the first time           |
| Collection     | **Haros Guidebook**                                                         |
| Working title  | **Haros Guidebook: A Visual Guide from First Task to Runtime Architecture** |

## 1. Executive decision

Haros needs a guidebook, not an expanded README.

The repository already contains a broad product and runtime system: three work surfaces, durable
Product Orchestration, ten Engine identities, model discovery, permissions, queues, recovery,
files, Git, terminals, browsers, devices, automations, Studio outputs, typed contracts, persistence,
streaming projections, diagnostics, packaging, and source-adoption boundaries. The current stable
English documentation is intentionally small: the README introduces the product and
`docs/architecture.md` names its most important owners. That is a sound foundation, but it cannot
teach a newcomer how the whole system fits together.

The proposed documentation system is a 50-chapter, Markdown-first guidebook with three synchronized
reading layers:

1. **Use it** — what a person sees and does in Haros.
2. **Understand it** — the mental model and failure semantics behind the behavior.
3. **Trace it** — the authoritative contracts, owners, and source anchors for contributors.

The guidebook should be readable in order, searchable by topic, and maintainable without becoming a
second implementation truth.

The English-only decision applies to the Guidebook publication itself. It does not authorize
English-only changes to Haros product UI or ordinary product copy. If Guidebook production exposes a
need to change the product, that change leaves this documentation scope and remains subject to the
repository's English-and-Simplified-Chinese product-copy rule.

### 1.1 Why “Guidebook”

“Guidebook” is deliberately practical and approachable. It promises a guided journey through real
work: identify what the reader is seeing, choose the next action, understand the mechanism, and find
the authoritative source when needed. “Manual” would make the collection sound narrowly procedural,
while “encyclopedia” would overclaim completeness. The name also scales cleanly across a website,
HTML edition, PDF, and EPUB.

## 2. Central thesis

> Haros is a local-first AI workbench that keeps durable product work separate from replaceable
> Agent Engines, then reconnects them through typed orchestration and an authorized host-capability
> boundary.

Every chapter must support this thesis. Engine breadth is important, but it is not the organizing
idea. The organizing idea is continuity: projects, tasks, queued work, timelines, permissions, and
recovery remain coherent even when execution runtimes differ or fail.

## 3. What the repository review established

### 3.1 Confirmed product facts

| Fact                                                                    | Meaning for the guidebook                                                             | Primary evidence                                     |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Haros is a local-first desktop AI workbench.                            | Start from work continuity, not from a model picker.                                  | `README.md`                                          |
| Agent, Chat, and Studio are three product surfaces.                     | Teach their different workspace lifecycles before internal architecture.              | `README.md`, `packages/shared/src/productSurface.ts` |
| The three surfaces share Product Orchestration.                         | Reuse one vocabulary for Project, Thread, Turn, Queue, Timeline, and recovery.        | `docs/architecture.md`, orchestration contracts      |
| An Engine is a complete agent runtime.                                  | Never use “Engine,” “Provider,” and “model” as synonyms.                              | `docs/architecture.md`, Engine contracts             |
| `ENGINE_DESCRIPTORS` owns Engine identity and discovery presentation.   | Engine tables and contributor guidance must derive from the canonical owner.          | `packages/shared/src/engineMetadata.ts`              |
| Product Threads are not native Engine Sessions.                         | This distinction needs a dedicated chapter and several recurring examples.            | `docs/architecture.md`, orchestration contracts      |
| HostGateway owns product-authorized local capabilities.                 | Tool chapters must explain authority, exact-turn binding, receipts, and cancellation. | HostGateway services and contracts                   |
| Product state is persisted independently of Engine-private state.       | Local-first and recovery claims must name their exact boundaries.                     | `docs/architecture.md`, persistence layers           |
| Commands, events, projections, and receipts form the durable work path. | Architecture chapters should follow one turn through the whole lifecycle.             | orchestration and persistence layers                 |
| Haros is currently source alpha.                                        | The guidebook must distinguish current behavior from release claims.                  | `README.md`, `SUPPORT.md`                            |

### 3.2 Confirmed implementation breadth

The source tree contains major owners for:

- Engine adapters, discovery, health, maintenance, native event projection, and runtime
  reconciliation;
- Product Orchestration commands, events, reactors, projections, checkpoints, imports, forks,
  handoffs, queued turns, and recovery;
- HostGateway task, diagnostic, goal, automation, browser, and device tool groups;
- SQLite persistence, projection tables, command receipts, event delivery, backups, and migrations;
- Web workbench surfaces for Composer, Timeline, diffs, terminals, browser, devices, pull requests,
  settings, automations, Studio, and onboarding;
- Desktop startup, window lifecycle, update handling, migration recovery, browser hosting, and
  packaged proof;
- typed contracts and shared projections that prevent UI and adapters from becoming parallel
  owners.

The repository also contains hundreds of focused unit, integration, and browser-test files. The
guidebook should use tests as evidence of behavior, not as a substitute for product explanation.

### 3.3 Current documentation gaps

| Gap                                        | Reader cost                                                                                   | Proposed response                                                                                        |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| No progressive learning path               | A newcomer sees nouns before relationships.                                                   | Use one running journey across seven parts.                                                              |
| No complete product vocabulary             | Terms such as Thread, Turn, Session, Engine, model, Queue, and Timeline are easy to conflate. | Add an early mental-model chapter and a maintained glossary.                                             |
| No end-to-end turn trace                   | Reliability mechanisms appear as unrelated implementation details.                            | Trace one submitted prompt from Composer to settlement and recovery.                                     |
| No feature-to-owner map                    | Contributors can copy facts into the wrong layer.                                             | Give every technical chapter explicit source anchors and owner notes.                                    |
| No failure-first documentation             | Happy-path descriptions understate Haros's core value.                                        | Include failure, cancellation, restart, and recovery in every relevant chapter.                          |
| No visual explanation system               | Dense relationships remain abstract.                                                          | Use generated explanatory figures as the default teaching medium, backed by tables and real UI evidence. |
| No maintenance contract for long-form docs | A large guidebook could become stale quickly.                                                 | Separate stable concepts from alpha behavior and validate source anchors per edition.                    |

## 4. Reader contract

### 4.1 Primary reader

The default reader is a junior developer who knows basic files, Git, terminals, and web
applications but does not yet understand agent runtimes, event-backed systems, process boundaries,
or durable recovery.

The guidebook must not require prior knowledge of Effect, Electron, WebSocket protocols, MCP, event
sourcing, or any supported Engine's internal protocol.

### 4.2 Secondary readers

| Reader                 | What they should get without reading everything                              |
| ---------------------- | ---------------------------------------------------------------------------- |
| Haros user             | Parts I–IV: a confident mental model and complete workflows.                 |
| New contributor        | Parts I–VI: product behavior, owners, failure semantics, and source anchors. |
| Engine integrator      | Chapters 10–13, 35–43, 48, and the contract appendices.                      |
| Maintainer or reviewer | Parts V–VII: truth ownership, proof boundaries, legal and release limits.    |

### 4.3 Observable completion outcomes

After finishing the core path, a junior reader should be able to:

1. explain Haros in one minute without calling it “just another chat client”;
2. choose correctly among Agent, Chat, and Studio;
3. distinguish Project, Thread, Turn, Timeline, Queue, Engine, model, and native Session;
4. complete a task using attachments, permissions, tools, diffs, and recovery;
5. explain what survives an Engine failure, server restart, or normal desktop quit;
6. locate the owner of a behavior before proposing a code change;
7. describe why HostGateway exists and what an Engine adapter must not own;
8. run the repository's focused verification path without making release claims.

### 4.4 Reading routes

The root Guidebook README presents these routes without creating separate editions:

| Route                     | Chapters                           | Reader outcome                                       |
| ------------------------- | ---------------------------------- | ---------------------------------------------------- |
| Orientation               | 1–6                                | Explain what Haros is and use its core vocabulary    |
| First complete work cycle | 1–15, then 25–28                   | Set up, execute, inspect, and recover a real task    |
| Work organization         | 1–15, then 16–24 and 34            | Manage durable goals, lineage, forks, and schedules  |
| Capability practitioner   | 1–15, then 25–34                   | Use local capabilities with correct authority        |
| Contributor core          | 1–6, 9, 11–15, 35–46, and 49–50    | Trace behavior to owners and prove changes           |
| Complete Guidebook        | 1–50 plus task-relevant appendices | Build the full product and architecture mental model |

Routes are link collections derived into the root README. They do not duplicate chapter content or
create independent navigation truth.

## 5. Editorial architecture

### 5.1 A single running journey

The guidebook follows one believable project from beginning to end:

> A junior developer opens a local repository, asks Haros to diagnose and fix a bug, reviews a
> plan, lets the Agent inspect files and run tests, follows queued work, checks the diff, survives an
> interruption, forks a side investigation, hands work to another Engine, and packages the result
> for review.

Chat and Studio use parallel mini-journeys so the reader can see what changes and what remains the
same. The examples must use realistic names and outputs, not placeholder lorem ipsum.

### 5.2 Standard chapter anatomy

Every chapter should use the smallest useful subset of this pattern:

1. **The question** — one concrete problem the chapter resolves.
2. **The plain-English model** — the shortest accurate explanation.
3. **See it in Haros** — a real product workflow or captured state.
4. **How it works** — only the architecture required to explain the behavior.
5. **What can go wrong** — failure, cancellation, restart, or stale-state behavior.
6. **The ownership table** — fact, owner, consumer, and forbidden duplicate.
7. **Try it** — a safe exercise with an observable result.
8. **Recap** — five or fewer durable statements.
9. **Check your model** — two or three questions that expose common confusion.

Not every statement belongs in a table or callout. Tables are reserved for repeated fields,
state comparisons, mappings, and decision matrices.

The visual default is one primary mental-model figure and one secondary workflow, cutaway, or
failure figure per chapter. Figures are planned with the chapter argument, not added after drafting.

### 5.3 Chapter metadata contract

Every chapter source carries compact front matter for `chapter`, `part`, `title`, `language`,
`edition_commit`, `verified_at`, and `source_anchors`. Reading time, navigation, figure lists, table
lists, and publication metadata are derived; they are not hand-maintained as parallel registries.

The body must make every specialized term understandable at first use or link it to an earlier
definition. A fresh reader should be able to answer each chapter's model-check questions using that
chapter and its declared prerequisites, without opening source code.

### 5.4 Depth markers

Each chapter may label sections with three unobtrusive markers:

- **Core** — required for every reader;
- **Under the hood** — contributor-level implementation detail;
- **Source trail** — authoritative files, contracts, and tests.

These are reading aids, not separate versions of the guidebook.

### 5.5 Chapter commissioning brief

No Worker receives only a chapter title. Before drafting, the Executor freezes a compact brief with:

| Brief field             | Required content                                                       |
| ----------------------- | ---------------------------------------------------------------------- |
| Reader question         | The one concrete confusion or decision the chapter resolves            |
| Observable promise      | What the reader can explain or do after finishing                      |
| Prerequisites           | Earlier chapters or terms the chapter may assume                       |
| Durable distinctions    | Boundaries the reader must not collapse                                |
| Current-behavior claims | Edition-pinned facts that require owner and test evidence              |
| Failure semantics       | What can fail, what survives, what settles, and how control returns    |
| Tables                  | Three or four specific comparison, lifecycle, ownership, or proof jobs |
| Visual slots            | Canonical slot, visual family, explanatory job, and source facts       |
| Real evidence           | Capture or focused proof required, if any                              |
| Exercise                | Safe action and observable result                                      |
| Model check             | Two or three questions with source-backed expected answers             |
| Exclusions              | Adjacent details that do not belong in this chapter                    |

The brief is a bounded commissioning input, not a second chapter. Once its content is integrated,
the chapter source and its declared anchors become the maintained publication facts.

## 6. Proposed 50-chapter table of contents

### Part I — Meet Haros

|   # | Chapter                                       | Reader promise                                                                            | Main evidence and artifacts                                                          |
| --: | --------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
|   1 | **Why an AI Workbench, Not Another Chat Box** | Understand the continuity problem Haros is designed to solve.                             | README thesis; “fragmented tools vs one workbench” labeled visual; comparison table. |
|   2 | **Haros in One Sentence**                     | Explain the product accurately to a teammate.                                             | Product identity, local-first boundary, generated core-thesis figure.                |
|   3 | **Agent, Chat, and Studio**                   | Choose the right surface and predict its workspace lifecycle.                             | Product-surface projection; three-surface table; real navigation capture.            |
|   4 | **Your First Complete Task**                  | Follow one prompt from submission to reviewed result.                                     | Composer, Queue, Timeline, diff, settlement; five-stage journey figure.              |
|   5 | **The Vocabulary of Haros**                   | Stop confusing Project, Thread, Turn, Session, Engine, and model.                         | Contract-backed glossary; noun relationship map.                                     |
|   6 | **Local-First, Explained Precisely**          | Know what stays local, what may connect outward, and what “local-first” does not promise. | State boundaries, connected-service caveats, local/remote responsibility table.      |

### Part II — Work in the Haros Workbench

|   # | Chapter                                                          | Reader promise                                                                    | Main evidence and artifacts                                              |
| --: | ---------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
|   7 | **First-Run Setup**                                              | Prepare an Engine and exact model without treating discovery as magic.            | Onboarding flow, Engine readiness, model catalog, degraded states.       |
|   8 | **Projects and Managed Workspaces**                              | Understand folder-backed Projects, managed Chat space, and isolated Studio space. | `ProjectKind`, workspace roots, project creation and recovery.           |
|   9 | **Threads, Turns, Messages, and Sessions**                       | Follow the lifetime of one task without collapsing four different facts.          | Orchestration Thread schema, latest turn, session states, messages.      |
|  10 | **The Composer as a Control Surface**                            | Use prompts, references, commands, and controls intentionally.                    | Composer components, slash commands, send admission, real UI capture.    |
|  11 | **Engines, Models, and Options**                                 | Know what changes when selecting an Engine, a model, or Engine-specific options.  | Engine descriptors, discovery contracts, selection provenance.           |
|  12 | **Permissions and Runtime Modes**                                | Predict when Haros asks, auto-approves, or grants full access.                    | Runtime-mode contracts, approval states, capability boundaries.          |
|  13 | **Interaction Modes: Default, Plan, Debug, Converge, and Learn** | Choose a cognitive workflow without mistaking a mode for a different Engine.      | Interaction-mode contracts, capability gating, mode comparison table.    |
|  14 | **Queue, Steer, Interrupt**                                      | Understand what happens when new work arrives while work is already running.      | Dispatch modes, queued-turn promotion, interrupt settlement.             |
|  15 | **Timeline, Activity, and Model Provenance**                     | Read what happened, when, and under which admitted model identity.                | Timeline projections, activities, turn provenance, first-frame identity. |

### Part III — Organize and Extend a Line of Work

|   # | Chapter                                           | Reader promise                                                                     | Main evidence and artifacts                                                  |
| --: | ------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
|  16 | **Groups Without Moving Projects**                | Collect related conversations while preserving their real Project ownership.       | User-facing Groups, Space-backed orchestration state, membership behavior.   |
|  17 | **Notes, Pinned Messages, and Markers**           | Turn a long transcript into durable working memory and review checkpoints.         | Notes, pin, marker contracts and limits; UI examples.                        |
|  18 | **Goals and Goal Achievement**                    | Give a long-running task a durable objective and know when pursuit stops.          | Goal timing, pause/resume, achievement records, continuation triggers.       |
|  19 | **Plans and Implementation Threads**              | Review a proposed plan and carry it into a distinct implementation path.           | Proposed-plan projection, implementation-thread relationship.                |
|  20 | **Attachments, Mentions, Skills, and References** | Add context without confusing a reference with authority or execution.             | Attachment admission, Engine skill and mention projections.                  |
|  21 | **Images and Voice**                              | Understand local intake, size limits, normalization, and transcription boundaries. | Image attachments, local preview grants, voice upload and transcription.     |
|  22 | **Sidechats, Subagents, and Thread Hierarchy**    | Split an investigation while retaining visible lineage and responsibility.         | Parent/source/subagent fields, Side command behavior, hierarchy projections. |
|  23 | **Forks and History Boundaries**                  | Know exactly what history a fork inherits and what it does not.                    | History-only and Chat-to-Agent fork scopes; bootstrap states.                |
|  24 | **Handoffs, Branches, and Worktrees**             | Move work across Engines or workspace modes without pretending native continuity.  | Handoff records, worktree metadata, source messages, stop-first semantics.   |

### Part IV — Use Haros's Local Capabilities

|   # | Chapter                                   | Reader promise                                                                             | Main evidence and artifacts                                               |
| --: | ----------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
|  25 | **Files, Search, Preview, and Editors**   | Safely find, inspect, edit, and open workspace files.                                      | Project file contracts, preview grants, editor discovery, boundary cases. |
|  26 | **The Integrated Terminal**               | Understand terminal ownership, tabs, process state, and shutdown.                          | PTY services, runtime selection, history, process-tree cleanup.           |
|  27 | **Git Status, Branches, and Checkpoints** | Connect a Haros turn to real repository state and reversible checkpoints.                  | Git services, status cache, checkpoint summaries, branch toolbar.         |
|  28 | **Diffs, Rollback, and Edit-and-Resend**  | Review changes and reverse conversation or file state without conflating them.             | Turn diffs, checkpoint revert, conversation rollback, edit replay.        |
|  29 | **Pull Requests**                         | Move from local work to a truthful PR view without overclaiming merge readiness.           | GitHub CLI boundary, PR projections, mergeability and statistics.         |
|  30 | **Browser Workflows and Web Access**      | Separate interactive browsing, agent web search, and external network access.              | Browser host, browser tools, bundled web access, annotations.             |
|  31 | **Device Workflows**                      | Understand simulator/device discovery, approval-sensitive actions, and screenshots.        | Device service, HostGateway device tools, supported-platform limits.      |
|  32 | **Project Actions and Dev Servers**       | Run repeatable project commands and understand background server ownership.                | Project scripts, process manager, push events, cancellation.              |
|  33 | **Studio Outputs**                        | Create artifacts in an isolated workspace and find captured deliverables.                  | Studio scaffold, Outbox rules, per-turn output capture.                   |
|  34 | **Automations**                           | Design recurring or attached work with explicit schedule, permissions, and failure policy. | Automation contracts, heartbeat vs standalone, memory, run history.       |

### Part V — Understand the Architecture

|   # | Chapter                                          | Reader promise                                                                        | Main evidence and artifacts                                                        |
| --: | ------------------------------------------------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
|  35 | **Desktop, Web, and Server**                     | Draw the process map and explain why the Web workbench does not own native execution. | Desktop shell, Web client, Server composition, IPC/HTTP/WebSocket edges.           |
|  36 | **Typed Contracts and Narrow Projections**       | Understand how a consumer learns enough without becoming a second owner.              | `packages/contracts`, shared projections, credential-blind views.                  |
|  37 | **Product Orchestration**                        | Follow a command into events, projections, and visible state.                         | Decider, OrchestrationEngine, reactors, event types, read models.                  |
|  38 | **Persistence and Read Models**                  | Know what is durable, what is projected, and why replay does not rewrite history.     | SQLite layers, event store, projections, checkpoints, receipts.                    |
|  39 | **Engine Identity, Discovery, and Adapters**     | Explain the exact responsibilities of the canonical Engine owner and one adapter.     | Engine descriptors, registry, discovery, health, adapter services.                 |
|  40 | **Product Threads vs Native Engine Sessions**    | Explain why cross-Engine continuation cannot be fabricated.                           | Thread/session schemas, handoff imports, native IDs, state isolation.              |
|  41 | **HostGateway and Exact-Turn Authority**         | Explain how tools are cataloged, authorized, invoked, cancelled, and receipted.       | Tool groups, session leases, target resolution, operation repository.              |
|  42 | **Streaming, Synchronization, and Backpressure** | Understand immediate UI feedback without assuming the client owns truth.              | shell/detail subscriptions, live streams, admission, backpressure, reconciliation. |

### Part VI — Reliability, Security, and Recovery

|   # | Chapter                                             | Reader promise                                                                          | Main evidence and artifacts                                                       |
| --: | --------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
|  43 | **Startup and Admission**                           | Know when Haros is ready to accept work and why visible readiness has layers.           | Server startup, Engine discovery, first-frame model identity, startup access.     |
|  44 | **Failure, Cancellation, Timeout, and Idempotency** | Predict what Haros preserves and what it settles when execution goes wrong.             | command receipts, lifecycle generations, cancellation, timeout, retry boundaries. |
|  45 | **Restart, Quit, and Recovery**                     | Explain how stuck turns, pending questions, migrations, and normal quit are reconciled. | startup reconciliation, quit-resume record, migration backup and restore.         |
|  46 | **Secrets, Trust, and Local Boundaries**            | Trace credentials and authority without exposing or duplicating them.                   | credential-blind projections, private paths, trusted origins, outbound policy.    |

### Part VII — Extend and Maintain Haros

|   # | Chapter                                            | Reader promise                                                                                        | Main evidence and artifacts                                                          |
| --: | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
|  47 | **Diagnostics, Usage, Retention, and Maintenance** | Read health and usage evidence without confusing telemetry with authority.                            | diagnostics, Engine usage, profile history, retention, maintenance events.           |
|  48 | **External Connections and MCP**                   | Understand how external capabilities enter without taking over product state.                         | External MCP gateway, credential verification, execution admission, audit.           |
|  49 | **Adding an Engine Without Adding a Second Truth** | Make an Engine change through descriptors, adapter seams, projections, and focused tests.             | change-radius rule, canonical registry, adapter conformance, Settings discovery.     |
|  50 | **Contributing, Proving, Packaging, and Shipping** | Work from source, choose proportional proof, respect source adoption, and avoid false release claims. | contribution rules, test ladder, packaged proof, legal metadata, release boundaries. |

## 7. Appendices

Appendices are reference surfaces and are not counted as chapters.

| Appendix                          | Purpose                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| A. Glossary                       | One canonical definition per product and architecture term.                           |
| B. State and Lifecycle Reference  | Compact state tables for sessions, turns, interactions, automations, and updates.     |
| C. Engine Capability Matrix       | Generated from canonical descriptors and focused capability evidence for the edition. |
| D. Command and Event Index        | Human-readable map of public commands, emitted events, and visible outcomes.          |
| E. Source Map                     | Chapter-to-owner file anchors and relevant focused tests.                             |
| F. Failure Playbook               | Symptom → likely boundary → safe evidence → recovery path.                            |
| G. Security and Privacy Checklist | Sanitization, credentials, screenshots, local paths, and reporting rules.             |
| H. Edition Notes                  | Haros version/commit, known alpha limits, changed chapters, and verification date.    |

## 8. Table system

The guidebook should contain approximately 160–220 purposeful tables: normally three or four per
chapter, plus reference tables in the appendices. The target is not decorative density. Tables carry
the exact, comparable, and potentially changing facts that an illustrative figure should not be
asked to reproduce.

### 8.1 Required recurring tables

| Table family       | Example columns                                                 | Used in                             |
| ------------------ | --------------------------------------------------------------- | ----------------------------------- |
| Vocabulary         | Term, plain meaning, owner, commonly confused with              | Parts I–V                           |
| Surface comparison | Agent, Chat, Studio, workspace, default tools, output behavior  | Chapters 3, 8, 33                   |
| Lifecycle          | State, entry, owner, exit, restart behavior                     | Chapters 9, 14, 34, 43–45           |
| Ownership          | Fact, sole owner, projection, forbidden duplicate               | Architecture chapters               |
| Capability         | Tool group, surface, default, approval, unavailable behavior    | Chapters 12, 30–34, 41              |
| Failure matrix     | Failure, preserved fact, visible state, recovery, non-guarantee | Every reliability-sensitive chapter |
| Decision guide     | User intent, recommended surface/mode/tool, reason              | Usage chapters                      |
| Proof ladder       | Claim, narrowest disproof, test layer, release caveat           | Chapters 49–50                      |

### 8.2 Tables that must be generated or verified from owners

- Engine identity and display-name table;
- supported interaction modes and execution capabilities;
- built-in HostGateway tool-group surface policy;
- command/event names;
- size, count, and content limits exposed by public contracts;
- repository scripts and verification commands.

These must never be maintained as freehand duplicate registries.

### 8.3 Table allocation by Part

| Section                        | Table range | Typical emphasis                                       |
| ------------------------------ | ----------: | ------------------------------------------------------ |
| Part I — Meet Haros            |       18–24 | Vocabulary, surface choice, boundaries, misconceptions |
| Part II — Workbench            |       27–36 | Controls, states, modes, Queue, provenance             |
| Part III — Organize Work       |       27–36 | Lifecycles, lineage, inheritance, limits               |
| Part IV — Capabilities         |       30–40 | Authority, availability, failure, cancellation         |
| Part V — Architecture          |       24–32 | Owners, consumers, commands, events, projections       |
| Part VI — Reliability          |       12–16 | Failure matrices, preservation, recovery, trust        |
| Part VII — Extend and Maintain |       12–16 | Evidence, integration, diagnostics, release claims     |
| Appendices                     |       10–20 | Canonical reference and edition-specific indexes       |
| **Total**                      | **160–220** | Exact facts remain scannable and maintainable          |

## 9. Image-led visual system

### 9.1 Default visual doctrine

Every non-evidence visual should be generated with `gpt-image-2` by default. This includes mental
models, workflows, architecture relationships, lifecycle explanations, failure stories, Part
openers, and synthesis plates. The first edition plans no Mermaid or hand-authored explanatory SVG
figures. If a relationship cannot be communicated truthfully through a generated figure plus an
exact Markdown table, a deterministic diagram may be approved as an exception; it is not a normal
asset class or a parallel visual system.

Real product states remain real browser or Desktop captures. They are evidence, not illustration.
The canonical Haros SVG may appear as the unchanged product mark; it is a brand asset, not an
explanatory diagram and must never be regenerated.

### 9.2 Visual allocation

| Allocation                                        | Accepted figures | Contract                                                          |
| ------------------------------------------------- | ---------------: | ----------------------------------------------------------------- |
| Guidebook cover                                   |                1 | One identity-safe editorial cover; canonical mark stays exact.    |
| Part openers                                      |                7 | One distinct visual thesis for each Part.                         |
| Chapter primary figures                           |               50 | One indispensable mental model for every chapter.                 |
| Chapter secondary figures                         |               50 | One workflow, comparison, cutaway, or worked example per chapter. |
| Additional failure and boundary figures           |               18 | Concentrated in lifecycle, security, and recovery chapters.       |
| Appendix and cross-guide synthesis plates         |               14 | Reference navigation, vocabulary, and end-to-end synthesis.       |
| **Total planned `gpt-image-2` publication slots** |          **140** | Every accepted asset occupies one unique slot.                    |

The 140 slots are a reviewed production plan, not permission to publish filler. Two accepted
generated figures are the chapter default. Conceptually dense chapters may use three to five. A
chapter may use fewer only when a real product capture already performs the second explanatory job
and the editor records why another generated figure would add no learning value. Reuse may improve
continuity, but one physical asset still counts as one slot and must never be counted twice.

### 9.3 Three generated visual families

| Family                     | Best use                                                    | Typical composition                                                        |
| -------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| Editorial journey plate    | Reader path, workflow, surface choice, or chapter opening.  | A clear left-to-right or foreground-to-background journey with 2–7 labels. |
| Mechanism cutaway plate    | Ownership, process boundary, orchestration, or authority.   | Layered physical metaphor with visible boundaries and labeled handoffs.    |
| Failure and recovery plate | Cancellation, stale state, interruption, or reconciliation. | Before/disruption/recovery sequence with one preserved fact made obvious.  |

These are one visual language, not three art directions. The pilot approves one published asset as
the style master for each family:

| Family                     | Pilot master and publication slot             |
| -------------------------- | --------------------------------------------- |
| Editorial journey plate    | Part I opener                                 |
| Mechanism cutaway plate    | Part V opener                                 |
| Failure and recovery plate | Chapter 14 additional failure/boundary figure |

These masters are three of the 140 published assets, not extra reference-only images. Later assets
use the accepted masters as style references and controlled image edits when a label or relationship
is wrong.

### 9.4 Visual direction

The visual language should feel like a calm technical guidebook rather than a futuristic AI ad.

| Element                        | Direction                                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Base palette                   | Haros charcoal `#242528`, warm white `#F6F3EA`, amber `#E2A11A`.                                     |
| Supporting colors              | Restrained slate, muted teal, and one failure red only when semantics require them.                  |
| Form                           | Clear cutaways, bounded loops, work surfaces, rails, receipts, and layered workspaces.               |
| Typography in generated images | Usually 2–7 short English labels, clean geometric sans-serif, high contrast, no prose paragraphs.    |
| Texture                        | Editorial paper and subtle physical depth; no glossy sci-fi dashboard aesthetic.                     |
| Brand boundary                 | No generated logo, no alternate mark, no tagline attached to the identity.                           |
| Exclusions                     | No fake code, fake UI, fake terminal output, decorative paragraphs, watermarks, or unrequested text. |

### 9.5 Figure placement and caption contract

- Number figures by chapter, such as `Figure 14.2`; number Part and appendix plates within their own
  section.
- Give every figure a one-sentence takeaway caption, descriptive alt text, and an accessible textual
  equivalent for all essential relationships.
- Do not repeat a chapter heading as decorative in-image text. Labels must explain objects,
  transitions, boundaries, or outcomes.
- Do not rely on color alone. Shape, placement, line style, or short labels must preserve meaning in
  grayscale and common color-vision conditions.
- Use at most one full-bleed hero per chapter. Other figures should remain readable inline on narrow
  Web and EPUB layouts.
- Pair metaphorical architecture figures with an exact nearby table. The caption states when the
  figure is conceptual rather than a protocol or screen representation.
- Do not publish unlabeled decorative filler under a figure number.

### 9.6 Anchor `gpt-image-2` inventory

The 26 assets below are the cross-guide anchor concepts inside the 140-figure allocation, not the
complete image list. Every asset is a standalone explanatory visual. Each prompt must declare the
listed strings as exact text elements before generation.

| ID  | Allocation slot    | Explanatory job               | Exact in-image text inventory                                   |
| --- | ------------------ | ----------------------------- | --------------------------------------------------------------- |
| G01 | Guidebook cover    | Guidebook cover               | `A VISUAL GUIDE FROM FIRST TASK TO RUNTIME ARCHITECTURE`        |
| G02 | Chapter 1 primary  | Workbench vs fragmented tools | `ONE WORKBENCH`; `PROJECTS`; `THREADS`; `TOOLS`; `RECOVERY`     |
| G03 | Chapter 3 primary  | Three surfaces, one product   | `AGENT`; `CHAT`; `STUDIO`; `ONE PRODUCT`                        |
| G04 | Chapter 4 primary  | First complete journey        | `ASK`; `QUEUE`; `RUN`; `REVIEW`; `RECOVER`                      |
| G05 | Chapter 5 primary  | Core noun map                 | `PROJECT`; `THREAD`; `TURN`; `ENGINE`; `MODEL`; `TOOL`          |
| G06 | Chapter 6 primary  | Local-first boundary          | `YOUR MACHINE`; `HAROS STATE`; `CONNECTED SERVICES`             |
| G07 | Chapter 7 primary  | Setup layers                  | `ENGINE`; `MODEL SERVICE`; `EXACT MODEL`; `READY`               |
| G08 | Chapter 8 primary  | Workspace lifecycles          | `YOUR FOLDER`; `MANAGED CHAT`; `ISOLATED STUDIO`                |
| G09 | Chapter 14 primary | Queue lifecycle               | `SUBMITTED`; `QUEUED`; `STARTING`; `RUNNING`; `SETTLED`         |
| G10 | Chapter 15 primary | Timeline provenance           | `WHAT`; `WHEN`; `WHICH ENGINE`; `WHICH MODEL`                   |
| G11 | Chapter 18 primary | Goals and plans               | `GOAL`; `PLAN`; `WORK`; `ACHIEVED`                              |
| G12 | Chapter 22 primary | Thread lineage                | `SOURCE TASK`; `SIDECHAT`; `SUBAGENT`; `FORK`                   |
| G13 | Chapter 24 primary | Handoff boundary              | `PRODUCT HISTORY`; `HANDOFF`; `NEW ENGINE SESSION`              |
| G14 | Part IV opener     | Capability guide              | `FILES`; `GIT`; `TERMINAL`; `BROWSER`; `DEVICE`                 |
| G15 | Chapter 33 primary | Studio artifact path          | `INBOX`; `WORKSPACE`; `OUTBOX`; `DELIVERABLES`                  |
| G16 | Chapter 34 primary | Automation loop               | `SCHEDULE`; `RUN`; `RESULT`; `MEMORY`; `NEXT RUN`               |
| G17 | Chapter 35 primary | Process map                   | `DESKTOP`; `WEB WORKBENCH`; `SERVER`                            |
| G18 | Chapter 37 primary | Orchestration cycle           | `COMMAND`; `EVENT`; `PROJECTION`; `VISIBLE STATE`               |
| G19 | Chapter 40 primary | Engine separation             | `PRODUCT THREAD`; `ENGINE ADAPTER`; `NATIVE SESSION`            |
| G20 | Chapter 41 primary | HostGateway authority         | `REQUEST`; `AUTHORIZE`; `EXECUTE`; `RECEIPT`                    |
| G21 | Chapter 42 primary | Streaming without split truth | `IMMEDIATE FEEDBACK`; `SERVER TRUTH`; `RECONCILIATION`          |
| G22 | Chapter 45 primary | Recovery model                | `PRESERVE PROMPT`; `SETTLE TURN`; `RESTORE CONTROL`             |
| G23 | Chapter 46 primary | Trust boundary                | `CREDENTIALS`; `TYPED PROJECTION`; `NO SECRET IN UI`            |
| G24 | Chapter 49 primary | Add-an-Engine change radius   | `DESCRIPTOR`; `ADAPTER`; `FOCUSED TESTS`; `NO NEW LISTS`        |
| G25 | Chapter 50 primary | Evidence ladder               | `UNIT`; `INTEGRATION`; `BROWSER`; `DESKTOP`; `PACKAGED PROOF`   |
| G26 | Appendix H plate 1 | Closing synthesis             | `DURABLE WORK`; `REPLACEABLE EXECUTION`; `RECOVERABLE PROGRESS` |

G01 deliberately excludes a generated Haros wordmark or logo. The image model creates the cover
field and the exact subtitle; the final cover uses the unchanged canonical Haros brand asset in a
reserved region. Brand composition is an explicit exception to the rule that explanatory labels
must be generated inside a standalone figure.

The remaining 114 assets are allocated during chapter briefs. No figure may be commissioned merely
to satisfy a quota: each one needs a distinct explanatory job, source facts, and acceptance test.

### 9.7 Chapter-pair commissioning map

This map assigns the two default generated figures before prose drafting. Titles are working
descriptions, not in-image text. Exact label inventories are written only after the chapter's source
facts are reviewed.

| Ch. | Primary generated figure                      | Secondary generated figure                             |
| --: | --------------------------------------------- | ------------------------------------------------------ |
|   1 | Fragmented tools becoming one workbench       | The continuity rail across a complete task             |
|   2 | Haros's central thesis                        | Durable product work and replaceable execution         |
|   3 | Three surfaces, one product                   | Three workspace lifecycles                             |
|   4 | The five-stage first-task journey             | What survives an interruption                          |
|   5 | Core noun relationship map                    | Common vocabulary collisions                           |
|   6 | The local-first boundary                      | Controlled outward connections                         |
|   7 | Engine-to-ready setup staircase               | Degraded setup and recovery route                      |
|   8 | Three kinds of workspace home                 | Workspace creation and recovery paths                  |
|   9 | Nested lifetimes of Thread, Turn, and Session | Product history beside native session state            |
|  10 | Composer as a conceptual control surface      | Send admission and refusal path                        |
|  11 | Engine, model service, and exact-model layers | Selection provenance receipt                           |
|  12 | Permission gates                              | Runtime modes through one capability boundary          |
|  13 | Five interaction-mode lenses                  | Same Engine, different cognitive workflow              |
|  14 | Queue lifecycle                               | Steer versus interrupt under pressure                  |
|  15 | Timeline strata                               | First-frame Engine and model provenance                |
|  16 | Groups as an overlay                          | Membership without moving a Project                    |
|  17 | Notes, pins, and markers as memory landmarks  | Durable memory versus bounded annotations              |
|  18 | The goal pursuit loop                         | Pause, resume, and achievement states                  |
|  19 | Plan-to-implementation bridge                 | Proposed plan and implementation history separation    |
|  20 | The admitted context bundle                   | Reference is context, not authority                    |
|  21 | Image and voice intake path                   | Normalization, privacy, and transcription boundaries   |
|  22 | Visible thread lineage                        | Side investigation and responsibility handoff          |
|  23 | The fork boundary                             | Inherited history versus newly created state           |
|  24 | Cross-Engine handoff bridge                   | Preserved product history and new native session       |
|  25 | File capability corridor                      | Preview grants and workspace boundaries                |
|  26 | Integrated terminal ownership stack           | Process-tree cleanup at shutdown                       |
|  27 | Repository state and checkpoint rings         | Reversible checkpoints versus ordinary Git state       |
|  28 | Two axes of rollback                          | Edit-and-resend replay path                            |
|  29 | Local work to pull-request evidence           | Truthful claim boundary before merge                   |
|  30 | Three different web-access paths              | Browser authority and network boundary                 |
|  31 | Device discovery and approval gate            | Capture and action boundary                            |
|  32 | Project-action control room                   | Background dev-server ownership                        |
|  33 | Studio artifact conveyor                      | Inbox, workspace, Outbox, and captured deliverables    |
|  34 | Automation lifecycle loop                     | Heartbeat and standalone failure policy                |
|  35 | Desktop, Web, and Server process landscape    | Authorized edges between processes                     |
|  36 | Narrow projection window                      | Credential-blind consumer view                         |
|  37 | Command-to-visible-state orchestration cycle  | One worked turn through decider, event, and projection |
|  38 | Persistence and read-model layers             | Replay, checkpoints, and receipts                      |
|  39 | Canonical Engine registry                     | Adapter responsibilities and bounded change radius     |
|  40 | Product Thread and native Session separation  | Why handoff cannot fabricate continuation              |
|  41 | HostGateway authorization checkpoint          | Exact-turn request, execution, and receipt             |
|  42 | Streaming river and durable banks             | Backpressure and reconciliation                        |
|  43 | Layered readiness gates                       | Admission refusal before safe execution                |
|  44 | Failure, cancellation, and timeout taxonomy   | Idempotent re-entry and settlement                     |
|  45 | Restart and recovery sequence                 | Stuck-turn and pending-interaction reconciliation      |
|  46 | Trust zones around local capabilities         | Secret path that never enters UI projections           |
|  47 | Health, usage, and maintenance evidence       | Retention lifecycle                                    |
|  48 | External MCP admission gateway                | External capability without product-state ownership    |
|  49 | Add-an-Engine extension path                  | The no-parallel-lists constraint                       |
|  50 | Evidence ladder                               | Source proof, packaged proof, and release boundary     |

The 18 additional failure and boundary figures are assigned to Chapters 6, 7, 12, 14, 18, 22, 24,
26, 28, 30, 31, 34, 38, 42, 43, 44, 45, and 46.

| Appendix or synthesis area         | Plates |
| ---------------------------------- | -----: |
| Glossary                           |      2 |
| State and Lifecycle Reference      |      3 |
| Engine Capability Matrix           |      2 |
| Command and Event Index            |      2 |
| Source Map                         |      1 |
| Failure Playbook                   |      2 |
| Security and Privacy Checklist     |      1 |
| Edition Notes                      |      1 |
| **Total appendix/synthesis slots** | **14** |

Together with the cover and seven Part openers, this accounts for all 140 planned slots.

Canonical slot IDs use `cover-01`, `part-NN-opener`, `ch-NN-primary`, `ch-NN-secondary`,
`ch-NN-extra-NN`, and `appendix-X-NN`. Anchor IDs G01–G26 are editorial handles only; each maps to
exactly one canonical slot in the anchor table. A build-time inventory is derived from sidecars and
must fail on a duplicate slot, a missing slot required by the current milestone, or one asset claiming
multiple slots. The final integration milestone additionally fails if any of the 140 approved slots
is unresolved without an explicit editorial omission decision.

### 9.8 Generated-image workflow

For every accepted generated asset:

1. assign one canonical publication slot and one explanatory job;
2. classify it as standalone explanatory art;
3. review the source facts before writing a prompt;
4. write `role → exact string → placement → typographic role` for every label;
5. generate at `quality="medium"` or higher: normally `2048x1152` for heroes, `1536x1024` for
   inline figures, and `1024x1024` only when the composition genuinely needs a square;
6. inspect the full-resolution image and every intended publication size;
7. reject or edit if any character, punctuation mark, label attachment, arrow, hierarchy, or source
   relationship is wrong;
8. reject all unrequested text, fake logos, misleading arrows, and invented UI;
9. ensure every semantically essential in-image label is also available through adjacent prose, an
   exact table, a caption, or an extended description;
10. store a Markdown sidecar with machine-readable front matter beside the accepted asset;
11. add descriptive alt text that explains the concept rather than merely repeating the caption;
12. strip sensitive metadata and retain only the accepted publication master in the repository.

OCR may help find errors, but it cannot replace visual inspection.

Each sidecar owns these fields: canonical slot, anchor ID if any, chapter or appendix, visual family,
explanatory job, reviewed source anchors, exact text inventory, final prompt, generation settings,
composition, acceptance checks, accessible equivalent, revision history, and accepted file checksum.
It must never contain API keys, endpoints, account identifiers, or raw service responses. Any asset
index used for builds is generated from these sidecars and is not independently edited.

### 9.9 Generation budget and repository budget

For a normal slot, generate one medium-quality candidate and use at most two controlled generation
or edit cycles after it. If three rendered candidates still cannot satisfy exact text and semantic
requirements, pause that slot and report the failure instead of continuing unbounded retries. High
quality requires a specific failure observed at medium quality; it is not the default.

Rejected candidates live only in a task-specific temporary directory and are not committed. The
accepted repository master defaults to high-quality JPEG when transparency is unnecessary and PNG
only when line fidelity or transparency materially requires it. Derived Web, print, thumbnail, and
EPUB renditions are build outputs rather than additional source assets.

| Asset budget                      | Default threshold                                      |
| --------------------------------- | ------------------------------------------------------ |
| Individual accepted raster        | Target ≤ 2 MB; larger files require a recorded reason  |
| All accepted figures and captures | Review at 150 MB; stop and redesign before 200 MB      |
| Rejected candidates in Git        | 0                                                      |
| Publication derivatives committed | 0 unless a later release task explicitly requires them |

### 9.10 Real capture plan

The first edition should include approximately 18–24 real UI captures covering:

- the three-surface navigation;
- first-run Engine and model setup;
- Composer controls and commands;
- queued work, pending approval, and pending user input;
- Timeline model identity and tool activity;
- plan review and implementation follow-up;
- Sidechat/subagent lineage;
- diff and checkpoint review;
- terminal, browser, and device panels;
- Studio output listing;
- automation authoring and run history;
- Engine, capabilities, connections, and recovery Settings.

Every capture must be reproducible from a fresh, task-specific Haros home and synthetic project data.
Its sidecar records viewport, theme, locale, product state or fixture, exact commit, capture command
or journey, sanitization result, caption, alt text, and file checksum. Sensitive local paths,
credentials, endpoints, account details, and real user data must never appear. A screenshot that
cannot be recreated or explained from its fixture is not accepted as product evidence.

## 10. Source-of-truth and maintenance contract

### 10.1 The guidebook does not own product behavior

| Information                                           | Sole owner                                   | Guidebook responsibility                                                           |
| ----------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------- |
| Engine identities and display names                   | `ENGINE_DESCRIPTORS`                         | Explain and project; never hand-maintain a competing list.                         |
| Product commands and events                           | contracts and Orchestration owners           | Summarize the lifecycle and link to the exact edition source.                      |
| Tool-group surface policy                             | shared HostGateway policy                    | Generate or verify tables from the policy.                                         |
| UI copy and behavior                                  | bilingual product surfaces and their owners  | Capture real states; do not redefine behavior in prose.                            |
| Machine names such as `@harnessos/*` and `.harnessos` | stable implementation contracts              | Mention only where technically necessary.                                          |
| Source adoption and legal facts                       | `source-adoptions.json` and retained notices | Link and explain; never create a parallel provenance record.                       |
| Guidebook publication language                        | explicit maintainer decision and this plan   | Publish the Guidebook in English; do not broaden this decision to product UI copy. |
| Guide order and reading paths                         | the guidebook's root README                  | Other pages link to it; no second navigation registry.                             |

### 10.2 Stable concept vs current alpha behavior

Each technical claim should be classified during drafting:

- **Product principle** — a durable Haros decision, such as Product Thread ≠ native Session;
- **Current behavior** — verified in the edition's source and tests;
- **Implementation detail** — useful for contributors but replaceable;
- **Alpha limitation** — explicitly not a release or long-term guarantee;
- **External fact** — cited to the source-adoption or upstream authority.

The prose need not show a badge on every sentence. The distinction must remain explicit wherever a
reader could mistake current implementation for a permanent promise.

### 10.3 Confirmed repository shape and publication direction

Markdown is the sole editable content source. Website pages, a standalone HTML edition, PDF, and
EPUB are derived publication targets; none may acquire independent chapter prose, navigation, image
captions, or tables.

```text
docs/guide/
  README.md                 # sole reading order and route owner
  00-preface.md
  part-01-meet-haros/
  part-02-workbench/
  part-03-organize-work/
  part-04-capabilities/
  part-05-architecture/
  part-06-reliability/
  part-07-contributing/
  appendices/
  assets/
    generated/              # accepted gpt-image-2 visuals plus prompt sidecars
    captures/               # sanitized real Haros captures
  publication/              # build configuration only; never a second content source
```

The derivation path is one-way:

| Source or output | May contain unique prose? | Navigation owner                 | Image source                           |
| ---------------- | ------------------------- | -------------------------------- | -------------------------------------- |
| Markdown         | Yes                       | `docs/guide/README.md`           | Accepted assets under `assets/`        |
| Website          | No                        | Derived from Markdown order      | Same accepted assets, responsive use   |
| Standalone HTML  | No                        | Derived from Markdown order      | Same accepted assets, embedded/linked  |
| PDF              | No                        | Derived contents and bookmarks   | Print-safe derivatives of same assets  |
| EPUB             | No                        | Derived EPUB navigation document | Reflow-safe derivatives of same assets |

Do not introduce a duplicated navigation manifest or publication control plane. The publication
toolchain may transform layout, resolution, links, and pagination; it may not rewrite meaning.
Generated outputs go to a task-specific build directory and are not committed during drafting.

The pilot must prove this contract with one linked website-compatible HTML set, one standalone HTML
file, one PDF, and one EPUB generated from the same Markdown. The proof checks headings, navigation,
internal links, tables, figures, captions, alt text, PDF legibility, and EPUB reflow. A successful
command alone is not sufficient if the rendered result is unreadable.

### 10.4 Evidence protocol

| Claim class              | Minimum evidence at the pinned edition                                 | Publication treatment                                         |
| ------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| Product principle        | README, architecture, applicable repository instruction or owner       | State plainly and explain why the boundary exists             |
| Current product behavior | Canonical contract or owner plus focused test or reproducible state    | Mark edition scope; do not imply a permanent guarantee        |
| Failure or recovery      | Failure-path owner plus focused failure/restart/cancellation proof     | Name what is preserved, settled, visible, and not promised    |
| UI behavior              | UI owner plus reproducible browser/Desktop capture                     | Use a real capture; record viewport, state, and commit        |
| Volatile matrix or limit | Generated or checked from the canonical owner                          | Do not maintain a freehand duplicate                          |
| External or legal fact   | Source-adoption authority, retained notice, or precise upstream source | Keep provenance narrow and distinguish it from Haros identity |

Tests prove behavior but do not explain it. Source code supplies authority but is not copied into
junior-facing prose. Every chapter brief identifies the smallest evidence set that can disprove its
claims; opening a broad inventory does not authorize documenting adjacent features.

## 11. Delivery plan

### Phase 0 — Lock the confirmed contract

Deliverables:

- confirmed primary reader and Markdown canonical source;
- approved 50-chapter architecture;
- approved central thesis and visual doctrine;
- confirmed website, HTML, PDF, and EPUB derivation contract;
- resolved English-only Guidebook scope without changing the bilingual product-UI rule;
- explicit non-goals for the first edition.

Exit criteria:

- no unresolved conflict between beginner journey and contributor depth;
- no expectation that generated images will impersonate product evidence;
- the edition boundary is tied to a known Haros commit.

### Phase 1 — Build the guidebook skeleton and three pilot chapters

Pilot chapters:

1. Chapter 3, **Agent, Chat, and Studio** — tests beginner explanation and product captures;
2. Chapter 14, **Queue, Steer, Interrupt** — tests lifecycle and failure explanation;
3. Chapter 37, **Product Orchestration** — tests the contributor/source-trail layer.

Pilot visuals:

- Part I opener as the published editorial-journey style master;
- Part V opener as the published mechanism-cutaway style master;
- Chapter 14 extra failure/boundary figure as the published failure/recovery style master;
- six chapter figures: two each for Chapters 3, 14, and 37, including G03, G09, and G18;
- three real UI captures.

Pilot chapter budget:

| Chapter |  Main-text target | Purposeful tables | Generated figures | Real captures |
| ------: | ----------------: | ----------------: | ----------------: | ------------: |
|       3 | 2,500–3,500 words |               3–4 |                 2 |           1–2 |
|      14 | 2,500–3,500 words |               3–4 |                 3 |           1–2 |
|      37 | 2,500–3,500 words |               3–4 |                 2 |           0–1 |

The two Part openers bring the generated pilot total to nine unique publication assets. The three
real captures are distributed according to reproducible evidence value rather than one per chapter.

Exit criteria:

- a junior reader can explain all three pilots without source-code assistance;
- every technical claim has a reviewed source anchor;
- all exact image text passes character-level inspection;
- all nine pilot images remain visually coherent across HTML, print, and reflowed reading sizes;
- every essential image label has an accessible textual equivalent;
- the same Markdown renders into the four pilot publication targets;
- a fresh reviewer can answer the pilot model-check questions without opening source code;
- the chapter template works for product, lifecycle, and architecture subjects.

### Phase 2 — Complete Parts I and II

Focus:

- product identity, mental model, first-run path, Composer, Engine/model selection, permissions,
  modes, Queue, Timeline, and provenance.

Exit criteria:

- a new reader can complete the core journey;
- all vocabulary conflicts are resolved in the glossary;
- no chapter assumes later architecture knowledge.

### Phase 3 — Complete Parts III and IV

Focus:

- organizing work, thread lineage, handoffs, local tools, Studio, and automations.

Exit criteria:

- every tool chapter states authority, failure, cancellation, and surface availability;
- workflow screenshots are real and sanitized;
- feature breadth does not obscure the shared orchestration model.

### Phase 4 — Complete Parts V and VI

Focus:

- process boundaries, contracts, Orchestration, persistence, Engine isolation, HostGateway,
  streaming, security, and recovery.

Exit criteria:

- architecture figures agree with exact ownership and lifecycle tables;
- source anchors cover normal, failure, restart, and shutdown behavior;
- no implementation detail is presented as an unqualified product guarantee.

### Phase 5 — Complete Part VII and appendices

Focus:

- diagnostics, external connections, Engine extension, contribution, proof, packaging, and legal
  boundaries.

Exit criteria:

- the add-an-Engine change scenario touches only the canonical owner cut;
- the proof ladder accurately separates source, browser, Desktop, packaged, and release claims;
- source-adoption and identity rules are accurately represented.

### Phase 6 — Whole-guide validation and publication packaging

One final candidate validation matrix covers eight dimensions. These are not eight independent
review cycles or eight reviewer roles:

1. **Narrative pass** — the central thesis remains visible and chapters do not read like unrelated
   feature notes.
2. **Junior comprehension pass** — exercises and model-check questions expose unexplained jargon.
3. **Technical fact pass** — source anchors and tests support the claims.
4. **Lifecycle pass** — normal, failure, cancellation, restart, and shutdown statements agree.
5. **Visual pass** — figures, tables, captions, text inventories, and captures are legible and true.
6. **Identity pass** — Haros is the only normal product identity; machine and third-party identities
   appear only where accuracy requires them.
7. **Security pass** — no secrets, private endpoints, user data, raw service responses, or sensitive
   local paths are present.
8. **Link and render pass** — internal links, headings, anchors, images, code fences, and tables render
   correctly in the chosen outputs.

## 12. Scope and effort model

Recommended first-edition size:

| Dimension                                      |                               Target |
| ---------------------------------------------- | -----------------------------------: |
| Core chapters                                  |                                   50 |
| Appendices                                     |                                    8 |
| Main-text word count                           |        125,000–165,000 English words |
| Purposeful tables                              |                              160–220 |
| Planned unique `gpt-image-2` publication slots |                                  140 |
| Planned code-authored diagrams                 |                                    0 |
| Real Haros captures                            |                                18–24 |
| Safe exercises                                 |                                30–40 |
| Final validation dimensions                    |                                    8 |
| Accepted raster repository budget              | Review at 150 MB; stop before 200 MB |

The guidebook should be produced in complete Parts, not as 50 simultaneous drafts. A chapter is not
“done” when prose exists; it is done when the journey, facts, failure semantics, visuals, links, and
source trail agree.

## 13. Risks and countermeasures

| Risk                                                          | Why it matters                                                               | Countermeasure                                                                                                 |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| The guidebook becomes a second truth.                         | Haros changes while prose silently freezes old behavior.                     | Derive volatile tables, record edition source, and keep source anchors near claims.                            |
| Fifty chapters become a feature inventory.                    | Readers remember controls but miss the product idea.                         | Reuse one running journey and the durable-work/replaceable-execution thesis.                                   |
| Junior-friendly becomes inaccurate simplification.            | Readers build a false model that later must be unlearned.                    | Use plain language first, then name the exact boundary and common confusion.                                   |
| Generated visuals fabricate labels or relationships.          | A polished image can teach the wrong architecture.                           | Exact text inventory, medium+ generation, character-level inspection, controlled edits, rejection.             |
| Generated art drifts across 140 assets.                       | The guidebook loses visual coherence and begins to look like a second brand. | Approve three style masters, reuse them as references, and review assets in Part-sized batches.                |
| Image text QA becomes a production bottleneck.                | One wrong label can invalidate an otherwise strong figure.                   | Keep inventories short, inspect every character, track revisions in sidecars, and reject uncertain assets.     |
| Generated architecture visuals oversimplify exact behavior.   | Readers may mistake metaphor for a protocol specification.                   | Pair every mechanism figure with an exact table and nearby source anchors; state the figure's boundary.        |
| Essential meaning exists only inside raster text.             | Screen-reader and low-vision readers lose the relationship being taught.     | Repeat every essential label relationship in prose, a table, a caption, or an extended description.            |
| Image retries become unbounded.                               | Production time and external API cost grow without improving acceptance.     | Stop after three rendered candidates per slot and escalate the unresolved explanatory job.                     |
| Accepted media makes the repository impractically large.      | Clone, review, and publication costs grow for every contributor.             | Commit accepted masters only, derive renditions, enforce per-file and aggregate raster budgets.                |
| Screenshots age quickly.                                      | UI evidence becomes stale and expensive to maintain.                         | Capture only states that materially prove behavior; use generated conceptual plates for durable relationships. |
| Alpha behavior is mistaken for a shipped release.             | Readers infer installers, support, or guarantees that do not exist.          | Repeat edition status at entry, setup, packaging, and release boundaries.                                      |
| Internal donor/runtime identities leak into normal narrative. | The public guidebook loses Haros ownership and clarity.                      | Use third-party names only in selectors, integration chapters, or legal provenance.                            |
| The publication platform dictates the content model.          | A docs framework becomes an unnecessary long-term owner.                     | Keep Markdown as source and add a renderer only after the pilot proves the need.                               |
| Derived formats silently diverge.                             | HTML, PDF, and EPUB appear complete while omitting or corrupting meaning.    | Render all four targets from one source and inspect representative links, tables, figures, and reflow.         |

## 14. Devil's-advocate review

### Strategy

A 50-chapter guidebook is justified only if it teaches a durable Haros mental model. If it merely lists
features, the README plus focused guides would be cheaper and more useful. The central thesis and
running journey are therefore non-negotiable acceptance criteria.

### Execution

The hardest part is not writing 150,000 words; it is keeping 50 chapters technically true while a
source-alpha product evolves. Edition pinning, source anchors, volatile-table generation, and
Part-level delivery are the primary execution controls.

### Adoption

A junior will not begin with an architecture encyclopedia. The first four chapters must deliver a
complete, satisfying journey before asking the reader to learn commands, events, projections, and
process boundaries. Architecture depth is earned by explaining visible behavior.

## 15. Decision ledger

### Confirmed

- The collection is named **Haros Guidebook**.
- The working title is **Haros Guidebook: A Visual Guide from First Task to Runtime Architecture**.
- The deliverable should deeply introduce Haros as a practical, navigable learning collection.
- It should be understandable to a junior reader.
- The Guidebook publication is English-only by explicit maintainer decision; product UI copy remains
  subject to the repository's bilingual rule.
- Use 50 core chapters and eight reference appendices.
- Markdown under `docs/guide/` is the sole editable content source.
- Website, standalone HTML, PDF, and EPUB editions derive from the same Markdown.
- Use 160–220 purposeful tables for exact comparisons, mappings, and current facts.
- Plan 140 unique `gpt-image-2` publication slots; two per chapter is the default and reused assets
  never count twice.
- Use `gpt-image-2` for non-evidence visuals, including conceptual architecture and lifecycle figures.
- Plan no code-authored explanatory diagrams by default.
- Use only real product captures as UI evidence.
- Required explanatory labels must be generated inside the image, not added later as a substitute.
- Keep the canonical Haros mark exact and outside model generation, including on the cover.
- Make every essential raster label relationship available in accessible text.
- Stop a visual slot after three failed rendered candidates rather than retrying without a bound.
- Commit only accepted media masters and keep publication derivatives out of the source tree.
- Treat the eight final validation dimensions as one candidate matrix, not eight review cycles.
- Treat a junior software developer as the primary reader; support users and maintainers through
  reading paths and depth markers.

### Explicit non-goals for the first edition

- Do not document private credentials, endpoints, raw provider responses, or real user state.
- Do not turn donor history or third-party runtimes into a second product narrative.
- Do not promise official installers, signed releases, update feeds, or paid support.
- Do not create a new documentation platform before the Markdown pilot proves it is necessary.
- Do not use AI-generated screenshots, AI-generated code, or AI-generated Haros logos as evidence.

## 16. Execution-readiness contract

### 16.1 Campaign and run boundary

The complete Guidebook is a multi-milestone Campaign, not one orchestration run. Before production,
create or update one canonical Campaign spec through the repository's goal workflow. That spec
references this plan rather than copying its chapter, visual, or publication truth.

Each orchestrated run delivers one frozen milestone:

| Run | Frozen outcome                                                      |
| --- | ------------------------------------------------------------------- |
| 1   | Phase 0 freeze, Guidebook skeleton, and the three-chapter pilot     |
| 2   | Parts I and II                                                      |
| 3   | Parts III and IV                                                    |
| 4   | Parts V and VI                                                      |
| 5   | Part VII and appendices                                             |
| 6   | Whole-guide integration, remaining media, and publication packaging |

Do not begin Run 2 until Run 1 proves the chapter template, visual masters, real-capture method, and
four-format derivation. A milestone may be revised by new source evidence, but adjacent product work
does not enter the Campaign automatically.

### 16.2 First-run Goal Spine

When Run 1 is explicitly authorized, freeze this minimum spine from current repository reality:

```text
RUN / SKILL: haros-guidebook-pilot / resolved zq-orchestrate path and hash
OUTCOME: A source-backed three-chapter Haros Guidebook pilot proves the editorial, visual,
         accessibility, evidence-capture, and publication contracts.
REQUIRED: R1 plan revalidation and edition pin; R2 docs/guide skeleton; R3 Chapters 3, 14, and 37;
          R4 nine generated publication assets; R5 three reproducible product captures;
          R6 source anchors and accessible equivalents; R7 website/HTML/PDF/EPUB render proof;
          R8 immutable candidate and one fresh Judge PASS.
NON_GOALS: Remaining 47 chapters; remaining 131 generated slots; product behavior or UI changes;
           full docs platform; release, publication, push, signing, or real user state.
CANONICAL: User decisions; this plan; AGENTS.md; README.md; docs/architecture.md; canonical source
           owners and focused tests at the pinned edition commit.
TASTE_DELTA: English-only Guidebook; image-led; exact short in-image English labels; Haros palette;
             calm editorial depth; no generated UI, code, logo, or futuristic AI-ad styling.
WORKSPACE: Exact checkout and source commit resolved at start; preserve all unknown changes,
           especially the existing .gitignore modification.
CANDIDATE -> DELIVERY: Immutable tree or complete artifact-hash manifest; advisory gate; local
                       delivery only; no push or external publication.
OPEN: R1–R8 at start.
NEXT: Re-read canonical sources, resolve exact workspace state, revalidate this plan, and pin the
      edition source commit.
```

Each REQUIRED item receives only the cheapest proof that can disprove it. The Campaign spec may
track milestone state, while this plan remains the editorial and publication contract; neither may
be replaced by a new ledger, visual registry, or duplicate navigation source.

At run start, resolve and hash the applicable skill files rather than copying their instructions into
the Campaign. Read `zq-orchestrate` before role creation, the user-designated `gpt-image-2` skill
before any image call, and `zq-ui` before UI capture or user-visible render inspection.

### 16.3 Role topology and parallelism

Use exactly one canonical Executor/integrator. In the current four-slot environment, Main plus the
Executor leaves room for at most two concurrent short-lived Workers. More Worker jobs may run in
bounded waves after earlier Workers stop; they never become additional Executors.

| Role        | Allowed responsibility                                                        |
| ----------- | ----------------------------------------------------------------------------- |
| Main        | Freeze outcome and taste; decide true scope changes and irreversible actions. |
| Executor    | Own integration, source truth, OPEN, candidate freeze, and all final writing. |
| Worker A    | One explicitly assigned chapter/source package or mutually exclusive path.    |
| Worker B    | One different chapter, media package, capture task, or publication proof.     |
| Fresh Judge | Review the complete frozen candidate once; return PASS or material findings.  |

Do not create an Alignment Supervisor initially. The pilot's scope and sources are sufficiently
bounded; a Supervisor becomes justified only if a material source conflict or dynamic work
reassignment creates real alignment risk. Do not create a semantic Sentinel. Stop all Workers before
creating the fresh Judge.

Recommended worker waves:

1. **Evidence wave** — mutually exclusive source packets for Chapters 3, 14, and 37 while the
   Executor freezes the skeleton, metadata, style brief, and publication conventions.
2. **Production wave** — chapter drafts and source-reviewed visual briefs in mutually exclusive
   paths; no figure prompt precedes its fact review.
3. **Media and proof wave** — generated assets, reproducible captures, accessibility equivalents,
   and publication smoke outputs, partitioned by non-overlapping asset slots.
4. **Integration** — Executor alone resolves terminology, running-journey continuity, navigation,
   checksums, and the final candidate.
5. **Judgment** — one fresh read-only Judge evaluates the immutable candidate against R1–R8.

### 16.4 Pilot acceptance matrix

| ID  | Required result                                    | Cheapest sufficient disproof                                             |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------ |
| R1  | Plan revalidated and edition source pinned         | Diff review, arithmetic checks, source-commit metadata                   |
| R2  | One Markdown source and one reading-order owner    | Structure scan, duplicate-nav check, internal-link check                 |
| R3  | Three complete, junior-readable pilot chapters     | Chapter contract audit and source-backed model-check answers             |
| R4  | Nine accepted, uniquely allocated generated assets | Sidecar inventory, checksums, full-resolution character and relation QA  |
| R5  | Three reproducible, sanitized product captures     | Fresh-home replay and capture metadata review                            |
| R6  | Facts, labels, and accessibility remain aligned    | Source-anchor check and essential-label textual-equivalent check         |
| R7  | Four publication targets preserve the same meaning | Render plus representative link, table, figure, PDF, and EPUB inspection |
| R8  | Candidate is independently acceptable              | Immutable candidate identity and one fresh Judge PASS                    |

The fresh Judge evaluates the eight validation dimensions in Section 11 as one matrix. A finding may
block delivery only when it binds to R1–R8, a non-goal, or a stated risk gate. Nice-to-have chapters,
new features, extra visual variants, and unrelated documentation cleanup remain adjacent value.

### 16.5 Stop conditions

Pause the run and return a material event when any of these occurs:

- source reality contradicts the central thesis, chapter promise, or a frozen REQUIRED item;
- a requested image reaches the three-candidate limit without exact text and semantic correctness;
- a capture would require real private Engine state, credentials, or an unreproducible user setup;
- accepted raster media reaches the 150 MB review threshold or any proposed asset would cross the
  200 MB stop threshold;
- publication requires an independent prose or navigation source;
- completing the pilot would require changing product behavior, public API, persistence, security,
  release state, or the protected `.gitignore` modification;
- control messages, reviews, or status artifacts begin growing faster than Guidebook output.

Normal image latency, a valid long render, or a Worker completing its bounded task is not a blocker
and does not justify another Executor, Supervisor, Judge, or repeated full validation.
