// FILE: useUsageHistory.ts
// Purpose: Query the DB-backed history projection and expose explicit user commands.

import type {
  ServerCommandUsageHistoryInput,
  UsageHistoryGroupBy,
  UsageHistoryRange,
} from "@harnessos/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { serverQueryKeys, serverUsageHistoryQueryOptions } from "~/lib/serverReactQuery";
import { ensureNativeApi } from "~/nativeApi";

export function useUsageHistory(input: { range: UsageHistoryRange; groupBy: UsageHistoryGroupBy }) {
  const queryClient = useQueryClient();
  const query = useQuery(serverUsageHistoryQueryOptions(input));
  const command = useMutation({
    mutationFn: async (commandInput: ServerCommandUsageHistoryInput) => {
      const api = ensureNativeApi();
      return api.server.commandUsageHistory(commandInput);
    },
    onSuccess: (result) => {
      queryClient.setQueryData(serverQueryKeys.usageHistory(input.range, input.groupBy), result);
      void queryClient.invalidateQueries({ queryKey: serverQueryKeys.usageHistoryAll() });
    },
  });
  return { query, command } as const;
}
