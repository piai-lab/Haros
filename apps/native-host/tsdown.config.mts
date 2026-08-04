import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  outDir: "dist",
  outExtensions: () => ({ js: ".mjs" }),
  clean: true,
  noExternal: (id) => id.startsWith("@omnimind/"),
});
