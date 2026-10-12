---
title: Concepts
description: How the kontour router discovers products, validates descriptors, and delegates commands without taking over product authority.
---

# Concepts

`kontour` is a router, not a product. It owns navigation, discovery, diagnostics, and safe delegation. Everything a command actually does belongs to the product that declares it.

## Products and namespaces

The router knows three products. Each owns a namespace.

| Product id | Package | Namespace |
| --- | --- | --- |
| `flow` | `@kontourai/flow` | `kontour flow ...` |
| `flow-agents` | `@kontourai/flow-agents` | `kontour flow agents ...` |
| `console` | `@kontourai/console` | `kontour console ...` |

Namespaces match by longest prefix, so `flow agents` goes to Flow Agents before the general `flow` namespace is considered. The router removes that prefix, matches the rest against the product's declared commands, and runs the declared executable with the descriptor's argument vector followed by whatever you typed after the command. The full table, including the kit commands, is in the [router specification](kontour-cli-router.md#namespace-and-ownership).

## Descriptors

A product describes itself with a capability descriptor: its identity, its executables, and each command it exposes, including the command's side effect (`read-local` or `write-local`, for example) and what confirmation it needs (`never` or `user-request`). `kontour capabilities` shows this metadata. It is transparency, not consent.

A descriptor comes from one of two places:

- **Product-owned.** A package ships `product-capability-descriptor.json`. Its presence always makes it the reported source, even if it fails validation, so a broken product-owned descriptor is reported as a problem rather than silently replaced. The package version must still equal the version the catalog expects.
- **The compatibility catalog.** The router bundles a descriptor for each product, with the package version it was derived from. This is a temporary bridge for products that do not ship their own yet. Each entry records its provenance and a removal trigger.

Every descriptor, from either source, is validated before use. The catalog never supplies executable code or install instructions.

## Discovery

For each product, the router resolves a package root in this order:

1. An explicit `--product-root=<product>=<absolute-root>` option.
2. The package of that name in the `node_modules` directory that holds the installed `@kontourai/cli`. This is a single directory lookup, not a walk up the directory tree, so a project-local product is invisible to a globally installed router.

It then reads that package's own `package.json` to establish the package name, version, and `bin` map. It does not trust the caller's description of the package. A root whose name does not match, or whose version differs from the one the catalog expects, is reported as incompatible. So is an installed package that is a symlink. A product with no root is reported as missing.

Discovery is offline. There is no network fallback.

## Delegation

When you run a product command, the router:

1. Selects the namespace and matches the command against the descriptor.
2. Resolves the declared executable to a real file inside the product package.
3. Runs it as an argument vector with no shell, in your current directory, with your standard streams.
4. Forwards `SIGINT` and `SIGTERM` to the child and returns the child's exit code.

The product keeps all authority over its own artifacts, gates, confirmations, exit status, and signal behavior. The router cannot skip a step, grant an exception, or reinterpret a failure.

## Consent and install policy

Showing a command's side effects is not permission to run it. The router never invokes npm, never downloads a missing product, and never changes a version on its own. When a product is missing it prints inert, copy-paste install commands pinned to the exact version the catalog expects; you run them yourself. Tags, ranges, and alternate package sources are not accepted as package specs.

## Init as a transaction

`kontour init` is the one place the router coordinates more than a single command. It builds a deterministic plan from a repository and the installed Flow Agents package, shows it, and applies it only when you pass the plan's SHA-256 id and `--yes`. Each action in the plan is delegated to Flow Agents. See [Kontour Init](kontour-init.md).

## What the router does not do

It does not implement product commands, import product code, host Station, merge packages, authorize side effects, or manage upgrades. Flow, Flow Agents, and Console stay independently usable through their own commands.
