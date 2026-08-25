# Upstream provenance

This directory is a subtractive, modified fork feasibility slice. It is not a
registered Pi Extension and is not exposed to models or OmniMind users.

- Package: `@mrclrchtr/supi-ask-user@5.0.0`
- Repository: `https://github.com/mrclrchtr/supi.git`
- Exact source commit: `ce8af5f57304ad114319aa75c00920f029ceb8e7`
- Exact source path: `packages/supi-ask-user`
- npm integrity: `sha512-uBlvlXTvSrdvTvvdbpapwVwA4I3DMcIaHSGe18mtd4KdWAhd36yY1UwGvAbFXcS2NvJ18VIkaJpi112CSoabJQ==`
- npm shasum: `cabb06df40ab95be1a67b4f3b32c83bc257ea38a`
- downloaded tarball SHA-256: `d687d4d448cc115a67ceb473b8e9ceeb56dddb047901b1f2daa05d6ae0cb300e`
- license: MIT; exact upstream text retained in `LICENSE`
- upstream author baseline: 9 test files / 152 tests passing under Vitest 4.1.10

The npm artifact has SLSA provenance resolving to the exact commit above, but
does not contain a LICENSE or NOTICE file. This fork repairs that distribution
defect by retaining the source repository's exact MIT text.

## Retained and adapted lineage

- `src/types.ts` derives from upstream `src/types.ts`.
- `src/normalize.ts` derives from upstream `src/normalize.ts`.
- `src/controller.ts` derives from upstream `src/session/controller.ts`.
- `src/lock.ts` derives from upstream `src/session/lock.ts`.
- `src/result.ts` derives from upstream `src/render/result.ts`.
- `src/kernel.ts` derives from the validation → availability → lock → signal →
  interaction → result → cleanup lifecycle in upstream `src/ask-user.ts`.
- Tests marked `upstream-adapted` preserve the corresponding author-test
  behavior while explicitly reversing preselection, trimming, and hard caps.

## Deliberately deleted

The upstream Extension entry point, Tool registration/schema/guidance,
transcript renderer, complete TUI tree, `supi-core`, prompt/config resolution,
events, deferred timer, terminal/session helpers, recommendation preselection,
text trimming, and product question/option caps are absent. The package has no
`pi.extensions` manifest, runtime dependencies, registration side effect, UI,
configuration, persistence, timer, event bus, or process singleton.

OmniMind-specific product contracts, Composer Question UI, registration,
same-turn barrier, provenance, Product State, and restart semantics are
intentionally outside this feasibility slice.

## Author-test disposition

The exact upstream suite is preserved as a separately reproducible baseline;
it is not copied wholesale and relabeled as fork coverage. Its 152 cases have
this explicit disposition:

| Upstream suite            | Exact cases | Preserve/adapt | Intentionally reverse | Delete | Reason                                                                                                                                                                       |
| ------------------------- | ----------: | -------------: | --------------------: | -----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `controller.test.ts`      |          38 |             34 |                     4 |      0 | Preserve navigation, choices, comments, outcome and terminal behavior; reverse recommendation/default preselection and text prefill.                                         |
| `normalize.test.ts`       |          19 |             14 |                     5 |      0 | Preserve identity, shape and recommendation validation; reverse trim/default/Unicode rewriting behavior.                                                                     |
| `ask-user.test.ts`        |          13 |              7 |                     0 |      6 | Adapt validation, fail-closed availability, success, incomplete, cancel, abort and concurrency; delete Pi registration, prompt config, TUI editor, event and terminal tests. |
| `result.test.ts`          |           1 |              0 |                     0 |      1 | Delete Pi model-summary truncation; the fork returns only structured data.                                                                                                   |
| transcript and TUI suites |          81 |              0 |                     0 |     81 | Entire presentation owner is deliberately absent.                                                                                                                            |
| **Total**                 |     **152** |         **55** |                 **9** | **88** | The fork suite adds boundary, no-cap, losslessness, stale-lease and late-answer tests.                                                                                       |

The fork's executable suite is intentionally smaller than the upstream suite:
it protects retained runtime/domain behavior and the deletion boundary, not a
second presentation system.
