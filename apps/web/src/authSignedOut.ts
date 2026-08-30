// FILE: authSignedOut.ts
// Purpose: Replaces authenticated application state after the current browser session logs out.

import {
  resolveStartupSurfaceLocale,
  STARTUP_SURFACE_THEME_STYLE,
  type StartupSurfaceLocale,
} from "./startupSurface";

export const AUTH_SIGNED_OUT_PATH = "/signed-out";

export function createSignedOutMarkup(locale: StartupSurfaceLocale = "en"): string {
  const copy =
    locale === "zh-CN"
      ? {
          eyebrow: "会话已关闭",
          title: "此浏览器已不再控制 Haros",
          message:
            "会话和实时连接已撤销。如需重新连接，请从仍然有效的所有者会话生成新的配对链接，并在此浏览器中打开。",
        }
      : {
          eyebrow: "Session closed",
          title: "This browser no longer controls Haros.",
          message:
            "The session and its live connections were revoked. To reconnect, generate a fresh pairing link from an active owner session and open it in this browser.",
        };
  return `
    ${STARTUP_SURFACE_THEME_STYLE}
    <main aria-labelledby="signed-out-title" style="min-height:100vh;box-sizing:border-box;display:grid;place-items:center;padding:32px;background:var(--startup-canvas);color:var(--startup-text);font-family:'DM Sans',sans-serif">
      <section style="position:relative;width:min(100%,560px);overflow:hidden;border:1px solid var(--startup-border);background:var(--startup-surface);padding:clamp(30px,6vw,56px);box-shadow:12px 12px 0 var(--startup-shadow)">
        <div aria-hidden="true" style="position:absolute;inset:0 0 auto auto;width:128px;height:8px;background:var(--startup-accent)"></div>
        <p style="margin:0 0 22px;color:var(--startup-accent);font:600 12px/1.2 'JetBrains Mono',monospace;letter-spacing:.16em;text-transform:uppercase">${copy.eyebrow}</p>
        <h1 id="signed-out-title" tabindex="-1" style="max-width:470px;margin:0;color:var(--startup-text);font-size:clamp(36px,7vw,58px);font-weight:600;line-height:.96;letter-spacing:-.05em">${copy.title}</h1>
        <p style="max-width:440px;margin:26px 0 0;color:var(--startup-muted);font-size:16px;line-height:1.65">${copy.message}</p>
      </section>
    </main>`;
}

function renderSignedOutScreen(): void {
  const root = document.getElementById("root");
  if (!root) return;

  const locale = resolveStartupSurfaceLocale(navigator.languages ?? [navigator.language]);
  document.documentElement.lang = locale;
  document.title = locale === "zh-CN" ? "已退出登录 · Haros" : "Signed out · Haros";
  root.innerHTML = createSignedOutMarkup(locale);
  root.querySelector<HTMLElement>("h1")?.focus();
}

export function bootstrapSignedOutScreen(
  input: {
    readonly pathname: string;
    readonly render: () => void;
  } = {
    pathname: window.location.pathname,
    render: renderSignedOutScreen,
  },
): boolean {
  if (input.pathname !== AUTH_SIGNED_OUT_PATH) return false;
  input.render();
  return true;
}
