# Independent OmniMind V1 Campaign

> Status: active
>
> Founding baseline: `a5136ca38b895592ce6c7dda3a61a1a327d7beec`
>
> Campaign execution baseline: `b41e3d5334332db12218fd1275e16dd111c7124a`
>
> Canonical truth: this file is the only Campaign state source
>
> Product authority: `README.md`
>
> Execution authority: `AGENTS.md` and `execution-brief.md`

## 1. Objective

Deliver an independent, production-grade OmniMind V1 that proves the product constitution end to end:

- a small, durable domain core;
- a fixed `Agent | Chat` product shell with Agent on the left, Chat on the right, shared interaction grammar and distinct Folder authority;
- product-owned canonical Conversations and immutable Run snapshots that remain readable across Engine changes and Engine loss;
- multiple real Agent engines behind ACP-first ingress, with one bundled default engine and honest capability differences;
- a restrained but powerful desktop workbench;
- local and remote files, terminals, processes and durable batch execution;
- file-native, inspectable and recoverable Wiki knowledge work;
- one neutral capability mechanism for all external and professional tools;
- first-class compatibility with the selected engine ecosystem without importing its product ontology;
- bundled first-party strategies and adapters that remain lazy, replaceable and state-neutral;
- automatic, staged and rollback-safe extension updates;
- honest trust, side-effect, recovery and provenance semantics;
- measured performance;
- several materially different real workloads succeeding on the same domain-neutral core.

This Campaign is not complete when a demo runs or when the producer believes the architecture is sound. It is complete only when every required claim is verified on one frozen final SHA, the relevant final gate passes, no blocker remains, and a fresh-context completion audit finds no material issue.

## 2. Authority and reading order

Every executor starts by reading, in order:

1. `AGENTS.md`
2. `README.md`
3. `execution-brief.md`
4. `discovery-record.md`
5. this Campaign spec

The documents have distinct authority:

- `README.md` owns product definition, identity cleanliness, source disclosure and architecture doctrine;
- `AGENTS.md` owns resident execution constraints;
- `execution-brief.md` owns construction order and proof design;
- `discovery-record.md` preserves maintainer intent and corrections;
- this file alone owns Campaign milestones, acceptance status and evidence.

Do not create another mission, ledger, manifest, decision register, handoff, progress report or completion checklist. Durable design detail belongs in the governing product document; Campaign progress belongs here.

## 3. Locked decisions

Product decisions are not copied into this Campaign. They are locked by the root `README.md`, especially:

- `Product identity` and `Product invariants`;
- `Product-native and external capabilities`;
- `Domain is only a workload`;
- `E0 ecosystem seven-category source freeze`;
- `Unified layering`, `single state authority`, `automatic update` and `behavioral acceptance`.
- `Agent | Chat product ontology`, `Conversation and Run authority`, `ACP-first multi-engine boundary`, `Models and Agents settings`, `permission enforcement truth`, `UI source takeover` and `bilingual usability contract`.

This Campaign locks only completion mechanics:

- M1 contains five disposable probes;
- a probe may disprove a technical choice but cannot silently change product doctrine;
- any product-decision change amends `README.md` first;
- this file alone records claims, status, evidence and candidate SHA;
- no producer self-certifies Campaign completion.

## 4. Authorization and boundaries

### 4.1 Authorized

- create, delete, rename and refactor all product code and documentation in this repository;
- use one implementation directly, fork it, transplant large subsystems or rewrite it;
- inspect declared source repositories at fixed revisions;
- run focused local tests and bounded real remote probes using already authorized resources;
- create incremental commits and push this repository;
- delete failed experiments after their conclusions are captured here;
- replace a chosen implementation when evidence disproves it.

### 4.2 Not authorized by this Campaign

- make the repository public;
- publish packages, installers or releases;
- rotate credentials;
- delete persistent remote user data;
- run unbounded or high-cost compute;
- modify the old product except for separately authorized coordination;
- rewrite shared history or force-push;
- choose a permanent distribution license without maintainer confirmation;
- make patient-level autonomous clinical decisions.

If a required proof needs one of these actions, mark the affected item `blocked` with the exact decision needed. Do not silently shrink the claim.

## 5. Execution model

