import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    target: "es2022",
    splitting: false,
  },
  {
    entry: { cli: "src/cli.ts" },
    format: ["esm"],
    sourcemap: true,
    target: "es2022",
    splitting: false,
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
]);
