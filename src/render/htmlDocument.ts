import * as vscode from "vscode";

function nonce(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < 32; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export interface HtmlDocumentContext {
  webview: vscode.Webview;
  /** Extension root, used to resolve bundled media assets. */
  extensionUri: vscode.Uri;
  /** Rendered body HTML from the Renderer. */
  body: string;
  /** Document title (shown in nothing user-facing yet; kept for a11y). */
  title: string;
  /** Webview URI of a user-supplied extra stylesheet, if configured. */
  customCssUri?: vscode.Uri;
}

/**
 * Wraps rendered body HTML in a full webview document: strict CSP, nonce'd
 * script tag, themed base stylesheet. CSP allows styles from the webview
 * origin, images from the webview origin plus https/data, and only the single
 * nonce'd `preview.js`.
 */
export function renderHtmlDocument(ctx: HtmlDocumentContext): string {
  const { webview, extensionUri, body, title, customCssUri } = ctx;
  const n = nonce();

  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "preview.css"),
  );
  // Loaded after the base sheet so user rules win. Its origin is covered by the
  // `style-src ${webview.cspSource}` directive.
  const customCssLink = customCssUri
    ? `\n  <link rel="stylesheet" href="${webview.asWebviewUri(customCssUri)}" />`
    : "";
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "preview.iife.js"),
  );

  // Expressive Code injects its theme CSS as inline `<style>` blocks. Tag them
  // with our nonce (see nonceStyles) so they pass the strict CSP without
  // `'unsafe-inline'`. EC's copy button is disabled (see codeHighlight.ts), so
  // no `<script>` is injected - every author-supplied script stays CSP-blocked.
  const bodyHtml = nonceStyles(body, n);

  const csp = [
    `default-src 'none'`,
    `style-src ${webview.cspSource} 'nonce-${n}'`,
    `img-src ${webview.cspSource} https: data:`,
    `font-src ${webview.cspSource}`,
    `script-src 'nonce-${n}'`,
  ].join("; ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="${styleUri}" />${customCssLink}
  <title>${escapeHtml(title)}</title>
</head>
<body>
  <main class="satteri-preview">
${bodyHtml}
  </main>
  <script nonce="${n}" src="${scriptUri}"></script>
</body>
</html>`;
}

/** Body markup for a render/load failure, shown instead of a blank panel. */
export function renderErrorBody(message: string): string {
  return `<div class="satteri-error">
  <h2>Preview failed</h2>
  <pre>${escapeHtml(message)}</pre>
</div>`;
}

/**
 * Add our CSP nonce to Expressive Code's injected `<style>` blocks so they pass
 * the strict CSP. Scripts are never nonced here: EC injects none (copy button
 * off), so any `<script>` in the body is author-supplied raw Markdown and must
 * stay CSP-blocked.
 */
function nonceStyles(html: string, n: string): string {
  return html.replace(/<style(?![^>]*\bnonce=)/gi, `<style nonce="${n}"`);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
