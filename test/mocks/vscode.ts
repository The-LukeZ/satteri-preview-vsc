// Minimal stand-in for the `vscode` module for unit tests. Only the surface our
// source touches at runtime is implemented: `Uri.joinPath`, `Uri.file`,
// `Uri.parse`, and a `toString`. Everything else that source imports from
// `vscode` is a type (erased at compile), so it needs no runtime shape here.

export interface MockUri {
  scheme: string;
  authority: string;
  path: string;
  toString(): string;
}

function make(scheme: string, authority: string, path: string): MockUri {
  return {
    scheme,
    authority,
    path,
    toString() {
      const auth = authority ? `//${authority}` : "";
      return `${scheme}:${auth}${path}`;
    },
  };
}

export const Uri = {
  file(p: string): MockUri {
    return make("file", "", p.startsWith("/") ? p : `/${p}`);
  },
  parse(value: string): MockUri {
    const m = /^([a-z][a-z0-9+.-]*):(?:\/\/([^/]*))?(.*)$/i.exec(value);
    if (!m) return make("file", "", value);
    return make(m[1], m[2] ?? "", m[3] ?? "");
  },
  joinPath(base: MockUri, ...segments: string[]): MockUri {
    const trimmed = base.path.replace(/\/+$/, "");
    const rest = segments.filter((s) => s.length > 0).join("/");
    return make(
      base.scheme,
      base.authority,
      rest ? `${trimmed}/${rest}` : trimmed,
    );
  },
};
