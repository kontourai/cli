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

# "cli-v<semver>" is accepted as MIGRATION COMPAT only: the first release cut
# in this repo (cli-v0.6.0) was tagged before release-please-config gained
# include-component-in-tag=false. All later tags are plain "v<semver>".
if ! printf '%s' "${TARGET_TAG}" | grep -Eq '^(v|cli-v)[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$'; then
  echo "Target must be a supported immutable release tag (v<semver> or legacy cli-v<semver>), got ${TARGET_TAG}" >&2
  exit 1
fi

# The full refspec deliberately excludes branches and other namespaces.
git fetch --no-tags origin "refs/tags/${TARGET_TAG}:refs/tags/${TARGET_TAG}"
git show-ref --verify --quiet "refs/tags/${TARGET_TAG}"
TARGET_SHA=$(git rev-parse "refs/tags/${TARGET_TAG}^{commit}")
git checkout --detach "${TARGET_SHA}"

PACKAGE_VERSION=$(node -p "JSON.parse(require('node:fs').readFileSync('package.json', 'utf8')).version")
BARE_TAG_VERSION="${TARGET_TAG#cli-v}"
BARE_TAG_VERSION="${BARE_TAG_VERSION#v}"
if [ "${PACKAGE_VERSION}" != "${BARE_TAG_VERSION}" ]; then
  echo "Tag ${TARGET_TAG} does not match package.json version ${PACKAGE_VERSION}" >&2
  exit 1
fi

git fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main
if ! git merge-base --is-ancestor "${TARGET_SHA}" refs/remotes/origin/main; then
  echo "Tagged commit ${TARGET_SHA} is not reachable from the fetched origin/main tip" >&2
  exit 1
fi

echo "target_sha=${TARGET_SHA}" >> "${OUTPUT}"
