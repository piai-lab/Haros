export const BUNDLED_PI_PROVENANCE = {
  displayName: "Pi",
  packageVersion: "0.81.1",
  packages: [
    "@earendil-works/pi-agent-core@0.81.1",
    "@earendil-works/pi-ai@0.81.1",
    "@earendil-works/pi-coding-agent@0.81.1",
    "@earendil-works/pi-tui@0.81.1",
  ],
  sourceUrl: "https://github.com/earendil-works/pi",
  sourceLabel: "earendil-works/pi package repository",
  sourceRevision: "20be4b18d4c57487f8993d2762bace129f0cf7c6",
  authority:
    "Pi owns native Session behavior, Package loading and lifecycle, and Agent execution semantics.",
  currentBoundary:
    "Pi executes in a supervised, isolated Native Host. Pi executable dependencies are absent from Electron Main, the renderer, and Product Service. This process isolation is a fault boundary, not a filesystem or network sandbox.",
  revisionTruth:
    "Resolved package generation is 0.81.1; exact npm artifact provenance resolves to upstream Git revision 20be4b18d4c57487f8993d2762bace129f0cf7c6.",
} as const;

export const OPEN_SOURCE_NOTICE = {
  href: "/licenses/ui-mother-MIT.txt",
  label: "Adopted UI MIT license",
} as const;

export const RELEASE_LEGAL_ARTIFACTS = [
  {
    href: "/licenses/THIRD-PARTY-NOTICES.txt",
    label: "Third-party notices",
  },
  {
    href: "/licenses/release-dependencies.json",
    label: "Dependency inventory",
  },
  {
    href: "/licenses/sbom.cdx.json",
    label: "CycloneDX SBOM",
  },
] as const;
