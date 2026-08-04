# Source review

> Nature: fixed-source research evidence. It does not grant production authority or Campaign status.

## 1. Fixed input

- Repository: U1（exact source URL 只由根 `README.md` 的 adoption record 持有）
- Revision: `6aca3dcc505894481430967c2acb762b3dd1b358`
- Imported baseline: `vendor/ui`
- Tracked files at the fixed revision: 6,425
- Adoption mode: complete runnable provenance baseline, followed by responsibility-based surgery

The imported tree was compared against a separate `git archive` extraction at the same revision with no difference. This proves physical baseline exactness, not product adoption or compatibility.

## 2. Rights and lineage

- The fixed revision contains an MIT license with copyright attributed to T3 Tools Inc.
- Git history continuously includes the original original-upstream lineage and later contributors.
- A temporary downstream copyright change was later reverted before the fixed revision.
- The complete 4,014-file icon corpus is maintainer-authorized for retention, adaptation and redistribution in source and product artifacts. Screenshots, former product identity and other graphics remain excluded or require item-level rights and product-need review before a production candidate.

Legal text is preserved at `LICENSES/ui-mother-MIT.txt`. Source cleanliness must never erase authorship or legal provenance.

## 3. Product chassis facts

The source is not merely a renderer. It includes:

- Desktop lifecycle and process supervision;
- Web renderer and design system;
- Product server and transport;
- command admission and receipts;
- orchestration and projection pipelines;
- startup reconciliation and SQLite persistence;
- file, Git, terminal and attachment capabilities;
- external Agent gateways and provider processes.

Non-test TypeScript/TSX at the fixed revision, using one consistent filename filter:

| Area                            | Files |   Lines |
| ------------------------------- | ----: | ------: |
| `apps/server/src/provider`      |    95 |  47,097 |
| `apps/server/src/orchestration` |    47 |  24,679 |
| `apps/server/src/persistence`   |   141 |  16,848 |
| `apps/server/src/agentGateway`  |    33 |   8,748 |
| `apps/web/src`                  |   765 | 205,087 |
| `apps/desktop/src`              |    68 |  24,470 |

The Pi adapter alone is 2,944 lines. Fixed-source plan 006 explicitly records an intention to make the source product an authoritative Agent Harness. That design ambition is useful evidence, but it cannot become OmniMind authority merely because the code is mature.

Therefore “keep only UI and delete the whole server Runtime” is unsupported. The correct adoption unit is a responsibility: mature Product Control Plane mechanisms may survive when they preserve product facts and single authority; Engine-specific execution authority must be replaced when it competes with the native runtime.

## 4. Native Pi integration facts

`apps/server/src/provider/Layers/PiAdapter.ts` directly uses native Pi SDK capabilities, including:

- `createAgentSessionServices()`;
- `createAgentSessionFromServices()`;
- `createAgentSessionRuntime()`;
- `SessionManager.create/open()`;
- ResourceLoader-backed services;
- ExtensionRunner registered commands;
- model, Thinking, session, steer, abort and compaction paths.

This disproves the claim that the source can only reach Pi through a shallow RPC bridge. It already reaches the execution core and a substantial headless extension surface.

The same file also explicitly degrades or rejects important Host UI capabilities: terminal input hooks, widgets, header/footer, editor text/component APIs and autocomplete providers. Plugin mentions and plugin discovery are reported false. Native SDK use therefore does not prove complete Package UX compatibility.

At the fixed revision, Pi packages resolve to `0.81.1` through caret declarations. The exact npm artifacts for the four installed `@earendil-works/pi-*` packages identify upstream Git revision `20be4b18d4c57487f8993d2762bace129f0cf7c6`; their installed manifest bytes and that revision's MIT legal text are digest-bound in `assets/licenses/release-legal-overrides.json`. This proves package/source/legal provenance for the current generation, not production runtime compatibility. The separately inspected local Pi research tree is newer (`0.83.0`), which remains evidence of version-tracking pressure and the need for a conformance matrix.

Release legal output is target-derived rather than a static cross-platform catalogue. The checked-in Web files identify themselves as a development-host platform/arch snapshot. During Desktop packaging, inventory, CycloneDX SBOM and notices are regenerated from that target's staged production closure; the build then compares disclosed `name@version` identities bidirectionally with the actual ASAR. A missing packaged legal file is accepted only through an exact override locked to package ID, installed manifest digest, declared license, source revision and legal-text digest. This mechanism is packaging evidence for one target, not evidence that another platform has the same closure.

## 5. Local baseline results

Environment: macOS, Bun 1.3.14; the donor declares Bun ^1.3.9 / packageManager 1.3.12 and Node ^24.13.1, while the local Node used for repository work is newer.

| Check                                        | Result               | Interpretation                                                         |
| -------------------------------------------- | -------------------- | ---------------------------------------------------------------------- |
| `bun install --frozen-lockfile`              | pass                 | lockfile installs at the fixed revision                                |
| `bun run build`                              | pass                 | complete monorepo builds; warnings remain                              |
| `bun run typecheck`                          | pass                 | 7/7 tasks passed                                                       |
| `bun run lint`                               | exit 0, 364 warnings | not a clean lint baseline                                              |
| `bun run test`                               | fail                 | 5 files failed; 38 failed and 3,413 passed Web tests                   |
| `bun run test:desktop-smoke`                 | pass                 | Electron launched and the fixed desktop smoke completed                |
| migration lineage check in original Git tree | pass                 | released migration identifiers/names preserved across 77 tags          |
| donor brand check                            | fail                 | checker flags legal LICENSE and origin attribution as retired identity |

Most Web test failures share a storage-mock error (`storage.setItem is not a function`) across pinned, split-view and workflow UI stores. Three observed attachment-state failures do not share that single explanation. These failures are baseline defects or environment-sensitive tests until independently diagnosed; they must not be rewritten as “all upstream tests pass.”

The brand-check failure is not permission to alter legal text. It demonstrates that identity checks require explicit legal and research evidence boundaries.

The desktop smoke proves the unchanged fixed tree can launch through its upstream Electron smoke path on this macOS host. It does not prove product adoption, visual parity, Windows/Linux behavior or production packaging.

## 6. Compatibility conclusion

Current evidence supports four compatibility classes:

1. Native headless capabilities that can run unchanged through the official SDK.
2. Structured GUI bridges for select/confirm/input/status/progress-style interactions.
3. Real PTY capsules for packages dependent on raw TUI or custom terminal components.
4. Unsupported packages whose platform, lifecycle, native mutation or Host API requirements cannot be met honestly.

No evidence supports “all Gallery packages are mature,” “all TUI can become React,” “process isolation is a sandbox,” or “SDK integration automatically yields 100% ecosystem compatibility.”

## 7. Revalidation triggers

Re-run only the affected review when any of these changes:

- source revision or imported tree digest;
- license, contribution history or branded assets;
- Pi exact version, SDK surface or package format;
- Bun/Node/platform or packaged Electron path;
- native Host process boundary;
- structured UI bridge contract;
- a previously unsupported Package produces a reproducible counterexample.