- Work directly in this saved project unless isolation for one broad candidate is clearly necessary.
- At most one Campaign branch/worktree exists at a time.
- Use incremental, coherent commits; keep `main` usable.
- Development runs focused checks only.
- A milestone becomes `candidate` only with concrete evidence and a SHA.
- Objective machine-checkable claims may become `verified` from deterministic evidence.
- Coverage, product quality and high-ambiguity claims require a fresh-context evaluator.
- The producer never marks the whole Campaign complete.
- A changed candidate SHA returns affected verified claims to `candidate`.
- An unchanged candidate is not repeatedly audited.
- If two work cycles produce no acceptance-state transition, stop narration, update this spec with the actual blocker or new hypothesis, and use a fresh executor.

### 5.1 Maintainer taste as an execution constraint

`AGENTS.md › 工程判断` is the sole resident taste contract. The Campaign does not restate it.

At every candidate boundary, evidence must still answer four Campaign questions:

- can a user understand, control, verify and recover the work;
- does each concept have one durable name, owner and truth source;
- are performance and visible interaction measured rather than asserted;
- can the implementation, donor adaptation and compatibility layer be replaced or deleted without preserving a false abstraction.

### 5.2 Continuous drift supervision

The active development thread is subject to recurring read-only supervision:

- compare current work with `README.md` and this spec;
- inspect actual diff, tests and evidence rather than progress prose;
- challenge architecture drift, identity leakage, duplicate truth, premature abstractions, weak naming, unmeasured performance and user-hostile interaction;
- correct the executor with concrete findings and the smallest next proof;
- avoid commentary when work is aligned;
- never mark Campaign completion from supervision alone.

At every milestone boundary, record a concise drift verdict in that milestone's evidence section:

```text
Drift review: aligned | corrected
User value:
Architecture/naming:
Performance:
Visual/product quality:
Material correction, if any:
```

## 6. Evidence conventions

Evidence cells contain:

- exact command or real scenario;
- result location or concise measured result;
- commit SHA;
- evaluator identity when judgment is required.

Do not write:

- “implemented”;
- “looks good”;
- “tests pass” without the command;
- percentages of completion;
- evidence from a different SHA without dependency justification.

Secrets, raw credentials, private endpoints, personal identifiers and unredacted remote responses never enter this file.

## 7. Milestones

### M0 — Sterile foundation

Deliver:

- minimal workspace/package structure;
- one reproducible quality command;
- identity and structure checker that reads the root disclosure, scans path/name/source/generated-output surfaces and enforces the minimum tree policy;
- source and license handling path;
- no unnecessary empty frameworks;
- clean checkout verification.

Exit:

- F-01 and F-02 are at least `candidate`; F-03 begins with the M2 durable core;
- the repository contains no accidental external identity outside allowed surfaces;
- no product implementation has been copied before source and boundary review.

### M1 — Five disposable probes

Run outside the production author surface:

1. embedded Agent engine lifecycle plus ecosystem compatibility and context cost;
2. full-workbench transplant versus clean vertical-slice reconstruction;
3. durable runtime primitives: Todo, child Agent, Team mailbox, Dynamic Workflow, files, checkpoint and attention;
4. remote files, terminal and durable external execution through a minimal worker;
5. file-native knowledge recall plus extension artifact staging, automatic update and rollback.

Each probe records:

- fixed source revision and rights path;
- chosen option;
- rejected option;
- measurements;
- failure behavior;
- smallest production transplant;
- host concepts to remove;
- deletion/rollback route.

Exit:

- the five decisions are written into the relevant stable doctrine or the evidence section below;
- failed probe code is deleted;
- adopted sources are disclosed only in the root README;
- M2 has no unresolved architecture fork.

### M2 — Local walking skeleton

Deliver one complete local path on the approved full UI source baseline:

1. import the fixed complete UI source tree with exact provenance, legal text and a reproducible runnable baseline;
2. remove donor product identity and donor tree shape from authored surfaces without hiding provenance; the first adoption commit must pass source, path/name, generated-output and structure scans;
3. establish locale resources and a terminology policy that makes Simplified Chinese and English key journeys equally usable without mechanically translating technical terms;
4. render the fixed `Agent | Chat` order, create one folderless Chat and one OMStudio/Folder-backed Agent Conversation using the same Composer/Engine/Model/Reasoning system;
5. persist a canonical Conversation entry and immutable Run snapshot, then create or rebuild one managed ACP Engine lineage and start one Attempt;
6. map raw ACP/Bridge evidence into typed product facts, incremental projections and UI view models;
7. read and modify a file, stream one message/tool/permission/output path, and expose Diff/Terminal/File through the workbench;
8. show a stable concise live summary with expandable detail while keeping the default UI engine-neutral; an explicit Engine/Model switch changes next Run without creating a Conversation, Handoff, Toast or Timeline notice;
9. create checkpoint and diff, cancel or inject failure, restart the application and recover exact state;
10. restart and continue from the canonical Conversation without depending on an Engine transcript, duplicate runtime or weak Activity state bus; after cross-Engine divergence, returning to the old Engine rebuilds rather than resumes stale lineage.

