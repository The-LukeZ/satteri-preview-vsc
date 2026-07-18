import { describe, it, expect, mock } from "bun:test";
import { debounce } from "../../src/util/debounce";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe("debounce", () => {
  it("collapses a burst into a single trailing call", async () => {
    const fn = mock();
    const d = debounce(fn, 20);
    d("a");
    d("b");
    d("c");
    expect(fn).not.toHaveBeenCalled();
    await sleep(40);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith("c");
  });

  it("fires again after the wait window resets", async () => {
    const fn = mock();
    const d = debounce(fn, 20);
    d("x");
    await sleep(40);
    d("y");
    await sleep(40);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("cancel() drops a pending call", async () => {
    const fn = mock();
    const d = debounce(fn, 20);
    d("x");
    d.cancel();
    await sleep(40);
    expect(fn).not.toHaveBeenCalled();
  });

  it("cancel() is safe with nothing pending", () => {
    const fn = mock();
    const d = debounce(fn, 20);
    expect(() => d.cancel()).not.toThrow();
  });
});
