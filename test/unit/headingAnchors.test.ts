import { describe, it, expect } from "bun:test";
import { headingAnchorsPlugin } from "../../src/render/plugins/headingAnchors";

// Minimal HAST-ish node + a ctx that records the mutations the plugin makes.
interface Node {
  type: "element";
  tagName: string;
  properties?: Record<string, unknown>;
  children: unknown[];
  text: string;
}

function heading(tagName: string, text: string, id?: string): Node {
  return {
    type: "element",
    tagName,
    properties: id ? { id } : {},
    children: [],
    text,
  };
}

function makeCtx() {
  return {
    textContent: (n: Node) => n.text,
    setProperty: (n: Node, key: string, value: unknown) => {
      (n.properties ??= {})[key] = value;
    },
    prependChild: (n: Node, child: unknown) => {
      n.children.unshift(child);
    },
  };
}

// The plugin returns `{ element: { visit } }`; drive the visitor directly.
function run(nodes: Node[]) {
  const plugin = headingAnchorsPlugin() as unknown as {
    element: { visit: (n: Node, ctx: ReturnType<typeof makeCtx>) => void };
  };
  const ctx = makeCtx();
  for (const n of nodes) plugin.element.visit(n, ctx);
}

describe("headingAnchorsPlugin", () => {
  it("slugifies heading text into a stable id", () => {
    const h = heading("h2", "Hello, World!");
    run([h]);
    expect(h.properties?.id).toBe("hello-world");
  });

  it("prepends a self-referencing anchor link", () => {
    const h = heading("h1", "Intro");
    run([h]);
    const anchor = h.children[0] as {
      tagName: string;
      properties: { href: string; className: string[] };
    };
    expect(anchor.tagName).toBe("a");
    expect(anchor.properties.href).toBe("#intro");
    expect(anchor.properties.className).toContain("heading-anchor");
  });

  it("dedupes repeated headings with numeric suffixes", () => {
    const a = heading("h2", "Setup");
    const b = heading("h2", "Setup");
    run([a, b]);
    expect(a.properties?.id).toBe("setup");
    expect(b.properties?.id).toBe("setup-1");
  });

  it("keeps an explicit authored id and does not overwrite it", () => {
    const h = heading("h3", "Whatever", "custom-id");
    run([h]);
    expect(h.properties?.id).toBe("custom-id");
    const anchor = h.children[0] as { properties: { href: string } };
    expect(anchor.properties.href).toBe("#custom-id");
  });

  it("skips a heading with no slug-able text", () => {
    const h = heading("h2", "   ");
    run([h]);
    expect(h.properties?.id).toBeUndefined();
    expect(h.children).toHaveLength(0);
  });

  it("resets its dedup counter per plugin instance (per compile)", () => {
    const a = heading("h2", "Notes");
    run([a]);
    const b = heading("h2", "Notes");
    run([b]); // fresh plugin() => counter reset
    expect(a.properties?.id).toBe("notes");
    expect(b.properties?.id).toBe("notes");
  });
});
