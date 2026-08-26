import { createHash } from "node:crypto";
import { createServer } from "node:net";

const PORT_BASE = 45_000;
const PORT_SPAN = 10_000;
const MAX_PORT_PROBES = 32;

function parsePortOverride(rawValue: string): number {
  const port = Number(rawValue);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(
      `VITEST_BROWSER_API_PORT must be an integer from 1 to 65535, received ${rawValue}`,
    );
  }
  return port;
}

async function canBind(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen({ host, port, exclusive: true }, () => {
      server.close((error) => resolve(error === undefined));
    });
  });
}

function derivedPort(key: string): number {
  const digest = createHash("sha256").update(key).digest();
  return PORT_BASE + (digest.readUInt32BE(0) % PORT_SPAN);
}

export async function resolveBrowserTestPort(options: {
  host: string;
  suite: "all" | "stable" | "geometry";
}): Promise<number> {
  const override = process.env.VITEST_BROWSER_API_PORT;
  if (override !== undefined) {
    const port = parsePortOverride(override);
    if (!(await canBind(options.host, port))) {
      throw new Error(`VITEST_BROWSER_API_PORT ${port} is already in use on ${options.host}`);
    }
    return port;
  }

  const firstPort = derivedPort(`${process.cwd()}\0${options.suite}`);
  for (let offset = 0; offset < MAX_PORT_PROBES; offset += 1) {
    const port = PORT_BASE + ((firstPort - PORT_BASE + offset) % PORT_SPAN);
    if (await canBind(options.host, port)) return port;
  }

  throw new Error(
    `Unable to reserve a browser test API port after ${MAX_PORT_PROBES} attempts on ${options.host}`,
  );
}
