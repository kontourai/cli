import assert from "node:assert/strict";
import test from "node:test";
import { validateReleasePackageVersions } from "./check-release-package-versions";

const baseManifest = { name: "@kontourai/cli", version: "0.5.0", dependencies: { "@kontourai/console-core": "0.3.0" } };
const baseLockfile = {
  name: "@kontourai/cli",
  version: "0.5.0",
  packages: { "": { name: "@kontourai/cli", version: "0.5.0", dependencies: { "@kontourai/console-core": "0.3.0" } } },
};
const baseReleaseConfig = { packages: { ".": {} } };
const baseReleaseManifest = { ".": "0.5.0" };

function input(overrides: Partial<{ manifest: unknown; lockfile: unknown; releaseConfig: unknown; releaseManifest: unknown }> = {}) {
  return {
    manifest: baseManifest,
    lockfile: baseLockfile,
    releaseConfig: baseReleaseConfig,
    releaseManifest: baseReleaseManifest,
    ...overrides,
  };
}

test("matching manifest, lockfile, Release Please config, and manifest pass", () => {
  assert.doesNotThrow(() => validateReleasePackageVersions(input()));
});

test("rejects a manifest whose name is not @kontourai/cli", () => {
  assert.throws(() => validateReleasePackageVersions(input({ manifest: { ...baseManifest, name: "@kontourai/other" } })), /must be @kontourai\/cli/);
});

test("rejects a non-exact Core dependency", () => {
  assert.throws(() => validateReleasePackageVersions(input({ manifest: { ...baseManifest, dependencies: { "@kontourai/console-core": "^0.3.0" } } })), /exact semver/);
});

test("rejects a lockfile whose top-level version does not match the manifest", () => {
  assert.throws(() => validateReleasePackageVersions(input({ lockfile: { ...baseLockfile, version: "0.4.0" } })), /does not match manifest/);
});

test("rejects a lockfile whose root workspace Core dependency drifts from the manifest", () => {
  const drifted = { ...baseLockfile, packages: { "": { ...baseLockfile.packages[""], dependencies: { "@kontourai/console-core": "0.2.0" } } } };
  assert.throws(() => validateReleasePackageVersions(input({ lockfile: drifted })), /does not match manifest Core dependency/);
});

test("rejects a Release Please config missing the \".\" package", () => {
  assert.throws(() => validateReleasePackageVersions(input({ releaseConfig: { packages: {} } })), /must declare the "\." package/);
});

test("rejects a Release Please manifest version that drifts from the package manifest", () => {
  assert.throws(() => validateReleasePackageVersions(input({ releaseManifest: { ".": "0.4.0" } })), /does not match package manifest/);
});
