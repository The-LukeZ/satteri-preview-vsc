// In-host test suite. @vscode/test-electron calls `run()` inside the Extension
// Development Host (Electron/Node), where `require("vscode")` and the native
// `satteri` module are available. Hand-rolled runner - no mocha dependency; the
// assertions are simple enough that node:assert + a for-loop covers it.
const assert = require("node:assert");
const path = require("node:path");
const vscode = require("vscode");

const EXTENSION_ID = "thelukez.satteri-markdown-preview";

async function run() {
  const tests = [];
  const test = (name, fn) => tests.push({ name, fn });

  test("activates and loads the native Sätteri engine in the host", async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, `extension ${EXTENSION_ID} not found`);
    await ext.activate();
    // The core risk: does the napi-rs binary resolve + run inside the host?
    const { markdownToHtml } = require("satteri");
    const { html } = await markdownToHtml("# Hello", {
      features: { gfm: true },
    });
    assert.match(
      html,
      /<h1[^>]*>[\s\S]*Hello/,
      "expected an <h1> for the heading",
    );
  });

  test("registers its three commands", async () => {
    const cmds = await vscode.commands.getCommands(true);
    for (const id of [
      "satteriMarkdownPreview.open",
      "satteriMarkdownPreview.openToSide",
      "satteriMarkdownPreview.refresh",
    ]) {
      assert.ok(cmds.includes(id), `missing command ${id}`);
    }
  });

  test("opens a preview for a fixture markdown file without throwing", async () => {
    const uri = vscode.Uri.file(
      path.resolve(__dirname, "../../fixtures/sample.md"),
    );
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);
    await vscode.commands.executeCommand("satteriMarkdownPreview.open");
    // If the command threw (render failure, native load failure), the await
    // above rejects and this test fails.
  });

  let failed = 0;
  console.log("\nSätteri Markdown Preview - integration");
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      failed++;
      console.error(
        `  ✗ ${t.name}\n      ${err && err.stack ? err.stack : err}`,
      );
    }
  }
  if (failed > 0) {
    throw new Error(`${failed} of ${tests.length} integration test(s) failed`);
  }
  console.log(`  ${tests.length} passed\n`);
}

module.exports = { run };
