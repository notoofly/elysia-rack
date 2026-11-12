# Installation

elysia-rack is distributed as the `elysia-rack` package on npm. Installation is the same on Linux, macOS, and Windows. The only difference is whether you use Bun or Node.js as your package manager and runtime.

Before you begin, read [Prerequisites](prerequisites.md).

## Install with Bun

Run this command in the root of your application:

```bash
bun add elysia-rack elysia react react-dom
```

This command does three things:

- Adds `elysia-rack` to your dependency list.
- Installs the required Elysia, React, and React DOM peer packages.
- Updates your lockfile.

If you use the Drizzle adapter, also install Drizzle ORM:

```bash
bun add drizzle-orm
```

Prisma users do not need to install `drizzle-orm`.

## Install with npm

Run this command in the root of your application:

```bash
npm i elysia-rack elysia react react-dom
```

If you use the Drizzle adapter:

```bash
npm i drizzle-orm
```

## Alternative package managers

The package is published to the public npm registry. Package managers that install from npm, such as pnpm or Yarn, should work, but they were not tested for this documentation. Use Bun or npm for a supported path.

## Verify the installation

Check that the package is present:

```bash
bun pm ls | grep elysia-rack
# or
npm ls elysia-rack
```

The output should include `elysia-rack` and its version. The documentation describes version `0.2.2`.

A quick import check also confirms that the package resolves:

```bash
bun -e "import('elysia-rack').then(() => console.log('ok'))"
# or
node --input-type=module -e "import('elysia-rack').then(() => console.log('ok'))"
```

A successful check prints `ok`.

## Post-installation configuration

Installation only adds the package files. To use the library, add `.use(reactPlugin())` and `.use(rack(...))` to your Elysia application. Continue to [Getting started](../getting-started.md) for a complete first configuration.

## Upgrade

Upgrade to the latest release with your package manager, then restart your application:

```bash
bun update elysia-rack
# or
npm update elysia-rack
```

Review the release notes before upgrading across minor versions. The package is at version `0.2.2`, so configuration keys may still change between releases.

## Uninstall

Remove the package from your application:

```bash
bun remove elysia-rack
# or
npm uninstall elysia-rack
```

Then remove the import and `.use(rack(...))` calls from your application. If you added `reactPlugin` only for elysia-rack, remove it as well.

Uninstalling the package does not change your database. Records created through the panel remain in your database.

## Where to go next

- [Getting started](../getting-started.md) for a working example.
- [Configuration reference](../configuration/configuration-reference.md) for every option.
