---
type: "Handoff"
title: "Direct-first public B1 review repair candidate"
status: "CANDIDATE"
work: "../work/direct-first-public-b1.md"
review: "../reviews/direct-first-public-b1.md"
candidate: "452b587208287b3383eff8eeecc5a3fd0d1baecc"
---

# Direct-first public B1 review repair handoff

## Assignment and transition

- Bundle: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `implementer`
- Actor ID: `direct_first_public_b1_repair_r1`
- Dispatch receipt: `3f690240ae57495293a232e7ea668341`
- Predecessor receipt: `f457f4f3b7fa42d1b8e6174f680a2892`
- Predecessor output: this linked handoff
- Work: [`direct-first-public-b1.md`](../work/direct-first-public-b1.md)
- Authority decision:
  [`product-truth-b1-alternate-authority-recovery.md`](../decisions/product-truth-b1-alternate-authority-recovery.md)
- Failed Product Review: [`direct-first-public-b1.md`](../reviews/direct-first-public-b1.md),
  receipt `4e09674cb24140dc9a552bb9e15c9bf5`, reviewed Product SHA
  `280976e44435d2331f589a9100397ba9d50446e3`

The new immutable repair candidate is
`452b587208287b3383eff8eeecc5a3fd0d1baecc` (parent
`62a6f013361623ae56e9eb6cbacb30113457c14b`, tree
`dd5561eff91cce87bc90c42732056da91ddb828d`). It contains exactly the twelve
authorized production/verification paths listed below and no v9, meter, framework, dependency,
lockfile, runtime/session, Harness, release, or unrelated path. This handoff is deliberately a
separate evidence change. Candidate status is not independent acceptance; the only authorized next
transition is one fresh different-actor Product Review of this SHA.

## Closed review findings

### 1. Durable database and Package destructive intermediates

- A classified database member is atomically renamed to the stable, enumerable identity
  `<name>.retiring-<sha256>-<size>`. A Package entry inside its stable outer
  `.discarding/<generation>.<tree-digest>` directory is atomically renamed to
  `.retiring-<base64url-logical-name>-<sha256>-<size>`.
- The exact renamed inode is opened no-follow, identity/size checked again, truncated to zero and
  fsynced. The stable zero-byte marker remains as the terminal receipt. No post-seal unlink or
  directory removal window exists, so fresh inspection can enumerate every current intermediate.
- Fresh inspection accepts only an exact nonzero marker matching its encoded seal or the exact
  zero-byte terminal receipt. Original-plus-marker, multiple/malformed markers, digest mismatch,
  link/symlink/mode/identity replacement, and foreign bytes are typed refusal. Unknown bytes are
  never deleted.
- Real child `SIGKILL` is sent while a nonzero database/Package retirement marker exists; a fresh
  process enumerates it and `inspect -> apply -> inspect` converges. Independent separate-writer
  children replace the exact database and Package marker between final validation and the fd sink,
  without a production hook. Both operations exit with typed refusal; the foreign replacement and
  moved owner inode survive; fresh inspection blocks.

### 2. Service schema witnesses bind actual SQL statements one-to-one

- `makeSqlitePersistenceLive` no longer accepts or exports a witness port. The synthetic loop that
  emitted 31 before events, ran one aggregate initializer, then emitted 31 after events is gone.
- The Service verifier installs a test-process-only Proxy on the actual `DatabaseSync.prepare`
  boundary. Each classified Service schema SQL string receives its ordinal in real prepare order;
  before/after fault injection wraps the actual `StatementSync.run/all` call for that one SQL
  statement. All 31 ordinals at both sites prove transactional rollback and no marker/application
  object residue. Normal execution proves the observed SQL sequence and the frozen ordinal sequence
  are bijective.
- Product schema verification uses the same test-only adapter interception around its real DDL
  execution. Real separate-writer and real `SIGKILL`/fresh-reopen cases remain at the actual SQLite
  boundary.

### 3. Production-callable verifier controls and renderer global are removed

- Normal production entry points no longer accept witness, test-hook, raw target callback, barrier,
  or mutation closure parameters. Service and Product layer factories expose no witness ports.
  Chromium profile, database-lock, classifier, direct inspect/apply, and Web draft-store production
  callers cannot install, choose, suppress, or throw verifier events.
- The renderer `Symbol.for("omnimind.composer-draft-witness")` and its `globalThis` lookup are
  deleted. Web verification observes a test-local Proxy around the real localStorage/presence
  adapter.
- Direct-tool verification uses runtime-generated copies of the exact owned source files in an OS
  temporary directory. Test-only source transformation binds otherwise-unset owner-local
  instrumentation variables to test-process fields in that copy; production modules have no setter,
  registration path, exported port, extra argument, stable global Symbol, or caller-reachable value
  path. The generated verifier directory and its workspace dependency symlink are removed after the
  suite. No checked-in verifier framework or second production implementation was added.
- The exact failed-Review regex union
  `TestHooks|WitnessPort|afterBoundary|Symbol\.for\(|globalThis\[|witness` returns zero matches over
  the same seven production files. This closes the Review's 86-record set without changing the
  production universe or creating a meter.

### 4. Retained replayable packaged chain

The exact-provenance macOS arm64 build and its generated-home journey are retained outside Git at:

`/Users/liuzaoqu/Desktop/Develop/independent/OmniMind-b1-452b5872-evidence.2ABS4v`

The retained [`TRANSCRIPT.md`](../../../../../OmniMind-b1-452b5872-evidence.2ABS4v/TRANSCRIPT.md)
records exact commands, exit codes, sanitized JSON and replay order. Its machine-readable
`artifact-manifest.json` binds:

