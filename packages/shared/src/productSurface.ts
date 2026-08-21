import type { ProjectKind, ProviderWorkSurface } from "@omnimind/contracts";

/**
 * Product-facing workspaces are derived from the authoritative Project kind.
 * This value is deliberately not persisted as provider runtime state.
 */
export type ProductSurface = "agent" | "chat" | "studio";

export function projectKindToProductSurface(kind: ProjectKind | undefined): ProductSurface {
  switch (kind) {
    // Legacy projected shells predate Project.kind; their only valid meaning is Project.
    case undefined:
    case "project":
      return "agent";
    case "chat":
      return "chat";
    case "studio":
      return "studio";
  }
}

/** Provider execution/trust remains a narrower two-surface contract. */
export function productSurfaceToProviderWorkSurface(surface: ProductSurface): ProviderWorkSurface {
  return surface === "agent" ? "agent" : "chat";
}

export function projectKindToProviderWorkSurface(
  kind: ProjectKind | undefined,
): ProviderWorkSurface {
  return productSurfaceToProviderWorkSurface(projectKindToProductSurface(kind));
}
