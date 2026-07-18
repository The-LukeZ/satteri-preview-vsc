// Build-time replacement for `shiki/themes` (see tsdown.config.mts `alias`).
//
// `@expressive-code/plugin-shiki` does `import { bundledThemes } from "shiki/themes"`,
// a static import of the FULL theme registry (~64 themes). Rolldown emits every
// entry of that lazy-import map as its own chunk in dist/, ~1.4 MB of themes we
// never use. This extension pins exactly two themes (github-light / github-dark,
// see src/render/plugins/codeHighlight.ts), so we alias `shiki/themes` to this
// stub: same `bundledThemes` shape, only the two themes, statically imported.
//
// NOTE: `shiki/langs` is deliberately NOT aliased - full language support stays.
// If codeHighlight.ts ever adds a theme, add it here too or Shiki will throw
// "Theme `x` not found" at render time.
import githubDark from "@shikijs/themes/github-dark";
import githubLight from "@shikijs/themes/github-light";

export const bundledThemes = {
  "github-dark": () => Promise.resolve({ default: githubDark }),
  "github-light": () => Promise.resolve({ default: githubLight }),
};

export const bundledThemesInfo = [];

export default bundledThemes;
