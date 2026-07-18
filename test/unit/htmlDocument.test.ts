import { describe, it, expect } from "bun:test";
import { Uri } from "vscode";
import {
  renderHtmlDocument,
  renderErrorBody,
} from "../../src/render/htmlDocument";

const webview = {
  cspSource: "https://vscode-webview.example",
  asWebviewUri: (u: { path: string }) => ({
    toString: () => `https://vscode-webview.example${u.path}`,
  }),
} as never;

const extensionUri = Uri.file("/ext");

function render(body: string, title = "Doc") {
  return renderHtmlDocument({ webview, extensionUri, body, title });
}

function nonceOf(html: string): string {
  const m = /<script nonce="([^"]+)"/.exec(html);
  if (!m) throw new Error("no nonce found");
  return m[1];
}

describe("renderHtmlDocument", () => {
  it("emits a strict CSP with no unsafe-inline/unsafe-eval", () => {
    const html = render("<p>hi</p>");
    const csp =
      /Content-Security-Policy" content="([^"]+)"/.exec(html)?.[1] ?? "";
    expect(csp).toContain("default-src 'none'");
    expect(csp).not.toContain("unsafe-inline");
    expect(csp).not.toContain("unsafe-eval");
  });

  it("restricts scripts to the single nonce", () => {
    const html = render("<p>hi</p>");
    const n = nonceOf(html);
    const csp =
      /Content-Security-Policy" content="([^"]+)"/.exec(html)?.[1] ?? "";
    expect(csp).toContain(`script-src 'nonce-${n}'`);
  });

  it("nonces Expressive Code's injected <style> blocks", () => {
    const html = render("<style>.ec{color:red}</style><p>x</p>");
    const n = nonceOf(html);
    expect(html).toContain(`<style nonce="${n}">.ec{color:red}`);
  });

  it("leaves an author-supplied <script> un-nonced so CSP blocks it", () => {
    const html = render("<script>alert(1)</script>");
    const n = nonceOf(html);
    // The only nonced script is our own preview.iife.js loader.
    const nonced = html.match(new RegExp(`<script nonce="${n}"`, "g")) ?? [];
    expect(nonced).toHaveLength(1);
    expect(html).toContain("<script>alert(1)</script>");
  });

  it("escapes the title", () => {
    const html = render("<p>x</p>", '<x>"&');
    expect(html).toContain("<title>&lt;x&gt;&quot;&amp;</title>");
  });
});

describe("renderErrorBody", () => {
  it("escapes the error message", () => {
    const out = renderErrorBody("<b>boom</b> & <script>");
    expect(out).toContain("&lt;b&gt;boom&lt;/b&gt; &amp; &lt;script&gt;");
    expect(out).not.toContain("<b>boom");
  });
});