The same skeleton also proves:

- Todo is reconstructed from the active Conversation branch;
- one foreground and one background child Conversation/Run share the same lifecycle reducer;
- a file write fails cleanly when its observed version is stale;
- checkpoint restore survives interruption without touching user Git state;
- attention and `outcome_unknown` return to the correct Attempt.
- `Approval required / Auto / Full access` is stored separately from `host-enforced / agent-enforced / mixed / unverified`;
- Chinese input/CJK layout and longer English labels both survive the critical path; Thinking/Planning, Git, Diff, PR, Token, ACP, paths, code and raw Agent process may remain English where clearer;
- the default surface does not present the bundled Engine as OmniMind's product identity.

Exit:

- F-03 through F-06, F-22, F-26 and F-29 through F-31 are at least `candidate`;
- one canonical user-visible Conversation truth; Engine-private transcripts remain non-authoritative caches;
- crash injection covers admission, attempt, action and file-write boundaries.

### M3 — Remote parity and durable external execution

Deliver:

- remote location connection through the system SSH stack;
- structured remote file, search, PTY and process operations;
- one multiplexed, versioned worker protocol;
- one concrete batch scheduler adapter;
- durable remote manifest and local external-execution reference;
- reconnect and authoritative reconciliation;
- large logs and outputs by reference;
- explicit transfer without transparent full mirroring.

Exit:

- F-07 through F-09 are at least `candidate`;
- application exit and network loss do not kill an external batch task;
- unknown outcomes remain unknown until reconciled.

### M4 — File-native Wiki

Deliver:

- immutable source handling;
- visible Markdown Wiki;
- source manifest, dependency and staleness tracking;
- index, query, save, refresh and lint flows;
- deterministic full-text projection;
- multi-file diff, checkpoint and rollback;
- local and remote in-place operation;
- a real approximately thousand-document corpus scenario;
- optional retrieval projections only when measured need exists.

Exit:

- F-10 through F-12 are at least `candidate`;
- changing, adding and deleting sources behave correctly;
- user edits are not silently erased;
- rebuildable projections can be deleted and recreated.

### M5 — Neutral capability ecosystem

Deliver:

- one capability contract for all external and professional tools;
- discovery without resident schema overload;
- progress, cancellation, structured errors and output references;
- execution-location and trust requirements;
- one external knowledge capability;
- one data or analysis capability;
- launch-grade compatibility for tool, skill, prompt and extension lifecycle with an explicit fail-fast report for unsupported host behavior;
- one dynamic workflow that changes route after intermediate evidence;
- one delegated Agent and one explicit Team mailbox scenario;
- bundled Browser, HTTP/web and MCP-like adapters using native Action receipts;
- content-addressed artifacts, Auto/Staged/Pinned, trust-envelope diff, safe-boundary activation and LKG rollback;
- graceful degradation when an external capability fails.

Exit:

- F-13 through F-15, F-23 through F-25, F-27 and F-32 are at least `candidate`;
- no external or domain product becomes a core type;
- no custom UI ABI is added without two proven consumers.

### M6 — Cross-domain product validation

Deliver at least three materially different workloads using the same general core. The set may include biomedical analysis, but no workload receives a product mode or domain ontology:

- a Chat without a folder;
- a folder-backed coding or editing task with live file inspection;
- a mixed-document knowledge task using visible Wiki and agentic search;
- a remote durable execution scenario;
- automatic child delegation and a user-steered child conversation;
- a Dynamic Workflow that replans;
- branchable work history and human redirection;
- reproducible files, logs, source links and receipts;
- safe automatic extension update and rollback;
- no patient-level, financial, publishing or production side effect without its separately scoped authority.

Exit:

- F-16 through F-18 and F-28 are at least `candidate`;
- product performance is measured along admission, engine, provider, tool, persistence, IPC, remote and render segments;
- the UI remains a restrained workbench rather than a chat or marketing surface.

