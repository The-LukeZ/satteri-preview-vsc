import { describe, it, expect } from "bun:test";
import { renderFrontmatter } from "../../src/render/frontmatter";

describe("renderFrontmatter", () => {
  it("labels the block with the frontmatter kind", () => {
    const out = renderFrontmatter({ kind: "yaml", value: "title: Hi\n" });
    expect(out).toContain("<summary>Frontmatter (yaml)</summary>");
  });

  it("escapes HTML so author frontmatter can't inject markup", () => {
    const out = renderFrontmatter({
      kind: "yaml",
      value: 'x: "<script>alert(1)</script>"\n',
    });
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("trims trailing whitespace from the value", () => {
    const out = renderFrontmatter({ kind: "toml", value: "a = 1\n\n\n" });
    expect(out).toContain("<code>a = 1</code>");
  });
});
