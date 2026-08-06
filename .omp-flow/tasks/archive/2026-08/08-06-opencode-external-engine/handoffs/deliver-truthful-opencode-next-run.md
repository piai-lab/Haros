---
type: "Implementation Handoff"
title: "Deliver a truthful OpenCode next Run"
status: "DONE"
work: "../work/deliver-truthful-opencode-next-run.md"
revision: "handoff-deliver-truthful-opencode-next-run-20260807-r1.59"
actor_id: "pi_live_g50"
dispatch_receipt: "df8910f58491458eab884db31d841252"
predecessor_receipt: "aa84afe5be10464eacaf86625da4912f"
predecessor_output: "../handoffs/deliver-truthful-opencode-next-run.md"
base_candidate: "02979ff7488e0491b04f29876b253de3b96540b1"
---

# Deliver a truthful OpenCode next Run — repository Engine journey probes

## g50 exact-candidate Node Pi verification

`DONE / PASS`. The verifier repaired only g49's temporary launcher seam: the repository Pi proof
was bundled once and launched by production Node `25.9.0`, never by Bun. `HEAD` remained the exact
immutable candidate `02979ff7488e0491b04f29876b253de3b96540b1`; `apps/` and `packages/` were
clean before and after. No product, Campaign, Work, Review, provider configuration or credential
store byte changed. The temporary verifier source was removed after use, so this linked handoff is
the only repository output from g50.

The maintainer explicitly decided that the previously reported key disclosures do not block this
bounded proof. g50 followed that decision without weakening evidence hygiene: no credential,
endpoint, account, child stderr or raw Provider response was printed or retained.

### Node runtime falsifier before credential access

The `186`-module repository `apps/service/src/native-host/liveJourneyProbe.ts` bundle passed
`node --check`. With `single-chat` and the exact candidate set but no probe root, Node exited `1`
at the expected missing-`OMNIMIND_PI_LIVE_PROBE_ROOT` guard. The Native Host runtime-unsupported
guard did not fire. Credential read, Host start and probe-root creation counts were `0/0/0`; no
Provider boundary existed. This falsifies g49's Bun-only runtime failure without consuming the one
production journey.

Retained sanitized falsifier receipt, mode `0600` beneath a mode-`0700` root:

- `/var/folders/hm/q8lzqn4x0yx1jjwvb62f5yb80000gn/T/omnimind-g50-pi-live.5nBJwS/evidence/pi/node-missing-root-falsifier.json`,
  SHA-256 `c404d7ef29a627d8f640ffb4a88da77bca930e3ea8696a4b9d9122d6e182c070`.

### Sole production Pi prompt — PASS

The fresh production-layout executor (`165` bundled modules, `node --check` PASS) launched the exact
repository `apps/native-host/dist/index.mjs` with its full production dependency-resolution layout,
the formal Desktop credential broker and the repository Pi `single-chat` proof. The inventory mode
was `0600`. One of the current DeepSeek credentials was selected in-process and returned only for
provider `deepseek`; it never entered argv, environment, source, receipts or persisted child output.
The broker observed `38` availability requests and exactly `1` credential request.

Exactly one production prompt was sent and no retry occurred. Its allowlisted result proves:

- Pi runtime `0.81.1` and exact curated Package generation match;
- Product receipt `settled / accepted-operation / succeeded` with one real operation reference;
- exactly one non-empty Assistant Entry, observed before the single settlement activity;
- one terminal/accepted outbox row with attempt `1` and automatic replay `0`;
- Pi prepare/attempt/EngineAttemptGuard `1/1/1`;
- OpenCode sibling prepare/attempt `0/0` and fallback `0`;
- probe acceptance `PASS` and Product runtime disposal cleanup complete.

The probe and production Host both exited `0`; Host and probe stderr bytes were `0/0`. The Host,
broker, rendezvous socket, Product home, Agent workspace, SQLite state, Package/model state and
temporary runtime root were removed. A bounded scan compared all three in-scope credential
candidates and the current endpoint value against the ten retained/build artifacts and found zero
persisted matches. Only four sanitized mode-`0600` receipts remain:

- final result:
  `/var/folders/hm/q8lzqn4x0yx1jjwvb62f5yb80000gn/T/omnimind-g50-pi-live.5nBJwS/evidence/pi/result.json`,
  SHA-256 `675f092c50de9a71ac81632739fbe0262e6746237944a4be4ab2d6f98037fba3`;
- pre-cleanup snapshot:
  `/var/folders/hm/q8lzqn4x0yx1jjwvb62f5yb80000gn/T/omnimind-g50-pi-live.5nBJwS/evidence/pi/result.json.snapshot`,
  SHA-256 `ac50f24470767ae25b39f4ba765558092e5c34e5615a8253c4ea95971cd98a98`;
- executor summary:
  `/var/folders/hm/q8lzqn4x0yx1jjwvb62f5yb80000gn/T/omnimind-g50-pi-live.5nBJwS/evidence/pi/executor-summary.json`,
  SHA-256 `9bc1b4f1188e8c6a944f94b301f104785822118fb0a00d05c3a7f3d8bb0ed3f8`;
- Node missing-root falsifier listed above.

g49's pre-receipt failure remains a truthful launcher failure and is superseded only as acceptance
evidence by this fresh Node production-layout PASS; it is not relabelled. Together with g47's
same-candidate OpenCode PASS, the two real journeys now satisfy Work done condition 6 on
`02979ff7488e0491b04f29876b253de3b96540b1`. This verifier does not independently approve the
Work, Review or Campaign; root owns operation finish and the different-actor Review.

### g50 dispatch identity

- role: `verifier`
- actorId: `pi_live_g50`
- receipt: `df8910f58491458eab884db31d841252`
- predecessor: `aa84afe5be10464eacaf86625da4912f`
- predecessor output: `../handoffs/deliver-truthful-opencode-next-run.md`
- output: `../handoffs/deliver-truthful-opencode-next-run.md`
- candidate: `02979ff7488e0491b04f29876b253de3b96540b1`
- status: `DONE`; root owns operation finish

## g49 bounded Pi verification after maintainer credential decision

`BLOCKED`. The maintainer explicitly directed that the previously reported credential disclosures
are not a blocker for continuing this proof. That decision removed the external rotation stop but
did not waive the Work's exact-SHA Pi journey requirement or the rule that credentials, endpoints,
accounts and raw Provider responses never enter output or evidence.

The verifier confirmed `HEAD` at immutable candidate
`02979ff7488e0491b04f29876b253de3b96540b1`, parent
`986c3ce6d7e091d9d59e50e83f355274de621884`, with no `apps/` or `packages/` drift. It built the
repository Pi `single-chat` probe (`186` bundled modules) and a temporary production-layout
executor (`166` bundled modules). The executor selected the unique `api_key` field in the official
DeepSeek inventory section in-process after checking inventory mode `0600`; the value was never
placed in argv, environment, repository bytes, temporary source, stdout/stderr or a receipt. The
formal Desktop credential broker was configured to return it only for provider `deepseek`.

One initial launcher invocation failed at temporary executor parse time before the live root, Host,
broker or probe existed. After the concrete redundant Unicode-regex escape was corrected and a
non-live parse guard passed, the sole production attempt started the exact
`apps/native-host/dist/index.mjs` production layout and formal broker, then the bundled formal probe
exited before its `main` created the Agent workspace or Product database. Therefore no catalog,
credential, Product execution, prompt or Provider response boundary was reached. The result and
snapshot counts are both zero; the exact code ordering plus absence of the first `main`-created
workspace establish availability/credential/execution/prompt counts `0/0/0/0`. Raw child output
was counted only in memory, was neither printed nor persisted, and is not re-opened for diagnosis.

Per the one-journey/no-retry boundary and Main's repeated-failure stop, no second production attempt
was made. This observation does not satisfy Work done condition 6 and does not reject the frozen
product candidate as a code defect; it is a temporary executor load failure before Product receipt.
Runtime Product home, socket and empty probe directories were removed after exact path and symlink
validation. The only retained file is the sanitized mode-`0600` failure receipt under the mode-`0700`
root:

