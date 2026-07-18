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
 * `mailto:`…), protocol-relative (`//host`), an in-page anchor (`#id`), or a
 * workspace-absolute path (`/foo`). Everything else is treated as relative to
 * the Markdown file's directory.
 */
function isAbsolute(value: string): boolean {
  return (
    value === "" ||
    value.startsWith("#") ||
    value.startsWith("//") ||
    value.startsWith("/") ||
    /^[a-z][a-z0-9+.-]*:/i.test(value)
  );
}

/**
 * Resolve a document-relative reference to a webview URI. Any `?query`/`#hash`
 * suffix is split off before joining (so it doesn't get percent-encoded into a
 * path segment) and reattached to the resolved URI.
 */
function resolve(
  webview: vscode.Webview,
  docDir: vscode.Uri,
  ref: string,
): string {
  const suffixAt = ref.search(/[?#]/);
  const path = suffixAt === -1 ? ref : ref.slice(0, suffixAt);
  const suffix = suffixAt === -1 ? "" : ref.slice(suffixAt);
  const target = vscode.Uri.joinPath(docDir, path);
  return webview.asWebviewUri(target).toString() + suffix;
}

/**
 * HAST plugin: rewrite relative `img`/`source`/`video`/`audio` `src` and `a`
 * `href` paths to `webview.asWebviewUri(...)` URIs rooted at the Markdown
 * file's directory, so local images and links load under the webview's strict
 * CSP + `localResourceRoots`. Absolute/protocol/anchor references pass through
 * untouched.
 *
 * Built per (webview, docDir): webview URIs are panel-specific, so this must
 * not be a shared cross-document definition - see the cache note in
 * `renderer.ts`.
 */
export function resourceUrisPlugin(
  webview: vscode.Webview,
  docDir: vscode.Uri,
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
        ctx.setProperty(node, attr, resolve(webview, docDir, value));
      },
    },
  });
}
