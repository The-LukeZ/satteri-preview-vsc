import type { HastPluginInput } from "satteri";
import expressiveCode from "satteri-expressive-code";
import * as vscode from "vscode";

export type ThemeMode = "light" | "dark";

/**
 * Map a VS Code color-theme kind to our fixed light/dark bucket. Per the M2
 * decision we ship one theme per bucket and re-render on theme change, rather
 * than mapping arbitrary VS Code themes into Expressive Code.
 */
export function themeModeForKind(kind: vscode.ColorThemeKind): ThemeMode {
  switch (kind) {
    case vscode.ColorThemeKind.Light:
    case vscode.ColorThemeKind.HighContrastLight:
      return "light";
    default:
      // Dark + HighContrast (dark) fall through to the dark theme.
      return "dark";
  }
}

const SHIKI_THEME = {
  light: "github-light",
  dark: "github-dark",
} as const;

/**
 * Expressive Code HAST plugin for fenced code blocks, pinned to a single Shiki
 * theme. A single theme keeps output deterministic and avoids the injected
 * `prefers-color-scheme` media query - the panel re-renders when the VS Code
 * theme kind flips, so we always emit exactly the active mode's CSS.
 *
 * The copy-to-clipboard button is disabled: it is the only runtime EC injects
 * as a `<script type="module">`, and keeping it would force us to nonce module
 * scripts in `htmlDocument.ts` - which would also whitelist a raw-Markdown
 * `<script type="module">` XSS payload. With it off, EC emits no JS at all, so
 * the strict CSP can block every author-supplied script unconditionally.
 *
 * NOTE: this plugin's visitor is async, so the enclosing `markdownToHtml` call
 * resolves to a Promise. Its injected `<style>` blocks are nonce-tagged by
 * `htmlDocument.ts` so they survive the strict CSP.
 */
export function codeHighlightPlugin(mode: ThemeMode): HastPluginInput {
  return expressiveCode({
    themes: [SHIKI_THEME[mode]],
    frames: { showCopyToClipboardButton: false },
  });
}
