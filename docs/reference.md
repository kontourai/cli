---
title: Reference
description: Commands, options, exit codes, error codes, and the programmatic exports of @kontourai/cli.
---

# Reference

## Command line

```text
kontour [--product-root=<product>=<absolute-root>]... <command> [options]
```

### Router options

#### --product-root

`--product-root=<product>=<absolute-root>` points the router at a product package. `<product>` is `flow`, `flow-agents`, or `console`, and the root must be an absolute path. Give at most one root per product. The option is accepted only before the command, and it overrides installed-package discovery.

#### --help

`--help` and `-h` print usage and exit `0` when they are the first token after any `--product-root` options. `kontour init --help` prints the `init` usage. Help renders before any product discovery or root validation. After a built-in command, `--help` is not help: `kontour products --help` exits `2`. After a product command it is passed through to the product.

### Built-in commands

| Command | Arguments | What it does |
| --- | --- | --- |
| `kontour products` | `[--json]` | Lists each product with its package, version, availability, protocol compatibility, and descriptor source. |
| `kontour capabilities` | `[flow\|flow-agents\|console] [--json]` | As `products`, plus each product's commands (side effect and confirmation), artifacts, and projections. A product id narrows the report. |
| `kontour doctor` | `[--json]` | As `products`, plus remediation commands for missing or incompatible products. |
| `kontour init` | see below | Inspect, plan, or apply a pinned Flow Agents setup. |

`products` and `doctor` accept only `--json`. `--json` may appear anywhere after the command. `--online` is reserved and refused with `ROUTER_ARGUMENT_INVALID`: the router performs no network access.

Availability is `available`, `missing`, or `incompatible`. Output carries a `schemaVersion`, the `command`, a list of `products`, and a flat list of `diagnostics`. The JSON shape is published as `schemas/router-output.schema.json`.

### init

```text
kontour init <--inspect|--plan|--apply> [--runtime <runtime>] [--kit <id>]... [--plan-id <sha256>] [--yes] [--json]
```

| Option | Meaning |
| --- | --- |
| `--inspect` | Run read-only Flow Agents diagnostics and report. |
| `--plan` | Compute the deterministic plan and its SHA-256 id. Writes nothing. |
| `--apply` | Run the approved plan. Requires `--plan-id` and `--yes`. |
| `--runtime` | One of `base`, `codex`, `claude-code`, `kiro`, `opencode`, `pi`. Default `codex`. |
| `--kit` | A kit catalog id: lowercase letters, digits, and hyphens, up to 64 characters, starting with a letter or digit. Repeatable; duplicates are removed. Default none. |
| `--plan-id` | The id from `--plan`. Must match the live repository and package state. |
| `--yes` | Explicit consent to apply. |
| `--json` | Machine-readable output. |

Exactly one of `--inspect`, `--plan`, `--apply` is required. The behavior, consent model, and failure handling are described in [Kontour Init](kontour-init.md).

### Delegated commands

Any other command is matched against the namespaces in the [router specification](kontour-cli-router.md#namespace-and-ownership). The commands each product declares in the bundled compatibility catalog are:

| Namespace | Commands |
| --- | --- |
| `kontour console` | `inspect`, `serve` |
| `kontour flow` | `status`, `start`, `cancel`, `kit validate`, `kit install`, `kit inspect` |
| `kontour flow agents` | `init`, `telemetry-doctor`, `workflow status`, `workflow start`, `workflow cancel`, `kit install`, `kit activate`, `kit status` |

A product that ships its own descriptor takes over as the reported source, but only when its package version equals the version the catalog expects. Run `kontour capabilities` to see what your installation exposes. A descriptor's declared argument vector replaces the matched command words, so `kontour console inspect` runs Console's `console-inspect` bin with no `inspect` argument.

## Limits

The router refuses a command line with more than 256 tokens, a token longer than 4096 characters, or a token containing a NUL, carriage return, or newline. The refusal is `ROUTER_ARGUMENT_INVALID`.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success, including help. |
| `2` | The router refused or could not route the request (diagnostics are written to stderr as `CODE: message`). |
| `70` | An internal error (`KONTOUR_INTERNAL_ERROR`). |
| other | For a delegated command, the product's own exit code. If the product is ended by a signal, `128` plus the signal number. |

`kontour init --apply` returns the exit code of the first failed action, or `0`.

## Diagnostic codes

| Code | Raised when |
| --- | --- |
| `ROUTER_ARGUMENT_INVALID` | Bad or duplicate `--product-root`, oversized arguments, `--online`, or extra arguments to `products` or `doctor`. |
| `ROUTER_NAMESPACE_UNKNOWN` | The first words are not `flow`, `flow agents`, or `console`. |
| `ROUTER_COMMAND_UNKNOWN` | The product's descriptor does not declare the command. |
| `ROUTER_PRODUCT_UNKNOWN` | `capabilities` was given something other than a product id. |
| `ROUTER_PRODUCT_MISSING` | A warning in `products`, `capabilities`, and `doctor` output: no installed package was found for the product. |
| `DESCRIPTOR_EXECUTABLE_MISSING` | You delegated to a product that is not installed. The message gives install commands. |
| `DESCRIPTOR_MALFORMED` | An installed product failed identity, version, or descriptor checks (wrong package name, a version other than the catalog's, a symlinked root, a bad descriptor). Delegation is refused and the product shows as `incompatible`. |
| `KONTOUR_DELEGATION_SPAWN_FAILED` | The product executable could not be started. |

`init` adds:

- `KONTOUR_INIT_ARGUMENT_INVALID`: no mode or more than one, an unknown token, or a bad runtime or kit id.
- `KONTOUR_INIT_FLOW_AGENTS_REQUIRED`: Flow Agents is missing or incompatible.
- `KONTOUR_INIT_EXACT_VERSION_REQUIRED`: Flow Agents, or the Flow package it depends on, is not the pinned version.
- `KONTOUR_INIT_CONSENT_REQUIRED`: `--apply` without `--yes` or without `--plan-id`.
- `KONTOUR_INIT_PLAN_INVALID`: the plan id no longer matches live repository and package state.
- `KONTOUR_INIT_REPOSITORY_DRIFT`: the repository changed identity before execution.

An unexpected failure while reading the Flow Agents package graph (for example a declared dependency that is not installed) surfaces as `KONTOUR_INTERNAL_ERROR` with exit `70`.

## Package exports

`@kontourai/cli` is CommonJS and exports:

- The root entry (`dist/index.js`, with types). It exposes `runCli`, the routing and discovery functions (`parseCommandLine`, `selectNamespace`, `routeCommand`, `discoverProducts`, `discoverFromOptions`, `resolveDiscoveredExecutable`), the output builders (`buildRouterOutput`, `renderRouterOutput`), the help helpers (`helpScope`, `renderHelp`), the install-policy validators (`validateExactPackageSpec`, `validateExplicitDownloadSpecs`, `missingProductRemediation`), the `compatibilityCatalog` and its version constants, the output comparators, and the standalone runner (`createStandaloneRunner`, `resolveStandaloneProductBinding`, `StandaloneRunnerExecutionError`). `src/index.ts` is the authoritative list.
- `@kontourai/cli/schemas/router-output.schema.json`, the JSON Schema for `products`, `capabilities`, and `doctor` output.
- `@kontourai/cli/schemas/init-plan.schema.json`, the JSON Schema for the `init` plan.

The package ships one executable, `kontour`.