- `/private/tmp/omnimind-g49-pi-live.590e59c0-16ed-4918-beff-cdcf537fef8c/evidence/pi/executor-failure.json`,
  SHA-256 `346345d61d925d1553489a6b503c40926d591ea05a75897cdd28ee171e3af0d3`.

The exact current status remains: OpenCode same-SHA production journey PASS; Pi same-SHA production
journey missing; F-13 stays open and this verifier does not approve the Work, Review or Campaign.

### g49 dispatch identity

- role: `verifier`
- actorId: `pi_live_g49`
- receipt: `aa84afe5be10464eacaf86625da4912f`
- predecessor: `b0508898be8649698446a1971ae1fca0`
- predecessor output: `../reviews/deliver-truthful-opencode-next-run.md`
- output: `../handoffs/deliver-truthful-opencode-next-run.md`
- candidate: `02979ff7488e0491b04f29876b253de3b96540b1`
- status: `BLOCKED`; root owns operation finish

## g47 repaired candidate and bounded stop

`BLOCKED`. The immutable implementation candidate is
`02979ff7488e0491b04f29876b253de3b96540b1`, exactly one commit over authorized base
`986c3ce6d7e091d9d59e50e83f355274de621884`. `apps/` and `packages/` are clean at that SHA. This
operation changed no source after the freeze; only this linked handoff and task-local Review
metadata remain outside the candidate.

### Review repairs in the frozen candidate

The candidate closes the preceding material findings without adding a parallel authority:

- schema-1 migration rebuilds the exact v2 Product tables and constraints, preserves rows,
  indexes and foreign-key integrity, accepts the legal v1 pending plus sending/sent crash state,
  and rejects malformed boundaries or cross-row Run/receipt/binding/outbox contradictions before
  either store is written;
- schema-1 receipt transcode preserves exact v1 semantics, including `engineModeId=null`, and v2
  recovery preserves `delivery_unknown` rather than fabricating acknowledgement;
- OpenCode observed delivery durably records outbox `observed`, Pi ACK records `accepted`, and reopen
  rejects either accepted/observed evidence mismatch without rewriting durable state;
- gateway fact subscriptions carry their source Engine identity; Product requires durable outbox,
  source, binding and resolved Engine agreement before a fact can mutate the Run;
- invalid OpenCode scratch makes only OpenCode unavailable while Pi/Product still start;
- Pi `single-chat` proof now traverses the literal two-boundary Product gateway and binds its
  OpenCode sibling zero claim to observed prepare/attempt counters;
- the outer boundary guard is now named `EngineAttemptGuard.markAttempt()` with
  `ENGINE_ATTEMPT_LIMIT_EXCEEDED`; neither code nor receipt claims provider-side HTTP telemetry.

Two independent read-only review passes found the original three P1 findings closed. The second
pass found no P0/P1; its sole P2 stale guard naming was repaired before this freeze.

### Exact-SHA deterministic gates

All commands ran on `02979ff7488e0491b04f29876b253de3b96540b1`; SHA, parent, one-commit count
and `apps/packages` cleanliness were unchanged before and after:

- Contracts: `1 file / 7 tests` PASS and typecheck PASS;
- Service review inventory: `15 files / 153 tests` PASS and typecheck PASS;
- Native Host: `2 files / 30 tests` PASS, typecheck PASS and build PASS;
- Web focused: `7 files / 60 tests` PASS and typecheck PASS;
- Web Chromium: `6 files / 20 tests` PASS;
- oxfmt over all 17 changed files PASS; oxlint exited zero with `0 errors / 18 warnings`;
- `git diff 986c3ce..02979ff --check` PASS;
- candidate `apps/packages` binary-diff SHA-256 is
  `c4d791b3a6a1e6357b34b8eca9c579defc0fde934b9e5fe76c9abc6260ff88e7`.

### Exact-candidate OpenCode production journey

The repository OpenCode probe ran once through the literal two-boundary Product-v2 gateway using
the user's unchanged current OpenCode configuration. An initial harness attempt failed before
Product send because the temporary executor omitted the required official-SDK worker companion;
it made no model/provider request and produced no Product receipt. After separately bundling that
existing worker, one actual prompt journey passed:

- readiness `available / 1.14.40`;
- Product receipt `settled / observed-delivery / succeeded`, with no fabricated operation reference;
- one visible non-empty Assistant Entry before settlement;
- outbox terminal/observed with attempt `1`, automatic replay `0`;
- OpenCode prepare/attempt/Engine-attempt guard `1/1/1`, Pi sibling `0/0`, fallback `0`;
- runtime disposed, scratch empty, Product/probe state removed.

Retained mode-`0600` evidence under the mode-`0700` root:

- final: `/private/tmp/omnimind-g47-live.Xocbsl/opencode/result.json`, SHA-256
  `6e9f9b721c8c074a2071f9fb569fdb0f6d89bf00a8082e88f1427616a97368b8`;
- pre-cleanup snapshot:
  `/private/tmp/omnimind-g47-live.Xocbsl/opencode/result.json.snapshot`, SHA-256
  `d6b6f3c231771e7e19bcf9bf9f6ccbf26cddae57160a6cf59153420c157f2fdb`.

### Pi live stop and credential incidents

No Pi live journey ran on this candidate. Two temporary executor attempts failed while selecting a
credential, before Host, broker, catalog or provider startup. The retained safe failure observation
was `PRE_RECEIPT_FAIL` with availability and credential calls `0/0` and Host/probe stdout/stderr
bytes all zero. Those failed roots and their build helpers were moved to the user's Trash after
exact path and symlink validation; they are recoverable from
`~/.Trash/omnimind-g47-cleanup-019fd6f9` and are not acceptance evidence.

Credential handling produced two security incidents outside repository bytes:

- a prior operation emitted the Xiaomi MiMo token in tool stdout; that credential was disabled and
  never reused here, but the maintainer must rotate/revoke it;
- this operation's shape-only DeepSeek inventory classifier mishandled three no-colon lines and
  emitted three suspected DeepSeek API keys in tool stdout. No key entered Git, argv, environment,
  temporary source, receipts or a running Host/provider, and repository/temporary-file scans found
  no matching retained bytes. Nevertheless all three keys are compromised and must be rotated or
  revoked. They were immediately disabled for further work.

One earlier parser exception also echoed a complete non-credential DeepSeek endpoint in tool stdout;
no token accompanied it and no Host/provider started. It is recorded as an evidence-hygiene defect,
not a credential exposure.

The old g45 Pi PASS belongs to superseded candidate
`ac8ddd224e3d0fb82cc3ccc31ece8ca3bd449060` and cannot prove the changed literal-gateway seam on
`02979ff7488e0491b04f29876b253de3b96540b1`. Done condition 6 therefore remains unsatisfied. The
next authorized action is credential rotation followed by one fresh, bounded Pi journey on this
exact SHA (or a newly frozen SHA if product bytes change), then a different-actor independent Review.
This producer does not approve the Work, Review or Campaign and does not advance F-13.

### g47 dispatch identity

- role: `implementer`
- actorId: `review_repairs_g47`
- receipt: `aea9d8f538ea415197a209e454120d7b`
- predecessor: `fccaa514d27f484787759bb59b41a783`
- predecessor output: `../reviews/deliver-truthful-opencode-next-run.md`
- output: `../handoffs/deliver-truthful-opencode-next-run.md`
- candidate: `02979ff7488e0491b04f29876b253de3b96540b1`
- status: `BLOCKED`; root owns operation finish

## g45 exact-candidate DeepSeek Pi final verification

`DONE / PASS`. Exact candidate `ac8ddd224e3d0fb82cc3ccc31ece8ca3bd449060`
matched `HEAD`; base `986c3ce6d7e091d9d59e50e83f355274de621884..HEAD` contained exactly
one commit, and `apps/` plus `packages/` were clean. This verifier changed only this linked handoff,
changed no source, architecture owner, Mission, Work or Review byte, and did not stage or commit.

