import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  target: "node22",
  bundle: true,
  noExternal: [/.*/],
  minify: false,
  sourcemap: false,
  outDir: "dist",
});
