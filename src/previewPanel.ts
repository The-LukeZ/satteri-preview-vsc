import * as vscode from "vscode";
import * as path from "path";
import { Renderer } from "./render/renderer";
import { renderHtmlDocument, renderErrorBody } from "./render/htmlDocument";
import { themeModeForKind } from "./render/plugins/codeHighlight";
import { readConfig, affectsConfig } from "./config";
import { debounce, type Debounced } from "./util/debounce";

const VIEW_TYPE = "satteriMarkdownPreview";
const DEBOUNCE_MS = 200;

/**
 * Wraps a single WebviewPanel bound to one Markdown document. Owns the panel
 * lifecycle, listens for edits to its document, and re-renders (debounced).
 */
export class PreviewPanel {
  private readonly panel: vscode.WebviewPanel;
  private readonly disposables: vscode.Disposable[] = [];
  private readonly queueUpdate: Debounced<[]>;
  private disposed = false;
  /** Monotonic token; a completed render only writes if it's still the latest. */
  private renderSeq = 0;

  constructor(
    private document: vscode.TextDocument,
    private readonly extensionUri: vscode.Uri,
    private readonly renderer: Renderer,
    column: vscode.ViewColumn,
    private readonly onDisposed: (panel: PreviewPanel) => void,
  ) {
    this.panel = vscode.window.createWebviewPanel(
      VIEW_TYPE,
      this.title(),
      column,
      {
        enableScripts: true,
        localResourceRoots: this.resourceRoots(),
        retainContextWhenHidden: true,
      },
    );

    this.queueUpdate = debounce(() => this.update(), DEBOUNCE_MS);

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() === this.document.uri.toString()) {
          this.queueUpdate();
        }
      },
      null,
      this.disposables,
    );

    // Re-theme code/CSS-var-driven output when the color theme kind changes.
    vscode.window.onDidChangeActiveColorTheme(
      () => void this.update(),
      null,
      this.disposables,
    );

    // Re-render when the user changes our settings (GFM/math/frontmatter/CSS).
    vscode.workspace.onDidChangeConfiguration(
      (e) => {
        if (affectsConfig(e)) {
          this.renderer.invalidate(this.document.uri);
          void this.update();
        }
      },
      null,
      this.disposables,
    );

    void this.update();
  }

  get documentUri(): vscode.Uri {
    return this.document.uri;
  }

  reveal(column: vscode.ViewColumn): void {
    this.panel.reveal(column);
  }

  /** Force an immediate re-render (Refresh command). */
  refresh(): void {
    this.renderer.invalidate(this.document.uri);
    void this.update();
  }

  private async update(): Promise<void> {
    if (this.disposed) {
      return;
    }
    const seq = ++this.renderSeq;
    const mode = themeModeForKind(vscode.window.activeColorTheme.kind);
    const config = readConfig(this.document.uri);

    let body: string;
    try {
      const docDir = vscode.Uri.joinPath(this.document.uri, "..");
      body = (
        await this.renderer.render(
          this.document,
          mode,
          this.panel.webview,
          docDir,
          config,
        )
      ).html;
    } catch (err) {
      body = renderErrorBody(
        err instanceof Error ? (err.stack ?? err.message) : String(err),
      );
    }

    // A newer render (edit or theme flip) superseded this one, or the panel
    // was disposed while the async render was in flight.
    if (this.disposed || seq !== this.renderSeq) {
      return;
    }

    this.panel.title = this.title();
    this.panel.webview.html = renderHtmlDocument({
      webview: this.panel.webview,
      extensionUri: this.extensionUri,
      body,
      title: this.title(),
      customCssUri: this.customCssUri(config.customCss),
    });
  }

  /**
   * Resolve the `customCss` setting to a `Uri`, or `undefined` if unset or not
   * loadable. Absolute paths are used as-is; relative paths resolve against the
   * document's workspace folder (or its containing directory when the file is
   * outside any workspace). The resolved location must be under a
   * `localResourceRoots` entry or the webview silently drops it — see
   * `resourceRoots()`, which whitelists the workspace folder / doc dir.
   */
  private customCssUri(customCss: string): vscode.Uri | undefined {
    if (!customCss) {
      return undefined;
    }
    if (path.isAbsolute(customCss)) {
      return vscode.Uri.file(customCss);
    }
    const base =
      vscode.workspace.getWorkspaceFolder(this.document.uri)?.uri ??
      vscode.Uri.joinPath(this.document.uri, "..");
    return vscode.Uri.joinPath(base, customCss);
  }

  private title(): string {
    return `Preview ${this.basename()}`;
  }

  private basename(): string {
    const parts = this.document.uri.path.split("/");
    return parts[parts.length - 1] || this.document.uri.path;
  }

  private resourceRoots(): vscode.Uri[] {
    const roots = [vscode.Uri.joinPath(this.extensionUri, "media")];
    const folder = vscode.workspace.getWorkspaceFolder(this.document.uri);
    if (folder) {
      roots.push(folder.uri);
    } else {
      // Single-file editing: allow the document's own directory.
      roots.push(vscode.Uri.joinPath(this.document.uri, ".."));
    }
    // Whitelist the custom stylesheet's directory (it may live outside the
    // workspace). Roots are fixed at panel creation, so pointing `customCss` at
    // a new out-of-workspace location needs the preview reopened.
    const cssUri = this.customCssUri(readConfig(this.document.uri).customCss);
    if (cssUri) {
      roots.push(vscode.Uri.joinPath(cssUri, ".."));
    }
    return roots;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.queueUpdate.cancel();
    this.onDisposed(this);
    this.panel.dispose();
    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
  }
}
