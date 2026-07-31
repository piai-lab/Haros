const GENERATION_ID_PATTERN = /^[a-f0-9]{64}$/;

function requireGenerationId(generationId) {
  if (!GENERATION_ID_PATTERN.test(generationId)) {
    throw new Error("generation id must be a lowercase SHA-256 value");
  }
}

export async function activateGeneration({ journal, generationId, previousGenerationId = null }) {
  requireGenerationId(generationId);
  if (previousGenerationId !== null) requireGenerationId(previousGenerationId);
  await journal.append({
    type: "generation_activated",
    generationId,
    previousGenerationId,
  });
}

export async function pinLastKnownGeneration({
  journal,
  failedGenerationId,
  lastKnownGenerationId,
  reason,
}) {
  requireGenerationId(failedGenerationId);
  requireGenerationId(lastKnownGenerationId);
  await journal.append({
    type: "generation_pinned",
    generationId: lastKnownGenerationId,
    failedGenerationId,
    reason,
  });
  await journal.append({
    type: "extension_projection_unloaded",
    generationId: failedGenerationId,
    reason,
  });
}
