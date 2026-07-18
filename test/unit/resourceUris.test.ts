import { describe, it, expect } from "bun:test";
import { Uri } from "vscode";
import { resourceUrisPlugin } from "../../src/render/plugins/resourceUris";

interface Node {
  type: "element";
  tagName: string;
  properties: Record<string, unknown>;
}

// Stub webview: asWebviewUri rewrites any uri to a fixed webview origin so we
// can assert on the rewritten prefix.
const webview = {
  cspSource: "https://vscode-webview.example",
  asWebviewUri: (u: { path: string }) => ({
    toString: () => `https://vscode-webview.example${u.path}`,
  }),
} as never;

const docDir = Uri.file("/home/user/docs");
const rootDir = Uri.file("/home/user");

function visitEl(tagName: string, properties: Record<string, unknown>): Node {
  const plugin = resourceUrisPlugin(webview, docDir, rootDir) as unknown as {
    element: {
      visit: (
        n: Node,
        ctx: {
          setProperty: (n: Node, k: string, v: unknown) => void;
        },
      ) => void;
    };
  };
  const node: Node = { type: "element", tagName, properties };
  plugin.element.visit(node, {
    setProperty: (n, k, v) => {
      n.properties[k] = v;
    },
  });
  return node;
}

describe("resourceUrisPlugin", () => {
  it("rewrites a relative img src to a webview uri", () => {
    const n = visitEl("img", { src: "pics/cat.png" });
    expect(n.properties.src).toBe(
      "https://vscode-webview.example/home/user/docs/pics/cat.png",
    );
  });

  it("rewrites a relative anchor href", () => {
    const n = visitEl("a", { href: "other.md" });
    expect(n.properties.href).toBe(
      "https://vscode-webview.example/home/user/docs/other.md",
    );
  });

  it.each([
    ["http://example.com/x.png"],
    ["https://example.com/x.png"],
    ["data:image/png;base64,AAAA"],
    ["//cdn.example.com/x.png"],
    ["#in-page-anchor"],
    ["mailto:a@b.com"],
    [""],
  ])("passes through absolute/special reference %s", (ref) => {
    const n = visitEl("img", { src: ref });
    expect(n.properties.src).toBe(ref);
  });

  it("resolves a /-rooted (GitHub-style) path against the workspace root", () => {
    const n = visitEl("img", { src: "/assets/logo.png" });
    expect(n.properties.src).toBe(
      "https://vscode-webview.example/home/user/assets/logo.png",
    );
  });

  it("splits a ?query/#hash suffix before joining and reattaches it", () => {
    const n = visitEl("a", { href: "page.md#section?v=1" });
    expect(n.properties.href).toBe(
      "https://vscode-webview.example/home/user/docs/page.md#section?v=1",
    );
  });

  it("ignores a non-string attribute value", () => {
    const n = visitEl("img", { src: 42 });
    expect(n.properties.src).toBe(42);
  });
});
