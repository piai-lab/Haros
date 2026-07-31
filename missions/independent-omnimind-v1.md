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
- an embedded general Agent engine behind a stable responsibility boundary;
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
- identity cleanliness checker that reads the root disclosure;
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

Deliver one complete local path:

1. trust a local location;
2. create a Thread;
3. persist turn admission;
4. start one engine attempt;
5. read and modify a file;
6. stream batched output and action state;
7. create checkpoint and diff;
8. restart the application;
9. recover exact state;
10. branch and continue.

The same skeleton also proves:

- Todo is reconstructed from the active Thread branch;
- one foreground and one background child Thread share the same lifecycle reducer;
- a file write fails cleanly when its observed version is stale;
- checkpoint restore survives interruption without touching user Git state;
- attention and `outcome_unknown` return to the correct Attempt.

Exit:

- F-03 through F-06, F-22 and F-26 are at least `candidate`;
- no duplicate transcript truth;
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

- F-13 through F-15 and F-23 through F-25 and F-27 are at least `candidate`;
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
| F-01 | Product-authored files contain no forbidden external identity outside the root disclosure and legal texts | deterministic scan + filename scan | candidate | `npm run quality` scanned 11 candidate files against 26 README-derived rules; filename/content and explicit runtime-fixture tests passed in the working repository and a fresh local clone | `99192d8fbfad41c0e6fc3fb36291f1ec9a242531` |
| F-02 | Every adopted source has accurate revision, path, rights, mode, divergence and update policy in the root disclosure | deterministic inventory + legal review | candidate | `npm run check:sources` validated the root `source-adoptions` inventory; result: 0 adopted sources, so no legal text is currently required; malformed/missing-rights paths are covered by the quality tests | `99192d8fbfad41c0e6fc3fb36291f1ec9a242531` |
| F-03 | Durable domain state contains only necessary product facts with one authority per fact | schema review + persistence tests + fresh evaluator | open | — | — |
| F-04 | Engine transcript is not duplicated and Thread/Turn/Attempt/Action correlations survive restart and branch | recovery and corruption tests | open | — | — |
| F-05 | Side effects follow proposed/decided/started/settled-or-unknown semantics and are never blindly replayed | adversarial crash matrix | open | — | — |
| F-06 | The desktop workbench supports long streaming work, files, preview, diff, queue, interrupt and background status without unstable UI | UI tests + measured real scenario + fresh evaluator | open | — | — |
| F-07 | Local and remote locations share one product model while credentials and remote files keep correct ownership | contract tests + real remote scenario | open | — | — |
| F-08 | A batch task survives network loss, sleep and application restart and reconciles from its external authority | real scheduler scenario | open | — | — |
| F-09 | Remote file conflicts, caches, transfers, large output and reconnect do not create a second authority or silent overwrite | adversarial remote tests | open | — | — |
| F-10 | Wiki ingestion never modifies source files and all durable synthesis is visible, inspectable Markdown | source hash proof + file review | open | — | — |
| F-11 | Wiki provenance, staleness, multi-page updates, user edits, rebuild and rollback are correct under interruption | corpus tests + crash matrix | open | — | — |
| F-12 | Approximately thousand-file mixed knowledge work is useful without a mandatory heavy retrieval backend | measured corpus evaluation + fresh evaluator | open | — | — |
| F-13 | All external and professional tools use one capability contract without entering the core ontology | multiple real capabilities + API review | open | — | — |
| F-14 | Trusted locations avoid per-command confirmation while untrusted code and third-party extensions cannot execute by implication | trust matrix + adversarial tests | open | — | — |
| F-15 | Irreversible or high-cost external actions require separate, accurately scoped authorization | policy tests + scenario review | open | — | — |
| F-16 | Startup, first delta, streaming, long Thread, background work, large output and remote latency meet measured budgets with attributable spans | performance suite + raw measurements | open | — | — |
| F-17 | The repository has no old-runtime compatibility track, speculative framework, hidden provider identity or duplicate product implementation | dependency/search audit + fresh evaluator | open | — | — |
| F-18 | Materially different workloads succeed on the same core without research, coding, knowledge or Remote product modes and domain types | end-to-end scenarios + fresh evaluator | open | — | — |
| F-19 | Relevant final gates pass once on the frozen final SHA | deterministic final gate | open | — | — |
| F-20 | Fresh-context completion audit reports no material finding on the frozen final SHA | independent completion audit | open | — | — |
| F-21 | Production code, public names and visible interaction form one coherent, elegant and maintainable system with no vague containers or avoidable performance debt | static checks + architecture/name review + measured UI + fresh evaluator | open | — | — |
| F-22 | Todo, child Agent, Team, Dynamic Workflow, explicit Goal and Review have non-overlapping state authority and survive branch/restart correctly | reducer/replay tests + state-authority review | open | — | — |
| F-23 | Dynamic Workflow is generated and revised from live evidence, obeys hard limits, preserves retry lineage and never blindly replays an uncertain side effect | scenario tests + crash/receipt matrix | open | — | — |
| F-24 | The launch compatibility bridge runs supported ecosystem packages, reports unsupported host behavior before activation and never imports host ontology into product state or UI | real package matrix + identity/API review | open | — | — |
| F-25 | Bundled, curated and arbitrary extension artifacts update automatically within approved trust envelopes, activate only at safe boundaries and roll back to LKG without changing an active generation | update/migration/fault-injection matrix | open | — | — |
| F-26 | File writes use observed-version preconditions; Git stays optional authority; checkpoint restore covers create/modify/delete/rename and fails recoverably without destructive user-Git operations | filesystem/Git concurrency + recovery matrix | open | — | — |
| F-27 | Browser, HTTP, MCP-like and external actions produce native receipts and preserve `outcome_unknown` after post-dispatch disconnect, timeout or cancellation | protocol fault injection + real adapter scenarios | open | — | — |
| F-28 | Per-Chat workbench state, live file viewing, child conversations, temporary question branches, multi-format preview and platform conventions remain coherent, fast and recoverable on macOS, Windows and Linux | cross-platform UI scenarios + measured fresh evaluator | open | — | — |

