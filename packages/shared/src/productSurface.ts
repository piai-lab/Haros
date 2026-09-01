import type { EngineSessionAdmission, EngineWorkSurface, ProjectKind } from "@harnessos/contracts";

/**
 * Product-facing workspaces are derived from the authoritative Project kind.
 * This value is deliberately not persisted as engine runtime state.
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

/** Engine execution/trust remains a narrower two-surface contract. */
export function productSurfaceToEngineWorkSurface(surface: ProductSurface): EngineWorkSurface {
  return surface === "agent" ? "agent" : "chat";
}

export function projectKindToEngineWorkSurface(kind: ProjectKind | undefined): EngineWorkSurface {
  return productSurfaceToEngineWorkSurface(projectKindToProductSurface(kind));
}

/** Derive the complete Engine admission once from authoritative Product truth. */
export function projectKindToEngineSessionAdmission(
  kind: ProjectKind | undefined,
  workspaceRoot: string,
): EngineSessionAdmission {
  const productSurface = projectKindToProductSurface(kind);
  if (productSurface === "agent") {
    return {
      productSurface,
      workSurface: "agent",
      projectContextRoot: workspaceRoot,
    };
  }
  return {
    productSurface,
    workSurface: "chat",
    projectContextRoot: null,
  };
}
