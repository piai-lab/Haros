---
type: "Research"
title: "Investigate the exact OpenCode ACP boundary"
---

# Investigate the exact OpenCode ACP boundary

## Selected synthesis

OpenCode `1.14.40` can truthfully supply an external Session, dynamic model/mode choices,
prompt-correlated stream facts, permission requests and a final `session/prompt` response over
ACP v1. It cannot supply the separate accepted-operation reference required by the current
Execution wording. A successful stdio write, `session/new`, and the immediately scheduled
`available_commands_update` are all insufficient proof that a particular prompt was accepted.

The provisional anchor is therefore **revised, not rejected**: one Product-visible Conversation
can cross into an OpenCode-owned Session, but this exact ACP implementation only supports a
conservative delivery/outcome boundary. Before any prompt-correlated Engine fact or final/error
response, a disconnect is `delivery_unknown`; after a prompt-correlated fact but before the final
response, it is `outcome_unknown`. Neither state permits automatic replay. Calling either state
`accepted`, or treating the process PID/stdio write as an ACK, would falsify the Product contract.

This is consequential because Execution currently says only an Engine accepted-operation
reference proves authority transfer (`architecture/execution.md:45-49`) and the Task says to stop
if an honest acceptance boundary is unavailable
(`.omp-flow/tasks/08-06-opencode-external-engine/task.md:42-53`). Return to Brainstorm/owner
calibration before design unless the intended degraded slice explicitly permits “delivery
observed” without an `accepted` receipt. Pi needs no change and no generic Engine abstraction is
justified.

Assignment: Bundle `.omp-flow/tasks/08-06-opencode-external-engine`; role `research`; actor
`opencode_acp_research_g2`; dispatch receipt `513bc0ed890c4956a986485bc8ea2fcd`.

## Provenance and exact artifact

### Installed artifact observations (2026-08-06, macOS arm64)

- The resolved public launcher is `/opt/homebrew/bin/opencode`, symlinked through the Homebrew
  keg to
  `/opt/homebrew/Cellar/opencode/1.14.40/libexec/lib/node_modules/opencode-ai/node_modules/opencode-darwin-arm64/bin/opencode`.
- The resolved file is a 104,812,450-byte arm64 Mach-O. `opencode --version` returned `1.14.40`.
  Its SHA-256 is
  `4b261084514f625065296e972995bb8a7eeadd6277ea5a679dbcf269185e1edc`, matching the Task's
  locked orientation digest
  (`.omp-flow/tasks/08-06-opencode-external-engine/task.md:35-40`).
- The installed Homebrew formula records the exact npm source
  `https://registry.npmjs.org/opencode-ai/-/opencode-ai-1.14.40.tgz`, archive SHA-256
  `ed648ca5651e7e82bb7598a7fd475dfa3a29ede83829d5b90b160215012cbd75`, and MIT license.
  Installed `opencode-ai/package.json` is `1.14.40`, MIT, and pins
  `opencode-darwin-arm64` `1.14.40`; the platform package declares `darwin`/`arm64`.