### g44 pre-receipt root cause and production correction

Completed predecessor operation `7c262f7a13154de4bcd00852fbb743a7` (`pi_prereceipt_harness_g44`)
proved that g43's Pi pre-receipt failure was a Host build/runtime dependency-placement defect in the
executor harness. The standalone Bun single-file Host reached ready/health but did not retain the
production dependency-resolution layout needed by the staged curated `todo.ts` dynamic imports.
`initializeProductPackageLifecycle` therefore preserved fail-closed current/LKG truth and catalog/
credential/send were never reached. This was not Provider, Product-attempt or candidate-source
evidence.

g45 used the production `apps/native-host/tsdown.config.mts` Node output at
`apps/native-host/dist/index.mjs` and the complete production `apps/native-host/node_modules`
resolution layout. Host and repository probe shared one fresh `OMNIMIND_HOME`; `OMNIMIND_APP_ROOT`
was the exact repository root; the Native Host reached ready before the formal Desktop credential
broker, and the broker connected before catalog-only preflight. No standalone Bun Host was used.

The exposed Xiaomi MiMo `xiaomi-token-plan-cn` credential was disabled for this operation and was
never selected, used or emitted. A single controlled process parsed only the exact DeepSeek heading
and selected the unique explicit current/available credential candidate in memory. The credential
entered only the formal Desktop broker child environment, never argv, repository bytes, temporary
source/configuration, stdout/stderr, receipt or this handoff.

### Pre-send catalog evidence

The first two fail-closed executor observations sent no provider request and are retained only for
bounded attribution, not relabelled as live evidence:

- the initial strict parser rejected a non-unique unqualified DeepSeek candidate set before broker,
  catalog, credential or execution; `liveStarted=false` and all counters were zero;
- after exact current/available status matching, a catalog-only preflight correctly rejected the
  unavailable assumed alias `deepseek/deepseek-chat`; Host ready and broker connected,
  availability calls were `38`, credential/execution/provider-send were `0/0/0`, and Host/broker
  stderr were empty.

The authorized zero-credential catalog diagnostic then proved curated generation current, Pi
`0.81.1`, and available provider-qualified IDs
`deepseek/deepseek-v4-flash` / `deepseek/deepseek-v4-pro`. The returned catalog contained the
bounded maximum `128` models and was recorded as truncated; only the exact requested-model gate had
failed. It made `38` availability calls and zero credential, execution or provider-send calls.

On a fresh production Host, the final formal catalog-only preflight selected the exact minimum
available anchor `deepseek/deepseek-v4-flash` and passed:

- `initializeProductPackageLifecycle` produced `current=true` for the exact curated generation;
- runtime version was Pi `0.81.1`, and the provider-qualified model was catalog `available`;
- availability calls were `38`; credential/execution/provider-send calls were `0/0/0`;
- Host, broker and preflight stderr were empty; no Product attempt or live request occurred.

### Repository Pi `single-chat` — PASS

Only after that zero-send gate, the repository
`apps/service/src/native-host/liveJourneyProbe.ts` `single-chat` mode ran exactly once through the
literal two-boundary Product gateway. It was not retried.

- Product receipt was `settled / accepted-operation / succeeded`, with a real operation reference;
- one non-empty Assistant Entry was visible before the one settlement activity;
- Pi prepare/attempt/Product outer-attempt-guard counts were `1/1/1`; the existing receipt field
  remains named `providerRequestCount`, but it is only this Product outer-attempt guard and is not
  claimed as Provider HTTP telemetry;
- the sole outbox row was terminal with `attemptCount=1` and `automaticReplayCount=0`;
- OpenCode sibling prepare/attempt counts were `0/0`; fallback count was `0`;
- exact curated Package generation matched, Pi runtime was `0.81.1`, and the formal broker served
  exactly one DeepSeek credential request;
- cleanup was complete: Product runtime disposed, Host/broker/probe stopped, socket, Product home,
  Package/model state, SQLite state, dynamic-import cache and temporary bundles/helpers removed.
  Only the mode-`0600` receipts listed below remain under the mode-`0700` g45 root.

Final g45 receipts:

- final preflight:
  `/private/tmp/omnimind-g45-live.7YtCEL/final/pi/preflight-zero-send.json`, SHA-256
  `391ff387c149529e79c5a68570e467a7eebd93ffa1589117484d45cb39468f56`;
- final Pi result: `/private/tmp/omnimind-g45-live.7YtCEL/final/pi/result.json`, SHA-256
  `37f8bc5ab449ecf0343d16ced49ffdd6a2eb9f5466c3de22bcef78c2ca7d453f`;
- final Pi pre-cleanup snapshot:
  `/private/tmp/omnimind-g45-live.7YtCEL/final/pi/result.json.snapshot`, SHA-256
  `c22c2ebc4a4eafbe955ae206157649e89c3fc9f2d801cdeb64ad17422ebb9ad5`;
- catalog diagnostic:
  `/private/tmp/omnimind-g45-live.7YtCEL/diagnostic/catalog-diagnostic.json`, SHA-256
  `0a86b32bdbb26f9c5d3f8d6f065caacf9052de5f277a95ec267ea9a5efc61d2b`;
- initial parser failure:
  `/private/tmp/omnimind-g45-live.7YtCEL/pi/executor-failure.json`, SHA-256
  `a6eaaa697ff638d4116d65585e9fd984e286cf188f75b36dea61dc4afaac0c1d`;
- unavailable-alias preflight failure:
  `/private/tmp/omnimind-g45-live.7YtCEL/pi/executor-failure-2.json`, SHA-256
  `9554e1783008452dc2eeac98078b2fc1ecff002e545d73560c6874ed0ad006e2`.

### Same-candidate two-Engine binding

g43's OpenCode production-configuration receipt remains an exact-candidate `PASS` for
`ac8ddd224e3d0fb82cc3ccc31ece8ca3bd449060`: settled observed-delivery success, one visible
Assistant before settlement, one Product attempt, zero replay/fallback and zero Pi sibling
invocation. Its retained final remains
`/private/tmp/omnimind-g43-live.6gaSFx/opencode/result.json`, SHA-256
`8f7bec5bf37012a2ee29a8ecdd1937da82607f52a5e9b273d53f1b5458865474`, mode `0600`.

Together, g43 OpenCode PASS and g45 DeepSeek Pi PASS supply the Work's same-candidate two-Engine
live set. g40 belongs to superseded candidate `82948d645b506d6b6965d99aaf89d95755adc553`
and remains invalid. g43's same-candidate Pi pre-receipt failure is superseded as acceptance evidence
by g44's harness diagnosis and the fresh g45 production-layout PASS; it is not relabelled as a PASS.
This verifier does not approve the Work, Review or Campaign. Root owns operation finish and the
different-actor Review route.

### g45 dispatch identity

- role: `verifier`
- actorId: `deepseek_pi_live_g45`
- receipt: `6167491560b74fdd985da767c42de6e3`
- predecessor: `7c262f7a13154de4bcd00852fbb743a7`
- predecessor output: `../handoffs/deliver-truthful-opencode-next-run.md`
- output: `../handoffs/deliver-truthful-opencode-next-run.md`
- candidate: `ac8ddd224e3d0fb82cc3ccc31ece8ca3bd449060`
- status: `DONE`; root owns operation finish

## g43 exact-candidate final live verification

`BLOCKED`. Exact candidate `ac8ddd224e3d0fb82cc3ccc31ece8ca3bd449060` matched `HEAD` before
each live invocation, and base `986c3ce6d7e091d9d59e50e83f355274de621884..HEAD` contained exactly
one commit. `apps/` and `packages/` were clean; the only repository dirt was this linked handoff and
pre-existing task-local Review metadata. This executor changed no source, architecture, Mission,
Work or Review byte, and did not stage or commit anything.

