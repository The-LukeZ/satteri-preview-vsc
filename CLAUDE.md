# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A VS Code extension that renders a live Markdown preview using the **Sätteri**
Rust engine (`satteri`, a native napi-rs module) instead of the built-in
`markdown-it`. Package manager is **Bun**. Bundler is **tsdown**. Sätteri has
its own MDAST/HAST plugin model — remark/rehype plugins do **not** work here;
extend rendering via Sätteri's `defineHastPlugin` API or as HTML post-processing.

## Commands

```sh
bun install
bun run build            # tsdown: emits dist/extension.cjs + media/preview.iife.js
bun run watch            # tsdown --watch
bun run typecheck        # tsc --noEmit
bun test test/unit       # unit tests (bun:test). Also: bun run test
bun test test/unit/config.test.ts   # single unit test file
bun run test:watch
bun run test:integration # real extension in a throwaway VS Code (test-electron)
bun run format           # prettier --write .
bun run package          # production build + release.mjs (typecheck→build→tests→vsix)
```

Press <kbd>F5</kbd> in VS Code to launch the Extension Development Host.
Integration tests must run from **Windows Terminal** on this machine (WSL).

## Two build targets (see `tsdown.config.mts`)

1. **Extension host** — `src/extension.ts` → `dist/extension.cjs`. MUST be
   **CommonJS** (VS Code `require()`s `main`). `vscode` + `satteri` are
   `deps.neverBundle` — `vscode` is host-provided; `satteri` is a native binary
   resolved from `node_modules` at runtime. **Gotcha:** tsdown externalizes
   everything in `package.json` `dependencies` BY DEFAULT, so `satteri` is a
   dependency AND `satteri-expressive-code` would be too — the latter must be
   force-bundled via `deps.alwaysBundle: ["satteri-expressive-code"]` (which
   also pulls its transitive `expressive-code` / `shiki` / `hastscript` tree,
   since those aren't in our `dependencies`). Merely omitting it from
   `neverBundle` does NOT bundle it — the dependency-default wins and the vsix
   ships a bare `require("satteri-expressive-code")` that throws `Cannot find
   module` on activation ("command not found"), while dev-mode (full
   `node_modules`) still works. Verify with
   `grep -c satteri-expressive-code dist/extension.cjs` → must be `0`.
   **Shiki theme trim:** `@expressive-code/plugin-shiki` statically imports the
   full `bundledThemes` registry from `shiki/themes` (~64 themes, ~1.4 MB of
   code-split chunks), even though only `github-light`/`github-dark` are used.
   The host build aliases `shiki/themes` → `build/shiki-themes.mjs` (a 2-theme
   stub) to drop them. `shiki/langs` is intentionally NOT aliased — full
   language support is kept. Adding a theme in `codeHighlight.ts` requires
   adding it to the stub too, or Shiki throws "Theme not found" at render.
2. **Webview script** — `media/preview.ts` → `media/preview.iife.js`. Browser
   IIFE. `clean:false` so it never wipes `media/preview.css`.

Because `satteri` is a per-platform native binary, `.vsix` packages are built
**per target** (`linux-x64`, `win32-x64`, `darwin-arm64`) on matching OS/arch —
`scripts/release.mjs` and the CI matrix handle this. `bun install` only pulls
the current platform's binary.

## Architecture

Rendering flow: **command → PreviewManager → PreviewPanel → Renderer → htmlDocument → webview**.

- `src/extension.ts` — `activate()` registers the three commands
  (`satteriMarkdownPreview.open` / `.openToSide` / `.refresh`) and one
  `PreviewManager`.
- `src/previewManager.ts` — one `PreviewPanel` per document URI; re-opening a
  doc reveals the existing panel. Owns a single shared `Renderer`.
- `src/previewPanel.ts` — wraps one `WebviewPanel` bound to one document.
  Listens for edits (debounced 200ms), color-theme-kind changes, and config
  changes, then re-renders. Uses a monotonic `renderSeq` so a slow async render
  only writes if it's still the latest. Resolves `customCss` and
  `localResourceRoots` (roots are fixed at panel creation).
- `src/render/renderer.ts` — calls `markdownToHtml()` with the three HAST
  plugins. Caches results keyed by `<uri>\n<webview.cspSource>` +
  document.version + theme mode + settings signature. `invalidate()` drops all
  panel entries for a document.
- `src/render/htmlDocument.ts` — wraps body HTML in the full webview document
  with a **strict CSP** (`default-src 'none'`, no `unsafe-inline`/`unsafe-eval`,
  single per-render `nonce`).
- `src/config.ts` — reads/types the four settings; `renderSignature()` feeds the
  render cache (excludes `customCss`, which only affects the shell `<link>`).

HAST plugins (`src/render/plugins/`): `headingAnchors` (slug ids + anchor
links), `resourceUris` (rewrites relative `img`/`a`/`source`/`video`/`audio` to
`webview.asWebviewUri`), `codeHighlight` (Expressive Code / Shiki).

## Security model (do not weaken casually)

The webview runs under a strict CSP with **no `'unsafe-inline'`**. Two
consequences that constrain code changes:

- **Expressive Code's copy-to-clipboard button is deliberately disabled**
  (`codeHighlight.ts`). It's the only runtime EC injects as a
  `<script type="module">`; keeping it would force noncing module scripts in
  `htmlDocument.ts`, which would also whitelist a raw-Markdown
  `<script type="module">` XSS payload. With it off, EC emits no JS, so every
  author-supplied script stays CSP-blocked.
- EC's injected inline `<style>` blocks are post-processed in
  `htmlDocument.ts` (`nonceStyles`) to add the nonce. Scripts are **never**
  nonced there — only the bundled `preview.iife.js` gets the nonce via its
  `<script>` tag.

The code highlighter pins **one** Shiki theme per mode (`github-light` /
`github-dark`) and the panel re-renders on theme-kind flip, rather than emitting
a `prefers-color-scheme` media query.

## Testing

Unit tests run in plain **Bun** (`bun:test`); `bunfig.toml` preloads
`test/setup.ts`, which mocks the `vscode` and `satteri` modules
(`test/mocks/`). So unit tests cover pure logic (HAST plugins, CSP/nonce shell,
config, debounce, frontmatter) without a host or the native engine. The **real**
native binary and `vscode` API are exercised only by the integration suite
(`@vscode/test-electron`, run in CI across Linux/macOS/Windows).
