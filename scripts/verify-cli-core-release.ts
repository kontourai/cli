import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertExactCoreMetadata, resolveCoreRegistryManifest } from "./npm-release-policy";

// Carried over from kontourai/console (console#264, Route A), where this
// package used to be a workspace and this script could be sourced from a
// fixed current-main checkout so that policy fixes made after a tag was cut
// still applied to that tag's publish. This repo has only one package, so
// `publish-npm.yml` runs this script from a `cli-main` sibling checkout of
// this repo's own main. The MANIFEST DATA it verifies stays tag-authoritative
// by resolving `root` from the process's working directory — the caller sets
// `working-directory` to the immutable tag checkout — never from this file's
// own on-disk location.
const root = process.cwd();
const manifestPath = process.env.PACKAGE_MANIFEST ?? "package.json";
const manifest = JSON.parse(readFileSync(resolve(root, manifestPath), "utf8")) as { dependencies?: Record<string, unknown> };
const spec = manifest.dependencies?.["@kontourai/console-core"];
if (typeof spec !== "string") throw new Error(`${manifestPath} is missing Core dependency`);
const output = execFileSync("npm", ["view", `@kontourai/console-core@${spec}`, "--json"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
assertExactCoreMetadata(spec, resolveCoreRegistryManifest(spec, JSON.parse(output)));
process.stdout.write(`Confirmed compatible @kontourai/console-core@${spec} on npm before ${manifestPath} publication.\n`);