### M7 — Candidate freeze and completion audit

Deliver:

- all required items at `candidate` or `verified`;
- one frozen candidate SHA;
- relevant build, test, identity, persistence, recovery, remote and UI gates once on that SHA;
- redacted real-environment evidence;
- fresh-context, read-only completion audit;
- material findings resolved and affected claims re-audited.

Exit only when the Done formula is true.

## 8. Acceptance matrix

| ID | Required claim | Proof type | Status | Evidence | SHA |
| --- | --- | --- | --- | --- | --- |
| F-01 | Product-authored paths, names, source text and controllable generated output contain no forbidden external identity outside the root disclosure, legal/manifest facts and explicit real-integration boundaries | deterministic source/path/generated scan | candidate | On `48c2fa919d2ea29702fa4b59971a67004945eba0`, `npm run quality` passed in a fresh local clone: 25 source files, 0 current generated files, 26 README-derived identity rules and the README-derived max depth 7; 31/31 tests include separate path/source/generated-output findings, automatic build-root discovery outside dependency trees, runtime-fixture fencing, forbidden-name/root/depth failures and source-inventory validation. The exact provenance baseline may temporarily fail author-tree identity by doctrine; the first production adoption candidate must repeat and pass this gate against its actual tree and generated output. | `48c2fa919d2ea29702fa4b59971a67004945eba0` |
| F-02 | Every adopted source has accurate revision, path, rights, mode, divergence and update policy in the root disclosure | deterministic inventory + legal review | candidate | `npm run check:sources` validated the root `source-adoptions` inventory; result: 0 adopted sources, so no legal text is currently required; malformed/missing-rights paths are covered by the quality tests | `99192d8fbfad41c0e6fc3fb36291f1ec9a242531` |
| F-03 | Durable domain state contains only necessary product facts with one authority per fact: OmniMind owns canonical Conversation/timeline and immutable Run snapshots; files, Git, external jobs and Engine-private state retain their real authorities | schema review + persistence tests + fresh evaluator | open | — | — |
| F-04 | Conversation/Run/Attempt/Action and opaque Engine lineage correlations survive restart, branch, Engine switching and Engine loss; Engine-private transcripts never become a competing product truth | recovery, replay and corruption tests across two Engines | open | — | — |
| F-05 | Side effects follow proposed/decided/started/settled-or-unknown semantics and are never blindly replayed | adversarial crash matrix | open | — | — |
| F-06 | The desktop workbench preserves the fixed `Agent | Chat` order, shared Composer/Engine/Model interaction, Folder/OMStudio distinction, long streaming work, file preview, diff, durable queue, interrupt and background status without unstable UI | UI tests + measured real scenario + fresh evaluator | open | — | — |
| F-07 | Local and remote locations share one product model while credentials and remote files keep correct ownership | contract tests + real remote scenario | open | — | — |
| F-08 | A batch task survives network loss, sleep and application restart and reconciles from its external authority | real scheduler scenario | open | — | — |
| F-09 | Remote file conflicts, caches, transfers, large output and reconnect do not create a second authority or silent overwrite | adversarial remote tests | open | — | — |
| F-10 | Wiki ingestion never modifies source files and all durable synthesis is visible, inspectable Markdown | source hash proof + file review | open | — | — |
| F-11 | Wiki provenance, staleness, multi-page updates, user edits, rebuild and rollback are correct under interruption | corpus tests + crash matrix | open | — | — |
| F-12 | Approximately thousand-file mixed knowledge work is useful without a mandatory heavy retrieval backend | measured corpus evaluation + fresh evaluator | open | — | — |
| F-13 | All external and professional tools use one capability contract without entering the core ontology | multiple real capabilities + API review | open | — | — |
| F-14 | Trusted locations avoid per-command confirmation while untrusted code and third-party extensions cannot execute by implication | trust matrix + adversarial tests | open | — | — |
| F-15 | Irreversible or high-cost external actions require separate, accurately scoped authorization | policy tests + scenario review | open | — | — |
| F-16 | Startup, first delta, streaming, long Conversation, background work, large output and remote latency meet measured budgets with attributable spans | performance suite + raw measurements | open | — | — |
| F-17 | The repository has no old-runtime compatibility track, speculative framework, hidden provider identity or duplicate product implementation | dependency/search audit + fresh evaluator | open | — | — |
| F-18 | Materially different workloads succeed on the same core without research, coding, knowledge or Remote product modes and domain types | end-to-end scenarios + fresh evaluator | open | — | — |
| F-19 | Relevant final gates pass once on the frozen final SHA | deterministic final gate | open | — | — |
| F-20 | Fresh-context completion audit reports no material finding on the frozen final SHA | independent completion audit | open | — | — |
| F-21 | Production code, public names, file tree and visible interaction form one coherent, elegant and maintainable system: `Agent | Chat` order is invariant, visible actions are not redundantly narrated, structure is shallow and single-duty, names are durable and precise, and no donor mirror/migration archaeology/vague container or avoidable performance debt remains | structure/static checks + architecture/name review + measured UI + fresh evaluator | open | — | — |
| F-22 | Todo, child Agent, Team, Dynamic Workflow, explicit Goal and Review have non-overlapping state authority and survive branch/restart correctly | reducer/replay tests + state-authority review | open | — | — |
| F-23 | Dynamic Workflow is generated and revised from live evidence, obeys hard limits, preserves retry lineage and never blindly replays an uncertain side effect | scenario tests + crash/receipt matrix | open | — | — |
| F-24 | The launch compatibility bridge runs supported ecosystem packages, reports unsupported host behavior before activation and never imports host ontology into product state or UI | real package matrix + identity/API review | open | — | — |
| F-25 | Bundled, curated and arbitrary extension artifacts update automatically within approved trust envelopes, activate only at safe boundaries and roll back to LKG without changing an active generation | update/migration/fault-injection matrix | open | — | — |
| F-26 | File writes use observed-version preconditions; Git stays optional authority; checkpoint restore covers create/modify/delete/rename and fails recoverably without destructive user-Git operations | filesystem/Git concurrency + recovery matrix | open | — | — |
| F-27 | Browser, HTTP, MCP-like and external actions produce native receipts and preserve `outcome_unknown` after post-dispatch disconnect, timeout or cancellation | protocol fault injection + real adapter scenarios | open | — | — |
| F-28 | Per-Conversation workbench state, folderless Chat scratch/read-only boundaries, Folder/OMStudio Agent behavior, live file viewing, child conversations, temporary questions, multi-format preview and platform conventions remain coherent, fast and recoverable on macOS, Windows and Linux | cross-platform UI scenarios + measured fresh evaluator | open | — | — |
| F-29 | Native ACP and at least one thin Bridge drive the same Conversation/Run/Engine-lineage contract; idle and next-Run Engine switching, stale-lineage rebuild, raw-event traceability and typed-fact/projection/view-model isolation are proven without wire data reaching React | two-engine conformance + event replay + type/API audit | open | — | — |
| F-30 | Approval-required, Auto and Full-access policy never overstate technical control; every Engine/ExecutionTarget reports host-enforced, agent-enforced, mixed or unverified from tested execution paths | per-engine permission matrix + deny side-effect tests + fresh evaluator | open | — | — |
| F-31 | Simplified Chinese and English users can complete every critical `Agent | Chat`, Engine/Model selection, Folder/OMStudio, workbench and recovery journey with coherent terminology; technical English remains where clearer and the default UI does not expose the bundled Engine as product identity | dual-locale end-to-end UI tests + CJK/long-label/accessibility checks + fresh evaluator | open | — | — |
| F-32 | A bundled-engine orchestration package can dispatch another ACP Agent as a bounded child with parent/origin/depth/cost/permission/target, cycle limits and one writer/integration owner without duplicating package Team/Workflow/Todo state | real nested-agent scenario + state-authority/write-admission audit | open | — | — |

