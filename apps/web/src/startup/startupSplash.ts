/**
 * Copied-adapted from Percho splash.ts at
 * 575216c2690c7e2b30d9ad10b773f424b469c163 (MIT).
 * HarnessOS deliberately replaces donor allSettled/max-timeout completion with
 * readiness reports from the existing transport, settings, Engine, and Composer owners.
 */

import { createStartupSplashDom } from "./startupSplashDom";

const FULL_MIN_DISPLAY_MS = 1_400;
const FULL_EXIT_MS = 1_100;
const REDUCED_MIN_DISPLAY_MS = 300;
const REDUCED_EXIT_MS = 220;

let active = false;
let shellSettled = false;
let expectsComposer = true;
let focusedComposerTerminal = false;
let finishing = false;
let startedAt = 0;
let finishTimer: number | null = null;
let removeTimer: number | null = null;

function clearTimer(timer: number | null): void {
  if (timer !== null) window.clearTimeout(timer);
}

function isReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function removeSplash(): void {
  clearTimer(finishTimer);
  clearTimer(removeTimer);
  finishTimer = null;
  removeTimer = null;
  document.getElementById("startup-splash")?.remove();
  delete document.documentElement.dataset.startupSplash;
  delete document.documentElement.dataset.startupReady;
  active = false;
}

function finishStartupSplash(): void {
  if (!active || finishing) return;
  finishing = true;
  const reduced = isReducedMotion();
  const minimum = reduced ? REDUCED_MIN_DISPLAY_MS : FULL_MIN_DISPLAY_MS;
  const wait = Math.max(0, minimum - (performance.now() - startedAt));
  finishTimer = window.setTimeout(() => {
    document.documentElement.dataset.startupReady = "true";
    const exitMs = reduced ? REDUCED_EXIT_MS : FULL_EXIT_MS;
    removeTimer = window.setTimeout(removeSplash, exitMs);
  }, wait);
}

function maybeFinish(): void {
  if (!shellSettled) return;
  if (expectsComposer && !focusedComposerTerminal) return;
  finishStartupSplash();
}

function cancelPendingFinishIfReadinessRegressed(): void {
  if (!finishing || document.documentElement.dataset.startupReady === "true") return;
  const ready = shellSettled && (!expectsComposer || focusedComposerTerminal);
  if (ready) return;
  clearTimer(finishTimer);
  finishTimer = null;
  finishing = false;
}

export function initializeStartupSplash(): void {
  if (active) return;
  active = true;
  shellSettled = false;
  expectsComposer = true;
  focusedComposerTerminal = false;
  finishing = false;
  startedAt = performance.now();

  document.documentElement.dataset.startupSplash = "active";
  createStartupSplashDom();
}

export function reportStartupShellReadiness(input: {
  readonly settled: boolean;
  readonly expectsComposer: boolean;
}): void {
  if (!active) return;
  shellSettled = input.settled;
  expectsComposer = input.expectsComposer;
  cancelPendingFinishIfReadinessRegressed();
  maybeFinish();
}

export function reportFocusedComposerReadiness(terminal: boolean): void {
  if (!active) return;
  focusedComposerTerminal = terminal;
  cancelPendingFinishIfReadinessRegressed();
  maybeFinish();
}

export function finishStartupSplashForRecovery(): void {
  if (!active) return;
  shellSettled = true;
  expectsComposer = false;
  maybeFinish();
}

export function dismissStartupSplashImmediately(): void {
  if (!active) return;
  document.documentElement.dataset.startupReady = "true";
  removeSplash();
}

export function isStartupSplashActive(): boolean {
  return active;
}
