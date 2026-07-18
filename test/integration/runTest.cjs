// Downloads a throwaway VS Code build and launches it with this extension
// loaded, then runs the in-host suite (suite/index.cjs). This is the only place
// the real `satteri` native module and the `vscode` API are exercised - proving
// the napi-rs binary resolves inside the extension host (risk #1).
const path = require("node:path");
const { runTests } = require("@vscode/test-electron");

async function main() {
  const extensionDevelopmentPath = path.resolve(__dirname, "../../");
  const extensionTestsPath = path.resolve(__dirname, "./suite/index.cjs");
  // Open the fixtures dir as the workspace so relative-resource resolution and
  // command-palette gating behave like a real single-folder session.
  const workspace = path.resolve(__dirname, "../fixtures");

  try {
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      // `--disable-extensions` disables *other* installed extensions (incl. the
      // built-in Markdown preview, which shares our keybindings) but keeps the
      // one under development loaded.
      launchArgs: [workspace, "--disable-extensions"],
    });
  } catch (err) {
    console.error("Integration tests failed:", err);
    process.exit(1);
  }
}

main();