- The installed license is the MIT text with copyright `2025 opencode`. It matches the
  [license at the fixed source revision](https://github.com/anomalyco/opencode/blob/277f1c71486ed4795875d09bb5c0bbe504f06dd5/LICENSE#L1-L21).

The upstream release is [v1.14.40, published 2026-05-07](https://github.com/anomalyco/opencode/releases/tag/v1.14.40)
and its tag resolves to commit `277f1c71486ed4795875d09bb5c0bbe504f06dd5`. The fixed source
declares OpenCode `1.14.40`, MIT and `@agentclientprotocol/sdk` `0.16.1` in
[`packages/opencode/package.json`](https://github.com/anomalyco/opencode/blob/277f1c71486ed4795875d09bb5c0bbe504f06dd5/packages/opencode/package.json#L1-L6)
and [the ACP dependency line](https://github.com/anomalyco/opencode/blob/277f1c71486ed4795875d09bb5c0bbe504f06dd5/packages/opencode/package.json#L83).
The SDK package is Apache-2.0 and tag `v0.16.1` resolves to
`9609d922dc855dc4446dfaef082416d34e0f123a`.

Useful source was acquired into the ignored clone cache:

- URL: `https://github.com/anomalyco/opencode.git`
- revision: `277f1c71486ed4795875d09bb5c0bbe504f06dd5`
- cache: `.omp-flow/cache/repos/opencode-1.14.40`
- anchors: `packages/opencode/src/cli/cmd/acp.ts`,
  `packages/opencode/src/acp/agent.ts`, `packages/opencode/src/acp/session.ts`,
  `packages/opencode/src/permission/index.ts`, and `packages/opencode/package.json`
- local interpretation: this is evidence for the selected user-installed external process, not
  adopted Product source and not redistribution authority.

The exact-output boundary allows only this Research Concept, so no second Reference Concept was
created; the above provenance should be split into a task-local Reference only if the Bundle owner
later authorizes another output. The unresolved source fact is reproducibility: version/tag/npm
metadata and exact installed bytes are bound, but no reproducible-build proof cryptographically
connects the Mach-O digest to the Git commit. Do not claim that stronger identity.

## Confirmed protocol and process facts

### Transport and process

The exact command starts an internal OpenCode HTTP server and client, then exposes the ACP SDK's
newline-delimited JSON stream on stdin/stdout; stdin end closes the readable stream and lets the
command handler return. See
[`acp.ts:23-31`](https://github.com/anomalyco/opencode/blob/277f1c71486ed4795875d09bb5c0bbe504f06dd5/packages/opencode/src/cli/cmd/acp.ts#L23-L31)
and
[`acp.ts:33-71`](https://github.com/anomalyco/opencode/blob/277f1c71486ed4795875d09bb5c0bbe504f06dd5/packages/opencode/src/cli/cmd/acp.ts#L33-L71).
This confirms official JSON-RPC/NDJSON stdio, but not a sandbox: the external process retains its
ordinary OS access, consistent with the repository warning that process isolation alone is not
host enforcement (`architecture/execution.md:109-116`).

The pinned SDK serializes a request to the writable stream and then waits for its matching JSON-RPC
response; the write only proves local stream handoff. Its connection aborts when the readable
stream ends, while this SDK revision neither converts that closure into an Engine acceptance ACK
nor rejects all pending request promises. See
[`src/acp.ts:961-997`](https://github.com/agentclientprotocol/typescript-sdk/blob/9609d922dc855dc4446dfaef082416d34e0f123a/src/acp.ts#L961-L997)
and
[`src/acp.ts:1125-1152`](https://github.com/agentclientprotocol/typescript-sdk/blob/9609d922dc855dc4446dfaef082416d34e0f123a/src/acp.ts#L1125-L1152).

### Initialization and authentication

A real process `initialize` probe negotiated ACP protocol version `1`, identified
`OpenCode/1.14.40`, and returned exactly:

- `loadSession: true`;
- MCP `http: true`, `sse: true`;
- prompt `embeddedContext: true`, `image: true` (audio absent);
- Session `fork`, `list`, `resume` (no advertised close/delete/additional-directory capability);
- one auth method, `opencode-login`.

This matches the fixed initializer
[`agent.ts:535-578`](https://github.com/anomalyco/opencode/blob/277f1c71486ed4795875d09bb5c0bbe504f06dd5/packages/opencode/src/acp/agent.ts#L535-L578).
Counter-evidence: `authenticate()` is hard-coded to throw
([`agent.ts:581-583`](https://github.com/anomalyco/opencode/blob/277f1c71486ed4795875d09bb5c0bbe504f06dd5/packages/opencode/src/acp/agent.ts#L581-L583));
a real `authenticate(opencode-login)` returned JSON-RPC internal error `-32603`. Therefore the
advertised method is a re-entry instruction to run `opencode auth login`, not working in-protocol
authentication. OmniMind must not copy credentials, call this a successful ACP login path, or
mutate OpenCode configuration.

### Session, catalog, model and mode

`session/new` calls OpenCode's own Session create API, keeps only process-local ACP routing state,
and returns the opaque native Session ID plus models/modes/config; `session/load` reattaches to the
same native Session and replays its history. See
[`session.ts:20-44`](https://github.com/anomalyco/opencode/blob/277f1c71486ed4795875d09bb5c0bbe504f06dd5/packages/opencode/src/acp/session.ts#L20-L44),
[`session.ts:46-74`](https://github.com/anomalyco/opencode/blob/277f1c71486ed4795875d09bb5c0bbe504f06dd5/packages/opencode/src/acp/session.ts#L46-L74),
and
[`agent.ts:585-678`](https://github.com/anomalyco/opencode/blob/277f1c71486ed4795875d09bb5c0bbe504f06dd5/packages/opencode/src/acp/agent.ts#L585-L678).

A real empty-Session restart matrix created one opaque 30-character Session ID, terminated that
ACP process, and successfully invoked both `session/resume` and `session/load` from fresh
`opencode acp` processes without exposing the ID or replayed content. This proves native lineage
survives process restart. It does **not** prove whether an ambiguous in-flight prompt settled.
Neither load nor resume carries a Run/operation ID that can reconcile a particular Product Run.

The 2026-08-06 real `session/new` response contained 261 runtime-declared model options, current
model `opencode/big-pickle`, modes `build` and `plan` with `build` current, and only two config
selectors: `model` and `mode`. The catalog is generated from OpenCode provider/config facts and
the default selection reads OpenCode config before fallback
([`agent.ts:1175-1284`](https://github.com/anomalyco/opencode/blob/277f1c71486ed4795875d09bb5c0bbe504f06dd5/packages/opencode/src/acp/agent.ts#L1175-L1284),
[`agent.ts:1598-1657`](https://github.com/anomalyco/opencode/blob/277f1c71486ed4795875d09bb5c0bbe504f06dd5/packages/opencode/src/acp/agent.ts#L1598-L1657)).
The count and current value are a temporal observation, not a static Product catalog and not proof
that every listed model is authenticated or reachable. Variants are folded into model values;
there is no independent Thinking/Reasoning config option.

### Prompt, stream and final settlement

The prompt handler converts supported ACP content, calls OpenCode's native Session prompt, and only
after that call returns sends usage and returns the JSON-RPC result. It always maps the normal path
to `stopReason: "end_turn"`; no intermediate prompt-acceptance response or operation ID exists.
See
[`agent.ts:1356-1491`](https://github.com/anomalyco/opencode/blob/277f1c71486ed4795875d09bb5c0bbe504f06dd5/packages/opencode/src/acp/agent.ts#L1356-L1491).

OpenCode projects native events into ACP `agent_message_chunk`, `agent_thought_chunk`, `tool_call`,
`tool_call_update`, `plan`, permission request and `usage_update` facts. Assistant message chunks
carry opaque Engine `messageId`; tool facts carry opaque `toolCallId`. The exact mapper also emits
raw tool input/output, so Product must allowlist typed fields and must not persist the raw payload
([`agent.ts:274-529`](https://github.com/anomalyco/opencode/blob/277f1c71486ed4795875d09bb5c0bbe504f06dd5/packages/opencode/src/acp/agent.ts#L274-L529)).

The bounded real journey inherited the user's existing OpenCode environment but never read,
copied or changed config/credentials. With a text-only “reply exactly OK; no tools” prompt it
observed, in order: `available_commands_update`, one two-character `agent_message_chunk`, one
`usage_update`, and the final `session/prompt` result `end_turn`; duration was 14,036 ms, stderr was
empty and no permission request occurred. The response body and opaque IDs were not retained.

Important counter-evidence: `available_commands_update` is scheduled by `session/new`, independently
of the prompt
([`agent.ts:1257-1265`](https://github.com/anomalyco/opencode/blob/277f1c71486ed4795875d09bb5c0bbe504f06dd5/packages/opencode/src/acp/agent.ts#L1257-L1265)).
It cannot be used as delivery or acceptance evidence even if it arrives after the client writes a
prompt. Only a fact causally specific to the single in-flight prompt, or its final/error response,
can move delivery from unknown.

### Permission and enforcement truth

OpenCode itself evaluates ordered permission rules as `allow`, `deny` or `ask`. A deny fails in the
Engine; allow proceeds without an ACP round trip; only ask publishes a permission event and waits
for a reply
([`permission/index.ts:179-214`](https://github.com/anomalyco/opencode/blob/277f1c71486ed4795875d09bb5c0bbe504f06dd5/packages/opencode/src/permission/index.ts#L179-L214)).
For an asked action the ACP mapper offers `allow_once`, `allow_always`, and `reject_once`; an ACP
request failure or non-selected outcome is converted to an Engine reject
([`agent.ts:191-270`](https://github.com/anomalyco/opencode/blob/277f1c71486ed4795875d09bb5c0bbe504f06dd5/packages/opencode/src/acp/agent.ts#L191-L270)).

This proves a real Engine-enforced decision path for operations OpenCode classifies as `ask`; it
does not prove host containment or that every file/network/command effect asks. Withholding ACP
client fs/terminal capabilities does not remove the OpenCode process's own built-in tools or OS
access. The truthful Run-level enforcement field therefore remains `unverified` until the
implementation performs a deny-side-effect test on the exact call path; detail may say
“OpenCode-engine permission rules; ACP client decides only asked actions.” `host-enforced` and
“sandbox” are false. This follows the Product requirement that source and deny evidence, not a
protocol name, determine the label (`architecture/product-state.md:91-93` and
`architecture/workbench.md:272-289`).

### Cancel, process failure and disconnect

`session/cancel` is a notification, so it has no acknowledgement. OpenCode maps it to its internal
Session abort endpoint
([`agent.ts:1539-1548`](https://github.com/anomalyco/opencode/blob/277f1c71486ed4795875d09bb5c0bbe504f06dd5/packages/opencode/src/acp/agent.ts#L1539-L1548)),
but the prompt handler still unconditionally returns `end_turn`. A real long-output probe sent
cancel 1,203 ms after prompt dispatch. It emitted no assistant chunk, emitted `usage_update`, and
settled 77 ms later as `end_turn`, not `cancelled`. Thus:

- record `abort_requested` when Product writes the cancel notification;
- keep consuming late facts;
- on response record `settled_after_abort_request`, Engine stop reason `end_turn`, and
  `abortConfirmed: false`;
- never claim the model/tool stopped merely because the notification write succeeded.

Spawn failure, version/digest mismatch, initialize error, auth-required error and `session/new`
error occur before prompt dispatch and are ordinary failed/unavailable outcomes with zero fallback.
After prompt dispatch, stdio EOF, EPIPE, timeout, signal exit or nonzero exit are process/transport
facts, not evidence that effects did not happen. The real restart matrix proves Session lineage can
survive a process loss; it does not settle a pending Run. An in-flight crash probe was deliberately
not replayed because the already-confirmed absence of a prompt operation ID makes replay unsafe.

## Typed Product mapping

| Product fact | Evidence-backed mapping for OpenCode 1.14.40 |
| --- | --- |
| Catalog identity | One explicit external Agent: source `anomalyco/opencode`, installed version/path/digest, protocol ACP v1, status split into missing/version-mismatch/initialize-failed/auth-required/ready. No silent fallback. |
| `EngineBinding` | Opaque `{engine: OpenCode, protocol: ACP v1, sessionId}` lineage owned by OpenCode. Product stores the opaque reference, not transcript/config/credentials. |
| Session lifecycle | `new`, `load`, `resume`, `list`, `fork` available as advertised; close/delete not advertised. Resume/load success proves lineage, not an ambiguous Run outcome. |
| Model/mode | Use per-Session runtime values and freeze selected values into the Run. Do not mirror the 261-option observation. `build`/`plan` are Engine modes, not Product permission policy. |
| Thinking | Thought chunks can be projected when emitted; independent Thinking-level selection is unsupported because config exposes only model/mode and variants are model values. |
| Prompt inputs | Text/resource baseline plus advertised image and embedded context; audio unsupported. |
| Structured Question | Unsupported by this exact mapper: no elicitation/question handler or capability was found. Do not infer a Question from text. |
| Queue/steer/follow-up | Unsupported as controls. Enforce one in-flight prompt per Session for causal delivery mapping; Product owns only pre-dispatch Queue. |
| Permission | Permission requests available only for Engine `ask`; Run-level enforcement stays `unverified` until deny-side-effect proof. Never label host-enforced/sandbox. |
| Files/commands/Terminal | OpenCode tools may read/write/execute under OpenCode/OS authority. Tool Activity is available; a Product PTY/Terminal contract is unsupported. |
| Package/namespaced UI | OmniMind Package integration and namespaced custom UI unsupported; OpenCode's own plugins/MCP/private state remain OpenCode-owned. |
| Local write | `dispatch_write_completed`; diagnostic only, never `delivered` or `accepted`. |
| Delivery observed | First prompt-specific `agent_message_chunk`/`agent_thought_chunk` with Engine message ID, `tool_call`/permission with tool-call ID, or correlated final/error response, under one-in-flight-per-Session. Call this observed delivery, not a durable acceptance ACK. |
| Stream | Allowlisted typed message/thought/tool/plan/usage facts; drop or redact raw input/output and private reasoning from durable Product state. |
| Final | Matching `session/prompt` JSON-RPC result settles protocol execution; preserve actual stop reason and usage. A JSON-RPC error is a correlated failed settlement. |
| Abort | `abort_requested` then `settled_after_abort_request`; `abortConfirmed` remains false for observed `end_turn`. No automatic second attempt. |
| Disconnect before delivery evidence | `delivery_unknown`, retain frozen input/selection, attempt count `1`, no retry/fallback/requeue. |
| Disconnect after delivery evidence, before final | `outcome_unknown`, retain visible partial facts and individual effect receipts, attempt count `1`, no retry/fallback. |
| Recovery | A new process may `resume` the opaque Session after explicit reconciliation, but must not resend the prompt. `load` replay cannot deterministically bind history to a Product Run because ACP exposes no prompt operation ID. |

This mapping preserves the Product's Queue and no-replay invariants
(`architecture/product-state.md:56-65,79-89`) and the Workbench's visible uncertainty/no-fallback
requirements (`architecture/workbench.md:291-301`).

## Interpretation, counter-evidence and decision impact

Confirmed: the exact real process is usable for a small external-Engine journey without copying or
changing OpenCode credentials/configuration; OpenCode retains Session/catalog/tool/private-state
authority; Product can keep its Conversation, typed projection and no-fallback truth.

Revised: the first-principles anchor's acceptance half is stronger than the protocol. The exact
implementation has no prompt-specific ACK or operation reference, `available_commands_update` is
not prompt evidence, advertised authentication is nonfunctional, and cancel settlement does not
confirm cancellation. These are not cosmetic gaps.

Falsified: successful stdio write, process liveness, Session creation, scheduled command update,
or `end_turn` after cancel cannot be promoted to accepted/abort-confirmed receipts. Any design or
test requiring such promotion is unsafe on OpenCode `1.14.40`.

The smallest truthful vertical slice is realizable only as a **degraded no-ACK contract** with the
mapping above. If the owner requires the current strict `accepted operation reference` before
stream, the selected slice is unrealizable and must stop at truthful unsupported/degraded rather
than enter implementation.

## Unknowns and concrete falsifiers

- No reproducible-build proof binds the source commit to the installed Mach-O bytes; exact digest,
  release/tag, package metadata and license are known separately.
- No safe live deny-side-effect test was performed because forcing an `ask` policy would require
  OpenCode configuration mutation. Until implementation finds a mutation-free exact path and
  proves denial, enforcement remains `unverified`.
- The real process probes used the current existing default model. They do not prove all 261
  options, every provider, tool execution, image input, fork/list, or cross-platform behavior.
- A successful `load`/`resume` cannot settle an interrupted prompt without a prompt operation ID;
  do not invent transcript heuristics.

Concrete stop/falsifier: if the proposed Product contract records `accepted` before receiving a
prompt-specific Engine reference/final response, automatically issues a second `session/prompt`
after any ambiguous disconnect, labels an abort confirmed from `end_turn`, or labels permission
host-enforced without a deny-side-effect proof, the selected vertical slice is unsafe. Conversely,
only a newer exact OpenCode artifact that adds a dedicated prompt acceptance/operation reference
and truthful cancel acknowledgement could remove these restrictions; that would be a new source,
digest and protocol review, not evidence transferable to `1.14.40`.

## Reproduction anchors

Read-only artifact checks used:

```text
shasum -a 256 <resolved exact binary>
<resolved exact binary> --version
brew info --json=v2 opencode
git ls-remote https://github.com/anomalyco/opencode.git refs/tags/v1.14.40
git -C .omp-flow/cache/repos/opencode-1.14.40 rev-parse HEAD
```

Live observations used a bounded Node child-process harness around the exact binary with
`opencode acp --cwd <repository>`, inherited the existing environment, printed only capability
keys/counts/status/timing, redacted opaque Session IDs, never printed model response bodies, and
terminated each child with a hard timeout. No OpenCode install/update/config/auth command was run.