## 9. Milestone evidence

Append concise milestone evidence here. Do not create separate reports.

### M0

Implementation candidate: `99192d8fbfad41c0e6fc3fb36291f1ec9a242531`

Strengthened pre-adoption gate: `48c2fa919d2ea29702fa4b59971a67004945eba0`

- `npm run quality`: identity scan passed for 11 candidate files and 26 README-derived rules; source inventory passed with 0 adopted sources; 4 tests passed.
- Fresh checkout proof: `git clone --local --no-hardlinks . <temporary>/repo` followed by `npm --prefix <temporary>/repo run quality`; the clone resolved to the implementation candidate and the same gate passed.
- The checker scans Git tracked and unignored candidate files, covers filenames and text, reports author versus generated/vendor metadata separately, and permits runtime-origin identity only through an explicit fixture argument.
- The root README now owns the machine-readable adoption inventory. Adopted source entries must carry revision, paths, rights, mode, changes, update policy and tracked legal texts before the gate passes.
- No product implementation, donor code, compatibility path or empty framework entered the repository.
- `npm run quality` on the strengthened gate passed in the working repository and a fresh no-hardlink local clone: 25 source files, 0 current generated files, 26 identity rules, max author depth 7 and 31/31 tests. The checker now separates path, source, generated-path and generated-output findings; discovers configured build roots even when ordinary source enumeration would omit them; excludes dependency trees; and enforces README-owned author roots, depth and forbidden naming tokens.

