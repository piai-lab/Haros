import * as OS from "node:os";
import * as Path from "node:path";

export const PLAN_FORMAT = "omnimind-direct-first-public-plan-v1";
export const LANES = ["dev", "userdata"] as const;
export type Lane = (typeof LANES)[number];
export const PROFILE_IDENTITIES = ["omnimind-dev", "omnimind"] as const;
export type ProfileIdentity = (typeof PROFILE_IDENTITIES)[number];
export const PROFILE_ORIGIN = "omnimind://app";
export const LEGACY_DRAFT_KEYS = [
  "omnimind:composer-drafts:v1",
  "omnimind:composer-drafts:v2",
] as const;
export const CURRENT_DRAFT_KEY = "omnimind:composer-drafts:g1";
export const LEGACY_PRODUCT_DATABASE = "product-state-v1.sqlite";
export const LEGACY_SERVICE_DATABASE = "state.sqlite";

export const PRODUCT_FINGERPRINTS = {
  f9c6967fc459e2a4b24c1c0943ffeeaa2a9377917908875d2d90fc17d8c58951: {
    receiptDecoder: "v1-model",
    runtimeActivitySequence: null,
  },
  e0608adb6d6f395baec4b0f7c00e1a292b3d20f5b1711347b66e72f3b8753ea8: {
    receiptDecoder: "v1-model",
    runtimeActivitySequence: "native_sequence",
  },
  a7941de35458444502b8871afaee5aec91a27881cce8d2cb75f5b8a28bafd82d: {
    receiptDecoder: "v1-runtime",
    runtimeActivitySequence: "native_sequence",
  },
  f21e986a59b61d5c09dbf5126a672dc12ea6b4dd3fea4afeaee4fcddd0a02d49: {
    receiptDecoder: "v2",
    runtimeActivitySequence: "engine_sequence",
  },
} as const;

export const SERVICE_FINGERPRINTS = {
  "3b6e18218559ce5d15aa1046aaba662eabdf5d3497396637bce6e67c866626a2": {
    marker: "unmarked",
  },
  "094e117328ae44aac99d822da05560251202c3109f25fdaa8d7e20042b6af220": {
    marker: "selection-v2",
  },
} as const;

export type BlockerCode =
  | "DATABASE_FINGERPRINT_UNKNOWN"
  | "PROTECTED_IDENTITY"
  | "PROTECTED_ACTIVE_PACKAGE_LEASE"
  | "PROTECTED_UNCERTAIN_RUN"
  | "PROTECTED_ATTACHMENT_METADATA"
  | "PROTECTED_CREDENTIAL"
  | "PROTECTED_GLOBAL_CONFIGURATION"
  | "PROTECTED_FACT_UNDECODABLE"
  | "PROTECTED_FACT_CLOSURE_CONTRADICTORY"
  | "PREBASELINE_RESET_REQUIRED"
  | "CURRENT_STATE_CONTRADICTORY"
  | "PACKAGE_STATE_UNKNOWN";

export interface Blocker {
  readonly code: BlockerCode;
  readonly laneOrProfile: string;
  readonly targetKind: string;
}

export interface ProtectedFacts {
  readonly lane: Lane;
  readonly storeKind: "product" | "service";
  readonly activeLeaseCount: number;
  readonly uncertainRunCount: number;
  readonly attachmentMetadataCount: number;
  readonly credentialCount: number;
  readonly identityCount: number;
  readonly globalConfigurationCount: number;
}

export interface TargetPlan {
  readonly kind:
    | "database"
    | "draft-key"
    | "package-stage"
    | "package-tombstone";
  readonly laneOrProfile: string;
  readonly relativePathOrKey: string;
  readonly classification: string;
  readonly action: "none" | "remove";
}

export interface DatabasePlan {
  readonly status: "absent" | "orphan-sidecar" | "classified" | "blocked";
  readonly fingerprint: string | null;
}

export interface LanePlan {
  readonly lane: Lane;
  readonly product: DatabasePlan;
  readonly service: DatabasePlan;
  readonly package: {
    readonly status: string;
    readonly disposableCount: number;
  };
}

export interface ProfilePlan {
  readonly identity: ProfileIdentity;
  readonly origin: typeof PROFILE_ORIGIN;
  readonly v1: "absent" | "present" | "blocked";
  readonly v2: "absent" | "present" | "blocked";
  readonly g1: "absent" | "present" | "blocked";
}

export interface DirectFirstPublicPlan {
  readonly format: typeof PLAN_FORMAT;
  readonly canonicalHome: string;
  readonly quiescence: {
    readonly desktop: "stopped" | "blocked";
    readonly service: "stopped" | "blocked";
    readonly nativeHost: "stopped" | "blocked";
    readonly profiles: "offline" | "blocked";
  };
  readonly lanes: readonly LanePlan[];
  readonly profiles: readonly ProfilePlan[];
  readonly targets: readonly TargetPlan[];
  readonly protectedFacts: readonly ProtectedFacts[];
  readonly blockers: readonly Blocker[];
}

export function canonicalProductHome(): string {
  return Path.join(OS.homedir(), ".omnimind");
}

export function profileRoot(identity: ProfileIdentity): string {
  const home = OS.homedir();
  if (process.platform === "win32") {
    return Path.join(
      process.env.APPDATA || Path.join(home, "AppData", "Roaming"),
      identity,
    );
  }
  if (process.platform === "darwin") {
    return Path.join(home, "Library", "Application Support", identity);
  }
  return Path.join(
    process.env.XDG_CONFIG_HOME || Path.join(home, ".config"),
    identity,
  );
}

export function emptyProtectedFacts(
  lane: Lane,
  storeKind: "product" | "service",
): ProtectedFacts {
  return {
    lane,
    storeKind,
    activeLeaseCount: 0,
    uncertainRunCount: 0,
    attachmentMetadataCount: 0,
    credentialCount: 0,
    identityCount: 0,
    globalConfigurationCount: 0,
  };
}
