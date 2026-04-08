import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  target: "node22",
  bundle: true,
  noExternal: [/.*/], // inline all dependencies into the bundle
  minify: false,
  sourcemap: true,
  outDir: "dist",
});
