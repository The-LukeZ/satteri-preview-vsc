import { defineConfig } from "tsdown";

const production = process.env.NODE_ENV === "production";

export default defineConfig([
  // Extension host bundle. VS Code loads `main` via require(), so this MUST be
  // CommonJS. tsdown's cjs format emits `dist/extension.cjs`, which
  // package.json `main` points at.
  {
    entry: ["src/extension.ts"],
    outDir: "dist",
    format: ["cjs"],
    platform: "node",
    target: "node18",
    deps: {
      // `vscode` is provided by the host; `satteri` is a native (napi-rs) module
      // that must not be bundled - it is required from node_modules at runtime.
      neverBundle: ["vscode", "satteri"],
      // tsdown externalizes everything in package.json `dependencies` BY DEFAULT.
      // `satteri-expressive-code` is a dependency, so it (and its transitive tree
      // expressive-code / shiki / hastscript / ...) would ship as bare
      // `require("satteri-expressive-code")` in extension.cjs and throw
      // `Cannot find module` on activation ("command not found"), since those
      // packages are NOT whitelisted in .vscodeignore. `alwaysBundle` overrides
      // the default and inlines the whole tree into dist/, which is shipped.
      // (Removing it from neverBundle is NOT enough - the dependency-default wins.)
      alwaysBundle: ["satteri-expressive-code"],
    },
    dts: false,
    clean: true,
    sourcemap: !production,
    minify: production,
    exports: true,
  },
  // Webview script. Runs in the browser-like webview context as a self-contained
  // IIFE. clean:false so it never wipes preview.css / other media assets.
  {
    entry: ["media/preview.ts"],
    outDir: "media",
    format: ["iife"],
    platform: "browser",
    target: "es2020",
    dts: false,
    clean: false,
    sourcemap: !production,
    minify: production,
    exports: true,
  },
]);