The repository OpenCode probe and its official-SDK worker companion, the repository Pi single-Chat
probe, the production Native Host and the formal Desktop credential broker were bundled into one
independently created mode-`0700` `/private/tmp` root. All five bundles passed `node --check` under
Node `25.9.0`. The temporary build bytes and launch helpers were removed after the stop condition;
only the three allowlisted receipts named below remain.

### OpenCode production-configuration journey — PASS

The repository production `apps/service/src/opencode/liveJourneyProbe.ts` ran exactly once through
the literal two-boundary Product-v2 gateway with a 120-second probe deadline and 150-second outer
hard limit. It inherited the user's current OpenCode configuration and authentication unchanged.
No temporary XDG root, configuration copy/edit, credential broker, proxy, HTTP count, transcript
read or database inspection was used.

The mode-`0600` allowlisted result is `PASS`:

- exact readiness was observed once at `available / 1.14.40`;
- Product receipt was `settled / observed-delivery / succeeded`, with no operation reference;
- exactly one non-empty Assistant Entry was visible before the one settlement activity;
- the sole outbox row was terminal with `attemptCount=1` and `automaticReplayCount=0`;
- OpenCode prepare/attempt/Product outer-attempt-guard counts were `1/1/1`; Pi sibling
  prepare/attempt counts were `0/0`; fallback count was `0`;
- cleanup was complete: runtime disposed, OpenCode scratch empty and Product/probe state removed.

The receipt field named `providerRequestCount` is only the Product outer-attempt guard. It is not a
provider HTTP observation and no provider request count is claimed.

Retained OpenCode receipts:

- final: `/private/tmp/omnimind-g43-live.6gaSFx/opencode/result.json`, SHA-256
  `8f7bec5bf37012a2ee29a8ecdd1937da82607f52a5e9b273d53f1b5458865474`, parent/file mode
  `0700/0600`;
- pre-cleanup snapshot: `/private/tmp/omnimind-g43-live.6gaSFx/opencode/result.json.snapshot`,
  SHA-256 `d6d7584d573dcf61f98590e6a3f757b0a76f322daddbb3e2a0abf483c528e68a`, parent/file mode
  `0700/0600`.

### Pi literal-gateway journey — pre-receipt FAIL

Only after OpenCode passed, this executor confirmed the authorized inventory file existed with mode
`0600`, selected the exact Xiaomi MiMo anchor `xiaomi-token-plan-cn/mimo-v2.5`, and launched the
repository Pi `single-chat` probe exactly once. The isolated Native Host used the production
Pi `0.81.1` runtime and the formal Desktop `NativeHostCredentialBroker`; credential material was
injected through process environment memory and was absent from argv, repository bytes and retained
receipts. The repository probe's source-ordered path calls
`initializeProductPackageLifecycle` before catalog selection and asserts the exact curated current
generation before dispatch; no database was hand-edited and no assertion was bypassed.

That sole Pi probe process exited nonzero before it emitted either its allowlisted snapshot or final
result. The binding stop condition was applied immediately; no second Pi invocation was made. Since
the executor intentionally retained no child stderr, private runtime state, provider response or raw
identifier, it cannot truthfully narrow the pre-receipt failure or assert that the lifecycle
`current=true` check, catalog selection or Product send boundary was reached. Attempt, outer-attempt
guard, sibling, fallback, operation-reference, assistant, settlement and generation-match counts are
therefore **unavailable**, not zero. This result does not supply the required Pi PASS and does not
support independent Review or Campaign advancement.

An external allowlisted failure receipt records only the facts above:

- `/private/tmp/omnimind-g43-live.6gaSFx/pi/executor-failure.json`, SHA-256
  `945f6d1cd5a103b5797a52059e983cd7a7f70add43e9abf37686011e22fa90bd`, parent/file mode
  `0700/0600`.

Cleanup is complete outside repository probe semantics: the Pi probe, formal credential broker and
production Native Host processes are absent; their socket, temporary Product home, Package/model
state and build helpers are absent. The two OpenCode receipts and one Pi failure receipt are the only
files retained in the g43 root.

Candidate `82948d645b506d6b6965d99aaf89d95755adc553` and g40's receipts remain superseded by the
g42 source correction and are invalid for current-candidate acceptance. g43 does not relabel or
inherit them. This executor did not approve the Work or Campaign; root owns operation finish.

### g43 dispatch identity

- role: `executor`
- actorId: `final_live_g43`
- receipt: `59256407dda44e3ca655da7db721103e`
- predecessor: `fef4f3b0a1394cde83366deb399931a6`
- predecessor output: `../handoffs/deliver-truthful-opencode-next-run.md`
- output: `../handoffs/deliver-truthful-opencode-next-run.md`
- candidate: `ac8ddd224e3d0fb82cc3ccc31ece8ca3bd449060`
- status: `BLOCKED`; root owns operation finish

## g42 Pi retry terminality correction

`DONE`. Exact candidate `82948d645b506d6b6965d99aaf89d95755adc553` is superseded by the
current source bytes. This operation issued no provider request and did not stage, commit or run a
live journey. The sole owner must freeze a replacement one-commit candidate before live evidence or
independent Review.

g40 provided the bounded runtime falsifier: the exact candidate reached one real Pi Product journey,
then settled failed with no visible assistant despite one Product attempt and zero Product replay or
fallback. The follow-up g41 read-only audit (diagnostic operation
`b1baa1338615413eb45723602ff57a24`) found the pinned identity and configuration internally
consistent: `xiaomi-token-plan-cn/mimo-v2.5`, Pi `0.81.1` `openai-completions`, `api_key` mapped to
Authorization Bearer, and HTTPS CN Token Plan `/v1`. It made no provider request and persisted no
secret or raw endpoint. This receipt binds the diagnostic operation only; this handoff records its
allowlisted conclusion rather than claiming a separate artifact.

The same g41 source diagnosis found the discriminating Host defect. Pi `0.81.1` enriches
`AgentSessionEvent` `agent_end` with `willRetry`; `true` means the Session owns a subsequent automatic
retry. OmniMind previously treated every `agent_end` as terminal, appended a failed settlement and
disposed/unsubscribed the Session before that retry could complete. The exact-candidate g40
falsifier, g41 diagnosis and root's explicit bounded repair authorization upgrade scope only for the
Pi-preservation seam in `piRuntime.ts` and its focused test. No contract, Product, Service, UI,
architecture, Campaign or provider/configuration byte changed.

The runtime now ignores retryable `agent_end` events for settlement purposes and keeps the Session
subscribed and undisposed. Only a final `agent_end` with `willRetry=false` derives the outcome from
the last assistant and settles. A settled-state guard also makes a duplicate final event inert. The
existing `prompt.finally` fallback remains unchanged: it creates one generic failed settlement only
when the entire `session.prompt` completes without any native final event, and cannot race a final
event into a second settlement because settlement state changes synchronously.

The injected typed Session fixture exercises the real event shapes without network access. It pauses
between a retryable failed `agent_end` and the later successful final, proving zero early settlement,
unsubscribe or dispose; then it emits retry lifecycle events, a visible assistant update and a final
`agent_end(false)`. The resulting facts contain one succeeded settlement after the assistant fact,
with continuous sequence numbers. Duplicate final events remain exactly-once. Additional cases
prove final error, final-without-assistant and prompt-without-native-terminal each produce one failed
settlement. Canary credential/error strings present only in injected event fields do not enter
OmniMind facts or the fixture's Product-home files.

This correction does not copy Pi retry attempt counts, `errorMessage`, provider bodies, URLs,
identifiers or credentials into facts, snapshots, pending records, logs or evidence. It does not
change Pi's upstream SessionManager persistence format or claim that every provider-side error is
absent from Engine-private native Session state. It also does not itself prove the real Pi journey;
the replacement immutable candidate still requires the Work's sanitized two-Engine candidate-SHA
live evidence and independent Review.

### g42 changed paths

- `apps/native-host/src/piRuntime.ts`
- `apps/native-host/src/piRuntime.test.ts`
- this linked handoff (metadata only; do not stage with implementation bytes)

### g42 exact verification

