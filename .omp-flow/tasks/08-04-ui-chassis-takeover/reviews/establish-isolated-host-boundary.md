---
type: "Implementation Review"
title: "Review: Establish the real isolated Host boundary"
work: "../work/establish-isolated-host-boundary.md"
handoff: "../handoffs/establish-isolated-host-boundary.md"
verdict: "PASS"
revision: "review-isolated-host-20260804-r2"
actor_id: "isolated_host_reviewer"
dispatch_receipt: "91003ce18c444ee3813d7d9fffab479b"
predecessor_receipt: "4a598a7cb54f4eb5b779e7a4775966c5"
predecessor_output: "../handoffs/establish-isolated-host-boundary.md"
---

# Review: Establish the real isolated Host boundary

## Findings

No substantive findings.

The two P1 findings from `review-isolated-host-20260804-r1` are closed:

1. Service now treats the Desktop-issued `hostInstanceId` as required rendezvous identity. It rejects a
   mismatching `host.hello` before constructing or sending any protocol request, and uses the expected identity
   for proof, request and response validation.
2. Product submission now fails closed on missing or non-dispatchable health. The exact-transfer Queue item
   remains durable and editable, while the unavailable branch returns before constructing Entry/Run/dispatch/
   receipt IDs or calling `submitQueueItem`; the optimistic transcript row, tail anchor and local dispatch state
   are reconciled without inventing Product lineage.

## Verdict

`PASS`. The bounded r2 repairs satisfy the assigned Work and close both prior P1 findings. Independent verification
also reconfirmed that the repaired client still interoperates with the single production Native Host executable and
that the real Desktop/Host process seam and boundary scan did not regress.

This verdict is limited to the completed `establish-isolated-host-boundary` Work. It does not claim Pi acceptance,
T3/T4, Campaign verification or repository-wide completion.

## Predecessor and subject resolution

The runtime record for predecessor `4a598a7cb54f4eb5b779e7a4775966c5` resolves to completed executor
`isolated_host_implementer`, entry `work/establish-isolated-host-boundary.md` and output
`.omp-flow/tasks/08-04-ui-chassis-takeover/handoffs/establish-isolated-host-boundary.md`. The handoff is `DONE`, has
the same dispatch receipt, links back to the assigned Work, and identifies the preceding r1 Review. Reviewer actor
`isolated_host_reviewer` differs from the implementation actor.

The current Work, handoff, actual changed files and repaired call paths were inspected. The shared worktree also
contains unrelated prior/parallel task changes; this review did not attribute or modify them.

## Independent verification

| Command / inspection | Result |
| --- | --- |
| `sed -n '1,240p' .omp-flow/.runtime/operations/4a598a7cb54f4eb5b779e7a4775966c5.json` plus linked Work/handoff reads | PASS: completed predecessor, required output, receipt and Work↔handoff linkage resolved; actor separation confirmed. |
| Independent inline fake-Host probe from `apps/service` using the correct authentication secret, expected instance `native-host-expected`, presented instance `native-host-wrong`, and recording every Service→Host frame kind | PASS, exit 0: the client rejected non-retryably with `NATIVE_HOST_AUTHENTICATION_FAILED`; only `client.hello` was observed, so no post-handshake request crossed the seam. |
| `bunx vitest run apps/service/src/native-host/client.integration.test.ts apps/service/src/native-host/serviceProcess.integration.test.ts apps/web/src/store/systemHealthStore.test.ts apps/web/src/components/system-health/ProductSubmissionHealthGate.test.ts --maxWorkers=1 --no-file-parallelism` | PASS, exit 0; 4 files / 17 tests. This includes the real production Host with correct secret/wrong expected instance, valid-client recovery on the same endpoint, all non-ready Service/Host/Engine health states, and the exact Queue→health gate→return→admission source boundary. |
| `bun run --cwd apps/service typecheck` | PASS, exit 0. |
| `bun run --cwd apps/web typecheck` | PASS, exit 0. |
| `bun run build:desktop && bunx vitest run apps/desktop/src/process/nativeHostProcess.integration.test.ts apps/desktop/src/process/desktopProcessTree.integration.test.ts scripts/native-host-boundary.test.ts --maxWorkers=1 --no-file-parallelism` | PASS, exit 0; fresh build 5/5 tasks, followed by 3 files / 6 tests covering the real production Host circuit, Desktop process tree and one-Host/Pi-free boundary. |
| Manual source-order inspection of `ChatView.tsx`, `systemHealthStore.ts` and their focused tests | PASS: Queue ownership is published before the fail-closed gate; null and every non-dispatchable status stop before `ProductEntryId`, `ProductRunId` and `submitQueueItem`; all-ready remains the only admission path. |
| `git diff --check -- .omp-flow/tasks/08-04-ui-chassis-takeover/work/establish-isolated-host-boundary.md apps/web/src/components/ChatView.tsx` | PASS, exit 0 with no output. |
| `git diff --no-index --check /dev/null .omp-flow/tasks/08-04-ui-chassis-takeover/reviews/establish-isolated-host-boundary.md` | PASS for whitespace inspection: no output; exit 1 is the expected `--no-index` content-difference status for the new Review. |

The independent wrong-instance falsifier produced:

```json
{"expectedHostInstanceId":"native-host-expected","presentedHostInstanceId":"native-host-wrong","frameKinds":["client.hello"],"accepted":false,"code":"NATIVE_HOST_AUTHENTICATION_FAILED","retryable":false}
```

## Scope and residual boundary

- No implementation, architecture, Campaign, runtime/session record or Evidence ledger was edited. The only
  repository write by this reviewer is this linked Review Concept.
- macOS development process behavior was exercised. Windows named-pipe and Linux process/package execution were
  not run and are not claimed.
- The Product health-gate test deliberately fixes the source boundary, while store tests exhaust the closed health
  unions. Full browser interaction and repository-wide test suites were outside this bounded r2 re-review.

## Dispatch identity

- actorId: `isolated_host_reviewer`
- receipt: `91003ce18c444ee3813d7d9fffab479b`
- predecessor receipt: `4a598a7cb54f4eb5b779e7a4775966c5`
- predecessor output: `../handoffs/establish-isolated-host-boundary.md`
