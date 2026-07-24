import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Standalone repo (extracted from kontourai/console): this file used to also
// smoke-test the root @kontourai/console tarball and @kontourai/console-ui,
// packed from sibling monorepo workspaces. Now the CLI package IS the repo
// root and those other packages live in their own repos, so this script is
// scoped to what it can still prove here: the packed @kontourai/cli tarball,
// installed offline alongside its exact-pinned @kontourai/console-core
// dependency (staged from the real npm-resolved node_modules copy, not
// built from source — see stageForPack below) and the three product
// fixture packages.
const cliRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function run(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = {}): string {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...env },
  });
}

function runCombined(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = {}): string {
  const result = spawnSync(command, args, {
    cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...env },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    // tsc writes diagnostics to stdout, not stderr; include both so a failure
    // here is diagnosable from this error alone.
    throw new Error(`${command} exited ${result.status}: ${result.stdout}${result.stderr}`);
  }
  return `${result.stdout}${result.stderr}`;
}

function pack(packageRoot: string, destination: string, options: { ignoreScripts?: boolean } = {}): string {
  const args = ["pack", "--json", "--pack-destination", destination];
  if (options.ignoreScripts) args.push("--ignore-scripts");
  const output = run("npm", args, packageRoot);
  const jsonStart = output.lastIndexOf("\n[");
  const result = JSON.parse(output.slice(jsonStart < 0 ? 0 : jsonStart + 1)) as Array<{ filename: string }>;
  assert.equal(result.length, 1, `Expected one tarball from ${packageRoot}`);
  return join(destination, result[0].filename);
}

// Stages a copy of an already-installed node_modules package with its
// `scripts` field stripped from the STAGED manifest, so `npm pack` on the
// staged copy can never invoke a lifecycle script. This is required, not just
// defensive: npm's `--ignore-scripts` (and `npm_config_ignore_scripts=true`)
// handling for the `prepare` lifecycle is inconsistent across npm major
// versions — npm 10.x (bundled with Node 22) still runs `prepare` on
// `npm pack` despite both, while npm 11.x (bundled with Node 24) does not
// (reproduced directly against a downloaded Node 22.18.0/npm 10.9.3 before
// this fix, confirmed both suppression attempts alone were insufficient).
// These installed copies carry only published-package content (no dev
// source), so any `prepare`/`build` script here always fails regardless — its
// dev-only build inputs are absent — and is never needed for our purpose (we
// only read the already-built `dist` output already present in node_modules).
function stageForPack(sourceDir: string, stagingRoot: string): string {
  const staged = join(stagingRoot, basename(sourceDir));
  mkdirSync(staged);
  cpSync(sourceDir, staged, { recursive: true });
  const manifestPath = join(staged, "package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
  delete manifest.scripts;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return staged;
}

function installOffline(project: string, tarballs: readonly string[], cache: string): void {
  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--package-lock=false", ...tarballs], project, {
    npm_config_offline: "true",
    npm_config_cache: cache,
    npm_config_registry: "http://127.0.0.1:9/registry/",
    HTTP_PROXY: "http://127.0.0.1:9",
    HTTPS_PROXY: "http://127.0.0.1:9",
    NO_PROXY: "",
  });
}

function assertPackedCli(project: string): string {
  const installed = join(project, "node_modules/@kontourai/cli");
  for (const file of [
    "dist/bin/kontour.js",
    "descriptors/flow.json",
    "descriptors/flow-agents.json",
    "descriptors/console.json",
    "schemas/router-output.schema.json",
    "schemas/init-plan.schema.json",
  ]) assert.ok(existsSync(join(installed, file)), `packed @kontourai/cli is missing ${file}`);
  const executable = join(project, "node_modules/.bin/kontour");
  assert.ok(existsSync(executable), "packed @kontourai/cli did not install its advertised kontour bin");
  return executable;
}

