import { useQuery } from "@tanstack/react-query";
import { Schema } from "effect";
import { useEffect, useRef, useState } from "react";

import { useLocalStorage } from "../hooks/useLocalStorage";
import { isFolderBackedProject } from "../lib/projectClassification";
import { serverConfigQueryOptions } from "../lib/serverReactQuery";
import { useServerSettings } from "../serverSettings";
import { useStore } from "../store";
import { useWorkspacePathsStore } from "../workspacePathsStore";
import {
  resolveLocalOnboardingCompletion,
  resolveOnboardingCompletionToReconcile,
  resolveOnboardingGate,
  type LocalOnboardingCompletion,
} from "./logic";
import { useOnboardingDialogStore } from "./onboardingDialogStore";

const ONBOARDING_STORAGE_KEY = "harnessos:onboarding:v2";

const OnboardingStorageSchema = Schema.Struct({
  completedAt: Schema.NullOr(Schema.String),
  installationKey: Schema.NullOr(Schema.String),
});

const INITIAL_STORAGE: LocalOnboardingCompletion = { completedAt: null, installationKey: null };

export interface UseOnboardingResult {
  readonly isOpen: boolean;
  readonly complete: () => void;
  readonly onOpenChange: (open: boolean) => void;
}

export function useOnboarding(): UseOnboardingResult {
  const [storage, setStorage] = useLocalStorage(
    ONBOARDING_STORAGE_KEY,
    INITIAL_STORAGE,
    OnboardingStorageSchema,
  );
  const [sessionCompletion, setSessionCompletion] =
    useState<LocalOnboardingCompletion>(INITIAL_STORAGE);
  const { query: settingsQuery, updateServerSettings } = useServerSettings();
  const installationKeyQuery = useQuery({
    ...serverConfigQueryOptions(),
    select: (config) => config.worktreesDir,
  });
  const installationKey = installationKeyQuery.data ?? null;
  useEffect(() => {
    if (
      installationKey !== null &&
      sessionCompletion.completedAt !== null &&
      sessionCompletion.installationKey === null
    ) {
      setSessionCompletion({ ...sessionCompletion, installationKey });
    }
  }, [installationKey, sessionCompletion]);
  const sessionCompletedAt =
    sessionCompletion.installationKey === null
      ? sessionCompletion.completedAt
      : resolveLocalOnboardingCompletion(sessionCompletion, installationKey);
  const threadsHydrated = useStore((store) => store.threadsHydrated);
  const homeDir = useWorkspacePathsStore((store) => store.homeDir);
  const chatWorkspaceRoot = useWorkspacePathsStore((store) => store.chatWorkspaceRoot);
  const studioWorkspaceRoot = useWorkspacePathsStore((store) => store.studioWorkspaceRoot);
  const projectCount = useStore(
    (store) =>
      store.projects.filter((project) =>
        isFolderBackedProject(project, { homeDir, chatWorkspaceRoot, studioWorkspaceRoot }),
      ).length,
  );
  const isOpen = useOnboardingDialogStore((store) => store.isOpen);
  const openReason = useOnboardingDialogStore((store) => store.openReason);
  const engaged = useOnboardingDialogStore((store) => store.engaged);
  const openStore = useOnboardingDialogStore((store) => store.open);
  const closeStore = useOnboardingDialogStore((store) => store.close);
  const markStartupGateSettled = useOnboardingDialogStore((store) => store.markStartupGateSettled);

  const settingsSettled = settingsQuery.isSuccess || settingsQuery.isError;
  const settingsAvailable = settingsQuery.isSuccess;
  const serverCompletedAt = settingsQuery.data?.onboardingCompletedAt ?? null;
  const localCompletedAt = resolveLocalOnboardingCompletion(storage, installationKey);

  const gate = resolveOnboardingGate({
    installationKeyStatus: installationKey !== null ? "success" : installationKeyQuery.status,
    threadsHydrated,
    settingsSettled,
    projectCount,
    serverCompletedAt,
    localCompletedAt: localCompletedAt ?? sessionCompletedAt,
  });

  useEffect(() => {
    if (gate === "pending") return;
    markStartupGateSettled();
    if (gate === "show" && !isOpen) {
      openStore("first-run");
      return;
    }
    if (gate === "hidden" && isOpen && openReason === "first-run" && !engaged) {
      closeStore();
    }
  }, [closeStore, engaged, gate, isOpen, markStartupGateSettled, openReason, openStore]);

  const reconcileAttemptedRef = useRef(false);
  const completedAtToReconcile = resolveOnboardingCompletionToReconcile({
    threadsHydrated,
    settingsAvailable,
    projectCount,
    serverCompletedAt,
    localCompletedAt,
    now: new Date().toISOString(),
  });
  useEffect(() => {
    if (completedAtToReconcile === null || reconcileAttemptedRef.current) {
      return;
    }
    reconcileAttemptedRef.current = true;
    void updateServerSettings({ onboardingCompletedAt: completedAtToReconcile });
  }, [completedAtToReconcile, updateServerSettings]);

  const complete = () => {
    const replay = useOnboardingDialogStore.getState().openReason === "replay";
    closeStore();
    if (replay) return;
    const completedAt = new Date().toISOString();
    setSessionCompletion({ completedAt, installationKey });
    if (installationKey !== null) {
      setStorage({ completedAt, installationKey });
    }
    if (serverCompletedAt === null) {
      void updateServerSettings({ onboardingCompletedAt: completedAt });
    }
  };

  const onOpenChange = (open: boolean) => {
    if (!open) {
      complete();
    }
  };

  return {
    isOpen,
    complete,
    onOpenChange,
  };
}
