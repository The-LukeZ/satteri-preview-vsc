// Webview-side script. Runs inside the preview panel context (browser-like,
// no Node). Signals readiness and handles in-page anchor clicks (M3), since
// webviews don't do native URL-fragment navigation - heading ids come from the
// headingAnchors HAST plugin.
declare function acquireVsCodeApi(): { postMessage(msg: unknown): void };

const vscode = acquireVsCodeApi();

document.addEventListener("click", (event) => {
  const target = event.target as HTMLElement | null;
  const anchor = target?.closest("a");
  if (!anchor) {
    return;
  }
  const href = anchor.getAttribute("href");
  if (href && href.startsWith("#")) {
    event.preventDefault();
    const id = decodeURIComponent(href.slice(1));
    const dest =
      document.getElementById(id) ??
      document.querySelector(`a[name="${CSS.escape(id)}"]`);
    dest?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

vscode.postMessage({ type: "ready" });
