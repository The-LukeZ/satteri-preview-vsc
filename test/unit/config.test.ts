import { describe, it, expect } from "bun:test";
import { renderSignature } from "../../src/config";
import type { PreviewConfig } from "../../src/config";

const base: PreviewConfig = {
  gfm: false,
  math: false,
  showFrontmatter: false,
  customCss: "",
};

describe("renderSignature", () => {
  it("encodes the three body-affecting flags as 0/1", () => {
    expect(renderSignature(base)).toBe("000");
    expect(renderSignature({ ...base, gfm: true })).toBe("100");
    expect(renderSignature({ ...base, math: true })).toBe("010");
    expect(renderSignature({ ...base, showFrontmatter: true })).toBe("001");
    expect(
      renderSignature({
        ...base,
        gfm: true,
        math: true,
        showFrontmatter: true,
      }),
    ).toBe("111");
  });

  it("ignores customCss (it only affects the shell, not the body)", () => {
    expect(renderSignature({ ...base, customCss: "/a.css" })).toBe(
      renderSignature({ ...base, customCss: "/b.css" }),
    );
  });
});
