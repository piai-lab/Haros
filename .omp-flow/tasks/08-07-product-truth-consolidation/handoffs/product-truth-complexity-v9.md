---
type: "Handoff"
title: "Narrow Product-truth complexity v9 measurement"
work: "../work/product-truth-complexity-v9.md"
status: "DONE"
actor_id: "product_truth_complexity_v9_impl_r2"
dispatch_receipt: "b37ff42180f742a5b909ce16fbab558a"
predecessor_receipt: "5715f89dd0e34abc99410f90c72f4c0d"
predecessor_output: "../handoffs/product-truth-complexity-v9.md"
reviewed_candidate: "ec416f7fe6eeea908fb80bbd6c716bc01e9860bd"
report_sha256: "4d02b9c880331e70cc9440e8461d3bfea280fa8b1a784c4df838f16491c4ff46"
---

# Narrow Product-truth complexity v9 measurement

## Result

`DONE` — the repaired measurement-only v9 candidate is frozen at immutable commit
`ec416f7fe6eeea908fb80bbd6c716bc01e9860bd`. It implements the exact hard facts in the
[v9 Interface](../interfaces/product-truth-complexity-v9.md) and the bounded
[measurement Work](../work/product-truth-complexity-v9.md), under accepted Design
`f110fb66006768074ca192bb94024632d16c09dd`, the zero-finding
[final QbD audit](../qbd/product-truth-complexity-v9-final-audit.md), and human PASS at
`d74bffb673a7869272a6e243a8c8a329fce69092`.

The immutable first candidate `0b09b7441ae71cafe39eaabaaad4f2f0cbce9f00` was rejected by the
[failed implementation Review](../reviews/product-truth-complexity-v9.md), receipt
`0bb1e2cc742d4572aef193be8c4fc23d`. This r2 candidate repairs only its three P1 findings: extension-
independent production/direct-tool membership over every changed path, value-namespace declaration
export disposition, and recursive duplicate-key rejection for predecessor evidence machine JSON.
It adds ten bounded structural fixtures, changes no Design or v9 semantic authority, and imports no
v8 expression case. Product, dependency, v1-v8 artifacts, Work/Design/Decision/QbD/Review bytes,
the three Synara-first documents and real `~/.omnimind` remain outside the repair.

## Frozen bytes and authority

- Meter: `scripts/product-truth/measure-complexity-v9.mjs`, mode `100755`, SHA-256
  `8408b18b9812444edc030b8b44a5d6389fceedc949ba196c8413ac80f722cce8`.
- Config: `scripts/product-truth/complexity-universe-v9.json`, SHA-256
  `b60120a449e0fc90e537dd1aa45f4e660650d21e050261785fe1156a6eb20ccb`.
- Focused test: `scripts/product-truth/measure-complexity-v9.test.ts`, SHA-256
  `0e8205cc0e548bc71b4345bd5fac59594406dc0dc5757b14ab2f723c9827a331`.
- Fixture manifest: 44 exact path/mode/SHA-256 records, raw-JCS SHA-256
  `4bd1dc794b3af56c98ed9313aff3cb62c044001320e952ffaa1d0b02ecef7f98`.
- Full candidate manifest: 47 exact path/mode/SHA-256 records, raw-JCS SHA-256
  `15e30df5191c9134e275cdd76da9349afe8b45e3ad66f63d49a46facbc8efa04`.
- R2 repair manifest from failed-Review commit
  `f12d654c5447c1c2192bdd3e43bcbd41a33f2769`: 12 exact path/mode/SHA-256 records,
  raw-JCS SHA-256 `f3415c4da21af4f29c7bdafacbc3515b28bd31177ec5e19992c09659961070d9`.
- V9 authority JCS SHA-256:
  `b8ffbdb58b17322d1e35835071c3458eba51c3913b0d05de50162219ae803920`.
- Five Work fence JCS SHA-256 values:
  `direct-first-public-b1=0e1551ebcdb8a47310e3ef56f9f7558ada452f5590d166551296eb359dd8faae`;
  `native-host-package-root-binding=c85e1d66b3945573e86d5cdc7c2499bb1dc3136d810d02913be6e4a04c5d6de5`;
  `product-execution-leaf=dec2eea264a3e638753fae7a548f1bb249f6f21bf5bc4a7011de05ddde5d3ca4`;
  `product-state-store=2f3a862745d5edb40b9bcf793dde7d66d048b0094276655e4223eccad5c5a36a`;
  `product-execution-coordinator-facade=124e32d7478469dd9973977573619371f5af863ed8f67d75fc2cc7d3643e79d9`.
- V1-v8 accepted-tree manifest: 580 exact records, JCS SHA-256
  `a23165cc1330a12e69003a7f29177a229ce56a451cd3db20341bdd6f745854eb`.
- Dependency byte closure: B0
  `b3989b0c513f830a18b6803c85455acada90b287702370207aaa3e3427f710f6`;
  accepted-tree `23336380434c431dca5236593f08ae276b790014a35a273ff2ad26eb44795e60`.

## Reuse and bounded replacement

The implementation reuses the accepted v7/v8 Git-object snapshot, canonical JSON, exact evidence
frontmatter/blob/report binding, strict ancestry, post-evidence immutability, selected lifecycle,
outside mode/blob, declaration, dependency-byte, and deterministic reporting mechanisms where
their authority matches v9.

The sole replacement owner is this v9 measurement Work: the literal graph is rebuilt directly from
TypeScript `ImportDeclaration` and literal `ExportDeclaration` records. The reproducible
falsifier is the immutable v8 r1-r17 expression-combination sequence summarized in the
[failed v8 Review](../reviews/product-truth-complexity-v8.md). Wiring or local repair cannot close
that class because Design supplies no complete graph-delta table and expressly forbids v9 from
inventing semantic expression authority. The v9 lifecycle is smaller: it emits the literal multiset,
resolution observations, SCCs, deltas, LOC and physical counts, all permanently observational.
Raw-reference completeness and behavior remain with B1's fixed verifier, reviewer-owned enumerator,
and same-SHA source Review.

## Official evidence and deterministic B0

The official invocation was exactly
`node scripts/product-truth/measure-complexity-v9.mjs --ref 7582170a277477ba0d71cf70f53e4e0836874a72 --predecessor-evidence 5632f63603e6ae8b3fb95f759c793a09b16a1e44`.

The selected bootstrap tuple binds reviewed v7 candidate
`5c3e61999e1d406873c957dd9dbb6847cc2487b9`, handoff blob
`fd31a236709a8e2482571423ac1e414cd7d84b40`, Review blob
`fa047d2bf3c62ce87483cea86f6e0b1ed2362eea`, predecessor report JCS SHA-256
`aa114aeb6239dffdc10ef8023ea3399bb9e8705f5960560e5766d80abe06b16c`,
implementer `product_truth_meter_v7_r5`, reviewer `product_truth_meter_v7_review_r5`, and
Review receipt `ac877c8dbc3a425b91129f153deb61f9`. These declared strings and receipts authenticate no identity.

Two clean post-freeze invocations were byte-identical at 148,897 bytes. Each output has byte SHA-256
`b997bdd3142b5c669e98e76f41ba4d7588004127f3b0d1ca9dff17a1b290f66c`
and JCS SHA-256 `4d02b9c880331e70cc9440e8461d3bfea280fa8b1a784c4df838f16491c4ff46`.
The report reproduces 69 production source members, 71 complete boundary members, 56 parsed sources,
578 literal records, graph SHA-256
`9594b2c2d1562d9d546ece89e699156d1e6708b0817ac0a2bf5b62ea6ba66869`,
and all 11 declarations as two present plus nine absent.

## Verification

- `bunx vitest run scripts/product-truth/measure-complexity-v9.test.ts`: PASS, 63/63.
- `bun run typecheck` from `scripts/`: PASS.
- `node --check scripts/product-truth/measure-complexity-v9.mjs`: PASS.
- Targeted `oxfmt --check`: PASS for all 12 r2 repair files.
- Link/JSON validation: PASS, all linked local targets, one complete report block and 45 v9 JSON
  files.
- `git diff --check`: PASS.
- Frozen commit identity/type, exact 12-path r2 diff and cumulative 47-path v9 candidate: PASS.
- V1-v8 byte/mode manifest, five fence digests, source/config authority, and path-limited scope:
  PASS.
- Source inspection found no v8 expression grammar or public-nonleak, write/Web-RPC/gateway,
  raw-terminal, global-wrapper, selector, alias-use, callback-inheritance, RHS/subtree,
  per-use-owner, CFG/ICFG, SSA, or points-to classifier. Graph/SCC/delta/LOC/physical sections are
  labeled observational with hard gates disabled in every tested mode.
- Tests and fixtures used generated Git snapshots only. No real `~/.omnimind`, destructive target,
  live provider, remote host, or B1 code/path was read or changed.

## Independent review required

This handoff is producer evidence, not acceptance. A fresh different actor must review immutable
candidate `ec416f7fe6eeea908fb80bbd6c716bc01e9860bd`, this handoff, the official invocation, and the
complete report, then write `reviews/product-truth-complexity-v9.md`. Only a zero-finding PASS can
satisfy B1's meter prerequisite.

## Complete B0 report

