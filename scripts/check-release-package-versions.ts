#!/usr/bin/env -S node --import tsx

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type JsonRecord = Record<string, unknown>;

function record(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as JsonRecord;
}

function identity(value: unknown, label: string): { name: string; version: string } {
  const item = record(value, label);
  if (typeof item.name !== "string" || typeof item.version !== "string") throw new Error(`${label} must contain string name and version fields`);
  return { name: item.name, version: item.version };
}

// Single-package repo (extracted from kontourai/console#extract-cli, where
// this was one of several packages guarded together): keeps the same
// anti-drift discipline — manifest, lockfile, release-please config, and the
// Release Please manifest must all agree — scoped to the one package that
// exists here.
export function validateReleasePackageVersions(input: { manifest: unknown; lockfile: unknown; releaseConfig: unknown; releaseManifest: unknown }): void {
  const manifest = identity(input.manifest, "package manifest");
  if (manifest.name !== "@kontourai/cli") throw new Error(`package manifest name ${manifest.name} must be @kontourai/cli`);
  const manifestRecord = record(input.manifest, "package manifest");
  const dependency = record(manifestRecord.dependencies, "package manifest dependencies")["@kontourai/console-core"];
  if (typeof dependency !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(dependency)) throw new Error("package manifest Core dependency must be an exact semver version");

  const lockfile = record(input.lockfile, "package lock");
  const lockRootIdentity = identity(lockfile, "package lock");
  if (lockRootIdentity.name !== manifest.name) throw new Error(`package lock top-level name ${lockRootIdentity.name} does not match manifest ${manifest.name}`);
  if (lockRootIdentity.version !== manifest.version) throw new Error(`package lock top-level version ${lockRootIdentity.version} does not match manifest ${manifest.version}`);
  const lockPackages = record(lockfile.packages, "package lock packages");
  const lockWorkspace = identity(lockPackages[""], "package lock root workspace");
  if (lockWorkspace.name !== manifest.name) throw new Error(`package lock workspace name ${lockWorkspace.name} does not match manifest ${manifest.name}`);
  if (lockWorkspace.version !== manifest.version) throw new Error(`package lock workspace version ${lockWorkspace.version} does not match manifest ${manifest.version}`);
  const lockDependency = record(record(lockPackages[""], "package lock root workspace").dependencies, "package lock dependencies")["@kontourai/console-core"];
  if (lockDependency !== dependency) throw new Error("package lock Core dependency does not match manifest Core dependency");

  const releaseConfig = record(input.releaseConfig, "Release Please config");
  const releasePackages = record(releaseConfig.packages, "Release Please packages");
  if (!("." in releasePackages)) throw new Error('Release Please config must declare the "." package');

  const releaseManifest = record(input.releaseManifest, "Release Please manifest");
  if (releaseManifest["."] !== manifest.version) throw new Error(`Release Please manifest "." version ${String(releaseManifest["."])} does not match package manifest ${manifest.version}`);
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function checkReleasePackageVersions(repositoryRoot = resolve(__dirname, "..")): void {
  validateReleasePackageVersions({
    manifest: readJson(resolve(repositoryRoot, "package.json")),
    lockfile: readJson(resolve(repositoryRoot, "package-lock.json")),
    releaseConfig: readJson(resolve(repositoryRoot, "release-please-config.json")),
    releaseManifest: readJson(resolve(repositoryRoot, ".release-please-manifest.json")),
  });
}

if (require.main === module) {
  try {
    checkReleasePackageVersions();
    process.stdout.write("Release package manifest, lock, and Release Please identities match.\n");
  } catch (error) {
    process.stderr.write(`RELEASE_PACKAGE_VERSION_MISMATCH: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
