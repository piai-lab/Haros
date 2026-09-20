import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  BrowserAutomationErrorMessages,
  BrowserVaultError,
  type BrowserVaultLogin,
  BrowserVaultSettings,
  type BrowserVaultSavePrompt,
  type BrowserVaultSnapshot,
} from "@harnessos/contracts";
import {
  createLocalCredentialVault,
  type CredentialVault,
  type LocalCredentialVault,
} from "betterwright";
import { Schema } from "effect";
import { VaultKeyProtection, type VaultKeyStore } from "./vaultKeyProtection";

export const BROWSER_VAULT_PROMPT_TTL_MS = 120_000;

const Source = Schema.Literals(["user", "agent"]);
const Preferences = Schema.Struct({
  settings: BrowserVaultSettings,
  sources: Schema.Array(Schema.Struct({ id: Schema.String, source: Source })),
});
type Source = typeof Source.Type;
type Payload = Parameters<LocalCredentialVault["handleRequest"]>[1];
type Action = Parameters<LocalCredentialVault["handleRequest"]>[0];
interface PageOrigin {
  getURL(): string;
  isDestroyed(): boolean;
}

/** Owner metadata stays in desktop IPC; only the scoped adapter reaches a worker. */
export class BrowserVault {
  private readonly vault: LocalCredentialVault;
  private ready: Promise<void> | undefined;
  private keyProtection: VaultKeyProtection | undefined;
  private disposed = false;
  private settings: BrowserVaultSettings = { agentUse: true, offerSave: false, autosave: false };
  private readonly sources = new Map<string, Source>();
  private readonly listeners = new Set<(change: { logins: boolean }) => void>();
  private readonly pending = new Map<
    string,
    { prompt: BrowserVaultSavePrompt; resolve(choice: "save" | "dismiss"): void }
  >();
  private writing = Promise.resolve();
  private captureError: string | null = null;

  constructor(
    private readonly home: string,
    private readonly keyStore?: VaultKeyStore,
  ) {
    if (
      ["key-protection.json", "vault.key", "vault.enc"].some((name) =>
        existsSync(join(home, "vault", name)),
      )
    ) {
      this.keyProtection = new VaultKeyProtection(join(home, "vault"), keyStore);
    }
    this.vault = createLocalCredentialVault({ home, keyProvider: () => this.keys.provide() });
    // Construction must not leak an unhandled rejection; a later explicit read can retry.
    void this.ensureReady().catch(() => {});
  }

  private ensureReady(): Promise<void> {
    return (this.ready ??= this.load().catch((error) => {
      this.ready = undefined;
      throw error;
    }));
  }

  private get keys(): VaultKeyProtection {
    if (this.disposed) throw new Error("Vault closed.");
    // Opening an empty app must not prompt for Keychain access before saving is enabled.
    return (this.keyProtection ??= new VaultKeyProtection(join(this.home, "vault"), this.keyStore));
  }

  private async load(): Promise<void> {
    let text: string;
    try {
      text = await readFile(join(this.home, "preferences.json"), "utf8");
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return;
      throw new BrowserVaultError("storage_failed");
    }
    let preferences: typeof Preferences.Type;
    try {
      preferences = Schema.decodeUnknownSync(Preferences)(JSON.parse(text));
    } catch {
      throw new BrowserVaultError("storage_failed");
    }
    this.settings = preferences.settings;
    for (const entry of preferences.sources) this.sources.set(entry.id, entry.source);
  }

  private persist(settings?: BrowserVaultSettings): Promise<void> {
    const write = async () => {
      const text = JSON.stringify({
        settings: settings ?? this.settings,
        sources: [...this.sources].map(([id, source]) => ({ id, source })),
      });
      await mkdir(this.home, { recursive: true, mode: 0o700 });
      const temporary = join(this.home, `preferences-${randomUUID()}.tmp`);
      try {
        await writeFile(temporary, text, { mode: 0o600, flag: "wx", flush: true });
        await rename(temporary, join(this.home, "preferences.json"));
        if (settings) this.settings = settings;
      } finally {
        await unlink(temporary).catch(() => {});
      }
    };
    const operation = this.writing.then(write).catch(() => {
      throw new BrowserVaultError("storage_failed");
    });
    this.writing = operation.catch(() => {});
    return operation;
  }