```omp-flow-product-truth-complexity-v9-report-v1
{
  "format": "product-truth-complexity-v9",
  "schema": "omp-flow-product-truth-complexity-v9-report-v1",
  "commit": "7582170a277477ba0d71cf70f53e4e0836874a72",
  "observationalBaseline": true,
  "instrument": {
    "scriptSha256": "8408b18b9812444edc030b8b44a5d6389fceedc949ba196c8413ac80f722cce8",
    "configSha256": "b60120a449e0fc90e537dd1aa45f4e660650d21e050261785fe1156a6eb20ccb"
  },
  "officialInvocation": {
    "argv": [
      "node",
      "scripts/product-truth/measure-complexity-v9.mjs",
      "--ref",
      "7582170a277477ba0d71cf70f53e4e0836874a72",
      "--predecessor-evidence",
      "5632f63603e6ae8b3fb95f759c793a09b16a1e44"
    ],
    "predecessorEvidenceArgumentCount": 1,
    "fixtureMode": false,
    "official": true,
    "environmentFallbackUsed": false,
    "identityAuthenticationClaimed": false
  },
  "authority": {
    "acceptedDesignCommit": "f110fb66006768074ca192bb94024632d16c09dd",
    "authoritySha256": "b8ffbdb58b17322d1e35835071c3458eba51c3913b0d05de50162219ae803920",
    "configSha256": "b60120a449e0fc90e537dd1aa45f4e660650d21e050261785fe1156a6eb20ccb",
    "workBoundarySha256": {
      "direct-first-public-b1": "0e1551ebcdb8a47310e3ef56f9f7558ada452f5590d166551296eb359dd8faae",
      "native-host-package-root-binding": "c85e1d66b3945573e86d5cdc7c2499bb1dc3136d810d02913be6e4a04c5d6de5",
      "product-execution-coordinator-facade": "124e32d7478469dd9973977573619371f5af863ed8f67d75fc2cc7d3643e79d9",
      "product-execution-leaf": "dec2eea264a3e638753fae7a548f1bb249f6f21bf5bc4a7011de05ddde5d3ca4",
      "product-state-store": "2f3a862745d5edb40b9bcf793dde7d66d048b0094276655e4223eccad5c5a36a"
    },
    "hardFacts": [
      "authority-and-config-digest",
      "membership-and-selected-work-lifecycle",
      "outside-work-presence-mode-blob",
      "official-evidence-tuple-blob-ancestry",
      "dependency-input-byte-closure",
      "declaration-identity-presence-export-private-disposition",
      "report-determinism"
    ],
    "observationalFacts": [
      "emitted-signature-without-independent-pin",
      "literal-import-export-graph-and-scc",
      "all physical and semantic counters",
      "all domain ownership interpretations"
    ],
    "explicitNonAuthority": [
      "semantic-public-raw-non-leak",
      "raw-or-global-terminal-inventory",
      "global-wrapper-or-selector-normalization",
      "module-or-local-alias-propagation",
      "callback-owner-inheritance",
      "rhs-or-expression-subtree-classification",
      "per-use-owner-or-lifetime-semantics",
      "native-host-package-lifecycle-write-verdict",
      "web-rpc-facade-or-gateway-verdict",
      "forbidden-compatibility-semantic-verdict",
      "cfg-icfg-ssa-points-to-order-reachability",
      "cleanup-lock-scheduler-exception-race-or-crash-convergence"
    ],
    "observationsPromoted": false
  },
  "evidence": {
    "transitionRows": [
      {
        "candidateWorkId": "direct-first-public-b1",
        "predecessorWorkId": "product-truth-complexity-v9",
        "handoffPath": ".omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v9.md",
        "reviewPath": ".omp-flow/tasks/08-07-product-truth-consolidation/reviews/product-truth-complexity-v9.md",
        "reportLabel": "v9 B0 report"
      },
      {
        "candidateWorkId": "native-host-package-root-binding",
        "predecessorWorkId": "direct-first-public-b1",
        "handoffPath": ".omp-flow/tasks/08-07-product-truth-consolidation/handoffs/direct-first-public-b1.md",
        "reviewPath": ".omp-flow/tasks/08-07-product-truth-consolidation/reviews/direct-first-public-b1.md",
        "reportLabel": "reviewed B1 v9 report"
      },
      {
        "candidateWorkId": "product-execution-leaf",
        "predecessorWorkId": "native-host-package-root-binding",
        "handoffPath": ".omp-flow/tasks/08-07-product-truth-consolidation/handoffs/native-host-package-root-binding.md",
        "reviewPath": ".omp-flow/tasks/08-07-product-truth-consolidation/reviews/native-host-package-root-binding.md",
        "reportLabel": "reviewed Native Host v9 report"
      },
      {
        "candidateWorkId": "product-state-store",
        "predecessorWorkId": "product-execution-leaf",
        "handoffPath": ".omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-execution-leaf.md",
        "reviewPath": ".omp-flow/tasks/08-07-product-truth-consolidation/reviews/product-execution-leaf.md",
        "reportLabel": "reviewed execution-leaf v9 report"
      },
      {
        "candidateWorkId": "product-execution-coordinator-facade",
        "predecessorWorkId": "product-state-store",
        "handoffPath": ".omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-state-store.md",
        "reviewPath": ".omp-flow/tasks/08-07-product-truth-consolidation/reviews/product-state-store.md",
        "reportLabel": "reviewed Store v9 report"
      }
    ],
    "selectedTuple": {
      "candidateWorkId": "product-truth-complexity-v9",
      "candidateUnderTestSha": "7582170a277477ba0d71cf70f53e4e0836874a72",
      "officialPredecessorEvidenceSha": "5632f63603e6ae8b3fb95f759c793a09b16a1e44",
      "reviewedCandidateSha": "5c3e61999e1d406873c957dd9dbb6847cc2487b9",
      "handoffPath": ".omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v7.md",
      "reviewPath": ".omp-flow/tasks/08-07-product-truth-consolidation/reviews/product-truth-complexity-v7.md",
      "handoffBlobId": "fd31a236709a8e2482571423ac1e414cd7d84b40",
      "reviewBlobId": "fa047d2bf3c62ce87483cea86f6e0b1ed2362eea",
      "predecessorReportSha256": "aa114aeb6239dffdc10ef8023ea3399bb9e8705f5960560e5766d80abe06b16c",
      "implementerActorId": "product_truth_meter_v7_r5",
      "reviewerActorId": "product_truth_meter_v7_review_r5",
      "reviewReceipt": "ac877c8dbc3a425b91129f153deb61f9"
    },
    "identityAuthenticationClaimed": false
  },
  "universe": {
    "source": "five-design-frozen-production-boundaries",
    "candidateSelectedPathsUsed": false,
    "workingTreeUsed": false,
    "sourceUniverseMemberCount": 69,
    "sourceUniverseJcsSha256": "f771ad1803e65a65e6077687d0f923d41c826d17cbcfdfb11dee73d1b3787caa",
    "members": [
      {
        "path": "apps/desktop/src/desktopStorageUpgrade.ts",
        "present": true,
        "mode": "100644",
        "blobId": "0d5f32d9369e84ced63afc45c397211751a3116b"
      },
      {
        "path": "apps/desktop/src/desktopUserDataProfile.ts",
        "present": true,
        "mode": "100644",
        "blobId": "ad0ff35cd1584fc9eee45d2885204e30402ffe6d"
      },
      {
        "path": "apps/desktop/src/ipcChannels.ts",
        "present": true,
        "mode": "100644",
        "blobId": "827ce87ebe7f2fae9e574563324aeaced95e8b8c"
      },
      {
        "path": "apps/desktop/src/main.ts",
        "present": true,
        "mode": "100644",
        "blobId": "5cf0809404c6e30195e3beae8c8712b8d665aa0a"
      },
      {
        "path": "apps/desktop/src/preload.ts",
        "present": true,
        "mode": "100644",
        "blobId": "1fd8a37aabf587e5aadc503d55893025b0a1a7d0"
      },
      {
        "path": "apps/desktop/src/process/nativeHostAuthenticatedReadiness.ts",
        "present": true,
        "mode": "100644",
        "blobId": "75488f88319e14fd64d9390894bf73f55d915b11"
      },
      {
        "path": "apps/desktop/src/process/nativeHostEnvironment.ts",
        "present": true,
        "mode": "100644",
        "blobId": "0dff19f8d45659dbfa22bcf75c7b3a022b380eb3"
      },
      {
        "path": "apps/desktop/src/process/nativeHostRendezvous.ts",
        "present": true,
        "mode": "100644",
        "blobId": "1739c76e97ed0048ad3287cd01039823573ed894"
      },
      {
        "path": "apps/desktop/src/process/nativeHostSupervisor.ts",
        "present": true,
        "mode": "100644",
        "blobId": "36b6715bbcb4f9949891b3ad759dfcd0b3db7451"
      },
      {
        "path": "apps/native-host/src/index.ts",
        "present": true,
        "mode": "100644",
        "blobId": "0b0d0cc9ca8a7a719d60e002fa9b469a6568e026"
      },
      {
        "path": "apps/native-host/src/piRuntime.ts",
        "present": true,
        "mode": "100644",
        "blobId": "fae5dfea66707453469efa5b5e5c5bc5709ed953"
      },
      {
        "path": "apps/native-host/src/responseFrame.ts",
        "present": true,
        "mode": "100644",
        "blobId": "f77880b92b496c89f4d4f860de3d309c98083dc3"
      },
      {
        "path": "apps/service/src/config.ts",
        "present": true,
        "mode": "100644",
        "blobId": "702fd757a76cb9c618ec9ec40ccbef599e1c6465"
      },
      {
        "path": "apps/service/src/effectServer.ts",
        "present": true,
        "mode": "100644",
        "blobId": "ed4ec47b96ae240c5c921e316d153426eb407ace"
      },
      {
        "path": "apps/service/src/main.ts",
        "present": true,
        "mode": "100644",
        "blobId": "e0d19e4099a40738d25efbb31690a5165a765457"
      },
      {
        "path": "apps/service/src/native-host/client.ts",
        "present": true,
        "mode": "100644",
        "blobId": "7cf5cdf35d7b64ac8b9e15de6565ba78f4691585"
      },
      {
        "path": "apps/service/src/native-host/executionBoundary.ts",
        "present": true,
        "mode": "100644",
        "blobId": "2b7e7771fab4a041fba632700f04487622694161"
      },
      {
        "path": "apps/service/src/native-host/liveJourneyProbe.ts",
        "present": true,
        "mode": "100644",
        "blobId": "d0673913be8ce1a4c7336722692f42f4e5de059a"
      },
      {
        "path": "apps/service/src/native-host/packageCrashProbe.ts",
        "present": true,
        "mode": "100644",
        "blobId": "d6b29b421ea753257b3a2e0ba38b5104c0658477"
      },
      {
        "path": "apps/service/src/native-host/packageLifecycle.ts",
        "present": true,
        "mode": "100644",
        "blobId": "40f202a828b670556d835baa0bf8f2fff87fa5f8"
      },
      {
        "path": "apps/service/src/opencode/liveJourneyProbe.ts",
        "present": true,
        "mode": "100644",
        "blobId": "7711e5c131e4c012ef0ba7ea736c6b172de5465c"
      },
      {
        "path": "apps/service/src/opencode/productBoundary.ts",
        "present": true,
        "mode": "100644",
        "blobId": "6d685139e42e9e0d2a979ebc84e1e63009e7ca97"
      },
      {
        "path": "apps/service/src/persistence/AutomationSchema.ts",
        "present": true,
        "mode": "100644",
        "blobId": "87f867d0d4f16660dda92ef79b905bdf7ea703e9"
      },
      {
        "path": "apps/service/src/persistence/Layers/Sqlite.ts",
        "present": true,
        "mode": "100644",
        "blobId": "518c1d25eafb580a570054f121c1501e1a83ecb0"
      },
      {
        "path": "apps/service/src/persistence/SystemCapabilitySchema.ts",
        "present": true,
        "mode": "100644",
        "blobId": "225f42d5a776d3dbf4e10cb4697a2d5f830ce41c"
      },
      {
        "path": "apps/service/src/persistence/automationSelectionTranscode.ts",
        "present": true,
        "mode": "100644",
        "blobId": "0f63c8cd70d1b22715f1f1d7cfe9db7b55ee62e8"
      },
      {
        "path": "apps/service/src/persistence/selectionSchemaCoordinator.ts",
        "present": true,
        "mode": "100644",
        "blobId": "318e6887a14ec80d14f1e928324ccb7758212841"
      },
      {
        "path": "apps/service/src/product/ProductControlPlane.ts",
        "present": true,
        "mode": "100644",
        "blobId": "21d9eaad68f37f31ad0bbbcc10c1c86f4d1a6bce"
      },
      {
        "path": "apps/service/src/product/engineJourneyProof.ts",
        "present": true,
        "mode": "100644",
        "blobId": "e41ae2f3bbf61cf4ffbaec069b475047c09d9c4a"
      },
      {
        "path": "apps/service/src/product/health/nativeHostHealthMonitor.ts",
        "present": true,
        "mode": "100644",
        "blobId": "2733a21e94f6f80354ab94a1fcfaadec068b69cf"
      },
      {
        "path": "apps/service/src/product/productExecutionBoundary.ts",
        "present": false,
        "mode": null,
        "blobId": null
      },
      {
        "path": "apps/service/src/product/productExecutionCoordinator.ts",
        "present": false,
        "mode": null,
        "blobId": null
      },
      {
        "path": "apps/service/src/product/productExecutionGateway.ts",
        "present": true,
        "mode": "100644",
        "blobId": "0343a3a9d9ce534fcd6758f451a1412396ca4e0a"
      },
      {
        "path": "apps/service/src/product/productStateDiagnostics.ts",
        "present": false,
        "mode": null,
        "blobId": null
      },
      {
        "path": "apps/service/src/product/productStateStore.ts",
        "present": false,
        "mode": null,
        "blobId": null
      },
      {
        "path": "apps/service/src/product/schema1ProductMutationFixtures.ts",
        "present": true,
        "mode": "100644",
        "blobId": "03ecc7f1b821d9afef65aef3ddbfd96e04daac5f"
      },
      {
        "path": "apps/service/src/product/schema1ProductTranscode.ts",
        "present": true,
        "mode": "100644",
        "blobId": "ba98224c70f4dc9119bf58294fbcb300adacb7bf"
      },
      {
        "path": "apps/service/src/product/schema1SelectionTranscode.ts",
        "present": true,
        "mode": "100644",
        "blobId": "4c6392f4b321e6a148e5998a087a845e17da0ac7"
      },
      {
        "path": "apps/service/src/server/readiness.ts",
        "present": true,
        "mode": "100644",
        "blobId": "2f335c17aa9a484514fbc34e57c6f59bf1cf4c82"
      },
      {
        "path": "apps/service/src/serverLayers.ts",
        "present": true,
        "mode": "100644",
        "blobId": "906f5a47de6a953e6fb5dc513ea42a84e6ba4502"
      },
      {
        "path": "apps/service/src/wsRpc.ts",
        "present": true,
        "mode": "100644",
        "blobId": "caaae4297aaf2ff1be6941a64c4b083439be4d2e"
      },
      {
        "path": "apps/web/src/appSettings.ts",
        "present": true,
        "mode": "100644",
        "blobId": "3bd00fa6934549cd4d565ab2e1898b11a0c02b54"
      },
      {
        "path": "apps/web/src/bootstrap.ts",
        "present": true,
        "mode": "100644",
        "blobId": "fda4cb999ef508629d586efa5b3da090f30f8de9"
      },
      {
        "path": "apps/web/src/components/ChatView.tsx",
        "present": true,
        "mode": "100644",
        "blobId": "bbbf517cd6fb3deaf4b29d7eda808a0e6081b4ed"
      },
      {
        "path": "apps/web/src/components/chat/ComposerImageAttachmentChip.tsx",
        "present": true,
        "mode": "100644",
        "blobId": "4f3cd2b3a3a7a863c731fed09acc4cb6549553b5"
      },
      {
        "path": "apps/web/src/composerDraftAttachments.ts",
        "present": true,
        "mode": "100644",
        "blobId": "eb52a6a2772c03d503dc52535c1e8106ccd811e0"
      },
      {
        "path": "apps/web/src/composerDraftDomain.ts",
        "present": true,
        "mode": "100644",
        "blobId": "da12bfec04fb5320861b11108e1f24b62a0e9018"
      },
      {
        "path": "apps/web/src/composerDraftPersistence.ts",
        "present": true,
        "mode": "100644",
        "blobId": "85cf03d0bbb7b6a305f55caebe05a0d5db6b5e93"
      },
      {
        "path": "apps/web/src/composerDraftStore.ts",
        "present": true,
        "mode": "100644",
        "blobId": "4a84a161d98c30a6566c0b7d34dfb289bff147a1"
      },
      {
        "path": "apps/web/src/composerDraftV2Transcode.ts",
        "present": true,
        "mode": "100644",
        "blobId": "eb5ccbdc89ab30541cb45425b0c25d12290308a1"
      },
      {
        "path": "apps/web/src/lib/composerImageSource.ts",
        "present": true,
        "mode": "100644",
        "blobId": "50a58cf116f135ab415fcee7a41d8cde26a2965f"
      },
      {
        "path": "apps/web/src/settingsSearchIndex.ts",
        "present": true,
        "mode": "100644",
        "blobId": "982c70029d8de25d2277c1a4f20f16e7210796a4"
      },
      {
        "path": "apps/web/src/storageOriginUpgrade.ts",
        "present": true,
        "mode": "100644",
        "blobId": "58b202883f5f1c338d571cbb7764d61e85a6edc5"
      },
      {
        "path": "package.json",
        "present": true,
        "mode": "100644",
        "blobId": "4bf4662c722540ced31306b09559bb83842fcba2"
      },
      {
        "path": "packages/contracts/src/ipc.ts",
        "present": true,
        "mode": "100644",
        "blobId": "68a6632cf4ebebfd2aee6c864bb697c3cf046aab"
      },
      {
        "path": "packages/contracts/src/native-host/protocol.ts",
        "present": true,
        "mode": "100644",
        "blobId": "d31519f613228760373a8a0dec81aae478b9a472"
      },
      {
        "path": "scripts/lib/release-update-policy.ts",
        "present": true,
        "mode": "100644",
        "blobId": "e1388ecc444cbb9ae7f43ffafb617fb0282889c3"
      },
      {
        "path": "scripts/package.json",
        "present": true,
        "mode": "100644",
        "blobId": "04fbee003fc7c0ce934e1ada2a0e43e206519a4e"
      },
      {
        "path": "scripts/prepare-release-update-feed.ts",
        "present": true,
        "mode": "100644",
        "blobId": "098281bb7c138fd3d5d9c167fcb80dfd75698551"
      },
      {
        "path": "scripts/product-truth/chromium-leveldb.ts",
        "present": false,
        "mode": null,
        "blobId": null
      },
      {
        "path": "scripts/product-truth/cli.ts",
        "present": false,
        "mode": null,
        "blobId": null
      },
      {
        "path": "scripts/product-truth/contracts.ts",
        "present": false,
        "mode": null,
        "blobId": null
      },
      {
        "path": "scripts/product-truth/database-lock.ts",
        "present": false,
        "mode": null,
        "blobId": null
      },
      {
        "path": "scripts/product-truth/direct-first-public.ts",
        "present": false,
        "mode": null,
        "blobId": null
      },
      {
        "path": "scripts/product-truth/sqlite-classifier.ts",
        "present": false,
        "mode": null,
        "blobId": null
      },
      {
        "path": "scripts/release-smoke.ts",
        "present": true,
        "mode": "100644",
        "blobId": "db6ce274a5dd5ade06f23990f2f28cff6df22adb"
      },
      {
        "path": "scripts/release-update-policy.json",
        "present": true,
        "mode": "100644",
        "blobId": "d581b4519abda67231f7bde50e27d102e4fda504"
      },
      {
        "path": "scripts/resolve-release-update-policy.ts",
        "present": true,
        "mode": "100644",
        "blobId": "31f457db6c1f61c3d4decb49057b90c4217d880d"
      },
      {
        "path": "scripts/update-release-package-versions.ts",
        "present": true,
        "mode": "100644",
        "blobId": "e6733f5c875121a5d6865c62f9a72171cbf5bec0"
      }
    ],
    "frozenBoundaryMemberCount": 71,
    "frozenBoundaryMembers": [
      {
        "path": "apps/desktop/src/desktopStorageUpgrade.ts",
        "present": true,
        "mode": "100644",
        "blobId": "0d5f32d9369e84ced63afc45c397211751a3116b"
      },
      {
        "path": "apps/desktop/src/desktopUserDataProfile.ts",
        "present": true,
        "mode": "100644",
        "blobId": "ad0ff35cd1584fc9eee45d2885204e30402ffe6d"
      },
      {
        "path": "apps/desktop/src/ipcChannels.ts",
        "present": true,
        "mode": "100644",
        "blobId": "827ce87ebe7f2fae9e574563324aeaced95e8b8c"
      },
      {
        "path": "apps/desktop/src/main.ts",
        "present": true,
        "mode": "100644",
        "blobId": "5cf0809404c6e30195e3beae8c8712b8d665aa0a"
      },
      {
        "path": "apps/desktop/src/preload.ts",
        "present": true,
        "mode": "100644",
        "blobId": "1fd8a37aabf587e5aadc503d55893025b0a1a7d0"
      },
      {
        "path": "apps/desktop/src/process/nativeHostAuthenticatedReadiness.ts",
        "present": true,
        "mode": "100644",
        "blobId": "75488f88319e14fd64d9390894bf73f55d915b11"
      },
      {
        "path": "apps/desktop/src/process/nativeHostEnvironment.ts",
        "present": true,
        "mode": "100644",
        "blobId": "0dff19f8d45659dbfa22bcf75c7b3a022b380eb3"
      },
      {
        "path": "apps/desktop/src/process/nativeHostRendezvous.ts",
        "present": true,
        "mode": "100644",
        "blobId": "1739c76e97ed0048ad3287cd01039823573ed894"
      },
      {
        "path": "apps/desktop/src/process/nativeHostSupervisor.ts",
        "present": true,
        "mode": "100644",
        "blobId": "36b6715bbcb4f9949891b3ad759dfcd0b3db7451"
      },
      {
        "path": "apps/native-host/src/index.ts",
        "present": true,
        "mode": "100644",
        "blobId": "0b0d0cc9ca8a7a719d60e002fa9b469a6568e026"
      },
      {
        "path": "apps/native-host/src/piRuntime.ts",
        "present": true,
        "mode": "100644",
        "blobId": "fae5dfea66707453469efa5b5e5c5bc5709ed953"
      },
      {
        "path": "apps/native-host/src/responseFrame.ts",
        "present": true,
        "mode": "100644",
        "blobId": "f77880b92b496c89f4d4f860de3d309c98083dc3"
      },
      {
        "path": "apps/service/src/config.ts",
        "present": true,
        "mode": "100644",
        "blobId": "702fd757a76cb9c618ec9ec40ccbef599e1c6465"
      },
      {
        "path": "apps/service/src/effectServer.ts",
        "present": true,
        "mode": "100644",
        "blobId": "ed4ec47b96ae240c5c921e316d153426eb407ace"
      },
      {
        "path": "apps/service/src/main.ts",
        "present": true,
        "mode": "100644",
        "blobId": "e0d19e4099a40738d25efbb31690a5165a765457"
      },
      {
        "path": "apps/service/src/native-host/client.ts",
        "present": true,
        "mode": "100644",
        "blobId": "7cf5cdf35d7b64ac8b9e15de6565ba78f4691585"
      },
      {
        "path": "apps/service/src/native-host/executionBoundary.ts",
        "present": true,
        "mode": "100644",
        "blobId": "2b7e7771fab4a041fba632700f04487622694161"
      },
      {
        "path": "apps/service/src/native-host/liveJourneyProbe.ts",
        "present": true,
        "mode": "100644",
        "blobId": "d0673913be8ce1a4c7336722692f42f4e5de059a"
      },
      {
        "path": "apps/service/src/native-host/packageCrashProbe.ts",
        "present": true,
        "mode": "100644",
        "blobId": "d6b29b421ea753257b3a2e0ba38b5104c0658477"
      },
      {
        "path": "apps/service/src/native-host/packageLifecycle.ts",
        "present": true,
        "mode": "100644",
        "blobId": "40f202a828b670556d835baa0bf8f2fff87fa5f8"
      },
      {
        "path": "apps/service/src/opencode/liveJourneyProbe.ts",
        "present": true,
        "mode": "100644",
        "blobId": "7711e5c131e4c012ef0ba7ea736c6b172de5465c"
      },
      {
        "path": "apps/service/src/opencode/productBoundary.ts",
        "present": true,
        "mode": "100644",
        "blobId": "6d685139e42e9e0d2a979ebc84e1e63009e7ca97"
      },
      {
        "path": "apps/service/src/persistence/AutomationSchema.ts",
        "present": true,
        "mode": "100644",
        "blobId": "87f867d0d4f16660dda92ef79b905bdf7ea703e9"
      },
      {
        "path": "apps/service/src/persistence/Layers/Sqlite.ts",
        "present": true,
        "mode": "100644",
        "blobId": "518c1d25eafb580a570054f121c1501e1a83ecb0"
      },
      {
        "path": "apps/service/src/persistence/SystemCapabilitySchema.ts",
        "present": true,
        "mode": "100644",
        "blobId": "225f42d5a776d3dbf4e10cb4697a2d5f830ce41c"
      },
      {
        "path": "apps/service/src/persistence/automationSelectionTranscode.ts",
        "present": true,
        "mode": "100644",
        "blobId": "0f63c8cd70d1b22715f1f1d7cfe9db7b55ee62e8"
      },
      {
        "path": "apps/service/src/persistence/selectionSchemaCoordinator.ts",
        "present": true,
        "mode": "100644",
        "blobId": "318e6887a14ec80d14f1e928324ccb7758212841"
      },
      {
        "path": "apps/service/src/product/ProductControlPlane.ts",
        "present": true,
        "mode": "100644",
        "blobId": "21d9eaad68f37f31ad0bbbcc10c1c86f4d1a6bce"
      },
      {
        "path": "apps/service/src/product/engineJourneyProof.ts",
        "present": true,
        "mode": "100644",
        "blobId": "e41ae2f3bbf61cf4ffbaec069b475047c09d9c4a"
      },
      {
        "path": "apps/service/src/product/health/nativeHostHealthMonitor.ts",
        "present": true,
        "mode": "100644",
        "blobId": "2733a21e94f6f80354ab94a1fcfaadec068b69cf"
      },
      {
        "path": "apps/service/src/product/productExecutionBoundary.ts",
        "present": false,
        "mode": null,
        "blobId": null
      },
      {
        "path": "apps/service/src/product/productExecutionCoordinator.ts",
        "present": false,
        "mode": null,
        "blobId": null
      },
      {
        "path": "apps/service/src/product/productExecutionGateway.ts",
        "present": true,
        "mode": "100644",
        "blobId": "0343a3a9d9ce534fcd6758f451a1412396ca4e0a"
      },
      {
        "path": "apps/service/src/product/productStateDiagnostics.ts",
        "present": false,
        "mode": null,
        "blobId": null
      },
      {
        "path": "apps/service/src/product/productStateStore.ts",
        "present": false,
        "mode": null,
        "blobId": null
      },
      {
        "path": "apps/service/src/product/schema1ProductMutationFixtures.ts",
        "present": true,
        "mode": "100644",
        "blobId": "03ecc7f1b821d9afef65aef3ddbfd96e04daac5f"
      },
      {
        "path": "apps/service/src/product/schema1ProductTranscode.ts",
        "present": true,
        "mode": "100644",
        "blobId": "ba98224c70f4dc9119bf58294fbcb300adacb7bf"
      },
      {
        "path": "apps/service/src/product/schema1SelectionTranscode.ts",
        "present": true,
        "mode": "100644",
        "blobId": "4c6392f4b321e6a148e5998a087a845e17da0ac7"
      },
      {
        "path": "apps/service/src/server/readiness.ts",
        "present": true,
        "mode": "100644",
        "blobId": "2f335c17aa9a484514fbc34e57c6f59bf1cf4c82"
      },
      {
        "path": "apps/service/src/serverLayers.ts",
        "present": true,
        "mode": "100644",
        "blobId": "906f5a47de6a953e6fb5dc513ea42a84e6ba4502"
      },
      {
        "path": "apps/service/src/wsRpc.ts",
        "present": true,
        "mode": "100644",
        "blobId": "caaae4297aaf2ff1be6941a64c4b083439be4d2e"
      },
      {
        "path": "apps/web/src/appSettings.ts",
        "present": true,
        "mode": "100644",
        "blobId": "3bd00fa6934549cd4d565ab2e1898b11a0c02b54"
      },
      {
        "path": "apps/web/src/bootstrap.ts",
        "present": true,
        "mode": "100644",
        "blobId": "fda4cb999ef508629d586efa5b3da090f30f8de9"
      },
      {
        "path": "apps/web/src/components/ChatView.tsx",
        "present": true,
        "mode": "100644",
        "blobId": "bbbf517cd6fb3deaf4b29d7eda808a0e6081b4ed"
      },
      {
        "path": "apps/web/src/components/chat/ComposerImageAttachmentChip.tsx",
        "present": true,
        "mode": "100644",
        "blobId": "4f3cd2b3a3a7a863c731fed09acc4cb6549553b5"
      },
      {
        "path": "apps/web/src/composerDraftAttachments.ts",
        "present": true,
        "mode": "100644",
        "blobId": "eb52a6a2772c03d503dc52535c1e8106ccd811e0"
      },
      {
        "path": "apps/web/src/composerDraftDomain.ts",
        "present": true,
        "mode": "100644",
        "blobId": "da12bfec04fb5320861b11108e1f24b62a0e9018"
      },
      {
        "path": "apps/web/src/composerDraftPersistence.ts",
        "present": true,
        "mode": "100644",
        "blobId": "85cf03d0bbb7b6a305f55caebe05a0d5db6b5e93"
      },
      {
        "path": "apps/web/src/composerDraftStore.ts",
        "present": true,
        "mode": "100644",
        "blobId": "4a84a161d98c30a6566c0b7d34dfb289bff147a1"
      },
      {
        "path": "apps/web/src/composerDraftV2Transcode.ts",
        "present": true,
        "mode": "100644",
        "blobId": "eb5ccbdc89ab30541cb45425b0c25d12290308a1"
      },
      {
        "path": "apps/web/src/lib/composerImageSource.ts",
        "present": true,
        "mode": "100644",
        "blobId": "50a58cf116f135ab415fcee7a41d8cde26a2965f"
      },
      {
        "path": "apps/web/src/settingsSearchIndex.ts",
        "present": true,
        "mode": "100644",
        "blobId": "982c70029d8de25d2277c1a4f20f16e7210796a4"
      },
      {
        "path": "apps/web/src/storageOriginUpgrade.ts",
        "present": true,
        "mode": "100644",
        "blobId": "58b202883f5f1c338d571cbb7764d61e85a6edc5"
      },
      {
        "path": "bun.lock",
        "present": true,
        "mode": "100644",
        "blobId": "ed41b51a05eeb53122add0388e19964a11e48f7f"
      },
      {
        "path": "package.json",
        "present": true,
        "mode": "100644",
        "blobId": "4bf4662c722540ced31306b09559bb83842fcba2"
      },
      {
        "path": "packages/contracts/src/ipc.ts",
        "present": true,
        "mode": "100644",
        "blobId": "68a6632cf4ebebfd2aee6c864bb697c3cf046aab"
      },
      {
        "path": "packages/contracts/src/native-host/protocol.ts",
        "present": true,
        "mode": "100644",
        "blobId": "d31519f613228760373a8a0dec81aae478b9a472"
      },
      {
        "path": "scripts/check-source-closure.mjs",
        "present": true,
        "mode": "100644",
        "blobId": "f4935e4b83aab6d095cf6bec408845e25d79db1b"
      },
      {
        "path": "scripts/lib/release-update-policy.ts",
        "present": true,
        "mode": "100644",
        "blobId": "e1388ecc444cbb9ae7f43ffafb617fb0282889c3"
      },
      {
        "path": "scripts/package.json",
        "present": true,
        "mode": "100644",
        "blobId": "04fbee003fc7c0ce934e1ada2a0e43e206519a4e"
      },
      {
        "path": "scripts/prepare-release-update-feed.ts",
        "present": true,
        "mode": "100644",
        "blobId": "098281bb7c138fd3d5d9c167fcb80dfd75698551"
      },
      {
        "path": "scripts/product-truth/chromium-leveldb.ts",
        "present": false,
        "mode": null,
        "blobId": null
      },
      {
        "path": "scripts/product-truth/cli.ts",
        "present": false,
        "mode": null,
        "blobId": null
      },
      {
        "path": "scripts/product-truth/contracts.ts",
        "present": false,
        "mode": null,
        "blobId": null
      },
      {
        "path": "scripts/product-truth/database-lock.ts",
        "present": false,
        "mode": null,
        "blobId": null
      },
      {
        "path": "scripts/product-truth/direct-first-public.ts",
        "present": false,
        "mode": null,
        "blobId": null
      },
      {
        "path": "scripts/product-truth/sqlite-classifier.ts",
        "present": false,
        "mode": null,
        "blobId": null
      },
      {
        "path": "scripts/release-smoke.ts",
        "present": true,
        "mode": "100644",
        "blobId": "db6ce274a5dd5ade06f23990f2f28cff6df22adb"
      },
      {
        "path": "scripts/release-update-policy.json",
        "present": true,
        "mode": "100644",
        "blobId": "d581b4519abda67231f7bde50e27d102e4fda504"
      },
      {
        "path": "scripts/resolve-release-update-policy.ts",
        "present": true,
        "mode": "100644",
        "blobId": "31f457db6c1f61c3d4decb49057b90c4217d880d"
      },
      {
        "path": "scripts/update-release-package-versions.ts",
        "present": true,
        "mode": "100644",
        "blobId": "e6733f5c875121a5d6865c62f9a72171cbf5bec0"
      }
    ]
  },
  "dependencies": {
    "hardGate": "exact-input-byte-closure-only",
    "phase": "baseline",
    "closureSha256": "b3989b0c513f830a18b6803c85455acada90b287702370207aaa3e3427f710f6",
    "records": [
      {
        "kind": "adopted-dependency-source",
        "package": "classic-level",
        "locator": "classic-level@3.0.0",
        "lockIdentity": "sha512-yGy8j8LjPbN0Bh3+ygmyYvrmskVita92pD/zCoalfcC9XxZj6iDtZTAnz+ot7GG8p9KLTG+MZ84tSA4AhkgVZQ==",
        "resolvedExports": [
          "ClassicLevel"
        ],
        "sourceClosureSha256": "6152fe031584d50f0ce8be548aed98912b178c4562e964c2a17f45268ea0f440"
      },
      {
        "kind": "adopted-dependency-source",
        "package": "@effect/sql-sqlite-bun",
        "locator": "https://pkg.pr.new/Effect-TS/effect-smol/@effect/sql-sqlite-bun@8881a9b",
        "lockIdentity": "8881a9b",
        "resolvedExports": [
          "SqliteClient",
          "layer",
          "make"
        ],
        "sourceClosureSha256": "deba2c06f44ae9015cd07d0149d3a341e17913bd35fc3edadcfa35262e501036"
      },
      {
        "kind": "adopted-dependency-source",
        "package": "node-gyp-build",
        "locator": "node-gyp-build@4.8.4",
        "lockIdentity": "sha512-LA4ZjwlnUblHVgq0oBF3Jl/6h/Nvs5fzBLwdEF4nuxnFdsfajde4WfxtJr3CaiH+F6ewcIB/q4jQ4UzPyid+CQ==",
        "resolvedExports": [
          "default"
        ],
        "sourceClosureSha256": "2f1603b1dd14138092c809949988dcb0606b73f642b435f4530043ca3a06f41d"
      },
      {
        "kind": "adopted-source-authority",
        "path": "README.md#source-adoptions",
        "sha256": "2b2ae1a84d70e55076bfabf720864693536462659da8c428acf5293ce4e6babf"
      },
      {
        "kind": "lockfile",
        "path": "bun.lock",
        "sha256": "9a362f533d831f7dbd45e4772dd57fbcda05bc8f9f92abb4857bd37d157af1b5"
      },
      {
        "kind": "package-manifest",
        "path": "apps/desktop/package.json",
        "sha256": "b3e7f9dec804c38294003592c9d62c814d315885bc801942169351b72454126e"
      },
      {
        "kind": "package-manifest",
        "path": "apps/native-host/package.json",
        "sha256": "6a21fdff5a552f2e4273a6691094b4dcee0e45577b083cdeac2e68ed8b87f70b"
      },
      {
        "kind": "package-manifest",
        "path": "apps/service/package.json",
        "sha256": "d3e62514e65e618ad0ae6bee23e816c90dc3e9898c6fbf17ab8e8c807fae26a5"
      },
      {
        "kind": "package-manifest",
        "path": "apps/web/package.json",
        "sha256": "f95e7e5520f8a203efb7f11c8a2b894056fd1441c4e8566b15d0092874e0e27f"
      },
      {
        "kind": "package-manifest",
        "path": "package.json",
        "sha256": "bb9fe997aef4e19bb8689bc55766bef2ec7be1c1de3152a32f034a8cff251f75"
      },
      {
        "kind": "package-manifest",
        "path": "packages/contracts/package.json",
        "sha256": "b0154b31da1f8f9cbccc4de13f0703fc484ad8c814a4fa3009427fa77b05a31b"
      },
      {
        "kind": "package-manifest",
        "path": "packages/shared/package.json",
        "sha256": "7e9d56d6a8869331a04e729c61d6df85811d96c9108d1de89730da590eebd0e6"
      },
      {
        "kind": "package-manifest",
        "path": "scripts/package.json",
        "sha256": "a8cb706221feb5d68dcd7fc6666ab957b27dfaf92a6b96c64ba9ef16035de3f0"
      }
    ],
    "semanticCapabilityVerdict": false
  },
  "immutableHistory": {
    "hardGate": true,
    "acceptedTreeManifestCount": 580,
    "acceptedTreeManifestSha256": "a23165cc1330a12e69003a7f29177a229ce56a451cd3db20341bdd6f745854eb",
    "candidateChecked": false
  },
  "declarations": {
    "hardGate": "identity-presence-disposition-first-materialization-only",
    "rows": [
      {
        "path": "scripts/product-truth/sqlite-classifier.ts",
        "symbol": "classifyLegacyDatabase",
        "declarationKind": "named-function-declaration",
        "b0Presence": "absent",
        "dispositionWhenPresent": "exported",
        "firstMaterializationWork": "direct-first-public-b1",
        "pathPresent": false,
        "present": false,
        "actualDeclarationKind": null,
        "actualDisposition": null,
        "emittedSignature": null
      },
      {
        "path": "scripts/product-truth/chromium-leveldb.ts",
        "symbol": "inspectProfileDraftKeys",
        "declarationKind": "named-function-declaration",
        "b0Presence": "absent",
        "dispositionWhenPresent": "exported",
        "firstMaterializationWork": "direct-first-public-b1",
        "pathPresent": false,
        "present": false,
        "actualDeclarationKind": null,
        "actualDisposition": null,
        "emittedSignature": null
      },
      {
        "path": "scripts/product-truth/chromium-leveldb.ts",
        "symbol": "deleteLegacyProfileDraftKeys",
        "declarationKind": "named-function-declaration",
        "b0Presence": "absent",
        "dispositionWhenPresent": "exported",
        "firstMaterializationWork": "direct-first-public-b1",
        "pathPresent": false,
        "present": false,
        "actualDeclarationKind": null,
        "actualDisposition": null,
        "emittedSignature": null
      },
      {
        "path": "scripts/product-truth/database-lock.ts",
        "symbol": "withProductTruthDatabaseLocks",
        "declarationKind": "named-function-declaration",
        "b0Presence": "absent",
        "dispositionWhenPresent": "exported",
        "firstMaterializationWork": "direct-first-public-b1",
        "pathPresent": false,
        "present": false,
        "actualDeclarationKind": null,
        "actualDisposition": null,
        "emittedSignature": null
      },
      {
        "path": "scripts/product-truth/direct-first-public.ts",
        "symbol": "inspectDirectFirstPublic",
        "declarationKind": "named-function-declaration",
        "b0Presence": "absent",
        "dispositionWhenPresent": "exported",
        "firstMaterializationWork": "direct-first-public-b1",
        "pathPresent": false,
        "present": false,
        "actualDeclarationKind": null,
        "actualDisposition": null,
        "emittedSignature": null
      },
      {
        "path": "scripts/product-truth/direct-first-public.ts",
        "symbol": "applyDirectFirstPublic",
        "declarationKind": "named-function-declaration",
        "b0Presence": "absent",
        "dispositionWhenPresent": "exported",
        "firstMaterializationWork": "direct-first-public-b1",
        "pathPresent": false,
        "present": false,
        "actualDeclarationKind": null,
        "actualDisposition": null,
        "emittedSignature": null
      },
      {
        "path": "apps/service/src/product/ProductControlPlane.ts",
        "symbol": "makeProductControlPlaneLayer",
        "declarationKind": "named-function-declaration",
        "b0Presence": "present",
        "dispositionWhenPresent": "exported",
        "firstMaterializationWork": null,
        "pathPresent": true,
        "present": true,
        "actualDeclarationKind": "named-function-declaration",
        "actualDisposition": "exported",
        "emittedSignature": {
          "disposition": "observational",
          "sha256": "9cba590c0b19d66ea7748a06046d5e218659a8e60f1af786f6827fd8da6b1266"
        }
      },
      {
        "path": "apps/service/src/persistence/Layers/Sqlite.ts",
        "symbol": "makeSqlitePersistenceLive",
        "declarationKind": "const-arrow-function",
        "b0Presence": "present",
        "dispositionWhenPresent": "exported",
        "firstMaterializationWork": null,
        "pathPresent": true,
        "present": true,
        "actualDeclarationKind": "const-arrow-function",
        "actualDisposition": "exported",
        "emittedSignature": {
          "disposition": "observational",
          "sha256": "ec2a3c236ca25855495686812c69e6c35f200300b1992f8942aaca449b34f29b"
        }
      },
      {
        "path": "apps/web/src/composerDraftStore.ts",
        "symbol": "readOrCreateComposerDraftEnvelope",
        "declarationKind": "const-arrow-function",
        "b0Presence": "absent",
        "dispositionWhenPresent": "module-private",
        "firstMaterializationWork": "direct-first-public-b1",
        "pathPresent": true,
        "present": false,
        "actualDeclarationKind": null,
        "actualDisposition": null,
        "emittedSignature": null
      },
      {
        "path": "apps/web/src/composerDraftStore.ts",
        "symbol": "writeAndVerifyComposerDraftEnvelope",
        "declarationKind": "const-arrow-function",
        "b0Presence": "absent",
        "dispositionWhenPresent": "module-private",
        "firstMaterializationWork": "direct-first-public-b1",
        "pathPresent": true,
        "present": false,
        "actualDeclarationKind": null,
        "actualDisposition": null,
        "emittedSignature": null
      },
      {
        "path": "apps/service/src/product/productStateStore.ts",
        "symbol": "makeProductStateStore",
        "declarationKind": "named-function-declaration",
        "b0Presence": "absent",
        "dispositionWhenPresent": "exported",
        "firstMaterializationWork": "product-state-store",
        "pathPresent": false,
        "present": false,
        "actualDeclarationKind": null,
        "actualDisposition": null,
        "emittedSignature": null
      }
    ]
  },
  "observations": {
    "disposition": "observational",
    "literalImportExportGraph": {
      "disposition": "observational",
      "hardGateEnabled": false,
      "presentParsedSourceCount": 56,
      "recordCount": 578,
      "recordMultisetJcsSha256": "9594b2c2d1562d9d546ece89e699156d1e6708b0817ac0a2bf5b62ea6ba66869",
      "records": [
        {
          "form": "export-declaration",
          "source": "apps/web/src/composerDraftStore.ts",
          "specifier": "./composerDraftAttachments"
        },
        {
          "form": "export-declaration",
          "source": "apps/web/src/composerDraftStore.ts",
          "specifier": "./composerDraftDomain"
        },
        {
          "form": "export-declaration",
          "source": "apps/web/src/composerDraftStore.ts",
          "specifier": "./composerDraftDomain"
        },
        {
          "form": "export-declaration",
          "source": "apps/web/src/composerDraftStore.ts",
          "specifier": "./composerDraftPersistence"
        },
        {
          "form": "export-declaration",
          "source": "apps/web/src/composerDraftStore.ts",
          "specifier": "./lib/browserAnnotations"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/desktopStorageUpgrade.ts",
          "specifier": "@omnimind/contracts"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/desktopStorageUpgrade.ts",
          "specifier": "node:fs"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/desktopStorageUpgrade.ts",
          "specifier": "node:path"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/desktopUserDataProfile.ts",
          "specifier": "node:fs"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/desktopUserDataProfile.ts",
          "specifier": "node:os"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/desktopUserDataProfile.ts",
          "specifier": "node:path"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./appSnapIpc"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./appSnapSupervisor"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./backendNodeOptions"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./backendProcessOutput"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./backendReadiness"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./backendShutdown"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./backendStartupBlock"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./backendStartupReadiness"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./backendSupervisionPolicy"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./browserAnnotations/webviewSecurity"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./browserHost"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./browserIpc"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./browserUsePipeServer"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./bundleSwapDetection"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./confirmDialog"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./desktopProcessErrors"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./desktopStaticProtocol"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./desktopStorageUpgrade"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./desktopUserDataProfile"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./desktopWsBridge"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./electronUpdaterSecurity"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./githubUpdateFeed"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./initialBackendWindowOpen"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./ipcChannels"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./localHtmlPreviewProtocol"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./macIconCacheRefresh"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./macUpdateDiagnostics"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./mediaPermissions"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./menuShortcuts"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./process/desktopHealthChannels"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./process/nativeHostAuthenticatedReadiness"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./process/nativeHostCredentialBroker"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./process/nativeHostEnvironment"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./process/nativeHostRendezvous"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./process/nativeHostSupervisor"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./process/serviceApplicationRoot"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./rendererCrashRecovery"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./resumableUpdateDownload"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./runtimeArch"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./serverListeningDetector"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./syncShellEnvironment"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./updateArtifactIdentity"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./updateInstallMarker"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./updateInstallPreparation"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./updateMachine"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./updatePendingCache"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./updateState"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./voiceTranscription"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "./windowState"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "@omnimind/contracts"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "@omnimind/contracts"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "@omnimind/contracts"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "@omnimind/shared/Net"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "@omnimind/shared/browserShortcuts"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "@omnimind/shared/desktopChrome"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "@omnimind/shared/desktopIdentity"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "@omnimind/shared/logging"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "@omnimind/shared/shell"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "@omnimind/shared/staticSnapshot"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "effect/Effect"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "electron"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "electron"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "electron-updater"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "node:child_process"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "node:crypto"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "node:fs"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "node:os"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "node:path"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/main.ts",
          "specifier": "original-fs"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/preload.ts",
          "specifier": "./desktopWsBridge"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/preload.ts",
          "specifier": "./ipcChannels"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/preload.ts",
          "specifier": "./process/desktopHealthChannels"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/preload.ts",
          "specifier": "@omnimind/contracts"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/preload.ts",
          "specifier": "electron"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/process/nativeHostRendezvous.ts",
          "specifier": "node:crypto"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/process/nativeHostRendezvous.ts",
          "specifier": "node:os"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/process/nativeHostRendezvous.ts",
          "specifier": "node:path"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/process/nativeHostSupervisor.ts",
          "specifier": "./nativeHostRendezvous"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/process/nativeHostSupervisor.ts",
          "specifier": "@omnimind/contracts"
        },
        {
          "form": "import-declaration",
          "source": "apps/desktop/src/process/nativeHostSupervisor.ts",
          "specifier": "node:child_process"
        },
        {
          "form": "import-declaration",
          "source": "apps/native-host/src/index.ts",
          "specifier": "./credentialBroker"
        },
        {
          "form": "import-declaration",
          "source": "apps/native-host/src/index.ts",
          "specifier": "./piRuntime"
        },
        {
          "form": "import-declaration",
          "source": "apps/native-host/src/index.ts",
          "specifier": "./responseFrame"
        },
        {
          "form": "import-declaration",
          "source": "apps/native-host/src/index.ts",
          "specifier": "@omnimind/contracts/native-host"
        },
        {
          "form": "import-declaration",
          "source": "apps/native-host/src/index.ts",
          "specifier": "node:crypto"
        },
        {
          "form": "import-declaration",
          "source": "apps/native-host/src/index.ts",
          "specifier": "node:fs"
        },
        {
          "form": "import-declaration",
          "source": "apps/native-host/src/index.ts",
          "specifier": "node:net"
        },
        {
          "form": "import-declaration",
          "source": "apps/native-host/src/piRuntime.ts",
          "specifier": "@earendil-works/pi-ai"
        },
        {
          "form": "import-declaration",
          "source": "apps/native-host/src/piRuntime.ts",
          "specifier": "@earendil-works/pi-coding-agent"
        },
        {
          "form": "import-declaration",
          "source": "apps/native-host/src/piRuntime.ts",
          "specifier": "@omnimind/contracts/native-host"
        },
        {
          "form": "import-declaration",
          "source": "apps/native-host/src/piRuntime.ts",
          "specifier": "node:crypto"
        },
        {
          "form": "import-declaration",
          "source": "apps/native-host/src/piRuntime.ts",
          "specifier": "node:fs"
        },
        {
          "form": "import-declaration",
          "source": "apps/native-host/src/piRuntime.ts",
          "specifier": "node:path"
        },
        {
          "form": "import-declaration",
          "source": "apps/native-host/src/responseFrame.ts",
          "specifier": "@omnimind/contracts/native-host"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/config.ts",
          "specifier": "./privatePathPermissions"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/config.ts",
          "specifier": "./realpathNearestExisting"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/config.ts",
          "specifier": "./startupAccess"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/config.ts",
          "specifier": "effect"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/config.ts",
          "specifier": "node:fs"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/config.ts",
          "specifier": "node:os"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/config.ts",
          "specifier": "node:path"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/config.ts",
          "specifier": "node:path/posix"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/config.ts",
          "specifier": "node:path/win32"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/effectServer.ts",
          "specifier": "./automation/Services/AutomationScheduler"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/effectServer.ts",
          "specifier": "./bunWebSocketCompatibility"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/effectServer.ts",
          "specifier": "./config"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/effectServer.ts",
          "specifier": "./http"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/effectServer.ts",
          "specifier": "./keybindings"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/effectServer.ts",
          "specifier": "./managedAttachmentCleanup"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/effectServer.ts",
          "specifier": "./nodeHttpServer"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/effectServer.ts",
          "specifier": "./product/ProductControlPlane"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/effectServer.ts",
          "specifier": "./server/readiness"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/effectServer.ts",
          "specifier": "./serverLifecycleEvents"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/effectServer.ts",
          "specifier": "./serverRuntimeStartup"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/effectServer.ts",
          "specifier": "./serverRuntimeState"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/effectServer.ts",
          "specifier": "./serverShutdown"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/effectServer.ts",
          "specifier": "./startupAccess"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/effectServer.ts",
          "specifier": "./wsRpc"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/effectServer.ts",
          "specifier": "effect"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/effectServer.ts",
          "specifier": "effect/unstable/http"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/effectServer.ts",
          "specifier": "effect/unstable/sql/SqlClient"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/effectServer.ts",
          "specifier": "node:http"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/main.ts",
          "specifier": "./auth/Services/ServerAuth"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/main.ts",
          "specifier": "./config"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/main.ts",
          "specifier": "./effectServer"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/main.ts",
          "specifier": "./memoryDiagnostics"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/main.ts",
          "specifier": "./open"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/main.ts",
          "specifier": "./os-jank"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/main.ts",
          "specifier": "./persistence/Layers/Sqlite"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/main.ts",
          "specifier": "./persistence/selectionSchemaCoordinator"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/main.ts",
          "specifier": "./product/ProductControlPlane"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/main.ts",
          "specifier": "./product/ProductControlPlane"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/main.ts",
          "specifier": "./serverLayers"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/main.ts",
          "specifier": "./serverLogger"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/main.ts",
          "specifier": "./startupAccess"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/main.ts",
          "specifier": "./telemetry/Layers/AnalyticsService"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/main.ts",
          "specifier": "./telemetry/Services/AnalyticsService"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/main.ts",
          "specifier": "@omnimind/shared/Net"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/main.ts",
          "specifier": "@omnimind/shared/cli"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/main.ts",
          "specifier": "effect"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/main.ts",
          "specifier": "effect/unstable/cli"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/main.ts",
          "specifier": "node:os"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/main.ts",
          "specifier": "node:path"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/client.ts",
          "specifier": "@omnimind/contracts/native-host"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/client.ts",
          "specifier": "node:crypto"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/client.ts",
          "specifier": "node:net"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/executionBoundary.ts",
          "specifier": "../config"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/executionBoundary.ts",
          "specifier": "../opencode/chatScratch"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/executionBoundary.ts",
          "specifier": "../opencode/installation"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/executionBoundary.ts",
          "specifier": "../opencode/productBoundary"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/executionBoundary.ts",
          "specifier": "../product/ProductControlPlane"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/executionBoundary.ts",
          "specifier": "../product/productExecutionGateway"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/executionBoundary.ts",
          "specifier": "./client"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/executionBoundary.ts",
          "specifier": "./packageLifecycle"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/executionBoundary.ts",
          "specifier": "@omnimind/contracts"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/executionBoundary.ts",
          "specifier": "effect"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/executionBoundary.ts",
          "specifier": "node:path"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/liveJourneyProbe.ts",
          "specifier": "../product/ProductControlPlane"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/liveJourneyProbe.ts",
          "specifier": "../product/engineJourneyProof"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/liveJourneyProbe.ts",
          "specifier": "../product/productExecutionGateway"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/liveJourneyProbe.ts",
          "specifier": "./client"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/liveJourneyProbe.ts",
          "specifier": "./executionBoundary"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/liveJourneyProbe.ts",
          "specifier": "./packageLifecycle"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/liveJourneyProbe.ts",
          "specifier": "@omnimind/contracts"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/liveJourneyProbe.ts",
          "specifier": "effect"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/liveJourneyProbe.ts",
          "specifier": "node:fs"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/liveJourneyProbe.ts",
          "specifier": "node:path"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/liveJourneyProbe.ts",
          "specifier": "node:url"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/packageCrashProbe.ts",
          "specifier": "../product/ProductControlPlane"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/packageCrashProbe.ts",
          "specifier": "./client"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/packageCrashProbe.ts",
          "specifier": "./executionBoundary"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/packageCrashProbe.ts",
          "specifier": "./packageLifecycle"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/packageCrashProbe.ts",
          "specifier": "@omnimind/contracts"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/packageCrashProbe.ts",
          "specifier": "@omnimind/contracts/native-host"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/packageCrashProbe.ts",
          "specifier": "effect"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/packageCrashProbe.ts",
          "specifier": "node:fs"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/packageCrashProbe.ts",
          "specifier": "node:path"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/packageLifecycle.ts",
          "specifier": "@omnimind/contracts/native-host"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/packageLifecycle.ts",
          "specifier": "node:crypto"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/packageLifecycle.ts",
          "specifier": "node:fs"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/packageLifecycle.ts",
          "specifier": "node:path"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/packageLifecycle.ts",
          "specifier": "node:url"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/native-host/packageLifecycle.ts",
          "specifier": "node:util"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/opencode/liveJourneyProbe.ts",
          "specifier": "../product/ProductControlPlane"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/opencode/liveJourneyProbe.ts",
          "specifier": "../product/engineJourneyProof"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/opencode/liveJourneyProbe.ts",
          "specifier": "../product/productExecutionGateway"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/opencode/liveJourneyProbe.ts",
          "specifier": "./chatScratch"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/opencode/liveJourneyProbe.ts",
          "specifier": "./installation"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/opencode/liveJourneyProbe.ts",
          "specifier": "./productBoundary"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/opencode/liveJourneyProbe.ts",
          "specifier": "@omnimind/contracts"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/opencode/liveJourneyProbe.ts",
          "specifier": "effect"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/opencode/liveJourneyProbe.ts",
          "specifier": "node:fs/promises"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/opencode/liveJourneyProbe.ts",
          "specifier": "node:path"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/opencode/liveJourneyProbe.ts",
          "specifier": "node:url"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/opencode/productBoundary.ts",
          "specifier": "../product/ProductControlPlane"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/opencode/productBoundary.ts",
          "specifier": "./executionBoundary"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/opencode/productBoundary.ts",
          "specifier": "./installation"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/opencode/productBoundary.ts",
          "specifier": "@omnimind/contracts"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/opencode/productBoundary.ts",
          "specifier": "effect"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/persistence/AutomationSchema.ts",
          "specifier": "effect"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/persistence/AutomationSchema.ts",
          "specifier": "effect/unstable/sql/SqlClient"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/persistence/Layers/Sqlite.ts",
          "specifier": "../../config.ts"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/persistence/Layers/Sqlite.ts",
          "specifier": "../../privatePathPermissions.ts"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/persistence/Layers/Sqlite.ts",
          "specifier": "../DatabaseLifecycleLock.ts"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/persistence/Layers/Sqlite.ts",
          "specifier": "../SystemCapabilitySchema.ts"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/persistence/Layers/Sqlite.ts",
          "specifier": "effect"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/persistence/Layers/Sqlite.ts",
          "specifier": "effect/unstable/sql/SqlClient"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/persistence/SystemCapabilitySchema.ts",
          "specifier": "./AutomationSchema.ts"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/persistence/SystemCapabilitySchema.ts",
          "specifier": "effect"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/persistence/SystemCapabilitySchema.ts",
          "specifier": "effect/unstable/sql/SqlClient"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/persistence/automationSelectionTranscode.ts",
          "specifier": "@omnimind/contracts"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/persistence/automationSelectionTranscode.ts",
          "specifier": "effect"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/persistence/selectionSchemaCoordinator.ts",
          "specifier": "../product/schema1ProductTranscode"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/persistence/selectionSchemaCoordinator.ts",
          "specifier": "../product/schema1SelectionTranscode"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/persistence/selectionSchemaCoordinator.ts",
          "specifier": "./DatabaseLifecycleLock"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/persistence/selectionSchemaCoordinator.ts",
          "specifier": "./automationSelectionTranscode"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/persistence/selectionSchemaCoordinator.ts",
          "specifier": "@omnimind/contracts"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/persistence/selectionSchemaCoordinator.ts",
          "specifier": "effect"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/persistence/selectionSchemaCoordinator.ts",
          "specifier": "effect"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/persistence/selectionSchemaCoordinator.ts",
          "specifier": "node:fs/promises"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/persistence/selectionSchemaCoordinator.ts",
          "specifier": "node:path"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/persistence/selectionSchemaCoordinator.ts",
          "specifier": "node:sqlite"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/product/ProductControlPlane.ts",
          "specifier": "../config"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/product/ProductControlPlane.ts",
          "specifier": "../persistence/DatabaseLifecycleLock"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/product/ProductControlPlane.ts",
          "specifier": "../privatePathPermissions"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/product/ProductControlPlane.ts",
          "specifier": "@omnimind/contracts"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/product/ProductControlPlane.ts",
          "specifier": "@omnimind/shared/threadWorkspace"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/product/ProductControlPlane.ts",
          "specifier": "effect"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/product/ProductControlPlane.ts",
          "specifier": "node:crypto"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/product/ProductControlPlane.ts",
          "specifier": "node:path"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/product/engineJourneyProof.ts",
          "specifier": "@omnimind/contracts"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/product/engineJourneyProof.ts",
          "specifier": "node:fs/promises"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/product/health/nativeHostHealthMonitor.ts",
          "specifier": "../../native-host/client"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/product/health/nativeHostHealthMonitor.ts",
          "specifier": "effect"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/product/productExecutionGateway.ts",
          "specifier": "./ProductControlPlane"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/product/productExecutionGateway.ts",
          "specifier": "@omnimind/contracts"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/product/productExecutionGateway.ts",
          "specifier": "effect"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/product/schema1ProductMutationFixtures.ts",
          "specifier": "./schema1ProductTranscode"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/product/schema1ProductTranscode.ts",
          "specifier": "../persistence/automationSelectionTranscode"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/product/schema1ProductTranscode.ts",
          "specifier": "@omnimind/contracts"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/product/schema1ProductTranscode.ts",
          "specifier": "effect"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/product/schema1SelectionTranscode.ts",
          "specifier": "@omnimind/contracts"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/product/schema1SelectionTranscode.ts",
          "specifier": "effect"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/server/readiness.ts",
          "specifier": "effect"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./auth/Layers/AuthControlPlane"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./auth/Layers/BootstrapCredentialService"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./auth/Layers/ServerAuth"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./auth/Layers/ServerAuthPolicy"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./auth/Layers/ServerSecretStore"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./auth/Layers/SessionCredentialService"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./automation/Layers/AutomationScheduler"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./automation/Layers/AutomationService"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./config"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./devServerSupervisor"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./environment/Layers/ServerEnvironment"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./git/Services/GitCore"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./git/Services/GitHubCli"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./git/runtimeLayer"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./keybindings"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./managedAttachmentCleanup"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./native-host/executionBoundary"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./persistence/Layers/AutomationRepository"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./persistence/Layers/ManagedAttachments"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./persistence/Layers/WorkspacePullRequestPins"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./persistence/Services/WorkspacePullRequestPins"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./product/ProductControlPlane"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./product/health/nativeHostHealthMonitor"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./project/Layers/ProjectFaviconResolver"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./pullRequests/Layers/PullRequestService"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./pullRequests/Services/PullRequestService"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./pullRequests/repositoryResolution"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./serverLifecycleEvents"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./serverRuntimeStartup"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./terminal/runtimeLayer"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "./workspace/runtimeLayer"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "@effect/platform-node/NodeServices"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/serverLayers.ts",
          "specifier": "effect"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "./auth/Services/ServerAuth"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "./auth/Services/SessionCredentialService"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "./auth/effectHttp"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "./automation/Services/AutomationService"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "./config"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "./devServerSupervisor"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "./git/Services/GitCore"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "./localImageFiles"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "./managedAttachmentPrincipal"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "./open"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "./product/ProductControlPlane"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "./pullRequests/Services/PullRequestService"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "./pullRequests/Services/PullRequestService"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "./startupAccess"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "./terminal/Services/Supervisor"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "./trustedOrigins"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "./workspace/Services/WorkspaceEntries"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "./workspace/Services/WorkspaceFileSystem"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "./workspace/Services/WorkspacePaths"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "./wsCompatibility"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "./wsConnectionSessions"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "./wsRequestAdmission"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "./wsStreamAdmission"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "./wsStreamBackpressure"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "@omnimind/contracts"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "effect"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "effect/unstable/http"
        },
        {
          "form": "import-declaration",
          "source": "apps/service/src/wsRpc.ts",
          "specifier": "effect/unstable/rpc"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/appSettings.ts",
          "specifier": "./components/BranchToolbar.logic"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/appSettings.ts",
          "specifier": "./hooks/useLocalStorage"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/appSettings.ts",
          "specifier": "./lib/appDensity"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/appSettings.ts",
          "specifier": "@omnimind/contracts"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/appSettings.ts",
          "specifier": "@omnimind/shared/appSnapShortcut"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/appSettings.ts",
          "specifier": "effect"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/appSettings.ts",
          "specifier": "react"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/bootstrap.ts",
          "specifier": "./authSignedOut"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/bootstrap.ts",
          "specifier": "./composerDraftV2Transcode"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/bootstrap.ts",
          "specifier": "./pairingBootstrap"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/bootstrap.ts",
          "specifier": "./storageOriginUpgrade"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../appSettings"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../chat-scroll"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../composer-logic"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../composerDraftStore"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../composerDraftV2Transcode"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../composerFocusRequestStore"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../composerSlashCommands"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../composerTriggerInsertion"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../conversationPresentation"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../diffRouteSearch"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../env"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../featureFlags"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../hooks/useComposerCommandMenuItems"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../hooks/useComposerDropzone"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../hooks/useComposerImageIntake"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../hooks/useCreateChat"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../hooks/useCreateThread"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../hooks/useTheme"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../hooks/useThreadWorkspaceHandoff"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../hooks/useTurnDiffSummaries"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../keybindings"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../lib/automationDraft"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../lib/automationIntent"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../lib/chatProjects"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../lib/chatReferences"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../lib/composerImageBlobStore"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../lib/composerPastedText"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../lib/composerSend"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../lib/contextWindow"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../lib/editableEventTarget"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../lib/fileComments"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../lib/studioProjects"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../lib/subagentPresentation"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../lib/terminalContext"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../lib/terminalContextComposerRegistry"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../lib/terminalFocus"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../lib/threadEnvironment"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../lib/threadHandoff"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../lib/threadRename"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../modelIdentifier"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../pendingUserInput"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../proposedPlan"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../rightDockStore"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../routes/-automations.shared"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../session-logic"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../splitViewStore"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../store"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../storeSelectors"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../temporaryThreadStore"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../terminalStateStore"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../threadDerivation"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../threadMarkers"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../types"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../workflowRunUiStore"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "../workspacePathsStore"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./BranchToolbar"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./BrandMark"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./ChatView.logic"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./ChatView.logic"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./ChatView.selectors"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./ComposerPromptEditor"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./FolderClosed"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./PlanSidebar"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./ProjectScriptsControl"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./PullRequestThreadDialog"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./RenameThreadDialog"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./SidebarHeaderNavigationControls"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./TerminalWorkspaceTabs"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./ThreadWorktreeHandoffDialog"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/ChatHeader"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/ChatTranscriptPane"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/ComposerActiveTaskListCard"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/ComposerColumnFrame"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/ComposerCommandMenu"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/ComposerInputBanners"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/ComposerLiveChangesHeader"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/ComposerLocalDirectoryMenu"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/ComposerPickerMenuPopup"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/ComposerQueuedHeader"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/ComposerReferenceAttachments"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/ComposerSubagentStrip"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/ComposerSubagentStrip.logic"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/ComposerVoiceButton"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/ComposerVoiceRecorderBar"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/ContextWindowMeter"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/ExpandedImageOverlay"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/ExpandedImagePreview"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/MessagesTimeline"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/MessagesTimeline.logic"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/ProjectPicker"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/RateLimitBanner"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/ThreadDetailHydrationState"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/ThreadErrorBanner"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/TranscriptSelectionActionLayer"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/WorkflowRunCard"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/WorkflowRunCard.logic"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/agentActivity.logic"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/chatHeaderControls"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/chatSelectionActions"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/composerPickerStyles"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/environment/EnvironmentPanel"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/environment/usePinnedMessageActions"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/transcriptScroll"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/useChatAutomationSetup"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/useChatTerminalController"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/useComposerVoiceController"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/useMarkSettledConversationVisited"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./chat/useTranscriptAssistantSelectionAction"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./composerFooterLayout"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./product/ProductConversationNotice"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./product/ProductRuntimePicker"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./product/productQueueActions"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./product/productRunControl"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./terminal/terminalIds"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./ui/button"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./ui/menu"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./ui/sidebar"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "./ui/toast"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "@legendapp/list/react"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "@omnimind/contracts"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "@omnimind/shared/automationMode"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "@omnimind/shared/chatThreads"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "@omnimind/shared/threadEnvironment"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "@omnimind/shared/threadExport"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "@omnimind/shared/threadWorkspace"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "@tanstack/react-pacer"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "@tanstack/react-query"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "@tanstack/react-router"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "react"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/conversationHistorySummary"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/historicalConversation"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/hooks/useDesktopTopBarGutter"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/hooks/useLocalStorage"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/hooks/useMediaQuery"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/hooks/useNowMs"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/hooks/useRepoDiffTotals"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/hooks/useThreadRecap"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/i18n/workbenchCopy"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/lib/chatPaneScope"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/lib/composerMentions"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/lib/gitReactQuery"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/lib/icons"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/lib/identifiers"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/lib/identifiers"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/lib/localFolderMentions"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/lib/modelFavorites"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/lib/platform"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/lib/projectReactQuery"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/lib/serverReactQuery"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/lib/styles"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/lib/threadCreatePromotion"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/nativeApi"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/pinnedMessages"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/productConversationMutations"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/productQueueReconciliation"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/productReadModel"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/projectInstructionsStore"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/projectScripts"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/projectTerminalRunner"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/store/productStore"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/store/systemHealthStore"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/ChatView.tsx",
          "specifier": "~/wsNativeApi"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/chat/ComposerImageAttachmentChip.tsx",
          "specifier": "../../composerDraftStore"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/chat/ComposerImageAttachmentChip.tsx",
          "specifier": "../../lib/composerImageSource"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/chat/ComposerImageAttachmentChip.tsx",
          "specifier": "../ui/tooltip"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/chat/ComposerImageAttachmentChip.tsx",
          "specifier": "./AttachmentRemoveButton"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/chat/ComposerImageAttachmentChip.tsx",
          "specifier": "./DraftAttachmentWarning"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/chat/ComposerImageAttachmentChip.tsx",
          "specifier": "./ExpandedImagePreview"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/components/chat/ComposerImageAttachmentChip.tsx",
          "specifier": "~/lib/icons"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftAttachments.ts",
          "specifier": "./composerDraftDomain"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftAttachments.ts",
          "specifier": "./hooks/useLocalStorage"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftAttachments.ts",
          "specifier": "./lib/composerImageBlobStore"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftAttachments.ts",
          "specifier": "./lib/composerImageSource"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftAttachments.ts",
          "specifier": "@omnimind/contracts"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftAttachments.ts",
          "specifier": "effect/Schema"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftDomain.ts",
          "specifier": "./composerDraftV2Transcode"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftDomain.ts",
          "specifier": "./lib/assistantSelections"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftDomain.ts",
          "specifier": "./lib/browserAnnotations"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftDomain.ts",
          "specifier": "./lib/composerImageSource"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftDomain.ts",
          "specifier": "./lib/composerPastedText"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftDomain.ts",
          "specifier": "./lib/fileComments"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftDomain.ts",
          "specifier": "./lib/terminalContext"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftDomain.ts",
          "specifier": "./types"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftDomain.ts",
          "specifier": "@omnimind/contracts"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftDomain.ts",
          "specifier": "effect/Equal"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftDomain.ts",
          "specifier": "effect/Schema"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftDomain.ts",
          "specifier": "~/historicalConversation"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftDomain.ts",
          "specifier": "~/historicalModelSelection"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftPersistence.ts",
          "specifier": "./composerDraftAttachments"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftPersistence.ts",
          "specifier": "./composerDraftDomain"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftPersistence.ts",
          "specifier": "./composerDraftModels"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftPersistence.ts",
          "specifier": "./lib/assistantSelections"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftPersistence.ts",
          "specifier": "./lib/browserAnnotations"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftPersistence.ts",
          "specifier": "./lib/composerPastedText"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftPersistence.ts",
          "specifier": "./lib/fileComments"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftPersistence.ts",
          "specifier": "./lib/terminalContext"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftPersistence.ts",
          "specifier": "./types"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftPersistence.ts",
          "specifier": "@omnimind/contracts"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftPersistence.ts",
          "specifier": "effect/Schema"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftPersistence.ts",
          "specifier": "effect/Types"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftPersistence.ts",
          "specifier": "~/historicalConversation"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftPersistence.ts",
          "specifier": "~/historicalModelSelection"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftStore.ts",
          "specifier": "./composerDraftActions"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftStore.ts",
          "specifier": "./composerDraftDomain"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftStore.ts",
          "specifier": "./composerDraftPersistence"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftStore.ts",
          "specifier": "./lib/storage"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftStore.ts",
          "specifier": "@omnimind/contracts"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftStore.ts",
          "specifier": "zustand"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftStore.ts",
          "specifier": "zustand/middleware"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftV2Transcode.ts",
          "specifier": "@omnimind/contracts"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/composerDraftV2Transcode.ts",
          "specifier": "effect"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/settingsSearchIndex.ts",
          "specifier": "./settingsNavigation"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/settingsSearchIndex.ts",
          "specifier": "~/lib/searchRanking"
        },
        {
          "form": "import-declaration",
          "source": "apps/web/src/storageOriginUpgrade.ts",
          "specifier": "@omnimind/contracts"
        },
        {
          "form": "import-declaration",
          "source": "packages/contracts/src/ipc.ts",
          "specifier": "./auth"
        },
        {
          "form": "import-declaration",
          "source": "packages/contracts/src/ipc.ts",
          "specifier": "./automation"
        },
        {
          "form": "import-declaration",
          "source": "packages/contracts/src/ipc.ts",
          "specifier": "./baseSchemas"
        },
        {
          "form": "import-declaration",
          "source": "packages/contracts/src/ipc.ts",
          "specifier": "./browserAnnotations"
        },
        {
          "form": "import-declaration",
          "source": "packages/contracts/src/ipc.ts",
          "specifier": "./editor"
        },
        {
          "form": "import-declaration",
          "source": "packages/contracts/src/ipc.ts",
          "specifier": "./filesystem"
        },
        {
          "form": "import-declaration",
          "source": "packages/contracts/src/ipc.ts",
          "specifier": "./filesystem"
        },
        {
          "form": "import-declaration",
          "source": "packages/contracts/src/ipc.ts",
          "specifier": "./git"
        },
        {
          "form": "import-declaration",
          "source": "packages/contracts/src/ipc.ts",
          "specifier": "./product/state"
        },
        {
          "form": "import-declaration",
          "source": "packages/contracts/src/ipc.ts",
          "specifier": "./project"
        },
        {
          "form": "import-declaration",
          "source": "packages/contracts/src/ipc.ts",
          "specifier": "./pullRequests"
        },
        {
          "form": "import-declaration",
          "source": "packages/contracts/src/ipc.ts",
          "specifier": "./server"
        },
        {
          "form": "import-declaration",
          "source": "packages/contracts/src/ipc.ts",
          "specifier": "./stats"
        },
        {
          "form": "import-declaration",
          "source": "packages/contracts/src/ipc.ts",
          "specifier": "./studio"
        },
        {
          "form": "import-declaration",
          "source": "packages/contracts/src/ipc.ts",
          "specifier": "./terminal"
        },
        {
          "form": "import-declaration",
          "source": "scripts/lib/release-update-policy.ts",
          "specifier": "node:fs"
        },
        {
          "form": "import-declaration",
          "source": "scripts/lib/release-update-policy.ts",
          "specifier": "node:path"
        },
        {
          "form": "import-declaration",
          "source": "scripts/prepare-release-update-feed.ts",
          "specifier": "./lib/release-update-policy.ts"
        },
        {
          "form": "import-declaration",
          "source": "scripts/prepare-release-update-feed.ts",
          "specifier": "node:path"
        },
        {
          "form": "import-declaration",
          "source": "scripts/prepare-release-update-feed.ts",
          "specifier": "node:url"
        },
        {
          "form": "import-declaration",
          "source": "scripts/release-smoke.ts",
          "specifier": "./lib/bun-text-lockfile.ts"
        },
        {
          "form": "import-declaration",
          "source": "scripts/release-smoke.ts",
          "specifier": "./lib/release-update-policy.ts"
        },
        {
          "form": "import-declaration",
          "source": "scripts/release-smoke.ts",
          "specifier": "./lib/release-workspace-manifests.ts"
        },
        {
          "form": "import-declaration",
          "source": "scripts/release-smoke.ts",
          "specifier": "@omnimind/shared/desktopIdentity"
        },
        {
          "form": "import-declaration",
          "source": "scripts/release-smoke.ts",
          "specifier": "node:child_process"
        },
        {
          "form": "import-declaration",
          "source": "scripts/release-smoke.ts",
          "specifier": "node:fs"
        },
        {
          "form": "import-declaration",
          "source": "scripts/release-smoke.ts",
          "specifier": "node:os"
        },
        {
          "form": "import-declaration",
          "source": "scripts/release-smoke.ts",
          "specifier": "node:path"
        },
        {
          "form": "import-declaration",
          "source": "scripts/release-smoke.ts",
          "specifier": "node:url"
        },
        {
          "form": "import-declaration",
          "source": "scripts/resolve-release-update-policy.ts",
          "specifier": "./lib/release-github-output.ts"
        },
        {
          "form": "import-declaration",
          "source": "scripts/resolve-release-update-policy.ts",
          "specifier": "./lib/release-update-policy.ts"
        },
        {
          "form": "import-declaration",
          "source": "scripts/resolve-release-update-policy.ts",
          "specifier": "node:fs"
        },
        {
          "form": "import-declaration",
          "source": "scripts/resolve-release-update-policy.ts",
          "specifier": "node:path"
        },
        {
          "form": "import-declaration",
          "source": "scripts/resolve-release-update-policy.ts",
          "specifier": "node:url"
        },
        {
          "form": "import-declaration",
          "source": "scripts/update-release-package-versions.ts",
          "specifier": "node:fs"
        },
        {
          "form": "import-declaration",
          "source": "scripts/update-release-package-versions.ts",
          "specifier": "node:path"
        },
        {
          "form": "import-declaration",
          "source": "scripts/update-release-package-versions.ts",
          "specifier": "node:url"
        }
      ],
      "resolvedRecordCount": 85,
      "resolvedRecordObservationSha256": "8cc953ec49315674e653b41cb9cdccda990176c9558a915b2de3168b8b414778",
      "stronglyConnectedComponents": [
        {
          "disposition": "observational",
          "hardGateEnabled": false,
          "members": [
            "apps/web/src/components/ChatView.tsx"
          ]
        }
      ],
      "delta": {
        "disposition": "observational",
        "hardGateEnabled": false,
        "compared": false,
        "addedRecords": [],
        "removedRecords": []
      }
    },
    "lines": {
      "disposition": "observational",
      "hardGateEnabled": false,
      "changedScopeProduction": 35873,
      "steadyStateRuntime": 35052,
      "responsibilitySlice": 5151,
      "files": [
        {
          "path": "apps/desktop/src/desktopStorageUpgrade.ts",
          "lines": 115,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/desktop/src/desktopUserDataProfile.ts",
          "lines": 253,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/desktop/src/ipcChannels.ts",
          "lines": 83,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/desktop/src/main.ts",
          "lines": 4464,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/desktop/src/preload.ts",
          "lines": 273,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/desktop/src/process/nativeHostAuthenticatedReadiness.ts",
          "lines": 32,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/desktop/src/process/nativeHostEnvironment.ts",
          "lines": 36,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/desktop/src/process/nativeHostRendezvous.ts",
          "lines": 48,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/desktop/src/process/nativeHostSupervisor.ts",
          "lines": 239,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/native-host/src/index.ts",
          "lines": 360,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/native-host/src/piRuntime.ts",
          "lines": 1992,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/native-host/src/responseFrame.ts",
          "lines": 56,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/service/src/config.ts",
          "lines": 304,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/service/src/effectServer.ts",
          "lines": 173,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/service/src/main.ts",
          "lines": 497,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/service/src/native-host/client.ts",
          "lines": 555,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/service/src/native-host/executionBoundary.ts",
          "lines": 751,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/service/src/native-host/liveJourneyProbe.ts",
          "lines": 509,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/service/src/native-host/packageCrashProbe.ts",
          "lines": 190,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/service/src/native-host/packageLifecycle.ts",
          "lines": 737,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/service/src/opencode/liveJourneyProbe.ts",
          "lines": 309,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/service/src/opencode/productBoundary.ts",
          "lines": 365,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/service/src/persistence/AutomationSchema.ts",
          "lines": 173,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/service/src/persistence/Layers/Sqlite.ts",
          "lines": 134,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/service/src/persistence/SystemCapabilitySchema.ts",
          "lines": 223,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/service/src/persistence/automationSelectionTranscode.ts",
          "lines": 150,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/service/src/persistence/selectionSchemaCoordinator.ts",
          "lines": 776,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/service/src/product/ProductControlPlane.ts",
          "lines": 5036,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/service/src/product/engineJourneyProof.ts",
          "lines": 231,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/service/src/product/health/nativeHostHealthMonitor.ts",
          "lines": 54,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/service/src/product/productExecutionGateway.ts",
          "lines": 115,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/service/src/product/schema1ProductMutationFixtures.ts",
          "lines": 173,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/service/src/product/schema1ProductTranscode.ts",
          "lines": 319,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/service/src/product/schema1SelectionTranscode.ts",
          "lines": 124,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/service/src/server/readiness.ts",
          "lines": 58,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/service/src/serverLayers.ts",
          "lines": 115,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/service/src/wsRpc.ts",
          "lines": 758,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/web/src/appSettings.ts",
          "lines": 229,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/web/src/bootstrap.ts",
          "lines": 16,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/web/src/components/ChatView.tsx",
          "lines": 8261,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/web/src/components/chat/ComposerImageAttachmentChip.tsx",
          "lines": 154,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/web/src/composerDraftAttachments.ts",
          "lines": 615,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/web/src/composerDraftDomain.ts",
          "lines": 906,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/web/src/composerDraftPersistence.ts",
          "lines": 1352,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/web/src/composerDraftStore.ts",
          "lines": 157,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/web/src/composerDraftV2Transcode.ts",
          "lines": 127,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/web/src/lib/composerImageSource.ts",
          "lines": 66,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/web/src/settingsSearchIndex.ts",
          "lines": 431,
          "category": "steady-state-runtime"
        },
        {
          "path": "apps/web/src/storageOriginUpgrade.ts",
          "lines": 71,
          "category": "steady-state-runtime"
        },
        {
          "path": "package.json",
          "lines": 108,
          "category": "direct-rebuild-or-configuration"
        },
        {
          "path": "packages/contracts/src/ipc.ts",
          "lines": 640,
          "category": "steady-state-runtime"
        },
        {
          "path": "packages/contracts/src/native-host/protocol.ts",
          "lines": 1247,
          "category": "steady-state-runtime"
        },
        {
          "path": "scripts/lib/release-update-policy.ts",
          "lines": 159,
          "category": "direct-rebuild-or-configuration"
        },
        {
          "path": "scripts/package.json",
          "lines": 27,
          "category": "direct-rebuild-or-configuration"
        },
        {
          "path": "scripts/prepare-release-update-feed.ts",
          "lines": 19,
          "category": "direct-rebuild-or-configuration"
        },
        {
          "path": "scripts/release-smoke.ts",
          "lines": 356,
          "category": "direct-rebuild-or-configuration"
        },
        {
          "path": "scripts/release-update-policy.json",
          "lines": 5,
          "category": "direct-rebuild-or-configuration"
        },
        {
          "path": "scripts/resolve-release-update-policy.ts",
          "lines": 35,
          "category": "direct-rebuild-or-configuration"
        },
        {
          "path": "scripts/update-release-package-versions.ts",
          "lines": 112,
          "category": "direct-rebuild-or-configuration"
        }
      ]
    },
    "physical": {
      "disposition": "observational",
      "hardGateEnabled": false,
      "productControlPlaneLines": 5036,
      "literalGatewayLines": 115,
      "facadeOperationCount": 42,
      "uniqueProductRpcOperationCount": 36,
      "productTableLiteralCount": 21,
      "transactionCallCount": 44,
      "volatileVariableCount": 3,
      "productionMonolithImporterCount": 10,
      "productDatabaseConstructionTokenCount": 0,
      "productDurableStateTokenCount": 19,
      "nativeHostPackageLifecycleLiteralRecordCount": 3,
      "compatibilityIdentityPresence": [
        {
          "path": "apps/web/src/composerDraftV2Transcode.ts",
          "present": true
        },
        {
          "path": "apps/web/src/storageOriginUpgrade.ts",
          "present": true
        },
        {
          "path": "apps/desktop/src/desktopStorageUpgrade.ts",
          "present": true
        }
      ]
    }
  },
  "comparison": {
    "enabled": false,
    "candidateWorkId": null,
    "predecessorKind": "accepted-v7-measurement-bootstrap"
  }
}
```
