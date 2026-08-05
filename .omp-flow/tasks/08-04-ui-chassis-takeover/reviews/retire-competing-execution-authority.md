---
type: "Implementation Review"
title: "Final review: Retire competing execution authority"
work: "../work/retire-competing-execution-authority.md"
handoff: "../handoffs/retire-competing-execution-authority.md"
verdict: "PASS"
revision: "review-retire-competing-execution-authority-20260805-r4"
actor_id: "authority_retirement_typecheck_closure_reviewer_r1"
dispatch_receipt: "cdda7d13ad904f45b5aab1e03886ebfe"
predecessor_receipt: "cde4f34e307e4f8a88c5e178aa62f92e"
predecessor_output: "../handoffs/retire-competing-execution-authority.md"
reviewed_failure_receipt: "0a8729dd4f414cd29b5de90451542eae"
reviewed_revision: "handoff-retire-competing-execution-authority-20260805-r5 plus bounded typecheck-closure correction"
supersedes_revision: "review-retire-competing-execution-authority-20260805-r3"
---

# Final review: Retire competing execution authority

## Findings

No blocking or non-blocking finding within this P1-only re-review.

## Verdict

`PASS`.

The r2 legal-source P1 is closed on the current r5 candidate. The three existing Settings-linked legal files now form one
deterministic 230-component development-host closure:

- `release-dependencies.json` declares 230 components and contains 230 component records;
- `sbom.cdx.json` contains 230 components;
- `THIRD-PARTY-NOTICES.txt` declares 230 installed production components;
- relative to the previous 238-component source, exactly the eight reviewed donor dependency IDs were removed and no ID
  was added;
- none of those eight IDs remains in inventory, SBOM or notices;
- `licenses:check` passes without weakening the generator or host-closure equality.

All three source files are byte-identical to both `apps/web/dist/licenses` and
`apps/service/dist/client/licenses`. The reviewer then rebuilt the macOS arm64 ZIP from this repaired source. Packaging
locked and verified 230 production components/identities, staged the isolated Native Host, rebuilt AppSnap and validated
the ZIP. The same output directory passed the isolated packaged Service/Native Host process-tree startup smoke.

This verdict accepts the bounded legal-source repair and therefore the reviewed authority-retirement Work candidate. It
does not create a commit, verify a final SHA, approve publishing/signing/notarization, convert the recorded MiMo
empty-settlement residual into a provider PASS, or claim the OmniMind Campaign/V1 complete. The four r1 findings and
Product plan-control correction remain closed from the prior review and were not reopened.

## P1 resolution

### One checked-in and built legal truth

The canonical checked-in inventory changed from 238 to 230 components. A direct old-vs-current ID-set comparison produced
exactly these removals and `added=[]`:

- `@agentclientprotocol/sdk@1.2.1`;
- `@anthropic-ai/claude-agent-sdk-darwin-arm64@0.3.207`;
- `@anthropic-ai/claude-agent-sdk@0.3.207`;
- `@anthropic-ai/sdk@0.100.0`;
- `@opencode-ai/sdk@1.15.13`;
- `@stablelib/base64@1.0.1`;
- `fast-sha256@1.3.0`;
- `standardwebhooks@1.0.0`.

The same comparison found zero occurrences of those exact IDs in the current inventory, SBOM and notices. SHA-256 checks
over each source/Web-dist/Service-client triplet were identical, so the Settings-linked source and shipped client bytes no
longer disagree.

### Same-source packaged proof

The independent build used `/tmp/omnimind-review-r3.JYM8aa` and produced a 161 MiB
`OmniMind-0.1.0-alpha.0-arm64.zip` with SHA-256
`18c93d11f7d904cfff2f466862d931ab8e96ba030cec08466bd83a3a1e4b4d8c`. The build itself verified 230 disclosed
dependency identities inside `app.asar`; its output then passed the isolated packaged startup/process-tree verifier.
This is post-repair evidence rather than inherited r4 packaging evidence.

## Predecessor and review boundary

Reviewer operation `32801247ef5c4686925c3a7b70537b4e` resolves completed implementation predecessor
`aee22d5ec855416da1bcc24182202f15`. The predecessor entry is the assigned Work, and its output is the linked r5 handoff,
which links back to that same Work. Implementer actor `retire_competing_execution_authority_implementer_r5` differs from
reviewer actor `retire_competing_execution_authority_reviewer_r3`. The implementer operation records failed-review
predecessor `0a8729dd4f414cd29b5de90451542eae`.

