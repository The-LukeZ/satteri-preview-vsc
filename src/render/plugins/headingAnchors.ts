import {
  defineHastPlugin,
  type HastContent,
  type HastPluginDefinition,
} from "satteri";

/**
 * Slugify heading text the way GitHub's Markdown does: lowercase, drop anything
 * that isn't a word char / space / hyphen, then collapse whitespace to single
 * hyphens. Kept dependency-free so it survives the Sätteri plugin sandbox.
 */
function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

/**
 * HAST plugin: give every heading a stable `id` (slugified from its text) and
 * prepend a self-referencing anchor link, so a table of contents and in-page
 * `#fragment` links resolve. The webview (`media/preview.ts`) handles the actual
 * smooth-scroll on click, since webviews don't do native fragment navigation.
 *
 * Returned as a factory so the per-document slug-dedup counter resets on each
 * compile rather than leaking counts across documents.
 */
export function headingAnchorsPlugin(): HastPluginDefinition {
  const seen = new Map<string, number>();

  return defineHastPlugin({
    name: "satteri-markdown-preview:heading-anchors",
    element: {
      filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
      visit(node, ctx) {
        // Skip a heading that already carries an explicit id (e.g. via the
        // heading-attributes feature) so authored anchors win.
        const existing = node.properties?.id;
        let slug =
          typeof existing === "string"
            ? existing
            : slugify(ctx.textContent(node));
        if (!slug) {
          return;
        }

        const count = seen.get(slug) ?? 0;
        seen.set(slug, count + 1);
        if (count > 0) {
          slug = `${slug}-${count}`;
          seen.set(slug, 1);
        }

        if (typeof existing !== "string") {
          ctx.setProperty(node, "id", slug);
        }

        const anchor: HastContent = {
          type: "element",
          tagName: "a",
          properties: {
            className: ["heading-anchor"],
            href: `#${slug}`,
            ariaHidden: "true",
            tabIndex: -1,
          },
          children: [{ type: "text", value: "#" }],
        };
        ctx.prependChild(node, anchor);
      },
    },
  });
}
