// Stand-in for the native `satteri` module. Unit tests never call the real
// Rust engine (`markdownToHtml`); they build our HAST plugins and invoke their
// visitors directly. `defineHastPlugin`/`defineMdastPlugin` in the real package
// just validate + return the definition, so the mock returns it verbatim.

export function defineHastPlugin<T>(def: T): T {
  return def;
}

export function defineMdastPlugin<T>(def: T): T {
  return def;
}

// The real engine's function; unit tests don't hit it (renderer is covered by
// the electron integration pass). Present so an accidental import doesn't crash
// with an opaque "not a function".
export function markdownToHtml(): never {
  throw new Error("markdownToHtml is not available in unit tests (mock)");
}