The review was intentionally limited to the r2 legal-source P1: generated source content, exact dependency-set delta,
deterministic check, build-copy equality and post-repair package/startup proof. It did not re-review runtime, UI, provider,
Product-state or historical-schema decisions already closed. The reviewer made no production repair, did not edit the
Work/handoff/runtime/session records or an Evidence ledger, and did not stage, commit, push or merge. This linked Review
Concept is the only repository output.

## Independent verification

| Command / inspection | Result |
| --- | --- |
| predecessor/reviewer operation JSON, Work and r5 handoff linkage | PASS; completed predecessor, exact output, Work back-link and actor separation |
| `bun run licenses:check` | PASS, exit 0; deterministic development-host metadata verified for 230 components |
| old-vs-current inventory ID-set comparison plus current inventory/SBOM/notices parsing | PASS; 238 → 230; exact eight removals, zero additions; inventory/list and SBOM each contain 230 components; all three current files have zero retired-ID hits |
| `cmp` and SHA-256 over each legal file in Web public, Web dist and Service client dist | PASS; all three triplets are byte-identical |
| `node scripts/build-desktop-artifact.ts --platform mac --target zip --arch arm64 --output-dir /tmp/omnimind-review-r3.JYM8aa` | PASS, exit 0; 230-component locked closure, 230 packaged identities, AppSnap arm64 and validated 161 MiB ZIP |
| `node scripts/verify-packaged-desktop-startup.ts --assets-dir /tmp/omnimind-review-r3.JYM8aa --platform mac --arch arm64 --version 0.1.0-alpha.0 --timeout-ms 90000` | PASS, exit 0; isolated packaged Service/Native Host process tree |
| scoped `git diff --check` over the three legal source files | PASS; no output |

The first read-only old-inventory comparison exceeded Node's default synchronous child-process buffer and returned no
comparison result. It was rerun with an explicit 16 MiB read buffer and then produced the exact successful set comparison
recorded above; this was an inspection harness limit, not a product gate failure.

## Dispatch identity

- actorId: `retire_competing_execution_authority_reviewer_r3`
- receipt: `32801247ef5c4686925c3a7b70537b4e`
- predecessor receipt: `aee22d5ec855416da1bcc24182202f15`
- predecessor output: `../handoffs/retire-competing-execution-authority.md`
- reviewed failure receipt: `0a8729dd4f414cd29b5de90451542eae`

## Bounded typecheck-closure re-review — 2026-08-05

### Findings

No blocking or non-blocking finding within this four-file typecheck-closure correction.

### Verdict

`PASS`.

This bounded verdict supersedes r3 as the current Review Concept revision under reviewer operation
`cdda7d13ad904f45b5aab1e03886ebfe`; it does not invalidate or relabel the prior r3 evidence. The
four deleted Service scripts are orphan ACP-only fixtures/benchmark utilities, not current Product,
system-capability or Native Host mechanisms:

- `acp-conformance-agent.ts` identifies itself as an official-SDK transport conformance subprocess
  and imports only Node streams/files, `@agentclientprotocol/sdk` and Zod;
- `acp-mock-agent.ts` identifies itself as a deterministic ACP runtime-integration fixture, exports
  no API and imports only Node streams/files, the removed ACP SDK and Effect;
- `acp-wire-benchmark.ts` is a standalone official-SDK wire benchmark with CLI/output handling and
  no Product or system import;
- `compare-acp-wire-benchmarks.ts` only compares benchmark JSON files and has no production import.

A current-tree scan excluding task history finds no reference to any of the four names or to
`@agentclientprotocol/sdk`. Root and Service package scripts likewise have no command referring to
them. The only remaining file in `apps/service/scripts` is the active `cli.ts`; the deleted scripts
have no replacement shim, alias, tsconfig exclusion or dependency restoration. Their removal closes
the exact Service TypeScript failure recorded by the blocked Freeze handoff while leaving the
current Product/Host boundary unchanged.

### Predecessor, Work and diff boundary

