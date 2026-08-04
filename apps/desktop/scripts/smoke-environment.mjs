import { isAbsolute, relative, resolve } from "node:path";

/**
 * Only process-launch necessities cross into the smoke tree. Provider state,
 * credentials, shell hooks and every ambient home/config path are deliberately
 * absent rather than guessed from variable names.
 */
const INHERITED_ENVIRONMENT_ALLOWLIST = new Set([
  "PATH",
  "PATHEXT",
  "SYSTEMROOT",
  "SystemRoot",
  "WINDIR",
  "COMSPEC",
  "LANG",
  "LANGUAGE",
  "LC_ALL",
  "LC_CTYPE",
  "TZ",
  "DISPLAY",
  "WAYLAND_DISPLAY",
  "DBUS_SESSION_BUS_ADDRESS",
  "XDG_RUNTIME_DIR",
]);

function disposablePath(root, ...segments) {
  const path = resolve(root, ...segments);
  const relation = relative(resolve(root), path);
  if (!isAbsolute(path) || relation.startsWith("..") || isAbsolute(relation)) {
    throw new Error(`Disposable smoke path escaped its root: ${path}`);
  }
  return path;
}

export function createDisposableDesktopEnvironment(root, inheritedEnvironment = process.env) {
  const environment = {};
  for (const name of INHERITED_ENVIRONMENT_ALLOWLIST) {
    const value = inheritedEnvironment[name];
    if (typeof value === "string" && value.length > 0) environment[name] = value;
  }

  const home = disposablePath(root, "home");
  const temporary = disposablePath(root, "tmp");
  return Object.assign(environment, {
    HOME: home,
    USERPROFILE: home,
    APPDATA: disposablePath(root, "appdata"),
    LOCALAPPDATA: disposablePath(root, "localappdata"),
    XDG_CONFIG_HOME: disposablePath(root, "xdg", "config"),
    XDG_CACHE_HOME: disposablePath(root, "xdg", "cache"),
    XDG_DATA_HOME: disposablePath(root, "xdg", "data"),
    XDG_STATE_HOME: disposablePath(root, "xdg", "state"),
    CODEX_HOME: disposablePath(root, "providers", "codex"),
    CLAUDE_CONFIG_DIR: disposablePath(root, "providers", "claude"),
    PI_CODING_AGENT_DIR: disposablePath(root, "providers", "pi"),
    PI_CODING_AGENT_SESSION_DIR: disposablePath(root, "providers", "pi", "sessions"),
    OMNIMIND_HOME: disposablePath(root, "omnimind"),
    TMPDIR: temporary,
    TMP: temporary,
    TEMP: temporary,
    ELECTRON_ENABLE_LOGGING: "1",
    OMNIMIND_DISABLE_AUTO_UPDATE: "1",
    OMNIMIND_DISPOSABLE_SMOKE_ROOT: resolve(root),
    // The PATH is an explicitly allowlisted test input. Mark it as final so the
    // service cannot source a real login shell and repopulate discarded values.
    OMNIMIND_PATH_HYDRATED: "1",
  });
}

export function disposableDesktopEnvironmentDirectories(environment) {
  return [
    environment.HOME,
    environment.APPDATA,
    environment.LOCALAPPDATA,
    environment.XDG_CONFIG_HOME,
    environment.XDG_CACHE_HOME,
    environment.XDG_DATA_HOME,
    environment.XDG_STATE_HOME,
    environment.CODEX_HOME,
    environment.CLAUDE_CONFIG_DIR,
    environment.PI_CODING_AGENT_DIR,
    environment.PI_CODING_AGENT_SESSION_DIR,
    environment.OMNIMIND_HOME,
    environment.TMPDIR,
  ].filter((value) => typeof value === "string");
}

export function isDisposableDesktopEnvironment(environment) {
  const root = environment.OMNIMIND_DISPOSABLE_SMOKE_ROOT;
  const home = environment.HOME;
  const productHome = environment.OMNIMIND_HOME;
  if (!root || !home || !productHome || !isAbsolute(root)) return false;
  const normalizedRoot = resolve(root);
  return [home, productHome].every((path) => {
    const normalized = resolve(path);
    const relation = relative(normalizedRoot, normalized);
    return relation.length > 0 && !relation.startsWith("..") && !isAbsolute(relation);
  });
}
