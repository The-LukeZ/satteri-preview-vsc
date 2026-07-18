import { defineHastPlugin, type HastPluginDefinition } from "satteri";
import * as vscode from "vscode";

/** Attributes rewritten per element: relative paths -> webview URIs. */
const TARGETS: Record<string, string> = {
  img: "src",
  source: "src",
  a: "href",
  video: "src",
  audio: "src",
};

/**
 * A value we must not touch: already-absolute (`http:`, `data:`, `vscode-*:`,
 * `mailto:`…), protocol-relative (`//host`), or an in-page anchor (`#id`).
 *
 * A workspace-absolute path (`/foo`, GitHub-style repo-root) is NOT skipped: it
 * is resolved against `rootDir` (see `resolve`), matching VS Code's built-in
 * Markdown preview. Everything else is relative to the Markdown file's dir.
 */
function isAbsolute(value: string): boolean {
  return (
    value === "" ||
    value.startsWith("#") ||
    value.startsWith("//") ||
    /^[a-z][a-z0-9+.-]*:/i.test(value)
  );
}

/**
 * Resolve a reference to a webview URI. A leading `/` is root-relative and joins
 * against `rootDir` (the workspace root, or the doc's dir outside a workspace);
 * anything else joins against `docDir`. Any `?query`/`#hash` suffix is split off
 * before joining (so it isn't percent-encoded into a path segment) and
 * reattached to the resolved URI.
 */
function resolve(
  webview: vscode.Webview,
  docDir: vscode.Uri,
  rootDir: vscode.Uri,
  ref: string,
): string {
  const suffixAt = ref.search(/[?#]/);
  const path = suffixAt === -1 ? ref : ref.slice(0, suffixAt);
  const suffix = suffixAt === -1 ? "" : ref.slice(suffixAt);
  const rootRelative = path.startsWith("/");
  const base = rootRelative ? rootDir : docDir;
  // joinPath treats its segments as relative, so strip the leading `/`.
  const target = vscode.Uri.joinPath(base, rootRelative ? path.slice(1) : path);
  return webview.asWebviewUri(target).toString() + suffix;
}

/**
 * HAST plugin: rewrite relative `img`/`source`/`video`/`audio` `src` and `a`
 * `href` paths to `webview.asWebviewUri(...)` URIs rooted at the Markdown
 * file's directory, so local images and links load under the webview's strict
 * CSP + `localResourceRoots`. Absolute/protocol/anchor references pass through
 * untouched.
 *
 * Built per (webview, docDir, rootDir): webview URIs are panel-specific, so this
 * must not be a shared cross-document definition - see the cache note in
 * `renderer.ts`. `rootDir` is the workspace root used for `/`-rooted refs (falls
 * back to `docDir` for single-file editing outside any workspace).
 */
export function resourceUrisPlugin(
  webview: vscode.Webview,
  docDir: vscode.Uri,
  rootDir: vscode.Uri,
): HastPluginDefinition {
  return defineHastPlugin({
    name: "satteri-markdown-preview:resource-uris",
    element: {
      filter: Object.keys(TARGETS),
      visit(node, ctx) {
        const attr = TARGETS[node.tagName];
        const value = node.properties?.[attr];
        if (typeof value !== "string" || isAbsolute(value)) {
          return;
        }
        ctx.setProperty(node, attr, resolve(webview, docDir, rootDir, value));
      },
    },
  });
}
