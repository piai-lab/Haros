import { randomBytes, randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface NativeHostRendezvous {
  readonly endpoint: string;
  readonly authentication: string;
  readonly hostInstanceId: string;
}

const MAX_PORTABLE_UNIX_SOCKET_PATH_BYTES = 100;

export function createNativeHostRendezvous(
  input: {
    readonly identity?: string;
    readonly platform?: NodeJS.Platform;
    readonly temporaryDirectory?: string;
  } = {},
): NativeHostRendezvous {
  const identity = input.identity ?? randomUUID();
  const platform = input.platform ?? process.platform;
  const socketIdentity = identity.replaceAll("-", "").slice(0, 20);
  const endpointName = `omnimind-native-host-${socketIdentity}.sock`;
  const preferredEndpoint = join(input.temporaryDirectory ?? tmpdir(), endpointName);
  const endpoint =
    platform === "win32"
      ? `\\\\.\\pipe\\omnimind-native-host-${identity}`
      : Buffer.byteLength(preferredEndpoint, "utf8") <= MAX_PORTABLE_UNIX_SOCKET_PATH_BYTES
        ? preferredEndpoint
        : join("/tmp", `omnimind-nh-${socketIdentity}.sock`);
  return {
    endpoint,
    authentication: randomBytes(32).toString("base64url"),
    hostInstanceId: `native-host-${identity}`,
  };
}

export function nativeHostChildEnvironment(
  base: NodeJS.ProcessEnv,
  rendezvous: NativeHostRendezvous,
): NodeJS.ProcessEnv {
  return {
    ...base,
    OMNIMIND_NATIVE_HOST_ENDPOINT: rendezvous.endpoint,
    OMNIMIND_NATIVE_HOST_AUTH: rendezvous.authentication,
    OMNIMIND_NATIVE_HOST_INSTANCE: rendezvous.hostInstanceId,
  };
}
