import { markdownToHtml, type Features, type Frontmatter } from "satteri";
import * as vscode from "vscode";
import { renderSignature, type PreviewConfig } from "../config";
import { renderFrontmatter } from "./frontmatter";
import { codeHighlightPlugin, type ThemeMode } from "./plugins/codeHighlight";
import { headingAnchorsPlugin } from "./plugins/headingAnchors";
import { resourceUrisPlugin } from "./plugins/resourceUris";

export interface RenderResult {
  html: string;
  frontmatter: Frontmatter | null;
}

/**
 * Renders a document's Markdown to HTML via Sätteri and caches the result
 * keyed by document version + theme mode, so repeated renders of an unchanged
 * document (e.g. tab focus changes) skip the native + Expressive Code work.
 *
 * Async because the Expressive Code HAST plugin's visitor is async, which makes
 * `markdownToHtml` resolve to a Promise.
 */
export class Renderer {
  private readonly cache = new Map<
    string,
    { version: number; mode: ThemeMode; sig: string; result: RenderResult }
  >();

  /**
   * `webview` + `docDir` feed the resource-URI plugin, which rewrites relative
   * `img`/`a` paths to panel-specific webview URIs. Because that output is
   * webview-specific, the cache key includes `webview.cspSource` (a per-webview
   * authority) - two panels on the same document don't share a rewrite.
   */
  async render(
    document: vscode.TextDocument,
    mode: ThemeMode,
    webview: vscode.Webview,
    docDir: vscode.Uri,
    config: PreviewConfig,
  ): Promise<RenderResult> {
    const sig = renderSignature(config);
    const key = `${document.uri.toString()}\n${webview.cspSource}`;
    const cached = this.cache.get(key);
    if (
      cached &&
      cached.version === document.version &&
      cached.mode === mode &&
      cached.sig === sig
    ) {
      return cached.result;
    }

    const features: Features = {
      gfm: config.gfm,
      frontmatter: true,
      math: config.math,
    };
    const { html, frontmatter } = await markdownToHtml(document.getText(), {
      features,
      hastPlugins: [
        headingAnchorsPlugin,
        resourceUrisPlugin(webview, docDir),
        codeHighlightPlugin(mode),
      ],
    });
    // Frontmatter never comes back inside `html`; prepend a rendered block when
    // the user opts in to displaying it.
    const body =
      config.showFrontmatter && frontmatter
        ? renderFrontmatter(frontmatter) + html
        : html;
    const result: RenderResult = { html: body, frontmatter };

    this.cache.set(key, { version: document.version, mode, sig, result });
    return result;
  }

  invalidate(uri: vscode.Uri): void {
    // Keys are `<uri>\n<webview.cspSource>`, so one document may have several
    // entries (one per panel). Drop every entry for this document.
    const prefix = `${uri.toString()}\n`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  dispose(): void {
    this.cache.clear();
  }
}
