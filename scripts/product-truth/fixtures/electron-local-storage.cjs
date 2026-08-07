const { app, BrowserWindow, protocol } = require("electron");

protocol.registerSchemesAsPrivileged([
  { scheme: "omnimind", privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

const profile = process.argv.find((value) => value.startsWith("--fixture-profile="))?.slice("--fixture-profile=".length);
if (!profile) throw new Error("Missing isolated fixture profile.");
app.setPath("userData", profile);

app.whenReady().then(async () => {
  protocol.handle("omnimind", () => new Response("<!doctype html><meta charset=utf-8><title>fixture</title>"));
  const window = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
  await window.loadURL("omnimind://app");
  await window.webContents.executeJavaScript(`
    localStorage.setItem("omnimind:composer-drafts:v1", "fixture-v1");
    localStorage.setItem("unrelated-key", "preserve-me");
  `);
  await window.webContents.session.flushStorageData();
  window.destroy();
  app.quit();
});
