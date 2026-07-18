# Changelog

## [0.0.3]

### Fixed

- Extension failed to activate from the Marketplace with `command 'satteriMarkdownPreview.openToSide' not found`. Root cause: tsdown externalizes
  every `package.json` dependency by default, so `dist/extension.cjs` shipped a bare `require("satteri-expressive-code")`; that package (and its
  `expressive-code` / `shiki` tree) is not whitelisted in `.vscodeignore`, so the `.vsix` omitted it and activation threw `Cannot find module`.
  Fixed by force-bundling the tree into `dist/` via tsdown `deps.alwaysBundle`. Development and integration tests were unaffected because they run against the full `node_modules`.

## [0.0.2]

### Fixed

- Extension failed to activate after installing from the Marketplace due to
  the compiled output not being included in the packaged `.vsix`

## [0.0.1]

First preview release. Live Markdown preview powered by the Sätteri (Rust)
engine.

### Added

- **Preview panel.** Live preview for `.md` files, opened beside the active
  editor. Debounced live update on edit and on active-editor change.
  Commands: Open Preview, Open Preview to the Side, Refresh Preview, with
  `Ctrl/Cmd+Shift+V` and `Ctrl/Cmd+K V` keybindings.
- **Rendering.** `satteri.markdownToHtml()` with GFM (tables, strikethrough,
  task lists, autolinks, footnotes) and optional math parsing. Renders into a
  Webview wrapped in a strict CSP shell (no `unsafe-inline`/`unsafe-eval`;
  nonce'd webview script only).
- **Code highlighting.** Fenced code blocks via the Expressive Code HAST
  plugin, shipping a fixed light/dark theme pair switched by the active VS Code
  color-theme kind. Copy-to-clipboard button disabled to keep the CSP free of
  author-injectable module scripts (XSS hardening).
- **Heading anchors.** Stable slugified heading ids + in-page anchor links;
  webview-side smooth-scroll on `#anchor` clicks.
- **Resource resolution.** HAST plugin rewrites relative `img`/`a`/`source`/
  `video`/`audio` paths to `webview.asWebviewUri(...)`; `localResourceRoots`
  scoped to the document's workspace folder (or containing dir).
- **Frontmatter.** Parsed frontmatter shown as an escaped `<details>` block
  (toggle via `satteriMarkdownPreview.showFrontmatter`); hidden from rendered
  body by default.
- **Configuration.** `satteriMarkdownPreview.gfm`, `.math`, `.showFrontmatter`,
  `.customCss`. Live re-render on config change; render cache keyed by settings.
- **Error handling.** Render failures (malformed input, native module load
  failure) show a readable error state instead of a blank panel.
- **Tests.** Unit suite under `bun:test` (plugins, htmlDocument CSP/nonce,
  frontmatter, config, debounce). Integration suite via `@vscode/test-electron`
  exercising the real native binary in-host, run in CI across Linux/macOS/
  Windows.
