# Sätteri Markdown Preview

<img src="/assets/logo/logo_dark.png" alt="Sätteri logo" width="128" height="128"   />

A VS Code extension that renders a live Markdown preview using
[Sätteri](https://satteri.bruits.org/) (a Rust Markdown/MDX engine) instead of
the built-in `markdown-it` renderer.

> **Status:** early development.

<!-- TODO: add a preview screenshot / GIF here before publishing. -->

![Preview screenshot](/assets/preview_screenshot.png)

## Development

Package manager is **Bun**.

```sh
bun install
bun run build
```

Then press <kbd>F5</kbd> in VS Code to launch the Extension Development Host.
Open a `.md` file and run **Sätteri: Open Preview** from the command palette or click the preview command in the top-right menu bar.

## Commands & keybindings

| Command                           | Keybinding                                        |
| --------------------------------- | ------------------------------------------------- |
| Sätteri: Open Preview             | <kbd>Ctrl/Cmd</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd> |
| Sätteri: Open Preview to the Side | <kbd>Ctrl/Cmd</kbd>+<kbd>K</kbd> <kbd>V</kbd>     |
| Sätteri: Refresh Preview          | -                                                 |

These keybindings match VS Code's **built-in** Markdown preview, so with both
installed the two collide. To make Sätteri win, unbind the built-in ones in your
`keybindings.json`:

```jsonc
{ "key": "ctrl+shift+v", "command": "-markdown.showPreview", "when": "editorLangId == markdown" },
{ "key": "ctrl+k v",     "command": "-markdown.showPreviewToSide", "when": "editorLangId == markdown" }
```

## Settings

| Setting                                  | Default | Description                                                            |
| ---------------------------------------- | ------- | ---------------------------------------------------------------------- |
| `satteriMarkdownPreview.gfm`             | `true`  | GFM (tables, strikethrough, task lists, autolinks, footnotes).         |
| `satteriMarkdownPreview.math`            | `false` | Parse `$…$` / `$$…$$` math (no bundled KaTeX/MathML stylesheet in v1). |
| `satteriMarkdownPreview.showFrontmatter` | `true`  | Show the frontmatter block at the top of the preview.                  |
| `satteriMarkdownPreview.customCss`       | `""`    | Path to an extra stylesheet, loaded after the built-in styles.         |

## Testing

Unit tests run in **Bun** (native `bun:test`); the `vscode` and `satteri`
modules are mocked (see `test/setup.ts`), so they cover the pure logic - HAST
plugins, the HTML shell/CSP, config, debounce - without a host or the native
engine.

```sh
bun test test/unit      # or: bun run test
bun run test:watch
```

Integration tests run the real extension in a throwaway VS Code build via
`@vscode/test-electron`. This is where the native Sätteri binary and the
`vscode` API are actually exercised (extension activates, commands register, a
preview opens). Run from **Windows Terminal**:

```sh
bun run test:integration
```

## Not a remark/rehype-compatible preview

Sätteri has its own MDAST/HAST plugin model (`defineMdastPlugin` /
`defineHastPlugin`). Existing remark/rehype plugins do not work here; features
are implemented against Sätteri's plugin API or as HTML post-processing.
