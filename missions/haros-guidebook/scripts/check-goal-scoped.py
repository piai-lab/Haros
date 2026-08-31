#!/usr/bin/env python3

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path
from typing import Callable


REPO_ROOT = Path("/Users/liuzaoqu/Desktop/Develop/independent/Haros")
UPSTREAM = Path("/Users/liuzaoqu/.codex/skills/zq-goal/scripts/check_goal.py")
GUIDEBOOK_GOAL = REPO_ROOT / "missions/haros-guidebook-goal.md"
OWNER_SPEC = REPO_ROOT / "missions/haros-owner-lifecycle-cut.md"
OWNER_GOAL = REPO_ROOT / "missions/haros-owner-lifecycle-cut-goal.md"
CONTROL_HEAD = "8802205680f065be4cc1d5d84c2aef0a37ba0c23"
CAMPAIGN_ID = "HAROS-OWNER-CUT-2026-08-30"
OWNER_SPEC_RELATIVE = "missions/haros-owner-lifecycle-cut.md"
OWNER_GOAL_RELATIVE = "missions/haros-owner-lifecycle-cut-goal.md"
CONTROL_PATHS = (
    OWNER_SPEC_RELATIVE,
    OWNER_GOAL_RELATIVE,
    "missions/evidence/haros-owner-lifecycle-cut/E-025-final-gate-pass.txt",
    "missions/evidence/haros-owner-lifecycle-cut/E-026-fresh-audit-pass.txt",
)
EXPECTED_REQUIRED_CLAIMS = {f"C-{index:03d}" for index in range(1, 10)}
EXPECTED_UPSTREAM_LINES = (
    "WARNING: canonical spec is not yet tracked by Git",
    "ERROR: competing state file missions/haros-owner-lifecycle-cut.md must itself be a Status: superseded tombstone",
    "ERROR: competing state file missions/haros-owner-lifecycle-cut-goal.md must itself be a Status: superseded tombstone",
)


class CheckFailure(RuntimeError):
    pass


def run_git(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", "-C", str(REPO_ROOT), *args],
        check=check,
        capture_output=True,
        text=True,
    )


def validate_upstream_output(output: str, returncode: int) -> None:
    lines = tuple(line for line in output.splitlines() if line)
    if returncode != 1:
        raise CheckFailure(f"upstream exit changed: expected 1, observed {returncode}")
    if len(lines) != 4:
        raise CheckFailure(f"upstream diagnostic count changed: expected 4, observed {len(lines)}")
    if lines[:3] != EXPECTED_UPSTREAM_LINES:
        raise CheckFailure("upstream diagnostics changed outside the scoped exception")
    if not re.fullmatch(r"FAIL: errors=2, warnings=1, goal_chars=\d+", lines[3]):
        raise CheckFailure(f"upstream summary changed: {lines[3]}")


def active_claim_values(text: str) -> list[str]:
    return re.findall(r"(?m)^\s*(?:-\s*)?Active Claim:\s*(.+?)\s*$", text)


def parse_required_claim_statuses(text: str) -> dict[str, str]:
    statuses: dict[str, str] = {}
    for line in text.splitlines():
        if not line.startswith("| C-"):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) < 4 or "[required]" not in cells[1]:
            continue
        statuses[cells[0]] = cells[3]
    return statuses


def validate_owner_text(spec_text: str, goal_text: str) -> None:
    if not spec_text.startswith(f"# Campaign: {CAMPAIGN_ID}\n"):
        raise CheckFailure("independent campaign identity changed in canonical spec")
    if f"Campaign `{CAMPAIGN_ID}`" not in goal_text:
        raise CheckFailure("independent campaign identity changed in Goal")

    spec_claims = active_claim_values(spec_text)
    goal_claims = active_claim_values(goal_text)
    if len(spec_claims) != 1 or not spec_claims[0].casefold().startswith("none"):
        raise CheckFailure("independent campaign canonical spec has an active Claim")
    if len(goal_claims) != 1 or not goal_claims[0].casefold().startswith("none"):
        raise CheckFailure("independent campaign Goal has an active Claim")

    statuses = parse_required_claim_statuses(spec_text)
    if set(statuses) != EXPECTED_REQUIRED_CLAIMS:
        raise CheckFailure(
            "independent campaign required-Claim set changed: "
            + ",".join(sorted(statuses))
        )
    nonverified = sorted(
        claim_id for claim_id, status in statuses.items() if status != "verified"
    )
    if nonverified:
        raise CheckFailure(
            "independent campaign has non-verified required Claim(s): "
            + ",".join(nonverified)
        )

    checkpoints = re.findall(r"(?m)^- Current checkpoint:\s*(.+?)\s*$", spec_text)
    if len(checkpoints) != 1 or not checkpoints[0].startswith("COMPLETE "):
        raise CheckFailure("independent campaign checkpoint is not COMPLETE")

    mission_references = set(
        re.findall(r"missions/[A-Za-z0-9._/-]+\.md", goal_text)
    )
    if mission_references != {OWNER_SPEC_RELATIVE}:
        raise CheckFailure(
            "independent campaign Goal does not point only to its own canonical spec"
        )