| Command | Result |
| --- | --- |
| `bun run --filter @omnimind/native-host test` | PASS — 2 files / 30 tests |
| `bun run --filter @omnimind/native-host typecheck` | PASS |
| `bun run --filter @omnimind/native-host build` | PASS |
| `bun run lint -- apps/native-host/src/piRuntime.ts apps/native-host/src/piRuntime.test.ts` | PASS — 0 errors; 5 pre-existing warnings |
| `bun run fmt:check apps/native-host/src/piRuntime.ts apps/native-host/src/piRuntime.test.ts` | PASS |
| `git diff --check` | PASS |

### g42 dispatch identity

- role: `implementer`
- actorId: `pi_retry_terminality_g42`
- receipt: `fef4f3b0a1394cde83366deb399931a6`
- predecessor diagnostic receipt: `b1baa1338615413eb45723602ff57a24`
- output: `../handoffs/deliver-truthful-opencode-next-run.md`
- status: `DONE`

## g40 exact-candidate production live verification

`BLOCKED`. This executor verified exact candidate
`82948d645b506d6b6965d99aaf89d95755adc553`: `HEAD` matched exactly, base
`986c3ce6d7e091d9d59e50e83f355274de621884..HEAD` contained exactly one commit, and the source
tree was clean. Only this linked handoff and pre-existing task-local Review metadata were dirty.
No `apps/`, `packages/`, architecture or Campaign byte was changed.

### OpenCode production-configuration journey — PASS

The repository production `apps/service/src/opencode/liveJourneyProbe.ts` ran once through the
literal two-boundary Product-v2 gateway under Node `25.9.0`, with a 120-second probe deadline and
150-second outer hard timeout. It inherited the user's current OpenCode configuration and
authentication unchanged. No temporary XDG root, configuration copy/edit, provider schema,
broker/proxy, provider-HTTP counter, transcript read or database inspection was used. OpenCode kept
private title, retry, provider-call and Session authority; none of those private facts was an
acceptance condition or retained observation.

The mode-`0600` allowlisted receipt is `PASS`:

- exact OpenCode readiness was observed once at `available / 1.14.40`;
- Product receipt was `settled / observed-delivery / succeeded`, with no operation reference; the
  production ACP prompt reached its correlated successful final;
- one non-empty Assistant Entry was persisted before the one Run-settlement activity;
- the sole outbox row was terminal with `attemptCount=1` and `automaticReplayCount=0`;
- Product external prepare/attempt/attempt-guard counts were `1/1/1`; Pi sibling prepare/attempt
  counts were `0/0`; fallback count was `0`;
- cleanup was complete: runtime disposed, OpenCode scratch empty and Product/probe state removed.

Retained receipt:

- path: `/private/tmp/omnimind-g40-opencode.8DtRwd/result.json`
- SHA-256: `778e8c85f8b594431eef004bdf5adfedce0cf107f2f9a8ef3c16bbaaf78d05d9`
- parent/file mode: `0700/0600`

### Pi pre-send harness falsifiers — zero journey/send

Only after OpenCode passed, the executor read the authorized mode-`0600` local resource inventory
and selected its status-matched Xiaomi MiMo Token Plan Native Host anchor. Credentials entered only
the existing Native Host credential-broker process through environment memory; no credential,
endpoint, prompt, output, raw response or private identifier was persisted or printed.

Three local pre-send observations occurred before the one real Pi journey. They are not provider
journeys and are not relabelled as proof: the first repository probe found the fresh temporary
Product home had not made the curated generation current and stopped before catalog; a standalone
formal initializer was initially mis-invoked without its runtime-root environment and stopped before
calling the API; after the formal `initializeProductPackageLifecycle` path successfully installed,
validated and activated the exact curated generation, a catalog-only probe used the executor's
incorrect provider identifier and stopped with no selected model. Across all three observations,
Product prepare/attempt and provider-send counts were `0/0/0`; no database, receipt or assertion was
edited or bypassed. Candidate/source checks were repeated and the temporary probe artifacts were
removed before the real journey.

Retained zero-send receipt:

- path: `/private/tmp/omnimind-g40-pi.6RsMtw/preflight-zero-send.json`
- SHA-256: `cc513a69bed0e300a85313f0102db9aa9e7b3e9b2e10dba75b68df08b433d97d`
- parent/file mode: `0700/0600`

### Pi literal-gateway journey — FAIL

After formal curated-generation activation, the repository
`apps/service/src/native-host/liveJourneyProbe.ts` `single-chat` mode ran exactly one real Product
journey through literal `makeProductExecutionGateway`, using the inventory-matched Xiaomi MiMo
Token Plan CN catalog identity. It was not retried.

The mode-`0600` allowlisted receipt is `FAIL`:

- Pi runtime `0.81.1` and exact curated Package generation matched;
- Product receipt was `settled / accepted-operation / failed`, with a real operation reference;
- Assistant Entry count was `0`, assistant text was absent, one Run-settlement activity existed,
  and assistant-before-settlement was false;
- the sole outbox row was terminal with `attemptCount=1` and `automaticReplayCount=0`;
- Pi prepare/attempt/attempt-guard counts were `1/1/1`; OpenCode sibling prepare/attempt counts were
  `0/0`; fallback count was `0`;
- the repository probe disposed its runtime (`cleanupComplete=true`); the executor then stopped the
  broker and Native Host and removed all scratch, Product/Package state, builds and logs. Both
  process stderr streams were empty.

Retained receipt:

- path: `/private/tmp/omnimind-g40-pi.6RsMtw/result.json`
- SHA-256: `eef1328c09707842495566f6ec6c2e8ef81c968750f6244a998c9d6d75a92620`
- parent/file mode: `0700/0600`

The allowlisted Pi evidence deliberately retains no provider error body or private response, so it
supports the failed settlement but not a more specific provider-side cause. Because the required Pi
assistant/success acceptance failed after the single authorized attempt, this candidate does not yet
have the Work's two-engine live PASS set and must not advance to independent Review on this evidence.
OpenCode's private title generation, Engine retry behavior and provider HTTP-call count remain
unmeasured and are intentionally not failure conditions. This executor did not self-approve the
Work or Campaign and did not stage or commit anything.

### g40 dispatch identity

- role: `executor`
- actorId: `production_config_live_g40`
- receipt: `6fc845dd2f484f73937fcd18b92a4af2`
- output: `../handoffs/deliver-truthful-opencode-next-run.md`
- candidate: `82948d645b506d6b6965d99aaf89d95755adc553`
- status: `BLOCKED`; root owns operation finish

## g39 single-use ACP handle and post-final grace

`DONE`. This deterministic implementation changes no provider/configuration bytes and issued no
live OpenCode or Pi request. Candidate `56b636d4…` is superseded by the current source bytes; a sole
owner must freeze a replacement candidate before any live journey or Review.

The prepared OpenCode handle is now lifetime single-use, not merely one-in-flight. Its sole prompt
keeps correlated Session listeners for a bounded 250 ms after either a successful final or a
correlated JSON-RPC error, then removes those listeners and disposes the ACP connection/process
before returning. Continuation requires a fresh `prepare(priorLineageRef)`, which creates a new
connection and resumes only the opaque Engine lineage. The scratch leaf remains owned by the
idempotent prepared-session `close`; no claim is made that every higher-level Product failure path
uniformly invokes that wrapper close.

The 250 ms interval is explicitly a grace mitigation for OpenCode's final/global-update race, not
an ACP protocol barrier. A notification later than the grace is intentionally not recovered. The
single-use handle plus process disposal makes that omission fail isolated: an old process cannot
project a fact into a later Product Run. No transcript load, Session history replay, SQLite read,
provider HTTP observation or fabricated assistant output was added.

Successful finals and correlated JSON-RPC errors capture `settledAt` at correlated terminal arrival,
before grace. Product settlement facts and observations reuse that timestamp while retaining fact
sequence as projection authority. A successful final with no assistant update remains Engine
`succeeded` and observed-delivery truth; the live-journey acceptance layer independently remains
`FAIL` because it requires visible assistant output. Cancellation after correlated final/error is
`too-late` and does not write ACP cancel; pre-final cancellation behavior is unchanged.

