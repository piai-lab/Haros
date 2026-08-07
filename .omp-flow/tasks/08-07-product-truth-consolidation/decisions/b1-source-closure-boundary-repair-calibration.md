---
type: "Decision"
title: "B1 source-closure disposition boundary repair"
---

# B1 source-closure disposition boundary repair

## Calibration applied

B1 already owns deletion of `apps/desktop/src/desktopUserDataProfile.ts` and its focused test as
part of the retired profile/origin bridge. Both paths are mapped targets of the immutable adopted
source tree. The source-closure gate therefore correctly changes their dispositions from
`adapted-present` to `adapted-removed`: present decreases from 1496 to 1494 and removed increases
from 774 to 776. The immutable source tree, mapping set, total path count and every other
disposition remain unchanged.

The gate stores the expected disposition counts and digest in
`scripts/check-source-closure.mjs`, which is outside the current B1 output boundary. The smallest
repair is to authorize only the mechanically regenerated count and digest constants needed to
bind the already-approved deletions. It does not reopen source adoption, provenance, mapping,
licensing or product behavior.

## Exact boundary addition

B1 additionally owns only `scripts/check-source-closure.mjs`, solely to update:

- `EXPECTED_DISPOSITION_COUNTS["adapted-present"]` from 1496 to 1494;
- `EXPECTED_DISPOSITION_COUNTS["adapted-removed"]` from 774 to 776;
- `EXPECTED_DISPOSITION_DIGEST` to the value deterministically recomputed by the unchanged
  `dispositionDigest` algorithm over the same immutable source tree and mapping set after those two
  exact target deletions.

No algorithm, tree SHA, path count, mapping, glyph count, public-surface lineage, exclusion,
repository-file rule or error behavior may change. No other source-closure path is authorized.

## Verification delta

The repaired candidate must prove:

- the diff in `scripts/check-source-closure.mjs` contains exactly the two count changes and one
  digest constant change;
- JSON output has total 6425 and the same counts for every disposition except the exact -2/+2
  transfer above;
- the two changed records target exactly
  `apps/desktop/src/desktopUserDataProfile.ts` and
  `apps/desktop/src/desktopUserDataProfile.test.ts`, both as `adapted-removed`;
- the source tree SHA, origins/mappings and all remaining disposition records are byte-for-byte
  unchanged when compared after accounting for those two statuses;
- identity/source/legal gates remain green and the frozen Product complexity meter files remain
  untouched.

## Preserved Work meaning and transition

This repair records provenance consequences of already-authorized deletions; it grants no new
production deletion, compatibility, destructive target or source authority. Every prior B1 done
condition and hard ordering remains unchanged. A fresh different-actor scoped QbD 2 audit must
accept this one-file/three-constant repair before the script is edited.
