import type { DesktopHealthSnapshot } from "@omnimind/contracts";
import { create } from "zustand";

interface SystemHealthState {
  readonly snapshot: DesktopHealthSnapshot | null;
  readonly setSnapshot: (snapshot: DesktopHealthSnapshot) => void;
}

export type ProductHealthSelection = {
  readonly engineId: string;
  readonly nativeEngineId: string;
  readonly catalogReady: boolean;
};

export function canDispatchProductSubmission(
  snapshot: DesktopHealthSnapshot | null,
  selection?: ProductHealthSelection,
): boolean {
  if (snapshot?.service.status !== "ready") return false;
  if (selection && !selection.catalogReady) return false;
  const selectedEngineIsNative = !selection || selection.engineId === selection.nativeEngineId;
  if (!selectedEngineIsNative) return true;
  return snapshot.nativeHost.status === "ready" && snapshot.engineSelection.status === "available";
}

export const useSystemHealthStore = create<SystemHealthState>((set) => ({
  snapshot: null,
  setSnapshot: (snapshot) => set({ snapshot }),
}));
