# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

`@drunk-pulumi/azure` is a TypeScript library that wraps `@pulumi/azure-native` and `@pulumi/azuread` resources into higher-level, chainable **Builders** for common Azure architectures. The goal: let developers stand up a secure-by-default resource (naming convention, RBAC via env roles, Key Vault-backed secrets, private networking, locks) with a short fluent chain, while still being able to override or opt out of any of those defaults via chain methods. It is consumed as an npm dependency inside other Pulumi programs, not run standalone (except for manual testing via `pulumi-test/`).

## Commands

```bash
pnpm install                # install deps (pnpm workspace)
pnpm build                  # update-tsconfig -> tsc -> copy-pkg into .out-bin/ (publishable package)
pnpm fastBuild               # just tsc compile (no tsconfig regen / packaging)
pnpm test                    # mocha over src/z_tests/**/*.test.ts
pnpm test-leak                # same, with PULUMI_DEBUG_PROMISE_LEAKS=true
pnpm test-cover                # nyc coverage over tests
pnpm pack                    # cd .out-bin && pnpm pack (produces the tarball)
```

Run a single test file directly (mirrors the `test` script):

```bash
cross-env NODE_OPTIONS='--import tsx' TSX_TSCONFIG_PATH='./tsconfig.test.json' mocha --timeout 10000 'src/z_tests/Core/Random.test.ts'
```

`pnpm build` regenerates the `files` array in `tsconfig.json` (via `.tasks/update-tsconfig.ts`) by scanning `src/` and excluding `z_tests`, so new source files won't compile/publish until that step runs.

Pulumi-side commands (`up`, `reup`, `destroy`, `new-stack`, `export`, `import`) operate against `pulumi-test/`, the manual smoke-test stack for this library — not part of the published package.

## Architecture

### Builder pattern (`src/Builder/`)

Every Azure resource type gets its own builder file (e.g. `StorageBuilder.ts`, `SqlBuilder.ts`, `VnetBuilder.ts`, `VaultBuilder.ts`). Each exposes a factory function returning a fluent object with `.withX(...)`, `.createX(...)`, `.addX(...)`, `.enableX(...)` methods that mutate private state, ending in `.build()` (sync or async) which actually constructs the Pulumi resources and returns a `*BuilderResults`/`ResourceInfo`-shaped object other builders can consume.

`ResourceBuilder.ts` is the top-level orchestrator most stacks start from. Its interface is split into staged TypeScript interfaces (`IResourceRoleBuilder` → `IResourceGroupBuilder` → `IResourceVaultBuilder` → `IResourceBuilder`) so the fluent chain enforces build order at compile time (e.g. you can't add a vault before creating/attaching a resource group). Its private `build()` runs a fixed sequence: env roles → resource group → RBAC permissions → vault → log info → env UID → vnet → vault private-link → other builders (sync then async) → resource lock.

When adding a new builder, follow the existing pattern in a sibling file (constructor takes a name + optional deps, private fields for chain state, public chain methods returning `this` typed as the next-stage interface, a `build()`/`async build()` that does the real work) and export it from `src/Builder/index.ts`.

### Security-by-default plumbing

- **Naming** (`src/Common/Naming.ts`): a per-resource-type rules table (`rules`) drives `getResourceName`, which composes `prefix-name-org-region-suffix`, enforces Azure length limits, and applies regex cleanups. Defaults come from `stack`/`organization` (`StackEnv.ts`, from Pulumi config/env) and can be disabled per-part via `DPA_NAMING_DISABLE_PREFIX` / `_SUFFIX` / `_REGION` env vars (`src/env.ts`).
- **Env Roles / RBAC** (`src/AzAd/EnvRoles/`, used from `ResourceBuilder.buildEnvRoles`/`buildPermissions`): resources can auto-create or load a set of environment-level AzureAD groups/roles and get RBAC role assignments granted automatically (`grantEnvRolesAccess`), instead of callers wiring up role assignments by hand.
- **Key Vault** (`src/Builder/VaultBuilder.ts`): the default secret/cert store. `ResourceBuilder` can create a vault, push env-role access to it, and add secrets/certs to it; other builders pull config from a vault via `withVaultFrom`/similar rather than plaintext config.
- **Networking** (`src/VNet`, `VnetBuilder.ts`, `VaultPrivateLink`): vaults and other resources can be linked into a VNet via private endpoints instead of public access.
- **Locking** (`src/Core/Locker.ts`): resource groups (or other resources) can be CanNotDelete-locked via `.lock()`.

All of the above are opt-in/opt-out through the builder chain (`.createRoles()`, `.withRolesFromVault()`, `.createVault()`, `.enableEncryption()`, `.lock()`, etc.) — nothing forces a given security feature, but the defaults lean secure.

### Domain folders under `src/`

Besides `Builder/` and `Common/`, each Azure service area has its own folder with the lower-level Pulumi resource wrappers that builders compose: `AzAd` (AAD groups/identities/roles), `Core` (generic resource helpers: `ResourceCreator`, `Random` (passwords/uuids with rotation policies), `KeyGenerators`, `Locker`), `KeyVault`, `Storage`, `Sql`, `Aks`, `VirtualMachine`, `VNet`, `Cdn`, `Certificate`, `Logs`, `Monitor`, `CustomRoles`. Builders in `src/Builder/` are the intended public entry points; the domain folders are mostly implementation detail for those builders.

### Tests (`src/z_tests/`)

Mirrors the `src/` domain folders. Every test file must `import '../_tools/Mocks'` **before** importing anything that constructs Pulumi resources — `Mocks.ts` sets `PULUMI_NODEJS_ORGANIZATION`/`PULUMI_TEST_MODE` and calls `pulumi.runtime.setMocks(...)` so resource construction doesn't hit real Azure. Tests read resource output via `pulumi.Output.promise()`/`apply` and assert with `node:assert/strict`.

### Examples (`examples/`)

Reference-only usage snippets for builders (currently `AppContainerBuilder.example.ts`). Excluded from the TS build (`tsconfig.json` `exclude`) — not compiled or published, meant to be copied into a consuming project.
