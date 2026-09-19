import { create } from "zustand";

export type OnboardingOpenReason = "first-run" | "replay";

interface OnboardingDialogStore {
  isOpen: boolean;
  startupGateSettled: boolean;
  openReason: OnboardingOpenReason | null;
  engaged: boolean;
  open: (reason: OnboardingOpenReason) => void;
  openDialog: () => void;
  close: () => void;
  markEngaged: () => void;
  markStartupGateSettled: () => void;
}

export const useOnboardingDialogStore = create<OnboardingDialogStore>((set) => ({
  isOpen: false,
  startupGateSettled: false,
  openReason: null,
  engaged: false,
  open: (reason) => set({ isOpen: true, openReason: reason, engaged: false }),
  openDialog: () => set({ isOpen: true, openReason: "replay", engaged: false }),
  close: () => set({ isOpen: false, openReason: null, engaged: false }),
  markEngaged: () => set({ engaged: true }),
  markStartupGateSettled: () => set({ startupGateSettled: true }),
}));
