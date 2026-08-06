import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const CURATED_PACKAGE_ASSETS = [
  {
    path: "assets/packages/pi-todo-0.81.1/manifest.json",
    sha256: "e172b7144253e1187e00758c46fd7468c70cd4f5c4fa22e8045824f459c49548",
  },
  {
    path: "assets/packages/pi-todo-0.81.1/todo.ts",
    sha256: "e46824d00217e25242c186d41837cc84ca81b23f978500323448502a9a424ee2",
  },
  {
    path: "assets/licenses/pi-MIT.txt",
    sha256: "4f6a1985796db5225e3b1e59972bd47e07a27a0748427cb3d3c8fbf39f9311f0",
  },
] as const;

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function stageCuratedPackageAssets(input: {
  readonly sourceRoot: string;
  readonly applicationRoot: string;
}): Promise<ReadonlyArray<string>> {
  if (!path.isAbsolute(input.sourceRoot) || !path.isAbsolute(input.applicationRoot)) {
    throw new Error("Curated Package staging roots must be absolute.");
  }
  const sources = await Promise.all(
    CURATED_PACKAGE_ASSETS.map(async (asset) => {
      const bytes = await readFile(path.join(input.sourceRoot, asset.path));
      if (sha256(bytes) !== asset.sha256) {
        throw new Error(
          `Curated Package release asset failed exact digest validation: ${asset.path}`,
        );
      }
      return { asset, bytes };
    }),
  );

  const staged: string[] = [];
  for (const { asset, bytes } of sources) {
    const destination = path.join(input.applicationRoot, asset.path);
    await mkdir(path.dirname(destination), { recursive: true, mode: 0o755 });
    await writeFile(destination, bytes, { flag: "wx", mode: 0o644 });
    staged.push(destination);
  }
  return staged;
}