## 9. Milestone evidence

Append concise milestone evidence here. Do not create separate reports.

### M0

Implementation candidate: `99192d8fbfad41c0e6fc3fb36291f1ec9a242531`

- `npm run quality`: identity scan passed for 11 candidate files and 26 README-derived rules; source inventory passed with 0 adopted sources; 4 tests passed.
- Fresh checkout proof: `git clone --local --no-hardlinks . <temporary>/repo` followed by `npm --prefix <temporary>/repo run quality`; the clone resolved to the implementation candidate and the same gate passed.
- The checker scans Git tracked and unignored candidate files, covers filenames and text, reports author versus generated/vendor metadata separately, and permits runtime-origin identity only through an explicit fixture argument.
- The root README now owns the machine-readable adoption inventory. Adopted source entries must carry revision, paths, rights, mode, changes, update policy and tracked legal texts before the gate passes.
- No product implementation, donor code, compatibility path or empty framework entered the repository.

Drift review: aligned

User value: one command gives a reproducible, location-specific failure instead of relying on manual brand cleanup.

Architecture/naming: the gate reads both identity and adoption truth from the root README; no second inventory or copied denylist exists.

Performance: one Git candidate-file enumeration and one read per scanned file; no dependency install or build step is required.

Visual/product quality: no user-visible surface was introduced in this milestone.

Material correction, if any: the M0 exit text previously included F-03 even though M2 owns the first durable domain core. It now matches the milestone boundaries and leaves F-03 open until persistence evidence exists.

### M1

Probe A engine-core/artifact route provisional choice: `2f4ded82582ee91155d64d4aa5e0aa5721ce28eb`

