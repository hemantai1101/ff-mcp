import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  target: "node20",
  bundle: true, // inlines @mcp/shared at build time
  minify: false,
  sourcemap: true,
  outDir: "dist",
});
