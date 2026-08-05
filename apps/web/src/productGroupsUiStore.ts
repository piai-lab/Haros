import type { ProductGroupId } from "@omnimind/contracts";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const PRODUCT_GROUPS_UI_STORAGE_KEY = "omnimind:product-groups-ui:v1";

interface ProductGroupsUiStore {
  readonly projectsDisclosureExpanded: boolean;
  readonly groupsDisclosureExpanded: boolean;
  readonly expandedGroupIds: ReadonlyArray<string>;
  toggleProjectsDisclosure: () => void;
  toggleGroupsDisclosure: () => void;
  toggleGroup: (groupId: ProductGroupId) => void;
  expandGroup: (groupId: ProductGroupId) => void;
}

function sanitizeExpandedGroupIds(value: unknown): ReadonlyArray<string> {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((candidate): candidate is string => typeof candidate === "string"))];
}

/** Local presentation preferences only; Product Group membership remains native Product fact. */
export const useProductGroupsUiStore = create<ProductGroupsUiStore>()(
  persist(
    (set) => ({
      projectsDisclosureExpanded: true,
      groupsDisclosureExpanded: true,
      expandedGroupIds: [],
      toggleProjectsDisclosure: () =>
        set((state) => ({ projectsDisclosureExpanded: !state.projectsDisclosureExpanded })),
      toggleGroupsDisclosure: () =>
        set((state) => ({ groupsDisclosureExpanded: !state.groupsDisclosureExpanded })),
      toggleGroup: (groupId) =>
        set((state) => ({
          expandedGroupIds: state.expandedGroupIds.includes(groupId)
            ? state.expandedGroupIds.filter((candidate) => candidate !== groupId)
            : [...state.expandedGroupIds, groupId],
        })),
      expandGroup: (groupId) =>
        set((state) =>
          state.expandedGroupIds.includes(groupId)
            ? {}
            : { expandedGroupIds: [...state.expandedGroupIds, groupId] },
        ),
    }),
    {
      name: PRODUCT_GROUPS_UI_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const value = persisted as Partial<ProductGroupsUiStore> | undefined;
        return {
          ...current,
          projectsDisclosureExpanded:
            typeof value?.projectsDisclosureExpanded === "boolean"
              ? value.projectsDisclosureExpanded
              : true,
          groupsDisclosureExpanded:
            typeof value?.groupsDisclosureExpanded === "boolean"
              ? value.groupsDisclosureExpanded
              : true,
          expandedGroupIds: sanitizeExpandedGroupIds(value?.expandedGroupIds),
        };
      },
      partialize: (state) => ({
        projectsDisclosureExpanded: state.projectsDisclosureExpanded,
        groupsDisclosureExpanded: state.groupsDisclosureExpanded,
        expandedGroupIds: state.expandedGroupIds,
      }),
    },
  ),
);
