---
type: "Decision"
title: "B1 implementation-discovered boundary repair"
---

# B1 implementation-discovered boundary repair

## Human calibration applied

The approved B1 Work requires any implementation-discovered production path outside its explicit
boundary to stop and return for map repair. Before the first implementer wrote product code, a
parallel read-only structural scan found additional callers/aliases belonging to the already
approved origin-bridge, `appshot` and retired Product-filename compatibility surfaces. The first
implementation operation was stopped with a clean worktree.

The maintainer's standing direction—repair blockers directly, delete confirmed compatibility and
do not pause for ordinary implementation choices—selects the minimal exact-boundary repair below.
This does not accept the residues, broaden the destructive scope or change B1 meaning.

## Exact boundary additions

B1 additionally owns only these compatibility deletions/canonical-path corrections:

- `packages/contracts/src/ipc.ts`: remove `OmniMindStorageSnapshot` and
  `DesktopBridge.storageUpgrade`;
- `apps/desktop/src/ipcChannels.ts`: remove the storage-upgrade read/ack channels;
- `apps/desktop/src/preload.ts`: remove the storage-upgrade preload exposure;
- `apps/web/src/lib/composerImageSource.ts`: remove legacy `appshot` acceptance/normalization while
  retaining `appsnap`, with its focused test;
- `apps/web/src/components/chat/ComposerImageAttachmentChip.tsx`: remove the legacy `appshot`
  comment/fixture with its focused test;
- `apps/web/src/settingsSearchIndex.ts`: remove the `appshot` search alias;
- `apps/service/src/native-host/executionBoundary.test.ts`: replace the retired Product database
  literal with the canonical resolver/constant without changing Native Host behavior.

The exact focused tests are
`apps/web/src/lib/composerImageSource.test.ts`,
`apps/web/src/components/chat/ComposerImageAttachmentChip.test.tsx` and the existing Native Host
execution-boundary test. A final full-tree scan found no other required boundary-external residue
for the approved storage-upgrade/profile-seed/Product-v1/release/selection/schema1 surfaces.

The direct rebuild tool may still contain retired filenames solely as closed destructive target
identities; those literals are not runtime compatibility and must not be removed by an undifferentiated
string scan.

## Transition

Repair the B1 Work boundary and submit only that change to a fresh scoped QbD 2 audit. On PASS,
restart B1 from the clean checkpoint with a new implementation receipt. QbD 1, the repaired QbD 2
sequence, A1-A15, protocol v2, g50 and every destructive exclusion remain unchanged.
