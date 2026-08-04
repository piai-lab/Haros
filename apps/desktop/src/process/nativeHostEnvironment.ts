const NATIVE_HOST_INHERITED_ENVIRONMENT_KEYS = [
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
  "TMPDIR",
  "TMP",
  "TEMP",
  "HOME",
  "USERPROFILE",
  "APPDATA",
  "LOCALAPPDATA",
  "XDG_RUNTIME_DIR",
] as const;

export function createNativeHostBaseEnvironment(
  source: NodeJS.ProcessEnv,
  productHome: string,
): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    ELECTRON_RUN_AS_NODE: "1",
    OMNIMIND_HOME: productHome,
  };
  for (const key of NATIVE_HOST_INHERITED_ENVIRONMENT_KEYS) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0) environment[key] = value;
  }
  return environment;
}
