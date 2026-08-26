# Browser geometry quarantine

Linux pixel, font, and layout comparisons live in `*.geometry.browser.tsx` entry files and run in
the non-blocking geometry job. The stable suite excludes those entries by filename; it does not
collect every browser file and filter test names afterward.

Runtime behavior, event streams, teardown, unhandled errors, focus reachability, and keyboard
interaction must remain in the blocking stable suite. A geometry entry may share a side-effect-free
suite module with stable tests, but the executable entry filename is the membership owner; this file
does not duplicate case names or counts.

Owner: `web/transcript`.

Removal criterion: move a case back to a stable `*.browser.tsx` entry after the underlying estimator,
font, or layout behavior is corrected and the stable case passes in three consecutive blocking Ubuntu
CI runs. The original Linux failure evidence remains commit `7c80c0dee`.
