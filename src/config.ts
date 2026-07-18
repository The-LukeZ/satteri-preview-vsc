import * as vscode from "vscode";

export const CONFIG_SECTION = "satteriMarkdownPreview";

/** Resolved extension settings for one document/preview. */
export interface PreviewConfig {
  /** GFM extensions (tables, strikethrough, task lists, autolinks). */
  gfm: boolean;
  /** Parse + render math (`$…$` / `$$…$$`). */
  math: boolean;
  /** Render the parsed frontmatter block at the top of the preview. */
  showFrontmatter: boolean;
  /**
   * Path to an extra stylesheet loaded into the webview. Absolute, or relative
   * to the document's workspace folder (or its containing directory when the
   * file is outside any workspace). Empty string = none.
   */
  customCss: string;
}

/** Read settings, scoped to `scope` so folder/workspace overrides apply. */
export function readConfig(scope?: vscode.Uri): PreviewConfig {
  const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION, scope);
  return {
    gfm: cfg.get<boolean>("gfm", true),
    math: cfg.get<boolean>("math", false),
    showFrontmatter: cfg.get<boolean>("showFrontmatter", true),
    customCss: cfg.get<string>("customCss", "").trim(),
  };
}

/**
 * A stable signature of the settings that affect rendered HTML. Used as part of
 * the render cache key so a settings change busts stale output. `customCss` is
 * excluded - it only affects the webview shell (a `<link>`), not the body.
 */
export function renderSignature(cfg: PreviewConfig): string {
  return `${cfg.gfm ? 1 : 0}${cfg.math ? 1 : 0}${cfg.showFrontmatter ? 1 : 0}`;
}

/** True if a config change event touches this extension's section. */
export function affectsConfig(e: vscode.ConfigurationChangeEvent): boolean {
  return e.affectsConfiguration(CONFIG_SECTION);
}
