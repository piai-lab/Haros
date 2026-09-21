import { create } from "zustand";

// Shared entry point for the sidebar and the empty Agent surface.
export const useProjectDialogStore = create<{
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}>((set) => ({
  isOpen: false,
  setOpen: (isOpen) => set({ isOpen }),
}));