The reviewer operation record resolves completed implementation predecessor
`cde4f34e307e4f8a88c5e178aa62f92e`. Its output is
`../handoffs/retire-competing-execution-authority.md`, whose bounded correction links back to the
assigned `../work/retire-competing-execution-authority.md` Work and to the blocked
`../handoffs/freeze-first-production-candidate.md` evidence. Implementer actor
`authority_retirement_typecheck_closure_implementer_r1` differs from reviewer actor
`authority_retirement_typecheck_closure_reviewer_r1`.

The actual production diff contains exactly four deletions and no other deleted path:

```text
apps/service/scripts/acp-conformance-agent.ts
apps/service/scripts/acp-mock-agent.ts
apps/service/scripts/acp-wire-benchmark.ts
apps/service/scripts/compare-acp-wire-benchmarks.ts
```

Together they remove 1,330 lines. The amended Work adds exactly these four paths to its allowlist,
and the appended handoff records the correction. `package.json`, `apps/service/package.json`,
`bun.lock`, `apps/service/tsconfig.json` and `tsconfig.base.json` are byte-identical to `HEAD`; no
Product/System/Native Host source, package configuration, lock graph, compiler boundary or runtime
record changed. Other pre-existing dirty and untracked paths were left untouched.

### Independent verification

| Command / inspection | Result |
| --- | --- |
| operation JSON inspection for `cde4f34e307e4f8a88c5e178aa62f92e` and `cdda7d13ad904f45b5aab1e03886ebfe`; Work/handoff link inspection | PASS; completed predecessor, exact output, same Work and different actors |
| current `rg` scan excluding `.git`, task history and the deleted files for the four filenames plus `@agentclientprotocol/sdk`; `git grep` at `HEAD` excluding the four files | PASS; zero consumer/reference hits |
| root and Service package-script inspection for ACP fixture/benchmark names; manifest/lock scan | PASS; zero script or dependency hits |
| `git show HEAD:<path>` import/purpose inspection for all four deleted files | PASS; three self-contained ACP SDK fixtures/benchmark files and one self-contained benchmark comparator; no Product/System/current-mechanism imports |
| `git diff --diff-filter=D --name-only --`; scoped numstat and physical-absence checks | PASS; exactly four deleted paths, 1,330 removed lines, all four absent |
| `git diff --exit-code -- package.json apps/service/package.json bun.lock apps/service/tsconfig.json tsconfig.base.json` plus worktree/`HEAD` blob hashes | PASS; no manifest, lockfile or tsconfig change; each worktree hash equals its `HEAD` blob |
| `bun run typecheck` in `apps/service` | PASS, exit 0; `tsc --noEmit` |
| `bun test scripts/execution-authority-boundary.test.ts` | PASS, exit 0; 1 file / 6 tests / 32 assertions |
| `bun run test -- src/product/ProductControlPlane.test.ts -t 'reopens the seven Product responsibilities without donor migrations\|reconciles delivery_unknown to accepted and then outcome_unknown without replay'` in `apps/service` | PASS, exit 0; Vitest 1 file / 2 tests, 30 skipped |
| root `bun run typecheck` | PASS, exit 0; 7/7 workspace tasks, zero cached |
| scoped `git diff --check --` over Work, handoff and four scripts | PASS; no output |

An initial reviewer invocation used `bun test` directly for the Product file. Bun's native runner
could not resolve that Node-SQLite fixture and collected zero tests. The package contract explicitly
uses Vitest, so the reviewer reran the identical two title filters through `bun run test --`; both
tests passed. This was a disclosed runner-selection error, not an implementation assertion failure.

### Scope limits and dispatch identity

This review accepts only the four-file typecheck-closure correction. It does not freeze a new SHA,
rerun the full Freeze matrix, renew live Provider/UI/package evidence, approve release actions or
verify a Campaign claim. No production repair was made by the reviewer; no stage, commit, push,
merge, runtime/session record or Evidence ledger was changed. There is no explicitly allowed
reviewer fix.

- actorId: `authority_retirement_typecheck_closure_reviewer_r1`
- receipt: `cdda7d13ad904f45b5aab1e03886ebfe`
- predecessor receipt: `cde4f34e307e4f8a88c5e178aa62f92e`
- predecessor output: `../handoffs/retire-competing-execution-authority.md`
- verdict: bounded `PASS`; return to integration/Freeze for a new coherent candidate