- Fixed source `74caa2649f10ed71b4378ce69f5d9fbfd2466ca5`: a clean archive could not run its declared offline build without untracked generated model data. With the exact generated-data input and limitation recorded in `README.md §22.11`, the focused seven-suite command ran 28 tests: 27 passed and the cross-cwd session-replacement test timed out at 5 seconds; its isolated 20-second rerun also timed out.
- Published 0.83.0 artifacts resolve to `gitHead 845d6ff1f6643aba440341cce877ce1c43ebbc39`, 36 commits before the reviewed source, so artifact behavior was kept separate. Deterministic artifact execution covered session creation, streaming/tool lifecycle, active-tool switching, cancellation, persistence, branching and invalid-tail recovery; a 128 KiB tool result produced a 131,781-byte next-request context.
- Provisional route: minimal managed fork/upstream patch branch plus thin product adapter. It remains research evidence, not `source-adoptions`; current direct-package lineage, build inputs, public registry injection and cross-cwd behavior are insufficient. The exact downgrade-to-package gates are in `README.md §22.11`.
- Still open inside Probe A: the real ordinary-tool/Todo/child-Agent/Dynamic-Workflow/fail-fast package matrix and its headless/UI/session-control/second-truth reports. M1 is not `candidate` and no acceptance item changed status.
- Probe C durable-runtime choice: `8cff0b5f1544f13117dde3648f2a60b2a87d711a`. Four fixed-source archives kept their evidence separate: the plan reducer ran 14/14 focused tests; child lifecycle/control ran 107/107 targeted tests; the mailbox candidate passed its first 17 suites then stopped on a file absent from the fixed archive; the dynamic-orchestration candidate ran its declared check/build and 24/24 tests. The incomplete suite is not recorded as green.
- The repository-external native simulator ran 8/8 tests for branch/replay, foreground/background child lifecycle, message idempotency/TTL/receipts, evidence-driven mid-run replan, retry lineage/hard caps, CAS conflict, private recovery material, safety rollback and double-failure `outcome_unknown`. It proves the planned product invariants are implementable and falsifiable, not any donor.
- `README.md §22.12` removed an unavailable checkpoint revision from fixed-source evidence and records its lineage blocker. Probe C provisionally selects one product-owned append-only journal plus small reducers and a replaceable recovery seam; no source adoption or acceptance status changed. M1 remains open for Probes B/D/E and Probe A's package matrix.

Drift review: aligned

User value: avoids freezing an artifact that cannot be tied to the reviewed source and prevents large tool output from silently consuming the next model request.

Architecture/naming: the choice preserves product-owned state and does not add donor code, adoption inventory entries or production names.

Performance: selected-tool schema injection was measured; the large-output context cost is concrete rather than inferred.

Visual/product quality: not in this probe scope.

Material correction, if any: separated fixed source, official artifact and locally generated build evidence; the provisional fork choice cannot be promoted to permanent doctrine or M1 completion.

### M2

No evidence yet.

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

1. verify repository path, `origin/main`, clean status and the final doctrine-freeze SHA;
2. run `npm run quality`, plus any later documentation-anchor or task-governance checks that actually exist in the current tree;
3. read the root cross-category freeze instead of reconstructing decisions from historical chats;
4. prepare the five M1 probes outside the production author surface with one owner and one falsifiable success condition each;
5. prove engine-ecosystem compatibility and artifact governance before opening general package installation;
6. freeze probe choices into the governing doctrine or this Campaign evidence, delete failed probe code, then begin M2;
7. leave F-01/F-02 historical evidence intact but rerun affected checks before claiming a new candidate SHA.

Do not begin by importing a complete old product, building a speculative public SDK, implementing every provider, turning Remote into a product mode, defaulting to heavy retrieval, or polishing a full UI before the interaction skeleton has evidence.

## 11. Blockers

None at Campaign start.

## 12. Done

```text
DONE = F-01..F-28 all verified on the final SHA
       && blocked = 0
       && relevant final gates pass on that SHA
       && fresh completion audit has no material finding
```

The producer may report a candidate. Only the evidence state above and an independent final audit can close the Campaign.