  private changed(logins = true): void {
    for (const listener of this.listeners) {
      try {
        listener({ logins });
      } catch {
        /* A closed renderer cannot block vault writes. */
      }
    }
  }

  onChanged(listener: (change: { logins: boolean }) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async snapshot(): Promise<BrowserVaultSnapshot> {
    await this.ensureReady();
    const protection = (await this.keyProtection?.status()) ?? {
      configured: false,
      locked: true,
      osProtected: false,
    };
    return this.vault.redact({
      protection,
      settings: this.settings,
      pending: [...this.pending.values()].map(({ prompt }) => prompt),
      error: this.captureError,
    } satisfies BrowserVaultSnapshot);
  }

  async listLogins(): Promise<BrowserVaultLogin[]> {
    const { protection } = await this.snapshot();
    if (protection.locked) return [];
    const { credentials, pendingCredentials } = await this.vault.ownerList({ category: "login" });
    // Lock/dispose may race a disk read. Do not publish a stale unlocked result.
    if (this.disposed || (await this.snapshot()).protection.locked) return [];
    return this.vault.redact([
      ...credentials.map(({ id, origin, username, label, updatedAt }) => ({
        id,
        origin,
        username,
        label,
        updatedAt,
        status: "saved" as const,
        source: this.sources.get(id) ?? ("unknown" as const),
      })),
      ...pendingCredentials.map(({ pendingId, origin, username, label, createdAt, expired }) => ({
        id: pendingId,
        origin,
        username,
        label,
        updatedAt: createdAt,
        status: expired ? ("expired" as const) : ("pending" as const),
        source: this.sources.get(pendingId) ?? ("unknown" as const),
      })),
    ]);
  }

  async setupMaster(password: string): Promise<void> {
    await this.ensureReady();
    await this.keys.setup(password);
    this.changed();
  }

  async unlock(password: string): Promise<void> {
    await this.keys.authenticate(password);
    this.changed();
  }

  async lock(): Promise<void> {
    await this.keys.lock();
    this.dismissPrompts();
    this.changed();
  }

  async reveal(input: {
    id: string;
    password: string;
  }): Promise<{ password: string; expiresAt: number }> {
    await this.ensureReady();
    await this.keys.authenticate(input.password);
    const record = await this.vault.ownerReveal(input.id);
    if (this.disposed || (await this.keys.status()).locked) throw new BrowserVaultError("locked");
    if (record.category !== "login" || record.secret == null)
      throw new Error("No saved password exists for this login.");
    this.vault.trackRedactionSecret(record.secret);
    return { password: record.secret, expiresAt: Date.now() + 20_000 };
  }

  async configure(input: BrowserVaultSettings): Promise<void> {
    await this.ensureReady();
    const settings = Schema.decodeUnknownSync(BrowserVaultSettings)(input);
    if (settings.autosave && !settings.offerSave)
      throw new Error("Enable password saving before autosave.");
    await this.persist(settings);
    if (settings.offerSave) await this.keys.status();
    if (!settings.offerSave) this.dismissPrompts();
    this.changed(false);
  }

  async remove(id: string): Promise<void> {
    await this.ensureReady();
    await this.vault.ownerRemove(id);
    this.sources.delete(id);
    await this.persist();
    this.changed();
  }

  private async request(action: Action, payload: Payload, origin: string, source: Source) {
    const result = await this.vault.handleRequest(
      action,
      { ...payload, matchMode: "exact-origin" },
      origin,
    );
    if (
      ["save", "update", "commit"].includes(action) &&
      result &&
      typeof result === "object" &&
      "id" in result &&
      typeof result.id === "string"
    ) {
      this.sources.set(result.id, source);
      try {
        await this.persist();
      } catch (error) {
        // The password is already durably saved. Removing it is not rollback:
        // an upsert may have replaced an existing login. Retain the password
        // and in-memory provenance so a later successful write can persist it.
        this.changed();
        throw error;
      }
    }
    if (
      action === "generate" &&
      result &&
      typeof result === "object" &&
      "pendingId" in result &&
      typeof result.pendingId === "string"
    ) {
      this.sources.set(result.pendingId, source);
      await this.persist();
    }
    if (!["list", "list-pending", "fill"].includes(action)) this.changed();
    return result;
  }

  agentAdapter(page: PageOrigin, signal: AbortSignal): CredentialVault {
    const assertOrigin = (origin: string) => {
      signal.throwIfAborted();
      if (!this.settings.agentUse || page.isDestroyed())
        throw new Error("Saved login use is unavailable.");
      const current = new URL(page.getURL());
      if (!["https:", "http:"].includes(current.protocol) || current.origin !== origin)
        throw new Error("Saved login does not match this page origin.");
    };
    return {
      handleRequest: async (action, payload, origin) => {
        await this.ensureReady();
        assertOrigin(origin);
        // Agent code can read and transform anything filled into its page, even
        // across worker restarts. Never give this adapter a secret-bearing action.
        if (action !== "list" && action !== "list-pending") {
          throw new Error(BrowserAutomationErrorMessages.BrowserCredentialUseUnavailable);
        }
        const result = await this.request(action, payload, origin, "agent");
        assertOrigin(origin);
        return result;
      },
      redact: (value) => this.vault.redact(value),
      // Deliberately no resetRedactionSecrets: the user-owned page outlives workers.
    };
  }

  redact<T>(value: T): T {
    return this.vault.redact(value);
  }

  trackSecret(secret: string): void {
    this.vault.trackRedactionSecret(secret);
  }

  async shouldOfferSave(input: {
    origin: string;
    username: string;
    password: string;
  }): Promise<boolean> {
    await this.ensureReady();
    if (!this.settings.offerSave || (await this.keys.status()).locked) return false;
    const { credentials } = await this.vault.ownerList({ category: "login" });
    const existing = credentials.find(
      (entry) => entry.origin === input.origin && entry.username === input.username,
    );
    if (!existing) return true;
    const filled = await this.vault.handleRequest("fill", { id: existing.id }, input.origin);
    return !(
      filled &&
      typeof filled === "object" &&
      "secret" in filled &&
      filled.secret === input.password
    );
  }

  reportCaptureFailure(): void {
    if (this.captureError) return;
    this.captureError = "capture_failed";
    this.changed(false);
  }

  reportCaptureReady(): void {
    if (!this.captureError) return;
    this.captureError = null;
    this.changed(false);
  }

  async saveCaptured(
    origin: string,
    payload: Payload,
    source: Source,
    isCurrent: () => boolean = () => true,
  ): Promise<void> {
    await this.ensureReady();
    if (
      this.disposed ||
      !this.settings.offerSave ||
      (await this.keys.status()).locked ||
      !isCurrent()
    )
      return;
    await this.request("save", payload, origin, source);
  }

  async askSave(input: Omit<BrowserVaultSavePrompt, "id">): Promise<"save" | "dismiss"> {
    await this.ensureReady();
    if (this.disposed || !this.settings.offerSave) return "dismiss";
    const protection = await this.keys.status();
    // Capture callbacks can outlive a lock, consent change, or application close.
    if (this.disposed || !this.settings.offerSave || protection.locked) return "dismiss";
    if (this.settings.autosave) return "save";
    if (this.pending.size >= 8) return "dismiss";
    const id = randomUUID();
    return new Promise((resolve) => {
      const timer = setTimeout(
        () => this.respond({ id, save: false }),
        BROWSER_VAULT_PROMPT_TTL_MS,
      );
      this.pending.set(id, {
        prompt: { ...input, id },
        resolve: (choice) => {
          clearTimeout(timer);
          resolve(choice);
        },
      });
      this.changed(false);
    });
  }

  respond(input: { id: string; save: boolean }): void {
    const pending = this.pending.get(input.id);
    if (!pending) return;
    this.pending.delete(input.id);
    pending.resolve(input.save && this.settings.offerSave ? "save" : "dismiss");
    this.changed(false);
  }

  dismissPagePrompts(threadId: string, tabId: string): void {
    for (const { prompt } of this.pending.values()) {
      if (prompt.threadId === threadId && prompt.tabId === tabId)
        this.respond({ id: prompt.id, save: false });
    }
  }

  private dismissPrompts(): void {
    for (const id of this.pending.keys()) this.respond({ id, save: false });
  }

  dispose(): void {
    this.disposed = true;
    this.keyProtection?.dispose();
    this.dismissPrompts();
    this.listeners.clear();
  }
}
