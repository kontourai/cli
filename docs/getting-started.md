---
title: Getting started
description: Install the kontour router, see which Kontour products it can find, and run your first delegated command.
---

# Getting started

`@kontourai/cli` installs one command, `kontour`. It finds the Kontour product packages you have installed (Flow, Flow Agents, Console) and hands your command to the product that owns it. This page takes you from install to a first delegated command.

## Requirements

Node.js 22 or newer.

## Install

```sh
npm install --global @kontourai/cli
```

The router never installs products for you. Install the ones you want yourself, with exact versions, into the same `node_modules` as the router (see [Installing products](#installing-products)).

## See what the router found

Three read-only commands report on the products. They work offline and change nothing.

```sh
kontour products       # which products are available, missing, or incompatible
kontour capabilities   # the commands, artifacts, and projections each product declares
kontour doctor         # the same report; the text form also prints remediation for anything missing or incompatible
```

Each accepts `--json` for machine-readable output. `capabilities` also accepts one product id (`console`, `flow`, or `flow-agents`) to narrow the report:

```sh
kontour capabilities flow-agents --json
```

A product that is not installed shows as `missing`. `doctor` then prints package-level install commands for the version the router's catalog expects. The JSON output of all three commands carries the same `remediation` lists.

## Run a product command

Put the product's namespace first. The router resolves the product's executable and runs it with your remaining arguments, in your current directory, with your terminal attached.

```sh
kontour console serve
kontour flow status
kontour flow agents workflow status
```

The router only runs commands that the product's descriptor declares. A command that is not declared is refused with `ROUTER_COMMAND_UNKNOWN`. See the [namespace table](kontour-cli-router.md#namespace-and-ownership) for which namespace belongs to which product.

## Installing products

The router looks for each product package in one place: the `node_modules` directory that holds the installed `@kontourai/cli` package, at `<that node_modules>/<package name>`. It does not search `$PATH`, parent directories, home directories, or the network. A router installed globally therefore sees products installed in the same global `node_modules`, not products installed in a project. A package that is a symlink (as with `npm link` or pnpm) is reported as `incompatible`, not found.

For a reproducible setup, install the router and the products together, with exact versions:

```sh
npm install --save-exact @kontourai/cli@<exact-version> @kontourai/console@<exact-version>
```

For a one-off run, name each package on the `npx` command. The `--package` flags are your consent to install; the router itself never runs npm.

```sh
npx --yes \
  --package @kontourai/cli@<exact-version> \
  --package @kontourai/console@<exact-version> \
  kontour console serve
```

If a product lives somewhere the router would not look, point at it with `--product-root`:

```sh
kontour --product-root=console=/absolute/path/to/console-package products
```

## Next steps

- [Concepts](concepts.md) explains descriptors, discovery, delegation, and the compatibility catalog.
- [Reference](reference.md) lists every command, option, error code, and exit code.
- [Kontour Init](kontour-init.md) covers `kontour init`, the onboarding transaction for Flow Agents.