Drift review: aligned

User value: one command gives a reproducible, location-specific failure instead of relying on manual brand cleanup.

Architecture/naming: the gate reads both identity and adoption truth from the root README; no second inventory or copied denylist exists.

Performance: one Git candidate-file enumeration and one read per scanned file; no dependency install or build step is required.

Visual/product quality: no user-visible surface was introduced in this milestone.

Material correction, if any: the M0 exit text previously included F-03 even though M2 owns the first durable domain core. It now matches the milestone boundaries and leaves F-03 open until persistence evidence exists. Before full UI source takeover, the founding constraint was strengthened from content/filename identity scanning to resident identity plus tree cleanliness over source, path/name and generated output; F-21 remains open until the adopted production tree and visible system receive their own review.

### M1

Status: `candidate`

Candidate SHA: `7041ccbaaf9eb0ecddb171408a59ed0bf42f6843`

Probe A engine-core/artifact route provisional choice: `2f4ded82582ee91155d64d4aa5e0aa5721ce28eb`

- Fixed source `74caa2649f10ed71b4378ce69f5d9fbfd2466ca5`: a clean archive could not run its declared offline build without untracked generated model data. With the exact generated-data input and limitation recorded in `README.md §22.11`, the focused seven-suite command ran 28 tests: 27 passed and the cross-cwd session-replacement test timed out at 5 seconds; its isolated 20-second rerun also timed out.
- Published 0.83.0 artifacts resolve to `gitHead 845d6ff1f6643aba440341cce877ce1c43ebbc39`, 36 commits before the reviewed source, so artifact behavior was kept separate. Deterministic artifact execution covered session creation, streaming/tool lifecycle, active-tool switching, cancellation, persistence, branching and invalid-tail recovery; a 128 KiB tool result produced a 131,781-byte next-request context.
- Provisional route: minimal managed fork/upstream patch branch plus thin product adapter. It remains research evidence, not `source-adoptions`; current direct-package lineage, build inputs, public registry injection and cross-cwd behavior are insufficient. The exact downgrade-to-package gates are in `README.md §22.11`.
- The remaining Probe A package matrix closed at `7041ccbaaf9eb0ecddb171408a59ed0bf42f6843`; the engine-core choice remains provisional and no source adoption was added.
- Probe C durable-runtime choice: `8cff0b5f1544f13117dde3648f2a60b2a87d711a`. Four fixed-source archives kept their evidence separate: the plan reducer ran 14/14 focused tests; child lifecycle/control ran 107/107 targeted tests; the mailbox candidate passed its first 17 suites then stopped on a file absent from the fixed archive; the dynamic-orchestration candidate ran its declared check/build and 24/24 tests. The incomplete suite is not recorded as green.
- The repository-external native simulator ran 8/8 tests for branch/replay, foreground/background child lifecycle, message idempotency/TTL/receipts, evidence-driven mid-run replan, retry lineage/hard caps, CAS conflict, private recovery material, safety rollback and double-failure `outcome_unknown`. It proves the planned product invariants are implementable and falsifiable, not any donor.
- `README.md §22.12` removed an unavailable checkpoint revision from fixed-source evidence and records its lineage blocker. Probe C provisionally selects one product-owned append-only journal plus small reducers and a replaceable recovery seam; no source adoption or acceptance status changed.
- Probe B workbench route: `4da85e2524ed238e5462825111bdd908745a6ea5`. The fixed source renderer build completed after an isolated dependency install; its 22,548,793-byte output and direct host/state coupling counts are build and source-boundary evidence, not runtime performance or cross-platform proof. A focused eight-file command ran 53/53 tests: 49 fixed-source tests and four external pure-function state-boundary tests. The latter only demonstrate restart/session replacement gaps in the examined state contract.
- Probe B provisionally selects a product-owned Thread shell and message/state boundary plus bounded viewer, stream-feedback, file-change and activity mechanisms. A full renderer remains eligible only as stripped geometry/chrome, not as the product state authority. The exact M2 vertical slice and performance/restart/macOS-Windows-Linux revalidation gates are in `README.md §22.13`; no donor code, temporary UI artifact, visual approval or source adoption entered the repository.
- Probe D remote/durable route: `64ae06d22f370f02c94e8e8a2886403d3a965ecc`. Fixed-source suites were kept separate: request handling 6/6, reconnect 50/50, host API 68 passed with one named platform-inapplicable test skipped and zero failed, search 32/32, local PTY 1/1, transport policy/authentication unit and mock coverage 318/318, three loopback integrations 1/1 each, abrupt-disconnect stress 1/1, and the local durable backend's exact command completed 10 shell checkpoints, five Node test scripts and its final import with zero command failures. Loopback evidence does not prove a real remote host, jump authentication, changed host keys, HPC or scheduler behavior.
- The repository-external Probe D simulator ran 10/10 tests for submit-intent acknowledgement loss and token reconciliation, cancellation phases, bounded log reads and output references, partial-download hash verification and atomic activation, helper-generation coexistence and failed-health LKG rollback, restart reconciliation, and uncorrelatable disconnect as `outcome_unknown`. It proves the planned product contract is falsifiable, not donor or real-scheduler capability.
- Probe D provisionally selects system transport ownership of credentials and host trust, a bounded content-addressed capability helper, and product-owned Conversation/Run/Attempt journal receipts and reconciliation. Remote remains an on-demand execution target; no source adoption or acceptance status changed. The real-host, cross-platform and scheduler revalidation gates are in `README.md §22.14`.
- Probe E file-native knowledge and extension-generation route: `1c6ceb36bea1da8287c4c66ef12adac313adc7e1`. Fixed-source levels remain separate: the update/install suites ran 31/31; the optional knowledge unit command ran 126 passed / 57 failed / 0 skipped, with all 57 engine failures reporting model-worker fetch failure; the external-service source and test definitions were inspected, but two bounded Go commands never entered test execution and therefore have no passed/skipped/failed claim. Registry metadata for the update candidate was inspected separately and its official artifact was not run.
- The repository-external Probe E script ran 15/15 tests: six generated a reproducible 1000-source mixed corpus and verified manifest/visible Wiki/FTS initialization, source navigation, one- and ten-file incremental updates, delete/stale/manual-section protection, rebuild and a lexical synonym miss; nine used real minimal tar artifacts to verify exact digest, staging checks, material trust-envelope diff, Auto/Staged/Pinned and 24-hour-plus-jitter discovery, safe-boundary activation, five active generation leases, health quarantine/LKG rollback and self-updater rejection. The measured local initialization was 629.054 ms and 1,002,334 projection bytes; these are single-host probe values, not a cross-platform benchmark.
- Probe E provisionally selects source files as authority with deletable in-place manifest/Wiki/FTS projections, deterministic source references before any optional semantic projection, and one product-owned immutable artifact-generation pipeline. Real Agent/model navigation, semantic recall, production artifacts, migrations and cross-platform rollback remain explicit M2/M5 revalidation gates. No temporary corpus, index, artifact, donor code, source adoption or acceptance status entered the repository.
- Probe A package matrix kept source, artifact and local consumer evidence separate. Eight exact artifacts were materialized with lifecycle scripts disabled; five admitted observations used independent processes and only package-root public resource/session APIs, while three machine reports rejected code before loader activation. The public root mismatch from the first attempt remains negative host-API evidence rather than being bypassed with a deep import.
- The five admitted observations had zero loader errors. Actual paths covered ordinary web-tool failure and cancellation updates, stale plan revision, child discovery and missing-run status, dynamic-script validation and cancellation, browser input validation, skill/prompt resource loading, and active-only tool selection. Two behavior defects remain explicit: ordinary web failures returned error text without `isError`, and the dynamic sample streamed a completed label before surfacing cancellation. The main child and browser descriptors measured 24,504 and 22,123 bytes respectively, so they are not default context.
- The launch route at that SHA was a product-owned compatibility bridge over the provisional managed engine fork: exact immutable generation, machine preflight before code, public resource loading, task-scoped active schemas, normalized stream/cancel/failure, and product journal/output references. Package behavior and cross-engine product truth were kept separate; package-private plan, Team or Workflow state was not adopted or duplicated. No sampled artifact earned direct-compatible status, which is not generalized into an ecosystem failure or a 100% compatibility claim.
- All five M1 probe routes are sufficiently bounded for `candidate` on the SHA above. Later maintainer convergence superseded the single-engine adapter entry with ACP-first ingress, approved a complete fixed UI source takeover, and made bilingual usability plus engine-neutral front-end identity part of M2. This does not invalidate M1 measurements and does not promote any production claim: F-24 and every other unimplemented item remain `open`. Current M2 entry is `execution-brief.md §8`, not the older §22.11 slice alone.

