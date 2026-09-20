/**
 * Copied-adapted from the pinned upstream splash controller recorded in
 * source-adoptions.json. Haros deliberately replaces the upstream
 * allSettled/max-timeout completion with readiness reports from the existing
 * transport, settings, Engine, and Composer owners.
 */

import { createStartupSplashDom } from "./startupSplashDom";

const EXIT_MS = 160;

let active = false;
let shellSettled = false;
let expectsComposer = true;
let focusedComposerTerminal = false;
let finishing = false;
let removeTimer: number | null = null;

function clearTimer(timer: number | null): void {
  if (timer !== null) window.clearTimeout(timer);
}

function isReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function removeSplash(): void {
  clearTimer(removeTimer);
  removeTimer = null;
  document.getElementById("startup-splash")?.remove();
  delete document.documentElement.dataset.startupSplash;
  delete document.documentElement.dataset.startupReady;
  active = false;
}

function finishStartupSplash(): void {
  if (!active || finishing) return;
  finishing = true;
  document.documentElement.dataset.startupReady = "true";
  if (isReducedMotion()) removeSplash();
  else removeTimer = window.setTimeout(removeSplash, EXIT_MS);
}

function maybeFinish(): void {
  if (!shellSettled) return;
  if (expectsComposer && !focusedComposerTerminal) return;
  finishStartupSplash();
}

export function initializeStartupSplash(): void {
  if (active) return;
  active = true;
  shellSettled = false;
  expectsComposer = true;
  focusedComposerTerminal = false;
  finishing = false;

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
  maybeFinish();
}

export function reportFocusedComposerReadiness(terminal: boolean): void {
  if (!active) return;
  focusedComposerTerminal = terminal;
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
