#!/usr/bin/env bash
set -euo pipefail

# Single-package repo: every release tag is "v<semver>" targeting the root
# package.json (workspace "."). Kept as its own script (rather than inlined
# in publish-npm.yml) to mirror kontourai/console's Route A pattern this repo
# was extracted from: it still validates tag format, that the tag matches the
# checked-out package.json version, and that the tagged commit is reachable
# from origin/main before any publish step trusts it.
TARGET_TAG=${1:?Usage: resolve-release-target.sh <release-tag>}
OUTPUT=${GITHUB_OUTPUT:-/dev/stdout}

if ! printf '%s' "${TARGET_TAG}" | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$'; then
  echo "Target must be a supported immutable release tag (v<semver>), got ${TARGET_TAG}" >&2
  exit 1
fi

# The full refspec deliberately excludes branches and other namespaces.
git fetch --no-tags origin "refs/tags/${TARGET_TAG}:refs/tags/${TARGET_TAG}"
git show-ref --verify --quiet "refs/tags/${TARGET_TAG}"
TARGET_SHA=$(git rev-parse "refs/tags/${TARGET_TAG}^{commit}")
git checkout --detach "${TARGET_SHA}"

PACKAGE_VERSION=$(node -p "JSON.parse(require('node:fs').readFileSync('package.json', 'utf8')).version")
if [ "v${PACKAGE_VERSION}" != "${TARGET_TAG}" ]; then
  echo "Tag ${TARGET_TAG} does not match package.json version v${PACKAGE_VERSION}" >&2
  exit 1
fi

git fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main
if ! git merge-base --is-ancestor "${TARGET_SHA}" refs/remotes/origin/main; then
  echo "Tagged commit ${TARGET_SHA} is not reachable from the fetched origin/main tip" >&2
  exit 1
fi

echo "target_sha=${TARGET_SHA}" >> "${OUTPUT}"