function assertPackedCore(project: string): void {
  const installed = join(project, "node_modules/@kontourai/console-core");
  const manifest = JSON.parse(readFileSync(join(installed, "package.json"), "utf8")) as { exports?: Record<string, unknown> };
  // "./intent-binding" (console#232/C5's standalone runner dependency) is
  // asserted alongside the descriptor subpaths so a CLI-only/tag-retry
  // publish can never ship against a Core tarball that is missing the
  // export the runner requires at its own module-load time (2026-07-20
  // security review, finding 4).
  for (const subpath of ["./product-capability-descriptor", "./product-capability-descriptor/node", "./intent-binding"])
    assert.ok(manifest.exports?.[subpath], `packed Core is missing export ${subpath}`);
  for (const file of [
    "dist/product-capability-descriptor.js", "dist/product-capability-descriptor.d.ts",
    "dist/product-capability-descriptor-node.js", "dist/product-capability-descriptor-node.d.ts",
    "dist/intent-binding.js", "dist/intent-binding.d.ts",
    "schemas/product-capability-descriptor.schema.json",
  ]) assert.ok(existsSync(join(installed, file)), `packed Core is missing ${file}`);
  run("node", ["-e", "require('@kontourai/console-core/product-capability-descriptor'); require('@kontourai/console-core/product-capability-descriptor/node'); require('@kontourai/console-core/intent-binding')"], project, { NODE_PATH: "" });
}

function cliSmoke(root: string, tarballs: string[]): void {
  const project = join(root, "cli-project");
  const cache = join(root, "offline-cache-cli");
  run("npm", ["init", "-y"], project);
  installOffline(project, tarballs, cache);
  assertPackedCore(project);
  const kontour = assertPackedCli(project);
  const packageRoot = (product: string) => join(project, "node_modules/@kontourai", product);
  const roots = [
    `--product-root=flow=${packageRoot("flow")}`,
    `--product-root=flow-agents=${packageRoot("flow-agents")}`,
    `--product-root=console=${packageRoot("console")}`,
  ];
  const cleanEnv = { NODE_PATH: "", npm_config_offline: "true", npm_config_registry: "http://127.0.0.1:9/" };
  const products = run(kontour, [...roots, "products", "--json"], project, cleanEnv);
  assert.match(products, /"schemaVersion"|"schema_version"/, "installed CLI did not emit versioned discovery JSON");

  const recordFile = join(root, "routes.jsonl");
  const routeEnv = { ...cleanEnv, KONTOUR_RECORD_FILE: recordFile };
  run(kontour, [...roots, "flow", "kit", "validate", "--fixture-arg"], project, routeEnv);
  run(kontour, [...roots, "flow", "agents", "kit", "status", "--fixture-arg"], project, routeEnv);
  run(kontour, [...roots, "console", "serve", "--help"], project, routeEnv);
  const records = readFileSync(recordFile, "utf8").trim().split("\n").map((line) => JSON.parse(line) as { product: string });
  assert.deepEqual(records.map(({ product }) => product), ["flow", "flow-agents", "console"]);
}

function main(): void {
  const root = mkdtempSync(join(tmpdir(), "kontour-cli-tarball-"));
  const packs = join(root, "packs");
  const staging = join(root, "staging");
  const makeDirectory = (path: string): void => { mkdirSync(path, { recursive: true }); };
  makeDirectory(packs);
  makeDirectory(staging);
  makeDirectory(join(root, "cli-project"));
  // The exact-pinned @kontourai/console-core dependency is packed from this
  // repo's own npm-resolved node_modules copy (published-package content
  // only, no dev source) — see stageForPack() above.
  const consoleCore = pack(stageForPack(join(cliRoot, "node_modules/@kontourai/console-core"), staging), packs, { ignoreScripts: true });
  const cli = pack(cliRoot, packs);
  const fixtures = ["flow", "flow-agents", "console"].map((name) =>
    pack(join(cliRoot, "test/fixtures/packages", name), packs));
  cliSmoke(root, [cli, consoleCore, ...fixtures]);
  process.stdout.write(`Tarball smoke passed: ${basename(cli)} and three product fixtures.\n`);
  rmSync(root, { recursive: true, force: true });
}

main();
