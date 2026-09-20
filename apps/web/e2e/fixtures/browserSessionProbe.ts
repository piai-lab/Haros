import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BrowserWindow, session, WebContentsView } from "electron";
import { ThreadId } from "@harnessos/contracts";

import { BrowserSessionRestore } from "../../../desktop/src/browserAutomation/browserSessionRestore";
import { createCookieSessionBackend } from "../../../desktop/src/browserAutomation/electronCookieSession";
import { BROWSER_SESSION_PARTITION } from "../../../desktop/src/browserManager";
import { BrowserVault } from "../../../desktop/src/browserAutomation/browserVault";
import { BrowserVaultCapture } from "../../../desktop/src/browserAutomation/browserVaultCapture";

export async function verifyNativeLoginCapture(home: string, url: string): Promise<boolean> {
  const vault = new BrowserVault(join(home, "capture-probe"));
  const view = new WebContentsView({ webPreferences: { sandbox: true, contextIsolation: true } });
  view.setBounds({ x: 0, y: 0, width: 800, height: 600 });
  const parent = BrowserWindow.getAllWindows()[0]!;
  parent.contentView.addChildView(view);
  const capture = new BrowserVaultCapture(vault);
  const waitUntil = async (phase: string, check: () => Promise<boolean>) => {
    const deadline = Date.now() + 10_000;
    while (!(await check())) {
      if (Date.now() >= deadline)
        throw new Error(`Native password capture did not settle: ${phase}.`);
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  };
  try {
    await vault.setupMaster("synthetic-capture-master");
    await vault.configure({ offerSave: true, autosave: false, agentUse: false });
    let ready = false;
    const reportReady = vault.reportCaptureReady.bind(vault);
    vault.reportCaptureReady = () => {
      reportReady();
      ready = true;
    };
    capture.register({
      threadId: ThreadId.makeUnsafe("capture-probe"),
      tabId: "capture-probe",
      webContents: view.webContents,
    });
    await view.webContents.loadURL(url);
    await waitUntil("sensor installation", async () => ready);
    const point = await view.webContents.executeJavaScript(`(() => {
      document.body.innerHTML = '<form action="/next" method="post"><input name="username" autocomplete="username"><input name="password" type="password" autocomplete="current-password"><button>Sign in</button></form>';
      document.querySelector('[name=username]').value = 'synthetic-user';
      document.querySelector('[name=password]').value = 'synthetic-password';
      const rect = document.querySelector('button').getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    })()`);
    for (const type of ["mousePressed", "mouseReleased"]) {
      await view.webContents.debugger.sendCommand("Input.dispatchMouseEvent", {
        ...point,
        type,
        button: "left",
        clickCount: 1,
      });
    }
    await waitUntil("save prompt", async () => (await vault.snapshot()).pending.length === 1);
    const pending = (await vault.snapshot()).pending[0]!;
    vault.respond({ id: pending.id, save: true });
    await waitUntil("encrypted save", async () => (await vault.listLogins()).length === 1);
    const snapshot = { ...(await vault.snapshot()), logins: await vault.listLogins() };
    assert.equal(snapshot.logins[0]?.username, "synthetic-user");
    assert.equal(snapshot.logins[0]?.origin, new URL(url).origin);
    assert.equal(snapshot.logins[0]?.source, "user");
    assert.equal(JSON.stringify(snapshot).includes("synthetic-password"), false);
    return true;
  } finally {
    await capture.dispose();
    vault.dispose();
    parent.contentView.removeChildView(view);
    view.webContents.close();
    parent.webContents.focus();
  }
}

/** Synthetic cookies and an isolated key-store double; never touches the OS keychain. */
export async function verifyBrowserSessionRestore(home: string): Promise<boolean> {
  const directory = join(home, "cookie-restore-probe");
  const store = {
    available: async () => true,
    encrypt: (value: string) => Buffer.from(value),
    decrypt: (value: Buffer) => value.toString(),
  };
  const firstBackend = createCookieSessionBackend(BROWSER_SESSION_PARTITION);
  const first = new BrowserSessionRestore(directory, firstBackend, store);
  try {
    await first.initialize();
    await firstBackend.restore([
      {
        url: "https://session.example.test/",
        name: "synthetic-session",
        value: "synthetic-cookie-value",
        path: "/",
        secure: true,
        httpOnly: true,
        sameSite: "Lax",
        priority: "High",
      },
    ]);
    await first.rememberImport(["session.example.test"]);
  } finally {
    await first.shutdown();
  }
  assert.equal(
    (await readFile(join(directory, "sessions.enc"))).includes("synthetic-cookie-value"),
    false,
  );
  // Drop Chromium's live copy to prove restoration comes from Haros's encrypted snapshot.
  await session
    .fromPartition(BROWSER_SESSION_PARTITION)
    .clearStorageData({ storages: ["cookies"] });
  const secondBackend = createCookieSessionBackend(BROWSER_SESSION_PARTITION);
  const second = new BrowserSessionRestore(directory, secondBackend, store);
  try {
    await second.initialize();
    const cookies = (await secondBackend.read()) as Array<Record<string, unknown>>;
    assert.equal(cookies.length, 1);
    assert.equal(cookies[0]?.value, "synthetic-cookie-value");
    assert.equal(cookies[0]?.domain, "session.example.test");
    assert.equal(cookies[0]?.session, true);
    assert.equal(cookies[0]?.httpOnly, true);
    assert.equal(cookies[0]?.priority, "High");
    assert.equal(cookies[0]?.sameSite, "Lax");
    assert.equal((await session.defaultSession.cookies.get({})).length, 0);
    return true;
  } finally {
    await second.shutdown();
    await session
      .fromPartition(BROWSER_SESSION_PARTITION)
      .clearStorageData({ storages: ["cookies"] });
  }
}
