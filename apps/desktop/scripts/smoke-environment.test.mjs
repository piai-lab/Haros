import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

import {
  createDisposableDesktopEnvironment,
  disposableDesktopEnvironmentDirectories,
  isDisposableDesktopEnvironment,
} from "./smoke-environment.mjs";

test("passes only launch necessities and roots every product/provider directory in disposable state", () => {
  const root = resolve("/tmp/omnimind-smoke-fixture");
  const env = createDisposableDesktopEnvironment(root, {
    PATH: "/fixture/bin:/usr/bin",
    LANG: "en_US.UTF-8",
    DISPLAY: ":99",
    TOTALLY_UNKNOWN_PRIVATE_VALUE: "do-not-inherit",
    ANTHROPIC_API_KEY: "provider-secret",
    CODEX_HOME: "/real/.codex",
    HOME: "/real/home",
    NODE_OPTIONS: "--require=/real/hook.cjs",
    SSH_AUTH_SOCK: "/real/agent.sock",
    VITE_DEV_SERVER_URL: "https://ambient.invalid",
  });

  assert.equal(env.PATH, "/fixture/bin:/usr/bin");
  assert.equal(env.LANG, "en_US.UTF-8");
  assert.equal(env.DISPLAY, ":99");
  assert.equal(env.TOTALLY_UNKNOWN_PRIVATE_VALUE, undefined);
  assert.equal(env.ANTHROPIC_API_KEY, undefined);
  assert.equal(env.NODE_OPTIONS, undefined);
  assert.equal(env.SSH_AUTH_SOCK, undefined);
  assert.equal(env.VITE_DEV_SERVER_URL, undefined);
  assert.equal(env.OMNIMIND_PATH_HYDRATED, "1");
  assert.equal(isDisposableDesktopEnvironment(env), true);
  for (const path of disposableDesktopEnvironmentDirectories(env)) {
    assert.ok(resolve(path).startsWith(`${root}/`), `${path} was outside ${root}`);
  }
});

test("keeps unknown secrets and real-home state out of child and grandchild processes", () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "omnimind-smoke-env-proof-"));
  const realHome = join(fixtureRoot, "ambient-home");
  const disposableRoot = join(fixtureRoot, "disposable");
  mkdirSync(realHome, { recursive: true });
  writeFileSync(join(realHome, "real-home-sentinel.txt"), "must-stay-private\n");
  const env = createDisposableDesktopEnvironment(disposableRoot, {
    PATH: process.env.PATH,
    HOME: realHome,
    USERPROFILE: realHome,
    TOTALLY_UNKNOWN_PRIVATE_VALUE: "unknown-secret",
    OPENAI_API_KEY: "provider-secret",
    GITHUB_TOKEN: "source-secret",
  });
  for (const directory of disposableDesktopEnvironmentDirectories(env)) {
    mkdirSync(directory, { recursive: true });
  }

  const grandchild = String.raw`
    const fs = require("node:fs");
    const os = require("node:os");
    const path = require("node:path");
    const home = os.homedir();
    fs.writeFileSync(path.join(home, "descendant-write.txt"), "inside disposable home\n");
    process.stdout.write(JSON.stringify({
      home,
      secret: process.env.TOTALLY_UNKNOWN_PRIVATE_VALUE,
      providerSecret: process.env.OPENAI_API_KEY,
      sourceSecret: process.env.GITHUB_TOKEN,
      codexHome: process.env.CODEX_HOME,
      piHome: process.env.PI_CODING_AGENT_DIR,
      sawRealSentinel: fs.existsSync(path.join(home, "real-home-sentinel.txt")),
    }));
  `;
  const child = String.raw`
    const { execFileSync } = require("node:child_process");
    process.stdout.write(execFileSync(process.execPath, ["-e", process.argv[1]], {
      env: process.env,
      encoding: "utf8",
    }));
  `;

  try {
    const proof = JSON.parse(
      execFileSync(process.execPath, ["-e", child, grandchild], { env, encoding: "utf8" }),
    );
    assert.equal(proof.home, env.HOME);
    assert.equal(proof.secret, undefined);
    assert.equal(proof.providerSecret, undefined);
    assert.equal(proof.sourceSecret, undefined);
    assert.equal(proof.sawRealSentinel, false);
    assert.ok(proof.codexHome.startsWith(`${disposableRoot}/`));
    assert.ok(proof.piHome.startsWith(`${disposableRoot}/`));
    assert.equal(
      readFileSync(join(realHome, "real-home-sentinel.txt"), "utf8"),
      "must-stay-private\n",
    );
    assert.equal(existsSync(join(realHome, "descendant-write.txt")), false);
    assert.equal(existsSync(join(env.HOME, "descendant-write.txt")), true);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
