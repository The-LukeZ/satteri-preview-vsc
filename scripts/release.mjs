#!/usr/bin/env bun
// release.mjs - cross-platform "package after I'm done" pipeline.
// Mirrors ci.yml: typecheck -> build -> unit tests -> integration tests -> package vsix(es)

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { arch, platform } from "node:os";
import path from "node:path";

const EXT_NAME = "satteri-markdown-preview";
const OUT_DIR = "dist";
const ALL_TARGETS = ["linux-x64", "win32-x64", "darwin-arm64"];

const args = process.argv.slice(2);
const skipTests = args.includes("--skip-tests");
const allTargets = args.includes("--all-targets");
const explicitTargets = args
  .flatMap((a, i) => (a === "--target" ? [args[i + 1]] : []))
  .filter(Boolean);

function log(msg) {
  console.log(`\x1b[1;34m[release]\x1b[0m ${msg}`);
}
function warn(msg) {
  console.warn(`\x1b[1;33m[warn]\x1b[0m ${msg}`);
}
function die(msg) {
  console.error(`\x1b[1;31m[error]\x1b[0m ${msg}`);
  process.exit(1);
}

function run(cmd, cmdArgs, opts = {}) {
  log(`$ ${cmd} ${cmdArgs.join(" ")}`);
  const result = spawnSync(cmd, cmdArgs, {
    stdio: "inherit",
    shell: process.platform === "win32", // needed for .cmd shims (bunx, vsce) on Windows
    ...opts,
  });
  if (result.status !== 0) {
    die(`Command failed: ${cmd} ${cmdArgs.join(" ")}`);
  }
}

function detectCurrentTarget() {
  const os = platform();
  const cpu = arch();
  if (os === "linux" && cpu === "x64") return "linux-x64";
  if (os === "darwin" && cpu === "arm64") return "darwin-arm64";
  if (os === "darwin" && cpu === "x64") return "darwin-x64";
  if (os === "win32" && cpu === "x64") return "win32-x64";
  die(`Cannot auto-detect target for ${os}-${cpu}. Use --target.`);
}

const targets = allTargets
  ? ALL_TARGETS
  : explicitTargets.length
    ? explicitTargets
    : [detectCurrentTarget()];

// 1. install
log("Installing dependencies (bun install --frozen-lockfile)");
run("bun", ["install", "--frozen-lockfile"]);

// 2. typecheck
log("Typechecking");
run("bun", ["run", "typecheck"]);

// 3. build
log("Building");
run("bun", ["run", "build"]);

// 4. unit tests
if (!skipTests) {
  log("Running unit tests");
  run("bun", ["test", "test/unit"]);
} else {
  warn("Skipping unit tests (--skip-tests)");
}

// 5. integration tests
if (!skipTests) {
  log("Running integration tests");
  if (platform() === "linux") {
    const hasXvfb = spawnSync("which", ["xvfb-run"]).status === 0;
    if (hasXvfb) {
      run("xvfb-run", ["-a", "bun", "run", "test:integration"]);
    } else {
      warn(
        "xvfb-run not found; attempting test:integration without a virtual display.",
      );
      run("bun", ["run", "test:integration"]);
    }
  } else {
    run("bun", ["run", "test:integration"]);
  }
} else {
  warn("Skipping integration tests (--skip-tests)");
}

// 6. package
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const currentTarget = detectCurrentTarget();

for (const target of targets) {
  if (target !== currentTarget) {
    warn(
      `Target '${target}' does not match current platform ('${currentTarget}').`,
    );
    warn(
      `The native binary for '${target}' may not be installed in node_modules;`,
    );
    warn(
      `run this script on a matching OS/arch (like your CI matrix does) for a correct build.`,
    );
  }
  const outFile = path.join(OUT_DIR, `${EXT_NAME}-${target}.vsix`);
  log(`Packaging target: ${target} -> ${outFile}`);
  run("bunx", ["vsce", "package", "--target", target, "-o", outFile]);
}

log("Done. Artifacts ready for manual upload:");
readdirSync(OUT_DIR).forEach((f) => console.log(`  ${path.join(OUT_DIR, f)}`));
