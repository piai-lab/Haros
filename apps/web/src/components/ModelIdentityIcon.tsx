// FILE: ModelIdentityIcon.tsx
// Purpose: Owns model-surface identity resolution without ever falling back to an Engine icon.
// Layer: Shared Web presentation

import type {
  ModelPresentationIdentity,
  EngineSelection,
  OmniMindModelServiceOrigin,
} from "@harnessos/contracts";

import type { EngineModelOption } from "~/providerModelOptions";
import { resolveModelPresentationIdentity } from "~/providerModelOptions";
import { ModelServiceIcon } from "./ModelServiceIcon";

function originFromSource(
  source: ModelPresentationIdentity["source"],
): OmniMindModelServiceOrigin | undefined {
  if (source === "user-configured") return "models_json";
  if (source === "extension") return "extension";
  if (source === "unknown") return "unknown";
  return source === "builtin-catalog" ? "builtin" : undefined;
}

export function resolveModelIdentityPresentation(input: {
  selection: EngineSelection;
  identity?: ModelPresentationIdentity | null;
  descriptor?: EngineModelOption | null;
}) {
  const admittedIdentity =
    input.identity?.model === input.selection.model ? input.identity : undefined;
  const admittedDescriptor =
    input.descriptor?.slug === input.selection.model ? input.descriptor : undefined;
  const identity =
    admittedIdentity ??
    resolveModelPresentationIdentity({
      selection: input.selection,
      ...(admittedDescriptor ? { options: [admittedDescriptor] } : {}),
    });
  const separatorIndex = input.selection.model.indexOf("/");
  const qualifiedServiceId =
    separatorIndex > 0 ? input.selection.model.slice(0, separatorIndex) : undefined;
  const modelId =
    separatorIndex > 0 ? input.selection.model.slice(separatorIndex + 1) : input.selection.model;
  return {
    identity,
    hasAdmittedIdentity: admittedIdentity !== undefined,
    hasAdmittedDescriptor: admittedDescriptor !== undefined,
    serviceId: identity.serviceId ?? qualifiedServiceId ?? "model",
    modelId,
    origin:
      identity.source === "unknown" && !admittedIdentity && !admittedDescriptor
        ? undefined
        : originFromSource(identity.source),
  } as const;
}

export function ModelIdentityIcon({
  selection,
  identity,
  descriptor,
  historical = false,
  className,
}: {
  readonly selection: EngineSelection;
  readonly identity?: ModelPresentationIdentity | null;
  readonly descriptor?: EngineModelOption | null;
  readonly historical?: boolean;
  readonly className?: string;
}) {
  const resolved = resolveModelIdentityPresentation({
    selection,
    ...(identity !== undefined ? { identity } : {}),
    ...(descriptor !== undefined ? { descriptor } : {}),
  });
  return (
    <ModelServiceIcon
      serviceId={resolved.serviceId}
      modelId={resolved.modelId}
      allowModelFamily={
        !historical ||
        resolved.hasAdmittedIdentity ||
        resolved.hasAdmittedDescriptor ||
        selection.model.includes("/")
      }
      {...(resolved.origin ? { origin: resolved.origin } : {})}
      {...(className ? { className } : {})}
    />
  );
}
