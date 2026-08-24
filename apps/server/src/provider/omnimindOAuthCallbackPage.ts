// FILE: omnimindOAuthCallbackPage.ts
// Purpose: Renders the OmniMind-owned presentation for provider browser OAuth loopback results.
// Layer: Server provider presentation boundary

import { readFileSync, statSync } from "node:fs";
import path from "node:path";

import type { OAuthPageRenderer } from "@earendil-works/pi-ai";

const MAX_LOGO_BYTES = 128 * 1024;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function loadOmniMindOAuthLogoDataUrl(staticDir: string | undefined): string | null {
  if (!staticDir) return null;
  try {
    const logoPath = path.join(staticDir, "brand", "omnimind-logo-flat.svg");
    const metadata = statSync(logoPath);
    if (!metadata.isFile() || metadata.size <= 0 || metadata.size > MAX_LOGO_BYTES) return null;
    return `data:image/svg+xml;base64,${readFileSync(logoPath).toString("base64")}`;
  } catch {
    return null;
  }
}

export function createOmniMindOAuthPageRenderer(input: {
  readonly serviceName: string;
  readonly logoDataUrl: string | null;
}): OAuthPageRenderer {
  const serviceName = escapeHtml(input.serviceName);
  const logo = input.logoDataUrl
    ? `<img class="logo" src="${input.logoDataUrl}" alt="OmniMind" width="76" height="76" />`
    : `<div class="wordmark" aria-label="OmniMind">OmniMind</div>`;

  return ({ kind }) => {
    const authorizationReceived = kind === "authorization_received";
    const englishTitle = authorizationReceived
      ? "Authorization received"
      : "Authorization didn’t complete";
    const chineseTitle = authorizationReceived ? "已收到授权" : "授权未完成";
    const englishMessage = authorizationReceived
      ? `Authorization from ${serviceName} was received. Close this page and return to OmniMind to finish connecting.`
      : `Return to OmniMind and try authorizing ${serviceName} again.`;
    const chineseMessage = authorizationReceived
      ? `已收到来自 ${serviceName} 的授权。请关闭此页面并返回 OmniMind 完成连接。`
      : `请返回 OmniMind，重新授权 ${serviceName}。`;

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" />
  <title>${englishTitle} · OmniMind</title>
  <style>
    :root {
      color-scheme: light dark;
      --canvas: #f5f7fa;
      --surface: #ffffff;
      --border: #dfe5ec;
      --text: #101828;
      --text-secondary: #667085;
      --accent: #073b8e;
      --success: #0f8a5f;
      --error: #c83b4b;
      --font: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --canvas: #111315;
        --surface: #191c20;
        --border: #30363d;
        --text: #f5f7fa;
        --text-secondary: #aab2bd;
        --accent: #8ab4f8;
        --success: #55c99a;
        --error: #ff8a98;
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: var(--canvas);
      color: var(--text);
      font-family: var(--font);
      -webkit-font-smoothing: antialiased;
    }
    main {
      width: min(100%, 560px);
      padding: 48px 40px 44px;
      border: 1px solid var(--border);
      border-radius: 24px;
      background: var(--surface);
      box-shadow: 0 20px 55px rgb(16 24 40 / 8%), 0 2px 8px rgb(16 24 40 / 4%);
      text-align: center;
    }
    .logo { display: block; margin: 0 auto 26px; }
    .wordmark {
      margin: 0 auto 28px;
      color: var(--accent);
      font-size: 20px;
      font-weight: 720;
      letter-spacing: -0.02em;
    }
    .state {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      margin-bottom: 14px;
      color: ${authorizationReceived ? "var(--success)" : "var(--error)"};
      font-size: 13px;
      font-weight: 650;
    }
    .state::before {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: currentColor;
      content: "";
    }
    h1 {
      margin: 0;
      font-size: clamp(27px, 5vw, 34px);
      line-height: 1.15;
      font-weight: 690;
      letter-spacing: -0.035em;
    }
    p {
      max-width: 430px;
      margin: 14px auto 0;
      color: var(--text-secondary);
      font-size: 16px;
      line-height: 1.65;
    }
    .copy-zh { display: none; }
    html[lang="zh-CN"] .copy-en { display: none; }
    html[lang="zh-CN"] .copy-zh { display: inline; }
    @media (max-width: 520px) {
      body { padding: 14px; }
      main { padding: 38px 24px 36px; border-radius: 20px; }
    }
  </style>
  <script>
    const prefersChinese = navigator.languages?.some((language) => /^zh(?:-|$)/i.test(language)) ?? /^zh(?:-|$)/i.test(navigator.language);
    if (prefersChinese) {
      document.documentElement.lang = "zh-CN";
      document.title = ${JSON.stringify(`${chineseTitle} · OmniMind`)};
    }
  </script>
</head>
<body>
  <main>
    ${logo}
    <div class="state" role="status">
      <span class="copy-en">${authorizationReceived ? "OAuth callback received" : "OAuth callback interrupted"}</span>
      <span class="copy-zh">${authorizationReceived ? "已收到 OAuth 回调" : "OAuth 回调已中断"}</span>
    </div>
    <h1><span class="copy-en">${englishTitle}</span><span class="copy-zh">${chineseTitle}</span></h1>
    <p><span class="copy-en">${englishMessage}</span><span class="copy-zh">${chineseMessage}</span></p>
  </main>
</body>
</html>`;
  };
}
