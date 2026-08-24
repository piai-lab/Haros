// FILE: pairingBootstrap.ts
// Purpose: Exchanges one-time remote pairing links before the application opens a WebSocket.

import {
  resolveStartupSurfaceLocale,
  STARTUP_SURFACE_THEME_STYLE,
  type StartupSurfaceLocale,
} from "./startupSurface";

const PAIRING_PATH = "/pair";

interface PairingLocation {
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
  replace(url: string): void;
}

interface PairingHistory {
  replaceState(data: unknown, unused: string, url?: string | URL | null): void;
}

interface PairingBootstrapDependencies {
  readonly location: PairingLocation;
  readonly history: PairingHistory;
  readonly fetch: typeof globalThis.fetch;
  readonly renderFailure: () => void;
}

export type PairingBootstrapResult = "not-pairing" | "redirecting" | "failed";

export function createPairingFailureMarkup(locale: StartupSurfaceLocale = "en"): string {
  const copy =
    locale === "zh-CN"
      ? {
          eyebrow: "安全配对已中断",
          title: "此配对链接无法使用",
          message: "链接可能不完整、已过期或已被使用。请从 OmniMind Server 生成新的配对链接后重试。",
        }
      : {
          eyebrow: "Secure pairing interrupted",
          title: "This pairing link could not be used.",
          message:
            "The link may be incomplete, expired, or already used. Generate a new pairing link from the OmniMind server and try again.",
        };
  return `
    ${STARTUP_SURFACE_THEME_STYLE}
    <main role="alert" aria-live="assertive" style="min-height:100vh;box-sizing:border-box;display:grid;place-items:center;padding:32px;background:var(--startup-canvas);color:var(--startup-text);font-family:'DM Sans',sans-serif">
      <section style="width:min(100%,520px);border:1px solid var(--startup-border);background:var(--startup-surface);padding:clamp(28px,6vw,52px);box-shadow:12px 12px 0 var(--startup-shadow)">
        <p style="margin:0 0 22px;color:var(--startup-accent);font:600 12px/1.2 'Geist Mono',monospace;letter-spacing:.16em;text-transform:uppercase">${copy.eyebrow}</p>
        <h1 tabindex="-1" style="margin:0;color:var(--startup-text);font-size:clamp(32px,7vw,52px);font-weight:600;line-height:.98;letter-spacing:-.045em">${copy.title}</h1>
        <p style="margin:24px 0 0;color:var(--startup-muted);font-size:16px;line-height:1.6">${copy.message}</p>
      </section>
    </main>`;
}

function renderPairingFailure(): void {
  const root = document.getElementById("root");
  if (!root) return;

  const locale = resolveStartupSurfaceLocale(navigator.languages ?? [navigator.language]);
  document.documentElement.lang = locale;
  document.title = locale === "zh-CN" ? "配对失败 · OmniMind" : "Pairing failed · OmniMind";
  root.innerHTML = createPairingFailureMarkup(locale);
  root.querySelector<HTMLElement>("h1")?.focus();
}

export async function bootstrapPairingSession(
  dependencies: PairingBootstrapDependencies = {
    location: window.location,
    history: window.history,
    fetch: globalThis.fetch,
    renderFailure: renderPairingFailure,
  },
): Promise<PairingBootstrapResult> {
  if (dependencies.location.pathname !== PAIRING_PATH) {
    return "not-pairing";
  }

  const credential = new URLSearchParams(dependencies.location.hash.slice(1)).get("token");
  dependencies.history.replaceState(
    null,
    "",
    `${dependencies.location.pathname}${dependencies.location.search}`,
  );

  if (!credential) {
    dependencies.renderFailure();
    return "failed";
  }

  try {
    const response = await dependencies.fetch("/api/auth/bootstrap", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });
    if (!response.ok) {
      dependencies.renderFailure();
      return "failed";
    }
  } catch {
    dependencies.renderFailure();
    return "failed";
  }

  dependencies.location.replace("/");
  return "redirecting";
}
