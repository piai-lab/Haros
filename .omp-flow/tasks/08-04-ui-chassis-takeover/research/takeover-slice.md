---
type: "Research"
title: "First production takeover slice study"
---

# First production takeover slice study

## 1. Question and decision criteria

The question is not which components look reusable. It is which first source boundary can preserve
the approved product chassis while preventing the imported execution system from becoming a second
OmniMind runtime.

The selected boundary must satisfy all of these conditions:

1. preserve the whole user-visible workbench dependency closure rather than redraw screenshots;
2. remain runnable at every declared checkpoint;
3. create the physical target responsibilities `apps/web`, `apps/desktop`, `apps/service`, and the
   shared contract packages without a permanent donor mirror;
4. make `Agent | Chat` and typed Product State the next product seam, not add a parallel shell or
   React-only mock state;
5. keep Pi and other Engine executable code outside Electron Main and renderer;
6. expose and then replace competing Session, queue, retry, Package and recovery authority instead
   of hiding it behind a renamed `Provider` abstraction;
7. pass source, identity, build, behavior and visual proof before becoming a production candidate.

## 2. Observed dependency closure

The fixed tree is a monorepo, not a component library. Its root workspaces include every `apps/*`,
both shared packages and the build scripts. The desktop build packages the Web client through the
Server build, and Electron Main supervises that Server child.

| Physical source | Observed size / coupling | Stable product value | Authority conflict |
| --- | --- | --- | --- |
| `vendor/ui/apps/web/src` | about 284k lines; 765 authored source files plus the 4,014-file static glyph corpus; imports contracts/shared throughout | shell geometry, Sidebar row grammar, Composer, Timeline, Viewer, Diff, Terminal, Browser, Git/PR/Kanban/Automation surfaces, stream/scroll mechanics | React consumes donor Thread/Project/Provider schemas and performs substantial event coalescing and reconciliation in `routes/__root.tsx` |
| `vendor/ui/apps/desktop/src` | about 40k lines; Electron 40; Main supervises the backend and owns window/update/browser/permission/crash behavior | window lifecycle, secure preload validation, menus, keychain-ready host boundary, notifications, updater, browser host, renderer/backend recovery | current Main knows `apps/server`, donor storage/protocol/env identities and one monolithic backend lifecycle; it must supervise Product Service and Native Host separately |
| `vendor/ui/apps/server/src` | about 296k lines; 824 tracked files | durable product control, persistence, typed WS admission, projection, Git, Terminal, workspace, attachments, automation and recovery mechanisms | `provider` (~86k lines), `orchestration` (~60k), `agentGateway` (~17k) and their composition jointly own Engine Session, turn queue/steer, retry, model/provider ontology, runtime ingestion and Package/Skill prompt behavior |
| `vendor/ui/packages/contracts/src` | about 18k lines | typed wire contracts and identifiers | `orchestration.ts` freezes a static provider union, Thread ontology, provider options and `ProviderEvent.payload: unknown`; this cannot be the permanent Product State ingress |
| `vendor/ui/packages/shared/src` | about 15k lines | cross-process pure mechanics | exports donor storage/desktop identity and Thread/Provider-specific helpers alongside general mechanics |
| root scripts/config/lock/patches | Bun/Turbo build and release dependency closure | reproducible install, build, package and smoke paths | hard-code donor package names, `apps/server`, identity, artifact and update policy |

The build coupling is explicit:

- `apps/server/scripts/cli.ts` builds Web and copies it into `apps/server/dist/client`;
- `apps/desktop/src/main.ts` resolves and supervises `apps/server/dist/index.mjs`;
- `scripts/build-desktop-artifact.ts` stages the same Server distribution and its production
  dependencies;
- `apps/web/src/routes/__root.tsx` subscribes to shell/thread snapshots and projects donor
  orchestration events directly into the Zustand store;
- `packages/contracts/src/orchestration.ts` combines Product, Engine and transport concepts in one
  public schema surface.

Therefore `apps/web` alone is not a runnable or truthful source-domain slice. Hand-picking it would
either retain imports into `vendor/ui`, create a permanent cross-tree dependency, or force a thin
replacement state that violates the approved workbench.

