import type { DesktopHealthSnapshot } from "@omnimind/contracts";
import { create } from "zustand";

interface SystemHealthState {
  readonly snapshot: DesktopHealthSnapshot | null;
  readonly setSnapshot: (snapshot: DesktopHealthSnapshot) => void;
}

export function canDispatchProductSubmission(snapshot: DesktopHealthSnapshot | null): boolean {
  return (
    snapshot?.service.status === "ready" &&
    snapshot.nativeHost.status === "ready" &&
    snapshot.engineSelection.status === "available"
  );
}

export const useSystemHealthStore = create<SystemHealthState>((set) => ({
  snapshot: null,
  setSnapshot: (snapshot) => set({ snapshot }),
}));
