# Kontour CLI

[![CI](https://github.com/kontourai/cli/actions/workflows/ci.yml/badge.svg)](https://github.com/kontourai/cli/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

**Offline-first suite router for Kontour products.**

`@kontourai/cli` provides the suite-level `kontour` command. It owns navigation, descriptor discovery, diagnostics, and safe subprocess delegation across [Flow](https://kontourai.io/flow), [Flow Agents](https://kontourai.io/flow-agents), and [Console](https://kontourai.io/console). It does not implement product commands, import product kernels, download products, or acquire authority to mutate product state.

> This package was extracted from [`kontourai/console`](https://github.com/kontourai/console) (where it lived at `cli/`) into its own repository because it is a cross-product suite router, not a Console-owned tool. Its only runtime dependency is the shared, exact-pinned [`@kontourai/console-core`](https://github.com/kontourai/console/tree/main/console-core) package. Issue history predating the move remains at `kontourai/console`.

## Install and invoke

Node.js 22 or newer is required. Install the router explicitly:

```sh
npm install --global @kontourai/cli
kontour products
kontour capabilities
kontour doctor
kontour console serve
```

For a one-off invocation, pin the router version and opt into each product package explicitly:

```sh
npx --yes \
  --package @kontourai/cli@<exact-version> \
  --package @kontourai/console@<exact-version> \
  kontour console serve
```

`npx` package flags are installation consent. The router itself never invokes npm, searches a registry, downloads a missing package, or silently changes a version. It resolves sibling product packages from the installed CLI's normal Node package graph. For reproducible and offline work, preinstall exact package versions and retain the npm cache or a lockfile-backed installation. A missing local product produces exact package-level install and one-shot commands rather than a network fallback.

See the [Kontour CLI Router specification](docs/kontour-cli-router.md) for installed discovery, explicit product roots, namespace ownership, transparency/confirmation boundaries, and compatibility-catalog provenance, and [Kontour Init](docs/kontour-init.md) for the `kontour init` onboarding transaction.

## Published package

- `@kontourai/cli` — the offline-first suite router (`kontour` bin) for Flow, Flow Agents, and Console product delegation. Exact-pins `@kontourai/console-core` and validates that pin's registry-visible metadata before every release.

## Development

```sh
npm ci
npm run typecheck
npm test
npm run check:import-boundary
npm run build
```

- `npm test` runs the unit/integration suite (`test/*.test.ts`).
- `npm run check:import-boundary` enforces that the router never imports product runtimes, unapproved `@kontourai/console-core` entrypoints, or denied Node built-ins — statically over source, over the compiled `dist` output, and against a negative fixture that must still trip the check.
- `npm run test:tarball` packs the CLI (plus the resolved `@kontourai/console-core` dependency and the three product test fixtures) and smoke-tests the packed artifact fully offline.
- `npm run test:init-e2e` and `npm run test:registry-regression` are network-dependent end-to-end checks against real, published `@kontourai/flow-agents`/`@kontourai/flow`/`@kontourai/cli` versions; they are not part of the default CI gate.

## License

Apache-2.0. See [LICENSE](LICENSE).