## 3. Strongest competing approaches

### A. Promote the exact whole tree first

The strongest case is behavioral preservation. A path-only promotion of the entire fixed tree keeps
all hidden build, window, stream, scroll, persistence, recovery and test relationships. It also gives
Git an unambiguous byte-for-byte baseline before product surgery.

It is not sufficient as a product candidate:

- the exact baseline already exists and is proven under `vendor/ui`; a second untouched copy adds no
  evidence;
- it imports donor branding, branded assets, package names, storage/protocol identifiers, release
  policy, marketing/research debris and the competing Agent runtime;
- the current source and identity gates intentionally exempt only the exact provenance root. Once
  edited production paths cease to be exact, all author paths must satisfy OmniMind naming and
  structure policy;
- a long-lived promoted baseline would turn a temporary proof checkpoint into the product.

This approach is acceptable only as a short-lived, explicitly non-candidate Git checkpoint on the
Campaign branch, immediately followed by responsibility surgery. It must never be merged or
described as production adoption by itself.

### B. Transplant one domain at a time

The strongest case is authority precision. Product control, UI projection and execution code could be
moved only after each target contract exists, leaving no known duplicate owner at any accepted
checkpoint.

Applied file-by-file or component-by-component, however, it is unsound for this mother:

- the Web shell relies on hundreds of store, route, contract and native bridge relationships;
- Desktop, Web and Service share build/package assumptions;
- normal-path screenshots do not prove failure, recovery, keyboard, stream or scroll behavior;
- the temporary boundary would be `apps/* -> vendor/ui/*`, which is exactly the permanent donor
  mirror the architecture forbids.

Domain-by-domain replacement is required after direct transplant, but it cannot replace the initial
physical transfer of the runnable dependency closure.

## 4. Selected strategy: one dependency-closure lift, then authority strangulation

Use the existing exact `vendor/ui` commit as the provenance baseline. Do not create another complete
copy. The first implementation wave performs a Git-native direct transplant of the **runnable product
dependency closure**, then immediately replaces its product and authority seams before any production
candidate is declared.

### Checkpoint T0 — existing exact baseline

Already present and immutable in Git: the complete fixed source tree, exact-tree proof, unchanged
build/typecheck/macOS desktop smoke, and documented upstream test failures. This checkpoint remains
evidence only. No unchanged probe is repeated.

### Checkpoint T1 — direct physical transplant (non-candidate)

Move, do not selectively recreate:

- `apps/web` -> `apps/web`;
- `apps/desktop` -> `apps/desktop`;
- `apps/server` -> `apps/service`;
- `packages/contracts` and `packages/shared` -> their root production responsibilities;
- the exact build dependency closure from root config, lockfile, patches and scripts;
- only assets actually required by those runnable packages.

Do not promote marketing, donor planning/audit/docs, screenshots, contributor automation, development
archives or unrelated repository policy. Their omission is not UI hand-picking: they are outside the
runnable product dependency closure. Preserve provenance through the fixed revision, original paths,
Git rename evidence and legal disclosure.

T1 may contain mechanical path/package-resolution edits required by `apps/service`, but no redesigned
Product/Engine behavior. It is a source/product-identity hard-green rollback checkpoint, not a production candidate. The
remaining `vendor/ui` evidence tree is removed after transplant provenance and all adopted paths are
recorded; it cannot remain as a second buildable product tree.

### Checkpoint T2 — Product facts and typed ingress

Before visual product work:

1. preserve the T1 product/package/storage/protocol/update identity and complete authorized corpus proof;
2. merge the repository quality scripts into the Bun/Turbo workspace instead of losing the existing
   source/identity/document gates;
3. establish product-owned `Workspace`, `Conversation`, `Entry`, `Run`, `EngineBinding`,
   `ResourceRef` and `OperationReceipt` contracts;
4. create a typed Engine-to-Product fact ingress; raw ACP/Pi/provider events and generic unknown
   payload renderers stop at the service boundary;
5. rewire root Web subscription and store projection to those product facts.

This is direct replacement of the donor projection seam, not a second store beside the old one. A
compatibility translator may exist only inside the bounded takeover commit and must be deleted before
the domain is accepted.