Drift review: aligned

User value: avoids freezing an artifact that cannot be tied to the reviewed source and prevents large tool output from silently consuming the next model request.

Architecture/naming: the choice preserves product-owned state and does not add donor code, adoption inventory entries or production names.

Performance: selected-tool schema injection was measured; the large-output context cost is concrete rather than inferred.

Visual/product quality: not in this probe scope.

Material correction, if any: separated fixed source, official artifact and locally generated build evidence; the provisional fork choice cannot be promoted to permanent doctrine or M1 completion.

### M2

No production evidence yet. Full source takeover is gated on the strengthened F-01/F-21 checker and resident doctrine landing on `main` first.

### M3

No evidence yet.

### M4

No evidence yet.

### M5

No evidence yet.

### M6

No evidence yet.

### M7

No evidence yet.

## 10. Current next action

The next executor must:

1. verify the exact repository path, `main == origin/main`, clean status, and that this Campaign plus the final doctrine commit remain in current history;
2. read the five authority documents in order and run the existing focused quality/document gates before changing production; preserve historical evidence and keep every unimplemented claim `open`;
3. before full source import, keep the resident identity/tree doctrine and README-driven checker green; use at most one Campaign branch/worktree. One exact provenance baseline commit may temporarily contain the unchanged fixed source and fail author-tree identity/structure rules, but it must contain source/rights/legal disclosure, prove unchanged build/run, carry no new product code, never become a main/production candidate and be followed immediately by purification on the same branch;
4. do not rerun M1 or protect the current M2 skeleton. Start from `execution-brief.md §8`: import the complete fixed UI source, preserve provenance/legal text, restore its runnable baseline, then remove donor path mirrors and recover all identity/structure gates before the first production candidate;
5. in one vertical path establish locale resources, the invariant `Agent | Chat` order, one folderless Chat plus one OMStudio/Folder-backed Agent Conversation, canonical timeline, frozen Run, managed ACP lineage, raw-evidence/typed-fact/projection/view-model layers, one message/tool/permission/output, inline progress, expanded Diff/Terminal/File, durable queue, cancel/failure/restart and honest enforcement level;
6. keep the default UI engine-neutral; only reveal real Engine names in user choice, source, diagnostics, permission truth and legal surfaces. Do not mechanically translate Thinking/Planning, Git, Diff, PR, Token, ACP, code, paths or raw Agent process when English is clearer;
7. delete the same path's old M2, Provider-first and weak Activity dual tracks after the replacement is proven. Preserve important UI surfaces such as Git, PR, Kanban and Automations even if later milestones connect their full runtime;
8. add actual adoptions to root `source-adoptions` with exact rights and attribution in the same commit; move only affected claims to `candidate` with commands, artifacts and SHA. Never self-certify Campaign completion.

Do not begin by redesigning the approved UI from screenshots, protecting sunk cost, swapping the `Agent | Chat` order, reviving Projects/Studio/This Mac ontology, binding a Conversation to one permanent Engine Session, narrating explicit user switches with Toast/Timeline noise, exposing the bundled Engine as product identity, routing ACP wire data into React, creating a generic `payload: unknown` state bus, building a speculative public SDK, implementing every provider, turning Remote into a product mode, or defaulting to heavy retrieval.

## 11. Blockers

None at Campaign start.

## 12. Done

```text
DONE = F-01..F-32 all verified on the final SHA
       && blocked = 0
       && relevant final gates pass on that SHA
       && fresh completion audit has no material finding
```

The producer may report a candidate. Only the evidence state above and an independent final audit can close the Campaign.