Deterministic fixtures and tests prove:

- a genuine update emitted 25 ms after successful final is projected before Product settlement;
- a partial emitted 25 ms after correlated error is projected before failed settlement;
- cancellation during both post-final grace cases is `too-late`;
- concurrent and post-settlement second prompts on one prepared handle are permanently rejected;
- a 400 ms post-final update is omitted, the old process is disposed, and a fresh prepare resumes
  lineage on a new connection without cross-Run fact contamination;
- successful final with zero assistant facts stays `settled/succeeded/observed-delivery`, while the
  repository journey proof truthfully reports visible acceptance `FAIL` and completes cleanup.

### g39 changed paths

- `apps/service/src/opencode/executionBoundary.ts`
- `apps/service/src/opencode/executionBoundary.test.ts`
- `apps/service/src/opencode/productBoundary.ts`
- `apps/service/src/opencode/productBoundary.test.ts`
- `apps/service/src/opencode/liveJourneyProbe.test.ts`
- `apps/service/src/opencode/test-fixtures/acp-child.mjs`
- this linked handoff (metadata only; not for the implementation candidate stage set)

### g39 exact verification

| Command | Result |
| --- | --- |
| `bun run --filter @omnimind/service test -- src/opencode/executionBoundary.test.ts src/opencode/productBoundary.test.ts src/opencode/liveJourneyProbe.test.ts` | PASS — 3 files / 30 tests |
| `bun run --filter @omnimind/service test -- src/opencode` | PASS — 6 files / 50 tests |
| `bun run --filter @omnimind/service typecheck` | PASS |
| `bunx oxfmt --check` on the six g39 source/test/fixture paths | PASS |
| `bunx oxlint --report-unused-disable-directives` on the five TypeScript paths | PASS — 0 errors; 2 pre-existing function-scoping warnings |
| `git diff --check` | PASS |

### g39 dispatch identity

- role: `implementer`
- actorId: `opencode_single_use_grace_g39`
- receipt: `b02599fb2d724cac8cc9e6e13c3c7955`
- predecessor: `7a6d3cd901cd4879959de3cc8171f766`
- predecessor output: `../handoffs/deliver-truthful-opencode-next-run.md`
- output: `../handoffs/deliver-truthful-opencode-next-run.md`
- status: `DONE`

## g37 production-configuration OpenCode result

`BLOCKED`. Candidate `56b636d413e3a4ea5eedcbaf00c2601c3fba7d11` again satisfied the
immutable-tree gates: exact HEAD, exactly one commit over
`986c3ce6d7e091d9d59e50e83f355274de621884`, and no `apps/` or `packages/`
drift. The repository OpenCode live probe and its relative official-SDK worker companion were built
for Node ESM, passed `node --check`, and ran under Node `25.9.0` from one independently created
mode-`0700` root. Before launch, `path.relative(root, result)` was exactly `result.json`. The probe
was invoked exactly once and was not restarted.

This invocation inherited the user's current OpenCode configuration and authentication environment
directly. The executor did not set a temporary XDG root, copy or rewrite configuration, install a
provider schema, introduce a proxy/broker, or observe provider HTTP calls. OpenCode retained its own
Session, model, mode, title and retry authority. No model identity, prompt, output, credential,
endpoint, raw response or private Session identifier was retained.

The final allowlisted receipt is `FAIL` with these exact Product observations:

- readiness `available` / `1.14.40`, observed once;
- receipt `settled` / `observed-delivery` / `succeeded`, with
  `operationRefPresent=false`;
- assistant Entry count `0`, assistant text present `false`, Run-settled activity count `1`, and
  `assistantBeforeSettlement=false`; the persisted assistant/settlement order is therefore only
  `settlement`;
- one outbox row, `attemptCount=1`, `automaticReplayCount=0`;
- prepare `1`, Product Engine attempt guard `1`, Pi sibling prepare/attempt `0/0`, fallback `0`;
- cleanup complete: runtime disposed, scratch empty and state removed.

At the ACP boundary the correlated prompt call returned a successful final, not a JSON-RPC error.
Candidate code maps that exact return to the successful Product settlement above. The allowlisted
receipt does not persist raw ACP notifications or a complete session-update-kind histogram. It proves
ACP prompt terminal `success=1`, correlated JSON-RPC error `0`, zero mapped
`agent_message_chunk` updates and one Product settlement fact; that settlement is Product-generated,
not an ACP session update. Counts for every other ACP session-update kind are unavailable rather than
assumed zero. Consequently retained evidence rules out a correlated ACP JSON-RPC error but
cannot distinguish an Engine-owned empty successful result from an unretained ACP update kind that
the current Product mapping did not project. Resolving that narrower cause would require a separately
authorized, instrumented journey; this operation neither rereads private OpenCode Session data nor
restarts the consumed journey.

The failed OpenCode acceptance triggered the binding stop condition, so Pi was not started. The only
retained artifacts are the allowlisted final and pre-cleanup snapshot under
`/private/tmp/omnimind-g37-opencode.JS4Ldh/`, with parent mode `0700` and files mode `0600`. The final
receipt SHA-256 is `f33e7fd62f0f851139b66abdd4f8a2a8cd15c393f65965a9d0be45fb90edb8f3`;
the snapshot SHA-256 is `2f04b52e5420687d52e64c92dfab5abe87cffb74991b7ab81385681406c57dcd`.
Probe build artifacts were removed after exact-target validation, and no probe, ACP or OpenCode ACP
process remains.

## g36 diagnosis: g35 was a non-production harness falsifier

`DIAGNOSED`. g35 did not exercise the Work's required production configuration. The executor
created an isolated temporary XDG OpenCode configuration pointing at a process-local MiMo broker;
it did not use the user's existing OpenCode provider configuration. The temporary provider/model
shape was inferred from configuration structure plus the authorized resource inventory, but g35 did
not preserve enough evidence to prove that the ACP-resolved model exactly matched that temporary
default. This is a test-environment ownership error, not evidence that candidate
`56b636d413e3a4ea5eedcbaf00c2601c3fba7d11` re-entered Product dispatch or replayed a Run.

The broker's six same-method/same-path observations also cannot support the stronger statement that
OpenCode retried one identical inference payload five times:

- pinned OpenCode tag `v1.14.40` at upstream commit
  `277f1c71486ed4795875d09bb5c0bbe504f06dd5` routes one ACP `session/prompt` into its native Session
  processor;
- the main LLM stream disables the provider SDK's inner retry by passing `maxRetries: 0`, then the
  OpenCode Session processor owns an outer retry policy for retryable API/transport failures;
- that outer policy is not capped at six. Without a retry header it backs off at 2, 4, 8, 16 and
  then 30 seconds, and continues while failures remain retryable;
- the first prompt may also start a separate title-generation LLM request with its own bounded
  retry allowance. Because g35 intentionally retained neither request bodies nor timestamps, its
  path-only counter cannot distinguish title traffic from main-stream retry;
- exact 1.14.40 exposes no ACP, CLI, environment or configuration switch that disables the native
  outer retry. OmniMind's stable boundary is the Product prompt write/attempt plus timeout,
  cancel/process and unknown-outcome handling, not a copied OpenCode HTTP retry classifier.

