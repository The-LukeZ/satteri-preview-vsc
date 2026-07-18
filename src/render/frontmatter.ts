import type { Frontmatter } from "satteri";

/**
 * Render the frontmatter block as HTML for display at the top of the preview.
 * Sätteri returns frontmatter as the raw string between the delimiters (not a
 * parsed object), so we show it verbatim in a labeled `<pre>` — no YAML/TOML
 * parser needed, and no author markup is interpreted.
 */
export function renderFrontmatter(fm: Frontmatter): string {
  return `<details class="satteri-frontmatter" open>
<summary>Frontmatter (${fm.kind})</summary>
<pre><code>${escapeHtml(fm.value.trimEnd())}</code></pre>
</details>
`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
