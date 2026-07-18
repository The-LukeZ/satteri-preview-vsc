import { mock } from "bun:test";
import * as satteriMock from "./mocks/satteri";
import * as vscodeMock from "./mocks/vscode";

// `vscode` is provided by the extension host and `satteri` is a native napi-rs
// module - neither resolves in a plain Bun test process. Intercept both so
// source modules that `import ... from "vscode"/"satteri"` get the mocks.
mock.module("vscode", () => vscodeMock);
mock.module("satteri", () => satteriMock);
