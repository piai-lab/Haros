import {
  type BrowserAutomationError,
  type BrowserAutomationErrorInput,
  type BrowserMcpToolErrorEnvelope,
} from "@harnessos/contracts";
import { makeBrowserMcpToolErrorEnvelope } from "@harnessos/shared/browserAutomationErrors";

export class BrowserAutomationHostError extends Error {
  readonly envelope: BrowserMcpToolErrorEnvelope;

  constructor(input: BrowserAutomationErrorInput) {
    const envelope = makeBrowserMcpToolErrorEnvelope(input);
    super(envelope.error.message);
    this.name = "BrowserAutomationHostError";
    this.envelope = envelope;
  }

  get browserError(): BrowserAutomationError {
    return this.envelope.error;
  }
}

export function browserHostError(input: BrowserAutomationErrorInput): never {
  throw new BrowserAutomationHostError(input);
}

export const asBrowserAutomationHostError = (
  error: unknown,
  fallback: BrowserAutomationErrorInput,
): BrowserAutomationHostError =>
  error instanceof BrowserAutomationHostError ? error : new BrowserAutomationHostError(fallback);