def validate_git_boundary() -> None:
    tracked = run_git("ls-files", "--error-unmatch", "--", *CONTROL_PATHS)
    tracked_paths = set(tracked.stdout.splitlines())
    if tracked_paths != set(CONTROL_PATHS):
        raise CheckFailure("independent campaign control chain is not fully tracked")
    if run_git("diff", "--quiet", "HEAD", "--", *CONTROL_PATHS, check=False).returncode:
        raise CheckFailure("independent campaign control chain is not HEAD-clean")
    if run_git("merge-base", "--is-ancestor", CONTROL_HEAD, "HEAD", check=False).returncode:
        raise CheckFailure("current HEAD does not contain the completed campaign control chain")
    subject = run_git("show", "-s", "--format=%s", CONTROL_HEAD).stdout.strip()
    if subject != "docs(campaign): durably close owner cut":
        raise CheckFailure("completed campaign control commit identity changed")
    tree = run_git("ls-tree", "-r", "--name-only", CONTROL_HEAD, "--", *CONTROL_PATHS)
    if set(tree.stdout.splitlines()) != set(CONTROL_PATHS):
        raise CheckFailure("completed campaign control commit lacks its durable chain")


def expect_rejected(label: str, action: Callable[[], None]) -> None:
    try:
        action()
    except CheckFailure:
        return
    raise CheckFailure(f"mutation unexpectedly passed: {label}")


def run_mutations(upstream_output: str, upstream_returncode: int, spec: str, goal: str) -> None:
    active_goal = goal.replace(
        "Active Claim: none — all required Claims are verified and no Claim remains active.",
        "Active Claim: C-001.",
        1,
    )
    if active_goal == goal:
        raise CheckFailure("active-Claim mutation anchor missing")
    expect_rejected("active-claim", lambda: validate_owner_text(spec, active_goal))

    nonverified_spec = spec.replace("| verified |", "| open     |", 1)
    if nonverified_spec == spec:
        raise CheckFailure("non-verified Claim mutation anchor missing")
    expect_rejected(
        "non-verified-claim", lambda: validate_owner_text(nonverified_spec, goal)
    )

    fake_competing = upstream_output.replace(
        "FAIL: errors=2, warnings=1,",
        "ERROR: competing state file missions/fake-campaign.md must itself be a Status: superseded tombstone\n"
        "FAIL: errors=3, warnings=1,",
        1,
    )
    expect_rejected(
        "extra-fake-competing-file",
        lambda: validate_upstream_output(fake_competing, upstream_returncode),
    )

    new_upstream_error = upstream_output.replace(
        "FAIL: errors=2, warnings=1,",
        "ERROR: synthetic future upstream diagnostic\nFAIL: errors=3, warnings=1,",
        1,
    )
    expect_rejected(
        "new-upstream-error",
        lambda: validate_upstream_output(new_upstream_error, upstream_returncode),
    )


def main() -> int:
    upstream = subprocess.run(
        [
            sys.executable,
            str(UPSTREAM),
            str(GUIDEBOOK_GOAL.relative_to(REPO_ROOT)),
            "--workspace",
            str(REPO_ROOT),
        ],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    output = upstream.stdout + upstream.stderr
    print(output, end="")

    try:
        validate_upstream_output(output, upstream.returncode)
        spec_text = OWNER_SPEC.read_text(encoding="utf-8")
        goal_text = OWNER_GOAL.read_text(encoding="utf-8")
        validate_owner_text(spec_text, goal_text)
        validate_git_boundary()
        run_mutations(output, upstream.returncode, spec_text, goal_text)
    except (CheckFailure, OSError, subprocess.SubprocessError) as error:
        print(f"goal-check-scoped=FAIL {error}", file=sys.stderr)
        return 1

    print(
        "goal-check-scoped-mutations=PASS cases=4 "
        "active-claim=1 non-verified-claim=1 fake-competing=1 new-upstream-error=1"
    )
    print(
        "goal-check-scoped=PASS upstream errors=2, "
        "scoped independent-completed-campaign exception PASS"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
