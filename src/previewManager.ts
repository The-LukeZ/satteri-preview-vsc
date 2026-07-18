import * as vscode from "vscode";
import { PreviewPanel } from "./previewPanel";
import { Renderer } from "./render/renderer";

/**
 * Tracks one preview panel per document URI. Opening a preview for a document
 * that already has one reveals the existing panel instead of spawning a
 * duplicate.
 */
export class PreviewManager {
  private readonly panels = new Map<string, PreviewPanel>();
  private readonly renderer = new Renderer();

  constructor(private readonly extensionUri: vscode.Uri) {}

  /** Open (or reveal) a preview for the active Markdown editor. */
  open(toSide: boolean): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== "markdown") {
      vscode.window.showWarningMessage("Sätteri: open a Markdown file first.");
      return;
    }

    const document = editor.document;
    const key = document.uri.toString();
    const column = toSide
      ? vscode.ViewColumn.Beside
      : (editor.viewColumn ?? vscode.ViewColumn.One);

    const existing = this.panels.get(key);
    if (existing) {
      existing.reveal(column);
      return;
    }

    const panel = new PreviewPanel(
      document,
      this.extensionUri,
      this.renderer,
      column,
      (p) => this.panels.delete(p.documentUri.toString()),
    );
    this.panels.set(key, panel);
  }

  /** Refresh the preview for the active editor, if one is open. */
  refresh(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    this.panels.get(editor.document.uri.toString())?.refresh();
  }

  dispose(): void {
    for (const panel of this.panels.values()) {
      panel.dispose();
    }
    this.panels.clear();
    this.renderer.dispose();
  }
}
