import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: {
    resolve: true,
  },
  treeshake: true,
  splitting: false,
  clean: true,
  external: ["react", "react-dom"],
  injectStyle: true,
  skipNodeModulesBundle: true,
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
});
