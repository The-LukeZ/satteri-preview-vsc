import * as vscode from "vscode";
import { PreviewManager } from "./previewManager";

export function activate(context: vscode.ExtensionContext): void {
  const manager = new PreviewManager(context.extensionUri);
  context.subscriptions.push({ dispose: () => manager.dispose() });

  context.subscriptions.push(
    vscode.commands.registerCommand("satteriMarkdownPreview.open", () =>
      manager.open(false),
    ),
    vscode.commands.registerCommand("satteriMarkdownPreview.openToSide", () =>
      manager.open(true),
    ),
    vscode.commands.registerCommand("satteriMarkdownPreview.refresh", () =>
      manager.refresh(),
    ),
  );
}

export function deactivate(): void {
  // Subscriptions dispose the manager (and all panels) automatically.
}