### Checkpoint T3 — real `Agent | Chat` shell on Product State

Replace the current top-level routing semantics with the approved order and stable difference:

- `Agent` on the left, folder-backed and execution-authoritative;
- `Chat` on the right, no Primary Folder and read-only references by default;
- one shared Sidebar row grammar, Composer, Timeline and Workbench;
- no provider-first tabs or donor Studio/Home container ontology as top-level product truth.

Preserve shell geometry and mature components in place. This checkpoint changes ownership and
navigation semantics, not the approved visual mother. It requires bilingual stable copy, keyboard and
accessible naming tests, plus same-state visual review for any material drift.

### Checkpoint T4 — isolated Native Host and old authority deletion

Only after the typed dispatch/receipt seam exists:

1. Electron Main supervises Product Service and Native Host as separate children;
2. the Native Host alone imports Pi SDK and executable Pi ecosystem code;
3. Product Service owns pre-dispatch admission, durable Conversation/Run facts and Product Queue;
4. Pi owns accepted Engine operation, Session/transcript/compaction/branch/Package private state;
5. Host ingress returns accepted/rejected/delivery-unknown receipts before streaming typed facts;
6. crash/restart and uncertain-dispatch tests pass;
7. donor Provider adapters, Provider Session directory, runtime ingestion/command reactor and any
   duplicate queue/retry/Package authority are deleted, not aliased.

T4 is the earliest point at which the takeover can support a production candidate for the first real
Chat and folder-backed Agent journey.

## 5. First executable product slice

The smallest complete product slice is therefore not “the new navigation.” It is:

> the full runnable chassis dependency closure, with one Product-State-owned Conversation path feeding
> the preserved Composer/Timeline/Workbench through typed facts, and one supervised isolated Pi Native
> Host accepting one real Chat and one folder-backed Agent Run.

All other mature surfaces remain physically present and either keep mapped product-control behavior or
show a truthful bounded unavailable state with a re-entry path. Git, PR, Kanban, Automations, Viewer,
Diff, Terminal, child and Package discovery are not deleted merely because the first Native Host slice
does not yet drive every one of them.

## 6. Verification and deletion gates

| Gate | Minimum proof |
| --- | --- |
| provenance | fixed source/revision, original path -> target path map, Git rename/copy evidence, contributors/license/legal text, changed-byte classification |
| source/identity | no buildable donor mirror; adopted production paths declared; no donor identity in author paths/source/generated output; no forbidden temporary namespace |
| dependency closure | frozen install; root build/typecheck; Desktop launches Product Service; packaged-path resolution updated; no imports resolve back into `vendor/ui` |
| Product State | contract tests for Conversation/Run/Entry/receipt invariants; persisted and live facts have one owner; no generic payload reaches React |
| UI behavior | real `Agent | Chat`; send/queue/cancel/restart/failure path; stable stream and scroll; keyboard/a11y; bilingual critical path |
| visual | same state and viewport comparison against the approved mother; material drift requires founder review before deletion |
| process/authority | dependency scan proving no Pi SDK in Web/Desktop/Service; Host crash does not kill window/store; delivery-unknown is never blindly replayed |
| deletion | every removed source domain has a target owner, normal/failure/recovery replacement and relevant behavior/visual proof |

## 7. Falsifiers and stop conditions

Stop and revise this selection if any of the following is demonstrated:

- the rights review rejects core source or a non-replaceable required asset;
- the root dependency closure cannot build without donor-only non-product directories;
- `apps/service` cannot separate Product persistence/projection from Provider execution without a
  period where two durable authorities accept the same command;
- the preserved Workbench can consume typed product facts only through a permanent generic payload or
  provider-shaped React model;
- Native Host crash or delivery uncertainty cannot be contained without moving Pi executable code
  into Electron Main/renderer;
- direct transplant causes material geometry, performance, CJK, keyboard or accessibility regression
  that cannot be repaired with bounded surgery.

Absent a falsifier, neither a second research round nor a new UI direction is warranted. The next step
is a bounded design that turns T1-T4 into dependency-ordered work Concepts, with the first formal
production candidate only after T4 evidence.
