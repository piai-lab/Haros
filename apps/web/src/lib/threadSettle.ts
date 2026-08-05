export interface OptimisticSettledMutation {
  readonly desiredSettled: boolean;
  readonly commandSequence: number | null;
  readonly observedDifferentState: boolean;
}

export function createOptimisticSettledMutation(input: {
  desiredSettled: boolean;
  serverSettledAtDispatch: boolean;
}): OptimisticSettledMutation {
  return {
    desiredSettled: input.desiredSettled,
    commandSequence: null,
    observedDifferentState: input.serverSettledAtDispatch !== input.desiredSettled,
  };
}

export function recordOptimisticSettledMutationSequence(
  mutation: OptimisticSettledMutation,
  commandSequence: number,
): OptimisticSettledMutation {
  return mutation.commandSequence === commandSequence
    ? mutation
    : { ...mutation, commandSequence };
}

export function reconcileOptimisticSettledMutation(
  mutation: OptimisticSettledMutation,
  serverSettled: boolean,
  projectionSequence = 0,
): { acknowledged: boolean; mutation: OptimisticSettledMutation } {
  if (mutation.commandSequence !== null && projectionSequence >= mutation.commandSequence) {
    return { acknowledged: true, mutation };
  }
  if (serverSettled === mutation.desiredSettled) {
    return { acknowledged: mutation.observedDifferentState, mutation };
  }
  if (mutation.observedDifferentState) return { acknowledged: false, mutation };
  return {
    acknowledged: false,
    mutation: { ...mutation, observedDifferentState: true },
  };
}