- ZIP: `169203720` bytes,
  SHA-256 `6ecbbb17dd66e2facc9c46da05620242a0e320d1ca6bd82750dab01a9da7cf23`
- DMG: `169178146` bytes,
  SHA-256 `fe0913ee51c001a6884dde2ca933f17417514e2c7c5e30ce53c54ec6454d6fe5`
- replay verifier SHA-256:
  `e7ef3469aca291ff9146a799869a6a9181f8487dd479356e95842a51165fd14d`

The build command required clean `HEAD` equal to the full source commit and the exact
`bun.lock` SHA-256 `05960c3b0c2b51ca90ad5f2411ff6eb4c24356a028f72ed0fb2ca364347bed91`;
it exited 0 after Desktop/Service/Web build, arm64 AppSnap build, frozen dependency staging,
231-component legal/ASAR validation, ZIP repack and DMG creation.

The replay chain uses only `<evidence-root>/state` for HOME, user data, caches and `OMNIMIND_HOME`:

1. fresh preparation proves Product and Service databases absent;
2. packaged fresh launch reaches app/window/backend/Native Host/authenticated readiness with exactly
   one Service, one Native Host and one renderer, then stops the complete process group by SIGTERM;
3. private read-only reopen observes Product and Service `schema_generation=1`, mode `0600`, zero
   Product runs, Automation runs and outbox rows, and all six retired database bundle members absent;
4. the same packaged bytes restart against the same generated home, using only log bytes appended
   after the restart spawn for readiness, again reach the five predicates and `1/1/1` counts, and
   stop cleanly;
5. the second read-only reopen observes the same Product and Service inode identities and the same
   generation/zero-replay facts.

An exploratory restart observation that read the whole existing log was discarded because it could
not distinguish prior readiness lines. The retained transcript contains only the corrected
append-after-spawn result and calls this out explicitly.

## Exact candidate scope

`git diff --name-status --no-renames 62a6f013361623ae56e9eb6cbacb30113457c14b 452b587208287b3383eff8eeecc5a3fd0d1baecc`
reports exactly:

Production:

- `apps/service/src/persistence/Layers/Sqlite.ts`
- `apps/service/src/product/ProductControlPlane.ts`
- `apps/web/src/composerDraftStore.ts`
- `scripts/product-truth/chromium-leveldb.ts`
- `scripts/product-truth/database-lock.ts`
- `scripts/product-truth/direct-first-public.ts`
- `scripts/product-truth/sqlite-classifier.ts`

Verification:

- `apps/service/src/persistence/Layers/Sqlite.test.ts`
- `apps/service/src/product/ProductControlPlane.test.ts`
- `apps/web/src/composerDraftStore.persistence.test.ts`
- `scripts/product-truth/direct-first-public.test.ts`
- `scripts/product-truth/first-public-capability-verifier.test.ts`

## Verification on frozen bytes

- Direct destructive focused checks passed for real SIGKILL inside both durable marker windows,
  database and Package no-hook separate-writer sink replacement, exact apply kill cases, all seven
  direct durable-boundary child kills, normal/intermediate/terminal states, replacement refusal and
  terminal receipt preservation.
- The three exact profile/database-lock durable-kill cases passed together, including fresh-process
  convergence. Direct inspect/apply fault and race matrices and the exact operation surface passed
  in the verifier-only copy.
- Service exact-row gate: `5 files / 91 tests`, exit 0.
- Web exact-row gate: `6 files / 84 tests`, exit 0.
- `bun run --cwd apps/service typecheck`, `apps/web`, `apps/desktop`, and `scripts`: all exit 0.
- `bun run release:smoke`: exit 0 and repository `bun.lock` unchanged.
- `bun run check:sources`: exit 0.
- `bun run check:closure`: exit 0; source tree
  `630f17e61abc478114bf83c1d740977c9f68b910`, counts `adapted-present=1494`,
  `adapted-removed=776`, disposition SHA-256
  `3d6a5b6dac4bfd938284d459a7840ccfde913c13ab8119578e41e5cc58ac90c4`.
- `git diff --check`: exit 0.
- Candidate was clean at `452b587208287b3383eff8eeecc5a3fd0d1baecc` before this handoff update.

Honest scripts boundary: the exact three-file final command
`bun run test -- product-truth/direct-first-public.test.ts product-truth/first-public-capability-verifier.test.ts release-update-policy.test.ts`
was launched once on byte-stable source and its process completed, but the execution adapter yielded
after startup and did not retain its terminal summary or exit status. It is therefore not claimed as
a recorded PASS and was not repeated, per the maintainer's one-final-gate instruction. The focused
results above are retained; a fresh reviewer must run the exact three-file command once against the
immutable candidate.

## Safety, decisions and remaining review duty

- No production/test code was changed after candidate SHA
  `452b587208287b3383eff8eeecc5a3fd0d1baecc` was frozen. Only this linked handoff and the retained
  external evidence directory were written afterwards.
- This actor did not commit, push, merge, alter v9/history, create a meter/framework, edit runtime or
  Harness state, or access the maintainer's real `~/.omnimind`.
- Every destructive test and packaged journey used a newly generated, precisely scoped temporary or
  retained evidence home. Credentials and raw application logs are not in this handoff or artifact
  manifest.
- Unproven done condition: independent Product acceptance. A fresh different actor must review the
  immutable SHA, rerun the exact scripts final command, replay the retained packaged chain, and
  accept or reject the four closures. No responsibility extraction or additional Product mutation is
  authorized before that Review.