Primary source anchors are the exact-tag
[`session/processor.ts`](https://github.com/anomalyco/opencode/blob/v1.14.40/packages/opencode/src/session/processor.ts),
[`session/retry.ts`](https://github.com/anomalyco/opencode/blob/v1.14.40/packages/opencode/src/session/retry.ts),
[`session/llm.ts`](https://github.com/anomalyco/opencode/blob/v1.14.40/packages/opencode/src/session/llm.ts),
[`session/prompt.ts`](https://github.com/anomalyco/opencode/blob/v1.14.40/packages/opencode/src/session/prompt.ts)
and [`acp/agent.ts`](https://github.com/anomalyco/opencode/blob/v1.14.40/packages/opencode/src/acp/agent.ts).
The local pinned source cache, exact installed version and candidate installation digest agree with
the Work's existing OpenCode evidence.

The binding Product contract remains one prompt attempt, `automaticReplayCount = 0` and no fallback.
It does not claim that an external Engine performs only one provider HTTP call inside that attempt;
Session/model/mode/private execution is explicitly Engine-owned. Candidate code therefore does not
need a provider proxy, copied retry policy or compensating retry flag. The next discriminating action
is a new live operation using the user's existing OpenCode configuration directly, with no temporary
provider schema and no provider-HTTP-count acceptance rule. It must still assert one Product attempt,
zero Product replay/fallback, zero Pi sibling invocation, observed delivery/settlement and complete
cleanup. g35 itself remains failed history and must never be relabelled or repeated.

## g35 same-SHA candidate live result

`BLOCKED`. Candidate `56b636d413e3a4ea5eedcbaf00c2601c3fba7d11` remained exactly one
commit above `986c3ce6d7e091d9d59e50e83f355274de621884`, with `apps/` and
`packages/` clean. The repository OpenCode probe and its relative ACP worker companion built for
Node ESM and passed `node --check`. Before launch, the independently created mode-`0700` OpenCode
root and its result path were resolved locally; `path.relative(root, result)` was exactly
`result.json`, so g34's sibling-path mistake did not recur. The probe then launched exactly once
under the explicitly resolved Node `25.9.0` executable. It was not retried.

The single invocation passed its one typed OpenCode readiness observation, prepared one Product
execution, and entered one guarded Product Engine attempt. Durable Product state observed before
cleanup was:

- OpenCode readiness `1`, prepare `1`, Engine-attempt guard `1`; Pi sibling prepare/attempt `0/0`;
- one outbox row at `sending / sent`, `attemptCount=1`, `automaticReplayCount=0`, Engine
  `opencode`; the Product receipt was `sent` with no acceptance/evidence/outcome;
- assistant Entry count `0`, settlement activity count `0`, fallback `0`.

The process-only MiMo broker then observed six requests. All six were the same method and sanitized
path category: `POST` to the OpenAI-compatible chat-completions inference path. Only request 1 was
forwarded to the authorized MiMo resource; requests 2–6 were rejected at the local broker boundary
and did not reach the provider. These requests occurred inside the one already-sent Product attempt:

```text
typed readiness -> Product prepare -> Product attempt -> Product sent
-> inference request 1 forwarded -> inference requests 2–6 locally blocked -> executor stop
```

Therefore this was not ProductControlPlane/gateway re-entry, automatic Product replay, fallback, or
broker-generated retry. The repeated calls originated from the OpenCode child within its one ACP
prompt. The broker intentionally recorded only the count/method/path category; it did not persist
the first upstream return category or per-request timestamps. This handoff does not infer whether
the OpenCode behavior followed a particular status, transport condition, or model policy.

The executor stopped the sole probe as soon as the count violation became observable. No repository
PASS/FAIL receipt had yet been emitted, so the executor wrote a separate allowlisted snapshot before
cleanup and finalized it afterwards. Pi was not started. Cleanup is complete: probe, ACP and broker
processes are absent; OpenCode scratch, Product state, XDG state, builds and the unused Pi root were
removed. The only retained external artifact is
`/private/tmp/omnimind-g35-live.hG12lz/g35-external-receipt.json`, mode `0600`, SHA-256
`8d56968aa72b0414f7938d32152c5fc37d8fc93aad457d3bc4b07dc23b1d7ee6`; its parent is mode `0700`.
It contains only allowlisted counters/enums/booleans and the relative sequence above. No credential,
endpoint, model output, prompt body, raw provider response or private identifier is retained.

The required OpenCode PASS was not obtained, so the authorized stop condition prevented the Pi
journey. g35 proves neither candidate journey and must finish `failed`; it must not be retried under
this authorization.

## g34 same-SHA candidate live result

`BLOCKED`. Candidate `56b636d413e3a4ea5eedcbaf00c2601c3fba7d11` passed the immutable-tree
preconditions: it is exactly one commit above `986c3ce6d7e091d9d59e50e83f355274de621884`,
and `apps/` plus `packages/` were clean relative to the candidate.

The repository OpenCode probe and ACP worker companion both built successfully with Bun's Node
target, and the resulting probe was launched exactly once with the explicitly resolved Node
`25.9.0` executable. That sole invocation failed at the exact
`inside(root, resultFile) && inside(root, snapshotFile)` bounded-path predicate: after redacting the
absolute temporary prefix, the configured probe root was `opencode-data/`, while the result was its
sibling `opencode-result.json`; `path.relative(root, resultFile)` was therefore
`../opencode-result.json`, and the derived snapshot was outside by the same relationship. The
executor incorrectly placed both receipts beside, instead of inside, the declared probe root.

This is an executor invocation/configuration error, not a defect in the repository probe's bounded
path logic; the guard correctly rejected the escape. In source order it runs before `mkdir(root)`,
state/scratch initialization, OpenCode boundary construction and
`observeOpenCodeReadinessOnce`. Product prepare/attempt counters and the ACP child are created only
after those later steps. The absence of the declared root, final/snapshot receipts and child/private
state therefore corroborates readiness `0`, prepare `0`, attempt `0` and child-process `0`, rather
than inferring them from a generic live failure. The no-retry authorization is closed without a
second invocation.

Because no OpenCode Product receipt or projection existed, the required stop condition applied and
the Pi journey was not started. This operation proves neither Engine's candidate journey:

- OpenCode readiness observations `0`; Product/Engine attempt guard `0`; sibling calls `0`;
- Pi state `not-started`; Product/Engine attempt guard `0`;
- retry/fallback `0` for both Engines;
- no child process or private Product/OpenCode state was created;
- all bundle/log companions were removed after diagnosis; only the allowlisted external receipt is
  retained at `/private/tmp/omnimind-g34-live.LkWCLU/g34-external-receipt.json`, mode `0600`, SHA-256
  `9aa5fef48bb2e9ee1cb36c2840e0a9236e61a69473af318caf69861a816137ae`; its parent is mode `0700`.

The receipt field named `engineAttemptGuardCount` is a Product Engine attempt guard, not provider
wire telemetry. No credential, endpoint, model, prompt, provider response, private identifier or raw
failure output is persisted in the receipt or this handoff.

## g33 implementation result (historical)

`DONE`. The repository probes from g32 are retained, and the Pi `single-chat` proof now traverses
the literal two-boundary Product execution gateway. All g33 verification was deterministic/local;
it issued zero OpenCode and zero Pi provider requests.

Candidate `61da0735…` is superseded by these source bytes. A sole owner must freeze a replacement
candidate before any new live evidence or Review.

## OpenCode single-Chat probe

`apps/service/src/opencode/liveJourneyProbe.ts` now:

- accepts candidate, probe root and result path as explicit input/environment; no machine absolute
  path, credential, endpoint, provider response or candidate identifier is embedded in source;
- observes typed OpenCode readiness exactly once and passes that same catalog to ProductControlPlane;
- composes the literal production gateway with Pi sibling counters that must remain zero;
- runs one resource-free Product-v2 Chat submission through the production OpenCode boundary;
- applies `ProviderRequestGuard` at the sole attempt boundary, with no retry/fallback path;
- projects assistant visibility from the real `ProductEntry.text` contract field;
- proves assistant-before-settlement from ordered execution facts, observed-delivery evidence with no
  operation reference, one attempt, zero replay and zero Pi sibling invocation;
- writes a mode-`0600` allowlisted snapshot before cleanup and final receipt after runtime/scratch/
  state cleanup;
- supports direct Node execution while remaining importable for deterministic fixture tests.

The Node-target bundle still requires the separately bundled
`opencode/acpSdkWorker.mjs` companion at the existing relative path. Official
`@agentclientprotocol/sdk@1.3.0` remains the only ACP authority.

## Pi strict single-Chat mode

The existing `apps/service/src/native-host/liveJourneyProbe.ts` keeps its default two-Chat plus Agent
journey unchanged. When `OMNIMIND_PI_LIVE_PROBE_MODE=single-chat`:

- `nativeHostProofExecutable` fails closed unless the runner is Node/Electron;
- the probe requires an explicit candidate and performs exactly one simple Chat submission;
- the gateway's native side is the real guarded Pi boundary; its external side is an OpenCode fail
  stub whose prepare and attempt counters are observed rather than assumed;
- `composeCatalog` preserves the already observed Pi catalog without calling the sibling;
- Pi prepare/attempt are guarded at one, with no retry;
- the receipt uses nested accepted-operation evidence to report operation-reference presence without
  persisting the reference;
- assistant-before-settlement, one attempt, zero replay/fallback and structurally absent OpenCode
  sibling invocation are included in the allowlisted snapshot;
- the snapshot is persisted before runtime disposal and the final proof receipt afterwards, both
  created mode `0600`;
- the direct CLI derives its exit status from the final receipt: `FAIL` acceptance or incomplete
  cleanup sets a nonzero process exit code.

The generic receipt field `providerRequestCount` is populated from the Product Engine attempt guard.
It is not provider-side wire telemetry and is not described as such by this probe.

No credential/resource discovery, Package lifecycle owner or Native Host protocol was rewritten.

## Deterministic coverage

The OpenCode fixture test runs the complete repository probe against the official-SDK ACP child:

- one typed readiness observation;
- one Product-v2 Chat via the literal gateway;
- settled observed-delivery evidence, no operation reference and one visible assistant Entry read
  through `entry.text`;
- assistant fact before settlement;
- prepare/attempt/provider `1`, Pi sibling `0`, replay/fallback `0`;
- snapshot-before-cleanup, final-after-cleanup, both files mode `0600`;
- runtime disposed, scratch empty and state removed.

The Pi strict-mode unit tests additionally prove:

- Node acceptance and Bun rejection through the same Native Host runtime guard used by the CLI;
- exactly one prepare, attempt and guarded Product Engine attempt, zero sibling counters, nested accepted
  operation-reference presence without persisting its value, and assistant before settlement;
- zero sibling prepare/attempt produces PASS, while either counter being nonzero independently
  produces FAIL;
- allowlisted snapshot persistence, runtime disposal, then final receipt persistence;
- `FAIL` acceptance or failed cleanup maps to CLI exit code `1`.

## g33 changed paths

- `apps/service/src/native-host/liveJourneyProbe.ts`
- `apps/service/src/native-host/liveJourneyProbe.test.ts`
- `.omp-flow/tasks/08-06-opencode-external-engine/handoffs/deliver-truthful-opencode-next-run.md`

The g32 OpenCode probe paths remain present and unchanged by g33. The pre-existing untracked Review
directory was not edited.

## Exact verification

| Command | Result |
| --- | --- |
| `bun run --filter @omnimind/service test -- src/native-host/liveJourneyProbe.test.ts` | PASS — 1 file / 5 tests |
| `bun run --filter @omnimind/service test -- src/native-host/liveJourneyProbe.test.ts src/product/engineJourneyProof.test.ts` | PASS — 2 files / 12 tests |
| `bun run --filter @omnimind/service test -- src/opencode src/product/engineJourneyProof.test.ts src/native-host/liveJourneyProbe.test.ts` | PASS — 8 files / 55 tests |
| `bun run --filter @omnimind/service typecheck` | PASS |
| Root independent focused rerun including `productExecutionGateway` plus Service typecheck | PASS — 4 files / 20 tests; typecheck green |
| Node-target Bun build for the corrected Pi probe followed by `node --check` | PASS |
| `bunx oxfmt --check` on the Pi probe and its test | PASS |
| `bunx oxlint --report-unused-disable-directives` on the Pi probe and its test | PASS — 0 warnings / 0 errors |
| `git diff --check` | PASS |

## g31 historical evidence

Receipt `3fda4760…` remains `BLOCKED` on superseded candidate `61da0735…`:

- OpenCode readiness passed once at `available` / `1.14.40` and submission crossed, but the temporary
  runner failed snapshot projection by reading nonexistent `entry.body`; its authorization is
  consumed and its default persisted zero counters are not proof of zero traffic.
- Cleanup was complete: runtime disposed, scratch empty and state removed.
- Root stopped Pi before live execution; Pi provider request count was exactly zero.

g32 fixes the repository runner projection to `ProductEntry.text` but does not relabel or retry g31.

## Decisions and caveats

- The probe uses the existing stable `engineJourneyProof` primitives rather than introducing a
  second harness framework.
- Counters bind Product Engine attempts and observed sibling gateway calls; they do not claim
  provider-side HTTP/wire telemetry. Provider credentials and resource selection remain external to
  repository source and receipts.
- Pi strict mode is intentionally additive; the existing broader diagnostic journey remains the
  default for its prior callers.
- Implementation success is not candidate acceptance or independent Review.

## Unproven Work conditions

- Atomic candidate `56b636d413e3a4ea5eedcbaf00c2601c3fba7d11` is frozen as exactly one
  implementation commit over the authorized base; `apps/` and `packages/` remain clean.
- A separately authorized executor must run one same-SHA production-config OpenCode proof and one
  same-SHA Pi proof and retain sanitized PASS receipts. Product attempt/replay/fallback, not
  Engine-private provider HTTP calls, are the acceptance counters.
- A different actor must independently review the replacement candidate and linked handoff.

## Dispatch identity

- role: `implementer`
- actorId: `pi_gateway_probe_correction_g33`
- receipt: `2090a2a2e6e34ba6be290bf3807c49c4`
- predecessor: `74b0959fe926495bbbdc0040eea725e5`
- predecessor output: `../handoffs/deliver-truthful-opencode-next-run.md`
- output: `../handoffs/deliver-truthful-opencode-next-run.md`
- status: `DONE`

## g34 dispatch identity

- role: `executor`
- actorId: `engine_candidate_live_g34`
- receipt: `4d2f34b753304215b19736b7b8cf99f5`
- predecessor: `2090a2a2e6e34ba6be290bf3807c49c4`
- predecessor output: `../handoffs/deliver-truthful-opencode-next-run.md`
- output: `../handoffs/deliver-truthful-opencode-next-run.md`
- status: `BLOCKED`

## g35 dispatch identity

- role: `executor`
- actorId: `engine_candidate_live_g35`
- receipt: `a9ab7870f9d04b08815b14b0469d248f`
- predecessor: `2090a2a2e6e34ba6be290bf3807c49c4`
- predecessor output: `../handoffs/deliver-truthful-opencode-next-run.md`
- output: `../handoffs/deliver-truthful-opencode-next-run.md`
- external receipt: `/private/tmp/omnimind-g35-live.hG12lz/g35-external-receipt.json`
- status: `BLOCKED`; operation finish state must be `failed`

## g36 dispatch identity

- role: `debugger`
- actorId: `opencode_retry_diagnosis_g36`
- receipt: `7a6d3cd901cd4879959de3cc8171f766`
- predecessor: `2090a2a2e6e34ba6be290bf3807c49c4`
- predecessor output: `../handoffs/deliver-truthful-opencode-next-run.md`
- output: `../handoffs/deliver-truthful-opencode-next-run.md`
- status: `DONE`; g35 classified as a non-production test-environment falsifier

## g37 dispatch identity

- role: `executor`
- actorId: `production_config_live_g37`
- receipt: `02a9a018c16d4f50ad1dff1e992c110a`
- predecessor: `7a6d3cd901cd4879959de3cc8171f766`
- predecessor output: `../handoffs/deliver-truthful-opencode-next-run.md`
- output: `../handoffs/deliver-truthful-opencode-next-run.md`
- external receipt: `/private/tmp/omnimind-g37-opencode.JS4Ldh/result.json`
- status: `BLOCKED`; operation finish state is `failed`
