# Drunk Pulumi Azure - GitHub Copilot Instructions

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Repository Overview

**Drunk Pulumi Azure** (`@drunk-pulumi/azure`) is a production-ready TypeScript library that provides an opinionated, type-safe abstraction layer over Pulumi's Azure Native provider. It implements the **Builder Pattern** extensively to simplify Azure infrastructure provisioning with sensible defaults, automated naming conventions, security best practices, and integrated RBAC management.

### Core Philosophy
- **Convention over Configuration**: Automatic resource naming with environment awareness
- **Security by Default**: Built-in encryption, RBAC, private endpoints, and Key Vault integration
- **Builder Pattern**: Fluent, chainable API for infrastructure definition
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Production Ready**: Used in production with proper error handling and resource locking

## Architecture & Design Patterns

### Builder Pattern Architecture

The library implements a sophisticated Builder pattern with multiple stages:

#### 1. **Base Builder Classes** (`src/Builder/types/genericBuilder.ts`)

```typescript
// Synchronous Builder
export abstract class Builder<TResults extends ResourceInfo> {
  protected constructor(public commonProps: BuilderProps) {}
  public abstract build(): TResults;
}

// Asynchronous Builder (for complex resources requiring async operations)
export abstract class BuilderAsync<TResults extends ResourceInfo> {
  protected constructor(public commonProps: BuilderProps) {}
  public abstract build(): Promise<TResults>;
}
```

#### 2. **Builder Interfaces** (Type-Safe Method Chaining)

Builders use interface segregation to provide type-safe, progressive API:
- **Starter Interfaces**: Initial configuration (e.g., `IStorageStarterBuilder`)
- **Feature Interfaces**: Add features (e.g., `IStorageBuilder`, `IVnetBuilder`)
- **Build Interface**: Final build step (e.g., `IBuilder<TResults>`)

Example flow:
```typescript
StorageBuilder(props)           // Returns IStorageStarterBuilder
  .asStorage()                  // Returns IStorageBuilder
  .withContainers([...])        // Returns IStorageBuilder
  .enableEncryption()           // Returns IStorageBuilder
  .build()                      // Returns StorageResult
```

#### 3. **Resource Builder** - The Foundation (`src/Builder/ResourceBuilder.ts`)

The `ResourceBuilder` is the entry point for most infrastructure:

```typescript
const rs = await ResourceBuilder('my-project')
  .createRoles()                    // Create environment roles (admin, contributor, readOnly)
  .createRG({ enableVaultRoles: true })  // Create resource group with vault RBAC
  .createVault('my-vault')          // Create Key Vault
  .addSecrets({ apiKey: 'value' })  // Add secrets to vault
  .createEnvUID()                   // Create encryption identity
  .build();                         // Returns: { group, vaultInfo, envRoles, envUIDInfo, ... }
```

**Key Features**:
- Creates foundational resources (Resource Groups, Roles, Vaults)
- Manages RBAC assignments automatically
- Handles encryption identities
- Supports VNet creation and linking
- Secret and certificate management

### Naming Convention System (`src/Common/Naming.ts`)

Automatic, environment-aware resource naming with 90+ predefined rules:

```typescript
// Naming format: [prefix]-[name]-[region]-[suffix]-[org]
// Example: "prd-mystg-seau-stg-myorg"

naming.getStorageName('mystg')
// Result: "prdmystgseastgmyorg" (cleaned for storage constraints)

naming.getResourceGroupName('myapp')
// Result: "prd-myapp-seau-grp-myorg"
```

**Naming Configuration** (`src/Common/Naming.ts` rules object):
- `cleanName`: Remove special characters for strict naming (e.g., Storage)
- `maxLength`: Enforce Azure resource length limits
- `suffix`: Service-specific suffix (e.g., 'stg', 'grp', 'aks')
- `includeOrgName`: Include organization in name
- `replaces`: Custom character replacement rules

**Environment Variables Control** (`src/env.ts`):
- `DPA_NAMING_DISABLE_PREFIX`: Disable environment prefix
- `DPA_NAMING_DISABLE_REGION`: Disable region code
- `DPA_NAMING_DISABLE_SUFFIX`: Disable service suffix

### Type System Architecture (`src/types.ts`)

**Type Composition Pattern** - Small, composable types:

```typescript
// Building blocks
type WithNamedType = { name: string };
type WithOutputId = { id: Output<string> };
type WithResourceGroupInfo = { group: ResourceGroupInfo };
type WithVaultInfo = { vaultInfo?: KeyVaultInfo };
type OptsArgs = { dependsOn?, ignoreChanges?, importUri? };

// Composed types
type ResourceInfo = WithNamedType & WithOutputId & WithResourceGroupInfo;
type BasicResourceArgs = WithNamedType & ResourceArgs & OptsArgs;
type EncryptResourceArgs = ResourceWithVaultArgs & WithEncryptionInfo;
```

**Key Type Categories**:
1. **Info Types**: Resource information after creation (`ResourceInfo`, `StorageInfo`, `KeyVaultInfo`)
2. **Args Types**: Input arguments for builders (`BasicResourceArgs`, `EncryptResourceArgs`)
3. **Props Types**: Configuration properties (`NetworkPropsType`, `PrivateLinkPropsType`)
4. **Builder Types**: Builder-specific interfaces (in `src/Builder/types/`)

### RBAC & Security Integration

#### Environment Roles (`src/AzAd/EnvRoles/`)

Three-tier role system stored in Key Vault:
- **admin**: Full control (Owner/Contributor)
- **contributor**: Read/write access
- **readOnly**: Read-only access

```typescript
const roles = EnvRoleBuilder.loadFrom(vaultInfo);
// Auto-loads role assignments from vault

// Apply to resources
grantEnvRolesAccess({
  name: 'my-storage',
  envRoles: roles,
  enableStorageRoles: { admin: true, contributor: true }
});
```

#### Encryption Pattern (`src/Core/KeyGenerators.ts`)

Resources support automatic encryption with managed identities:

```typescript
StorageBuilder({ name: 'mystorage', vaultInfo, envUIDInfo })
  .asStorage({ enableEncryption: true })  // Uses envUIDInfo for encryption
  .build();
```

### Resource Creation Pattern (`src/Core/ResourceCreator.ts`)

Centralized resource creation with automatic features:
- **Locking**: Prevent accidental deletion
- **Monitoring**: Diagnostic settings
- **Dependency Management**: Pulumi dependencies
- **Import Support**: Import existing resources

```typescript
export default function ResourceCreator<TClass, TProps>(
  Class: TClass,
  { lock, monitoring, dependsOn, ignoreChanges, importUri, ...props }: TProps
) {
  const resource = new Class(name, props, { dependsOn, import: importUri });
  const locker = lock ? Locker({ name, resource }) : undefined;
  const diagnostic = monitoring ? createDiagnostic(...) : undefined;
  return { resource, locker, diagnostic };
}
```

### Azure Environment Detection (`src/Common/AzureEnv/`)

Automatic Azure context detection:

```typescript
export const tenantId = config.tenantId;
export const subscriptionId = config.subscriptionId;
export const currentPrincipal = config.objectId;
export const currentRegionName = 'SoutheastAsia';  // From config
export const currentRegionCode = 'seau';
export const currentEnv = Environments.Prd;  // Detected from stack name

export const isPrd = isEnv(Environments.Prd);
export const isDev = isEnv(Environments.Dev);
```

### Private Endpoint Pattern (`src/VNet/PrivateEndpoint.ts`)

Standardized private endpoint creation for all services:

```typescript
// Each service (Storage, Vault, SQL, etc.) has a corresponding private link function
VaultPrivateLink({ 
  subnetIds: [...], 
  resourceInfo: vaultInfo 
});

StoragePrivateLink({ 
  subnetIds: [...], 
  resourceInfo: storageInfo,
  type: ['blob', 'file']  // Service-specific types
});
```

## Working Effectively

### Prerequisites and Dependencies
- **Node.js**: Version 20 (confirmed working version: v20.19.4)
- **Package Manager**: pnpm version 8 (install with `npm install -g pnpm@8`)
- **Build Time**: Allow adequate time - builds can take 30+ seconds

### Essential Setup and Build Commands
Run these commands in sequence for first-time setup:

```bash
# Install pnpm globally if not already installed
npm install -g pnpm@8

# Install dependencies - NEVER CANCEL, takes 2+ minutes
pnpm install

# Full build process - NEVER CANCEL, takes ~30 seconds  
pnpm run build

# Verify build succeeded
ls -la .out-bin/
```

**CRITICAL TIMING WARNINGS:**
- `pnpm install` takes 2+ minutes - NEVER CANCEL. Set timeout to 5+ minutes.
- `pnpm run build` takes ~30 seconds - NEVER CANCEL. Set timeout to 2+ minutes.
- `pnpm run ciBuild` takes ~15 seconds (faster CI build)

### Build System Details
- **Full Build**: `pnpm run build` - Runs update-tsconfig, fastBuild, and copy-pkg
- **CI Build**: `pnpm run ciBuild` - Faster build for CI (runs fastBuild only)
- **Output Directory**: `.out-bin/` - Contains compiled JS, TypeScript definitions, and clean package.json
- **TypeScript Config**: Auto-generated by `.tasks/update-tsconfig.ts` (scans src/ directory)

### Testing
```bash
# Run working tests (many tests are outdated)
npx cross-env TS_NODE_PROJECT='./tsconfig.test.json' mocha --timeout 10000 -r ts-node/register 'src/z_tests/Common/Helpers.test.ts'

# Test specific functionality
npx cross-env TS_NODE_PROJECT='./tsconfig.test.json' mocha --timeout 10000 -r ts-node/register 'src/z_tests/Vnet/Helper.test.ts'
```

**Testing Notes:**
- Many test files in `src/z_tests/` are outdated and reference missing modules
- Working tests include: `Helpers.test.ts`, `Vnet/Helper.test.ts`
- Test timeout: 10 seconds per test
- **DO NOT** attempt to fix all broken tests - focus on functionality that actually works

### Linting and Code Quality
```bash
# Run ESLint - shows ~150 warnings but doesn't fail build
pnpm run lint
```

**Linting Notes:**
- Takes ~10 seconds to complete
- Shows many TypeScript warnings but this is normal for this codebase
- ESLint configuration fixed to use dynamic path resolution
- Required dependencies: @typescript-eslint/eslint-plugin, @typescript-eslint/parser, @eslint/js, @eslint/eslintrc, eslint-plugin-deprecation

### Package Creation and Distribution
```bash
# Create distributable package
pnpm run pack

# Verify package creation
ls -la .out-bin/*.tgz
```

## Validation

### Manual Functionality Testing
Always validate that core functionality works after making changes:

```bash
# Test built package functionality
node -e "
const helpers = require('./.out-bin/Common/Helpers.js');
console.log('Testing getRootDomainFromUrl:');
console.log(helpers.getRootDomainFromUrl('test.drunkcoding.net'));
console.log('Testing RangeOf:');
console.log(helpers.RangeOf(3));
"
```

Expected output:
```
Testing getRootDomainFromUrl:
drunkcoding.net
Testing RangeOf:
[ 0, 1, 2 ]
```

### Build Validation Steps
1. **ALWAYS** run `pnpm install` first when working with fresh clone
2. **ALWAYS** run `pnpm run build` before testing changes
3. **ALWAYS** test core functionality after building
4. **ALWAYS** run `pnpm run lint` before committing (warnings are expected)

### CI/CD Validation
The repository has a GitHub Actions workflow (`.github/workflows/build-publish-drunk.yml`) that:
- Uses Node.js 20 and pnpm 8
- Runs `pnpm run build`
- Creates releases and publishes to npm
- **NEVER CANCEL** these builds - they can take several minutes

## Repository Structure

### Source Code Organization (`src/`)

The source code follows a modular architecture organized by Azure service or functional area:

```
src/
├── index.ts              # Main entry point - exports Builder and types
├── types.ts              # Core type definitions (200+ lines)
├── env.ts                # Environment configuration utilities
│
├── Builder/              # 🏗️ PRIMARY MODULE - Builder Pattern Implementations
│   ├── index.ts          # Exports all 26+ builders
│   ├── ResourceBuilder.ts    # Base builder - Resource Groups, Roles, Vault
│   ├── VnetBuilder.ts        # Virtual Network (Hub/Spoke, Firewall, VPN)
│   ├── StorageBuilder.ts     # Storage Accounts (Static Web, CDN)
│   ├── VaultBuilder.ts       # Key Vault with secrets/certs management
│   ├── AksBuilder.ts         # Azure Kubernetes Service
│   ├── SqlBuilder.ts         # SQL Database/Server
│   ├── ApimBuilder.ts        # API Management
│   ├── AFDBuilder.ts         # Azure Front Door
│   ├── AzAppBuilder.ts       # App Services (Web Apps, Functions)
│   ├── CdnBuilder.ts         # CDN configuration
│   ├── DnsZoneBuilder.ts     # Public DNS zones
│   ├── PrivateDnsZoneBuilder.ts  # Private DNS zones
│   ├── [... 15+ more builders]
│   └── types/            # Builder-specific type definitions
│       ├── index.ts      # Aggregates all builder types
│       ├── genericBuilder.ts  # Base builder interfaces
│       ├── resourceBuilder.ts # Resource builder types
│       ├── vaultBuilder.ts    # Vault builder types
│       ├── storageBuilder.ts  # Storage builder types
│       ├── vnetBuilder.ts     # VNet builder types
│       └── [... 20+ type files]
│
├── AzAd/                 # 🔐 Azure Active Directory & Identity
│   ├── index.ts
│   ├── Helper.ts         # AD utilities and role assignments
│   ├── Identity.ts       # Managed identity creation
│   ├── UserAssignedIdentity.ts
│   ├── Group.ts          # AD group management
│   ├── B2C.ts            # Azure AD B2C
│   ├── EnvRoles/         # Environment-based role management
│   │   ├── EnvRoles.ts        # Role builder implementation
│   │   └── EnvRoles.Consts.ts # Role constants
│   ├── Identities/       # Specialized identity types
│   │   ├── EnvUID.ts          # Environment User Identity
│   │   ├── AzDevOpsIdentity.ts
│   │   ├── AzDevOpsManagedIdentity.ts
│   │   └── AzUserAdRevertSync.ts
│   ├── Roles/            # RBAC role management
│   │   ├── Role.ts            # Role creation
│   │   ├── RoleAssignment.ts  # Role assignments
│   │   ├── RolesBuiltIn.ts    # Azure built-in roles
│   │   └── GraphDefinition.ts # Microsoft Graph roles
│   └── RoleDefinitions/  # Custom role definitions
│       └── JustInTimeRequestRole.ts
│
├── VNet/                 # 🌐 Virtual Network Components
│   ├── index.ts
│   ├── Vnet.ts           # Virtual network creation
│   ├── Subnet.ts         # Subnet management
│   ├── Helper.ts         # Network utilities (IP ranges, DNS)
│   ├── IpAddress.ts      # Public IP addresses
│   ├── IpAddressPrefix.ts # IP prefix management
│   ├── SecurityGroup.ts  # Network Security Groups
│   ├── RouteTable.ts     # Route tables
│   ├── Firewall.ts       # Azure Firewall
│   ├── FirewallPolicy.ts # Firewall policies
│   ├── Bastion.ts        # Azure Bastion
│   ├── NatGateway.ts     # NAT Gateway
│   ├── VPNGateway.ts     # VPN Gateway
│   ├── NetworkPeering.ts # VNet peering
│   ├── PrivateEndpoint.ts # Private endpoints
│   ├── types.ts          # VNet-specific types
│   ├── NSGRules/         # Pre-configured NSG rules
│   │   ├── ApimSecurityRule.ts
│   │   ├── BastionSecurityRule.ts
│   │   ├── BlockInternetSecurityRule.ts
│   │   ├── AppGatewaySecurityRule.ts
│   │   └── AzADSecurityRule.ts
│   └── FirewallPolicies/ # Pre-configured firewall policies
│       ├── DefaultFirewallPolicy.ts
│       ├── AksFirewallPolicy.ts
│       ├── CFTunnelFirewallPolicy.ts
│       ├── UbuntuFirewallPolicy.ts
│       └── CloudPCFirewallPolicy.ts
│
├── KeyVault/             # 🔑 Key Vault Management
│   ├── index.ts          # Vault creation with RBAC
│   ├── Helper.ts         # Secret/certificate helpers
│   └── CustomHelper.ts   # Custom vault operations
│
├── Storage/              # 💾 Storage Account Management
│   ├── index.ts          # Storage account creation
│   ├── Helper.ts         # Storage utilities
│   └── ManagementRules.ts # Lifecycle management
│
├── Common/               # 🛠️ Shared Utilities
│   ├── index.ts
│   ├── Helpers.ts        # Generic helpers (URL parsing, base64, etc.)
│   ├── Naming.ts         # Resource naming conventions (90+ rules)
│   ├── StackEnv.ts       # Pulumi stack environment
│   ├── ConfigHelper.ts   # Configuration management
│   ├── AzureEnv/         # Azure environment detection
│   │   ├── index.ts           # Tenant, subscription, region detection
│   │   └── AutoTags.ts        # Automatic resource tagging
│   ├── RsInfo/           # Resource information utilities
│   │   ├── index.ts           # Resource ID parsing, info retrieval
│   │   └── Helper.ts
│   ├── Location/         # Azure region management
│   │   ├── index.ts
│   │   └── LocationBuiltIn.ts # Region code mappings
│   ├── OpenApi/          # OpenAPI schema utilities
│   │   ├── index.ts
│   │   └── types.ts
│   └── AppConfigs/       # Application configuration
│       └── dotnetConfig.ts
│
├── Logs/                 # 📊 Monitoring & Diagnostics
│   ├── index.ts
│   ├── AppInsight.ts     # Application Insights
│   ├── LogAnalytics.ts   # Log Analytics Workspace
│   ├── WebTest.ts        # Availability tests
│   └── Helpers.ts        # Logging utilities
│
├── Core/                 # ⚙️ Core Framework Utilities
│   ├── ResourceCreator.ts # Generic resource creator with locking
│   ├── Locker.ts          # Resource lock management
│   ├── Random.ts          # Random value generation
│   └── KeyGenerators.ts   # Encryption key generation
│
├── Sql/                  # 🗄️ SQL Database
│   ├── index.ts
│   └── SqlDb.ts
│
├── Aks/                  # ☸️ Azure Kubernetes Service
│   ├── index.ts
│   ├── Helper.ts
│   └── Identity.ts
│
├── Certificate/          # 📜 Certificate Management
│   ├── index.ts
│   └── p12.ts            # PKCS#12 certificate handling
│
├── Cdn/                  # 🚀 CDN Configuration
│   ├── index.ts
│   ├── CdnEndpoint.ts
│   └── CdnRules.ts       # CDN rule configurations
│
├── Monitor/              # 📈 Azure Monitor
│   └── index.ts
│
├── CustomRoles/          # 👤 Custom RBAC Roles
│   └── index.ts
│
├── VirtualMachine/       # 💻 Virtual Machine Management
│   ├── index.ts
│   ├── Extension.ts
│   ├── AzureDevOpsExtension.ts
│   ├── DiskEncryptionSet.ts
│   └── GlobalSchedule.ts
│
└── z_tests/              # 🧪 Test Files (Many Outdated - Use Caution)
    ├── Common/           # ✅ Working tests
    │   ├── Helpers.test.ts       # WORKS - Helper utilities
    │   ├── Global.test.ts
    │   ├── Location.test.ts
    │   └── ResourceEnv.test.ts
    ├── Vnet/             # ✅ Partially working
    │   ├── Helper.test.ts        # WORKS - VNet helpers
    │   ├── Vnet.test.ts
    │   ├── IpAddress.test.ts
    │   ├── PrivateDNS.test.ts
    │   └── PublicDNS.test.ts
    ├── Vault/            # ⚠️ May be outdated
    ├── AzAd/             # ⚠️ May be outdated
    ├── Storage/          # ⚠️ May be outdated
    └── [... other test directories]
```

### Build & Distribution Files

```
.out-bin/                 # 📦 Build output directory (generated, gitignored)
├── *.js                  # Compiled JavaScript (CommonJS)
├── *.d.ts                # TypeScript definitions
├── package.json          # Clean package.json (no devDependencies)
├── README.md             # Copied from root
└── [directory structure mirrors src/]

.tasks/                   # 🔧 Build automation scripts
├── update-tsconfig.ts    # Auto-generates tsconfig.json from src/
└── npm-package.ts        # Creates clean package.json for distribution

.github/
├── workflows/
│   └── build-publish-drunk.yml  # CI/CD: Build, version, publish to npm
└── copilot-instructions.md      # This file

pulumi-test/              # 🧪 Example Pulumi project using the library
├── index.ts              # Usage examples
├── package.json          # References ../out-bin
├── Pulumi.yaml
└── Pulumi.dev.yaml
```

## Common Tasks

### Complete Infrastructure Setup Pattern

**Typical usage pattern for a new project**:

```typescript
import { ResourceBuilder, StorageBuilder, VnetBuilder, AksBuilder } from '@drunk-pulumi/azure';

// 1. Create foundation resources
const foundation = await ResourceBuilder('my-app')
  .createRoles()                              // Create env roles (admin, contributor, readOnly)
  .createRG({ 
    enableVaultRoles: true,                   // Auto-assign vault RBAC
    enableStorageRoles: true 
  })
  .createVault('my-vault')                    // Create Key Vault
  .addSecrets({
    dbPassword: 'secret-value',               // Add secrets
    apiKey: requireSecret('apiKey')           // From Pulumi config
  })
  .createEnvUID()                             // Create encryption identity
  .build();

// 2. Create VNet infrastructure
const network = VnetBuilder({
  name: 'my-vnet',
  group: foundation.group,
  vaultInfo: foundation.vaultInfo
})
  .asHub({                                    // Configure as hub VNet
    addressSpaces: ['10.0.0.0/16'],
    subnets: {
      default: { addressPrefix: '10.0.1.0/24' },
      aks: { addressPrefix: '10.0.2.0/23' },
      privatelink: { addressPrefix: '10.0.4.0/24' }
    }
  })
  .withPublicIP('prefix')                     // Create IP prefix for NAT
  .withNatGateway()                           // Add NAT Gateway
  .withFirewall({                             // Add Azure Firewall
    subnetSpace: '10.0.0.0/26',
    policyType: 'aks'                         // Use AKS firewall policy
  })
  .enableSecurityGroup()                      // Create NSG
  .addSecurityRule(BlockInternetSecurityRule) // Add NSG rules
  .build();

// 3. Create storage with private endpoint
const storage = StorageBuilder({
  name: 'mystg',
  group: foundation.group,
  vaultInfo: foundation.vaultInfo,
  envUIDInfo: foundation.envUIDInfo
})
  .asStorage({ enableEncryption: true })      // Enable encryption with managed identity
  .withContainers([
    { name: 'data', public: false },
    { name: 'backups', public: false }
  ])
  .withQueues(['jobs', 'notifications'])
  .withFileShares(['shared'])
  .withPrivateEndpoint({                      // Create private endpoint
    subnetIds: [network.subnets['privatelink'].id],
    type: ['blob', 'file', 'queue']
  })
  .withLifecyclePolicy({                      // Add lifecycle management
    blobProperties: { ... }
  })
  .lock()                                     // Prevent deletion
  .build();

// 4. Create AKS cluster
const aks = AksBuilder({
  name: 'my-aks',
  group: foundation.group,
  vaultInfo: foundation.vaultInfo
})
  .withVersion('1.28')
  .withNetwork({
    subnetId: network.subnets['aks'].id,
    outboundIpAddressIds: network.outboundIpAddress?.ids
  })
  .withSystemNodePool({
    vmSize: 'Standard_D4s_v3',
    minCount: 2,
    maxCount: 5
  })
  .addNodePool({
    name: 'workers',
    vmSize: 'Standard_D8s_v3',
    minCount: 1,
    maxCount: 10
  })
  .enableMonitoring(foundation.logInfo)
  .build();
```

### Working with Builder Pattern

#### ResourceBuilder - Foundation Builder

**Purpose**: Creates foundational resources (RG, Roles, Vault, Encryption Identity)

```typescript
// Minimal setup
const rs = await ResourceBuilder('project-name')
  .createRG()
  .build();
// Returns: { group: ResourceGroupInfo }

// With vault and roles
const rs = await ResourceBuilder('project-name')
  .createRoles()                    // Create role structure
  .createRG({ 
    enableVaultRoles: true          // Auto-assign vault roles
  })
  .createVault()                    // Vault named after project
  .build();
// Returns: { group, vaultInfo, envRoles }

// Load existing vault
const rs = await ResourceBuilder('project-name')
  .withRG({ resourceGroupName: 'existing-rg' })
  .withVaultFrom('existing-vault')  // Load by name
  .withRolesFromVault()             // Load roles from vault
  .build();

// With VNet
const rs = await ResourceBuilder('project-name')
  .createRG()
  .createVnet({
    addressSpaces: ['10.0.0.0/16'],
    subnets: { default: { addressPrefix: '10.0.1.0/24' } }
  })
  .build();
// Returns: { group, vnetInfo }

// Complete setup
const rs = await ResourceBuilder('project-name')
  .createRoles()
  .createRG({ enableVaultRoles: true })
  .createVault()
  .linkVaultTo({                    // Create private endpoint for vault
    subnetIds: [existingSubnetId]
  })
  .addSecrets({
    dbPassword: 'value',
    apiKey: (vault) => someComputation(vault)  // Function receives vault info
  })
  .addSecretsIf(isDev, { devApiKey: 'dev-key' })  // Conditional
  .addCerts({
    name: 'ssl-cert',
    certFile: './cert.pfx',
    certPassword: 'password'
  })
  .createEnvUID()                   // For encryption
  .withLogInfoFrom('shared-logs')   // Use existing logs
  .enableEncryption()
  .pushEnvToVault()                 // Store env vars in vault
  .build();
```

#### VnetBuilder - Network Infrastructure

```typescript
// Hub VNet with Firewall
const hub = VnetBuilder({ name: 'hub', group })
  .asHub({
    addressSpaces: ['10.0.0.0/16'],
    dnsServers: ['168.63.129.16'],  // Azure DNS
    subnets: {
      default: { addressPrefix: '10.0.1.0/24' },
      appgateway: { addressPrefix: '10.0.2.0/24' },
      bastion: { addressPrefix: '10.0.3.0/26' }
    }
  })
  .withPublicIP('prefix')           // IP prefix for NAT
  .withNatGateway()                 // Outbound internet
  .withFirewall({
    subnetSpace: '10.0.0.0/26',
    managementSubnetSpace: '10.0.0.64/26',
    policyType: 'default'
  })
  .withBastion()                    // Azure Bastion
  .enableSecurityGroup()
  .enableRouteTable()
  .build();

// Spoke VNet with peering
const spoke = VnetBuilder({ name: 'spoke', group })
  .asSpoke({
    addressSpaces: ['10.1.0.0/16'],
    dnsServers: [hub.firewall.privateIpAddress],  // Use hub firewall as DNS
    subnets: {
      workload: { addressPrefix: '10.1.1.0/24' },
      data: { addressPrefix: '10.1.2.0/24' }
    }
  })
  .withPeering({
    vnetId: hub.vnet.id,
    allowForwardedTraffic: true,
    useRemoteGateways: true
  })
  .addPrivateDnsZone('privatelink.blob.core.windows.net')
  .build();

// VPN Gateway
const vpn = VnetBuilder({ name: 'vpn', group })
  .asHub({ addressSpaces: ['10.2.0.0/16'] })
  .withVpnGateway({
    subnetSpace: '10.2.0.0/27',     // GatewaySubnet
    vpnType: 'RouteBased',
    sku: 'VpnGw2'
  })
  .build();
```

#### StorageBuilder - Storage Accounts

```typescript
// Standard storage with features
const storage = StorageBuilder({ name: 'data', group, vaultInfo })
  .asStorage({
    allowSharedKeyAccess: false,    // Use AAD only
    allowBlobPublicAccess: false,
    isSftpEnabled: false
  })
  .withContainers([
    { name: 'uploads', public: false },
    { name: 'processed', public: false }
  ])
  .withQueues(['jobs', 'deadletter'])
  .withFileShares(['configs', 'logs'])
  .withNetwork({
    defaultByPass: 'AzureServices',
    vnet: [{
      subnetId: vnetInfo.subnets['data'].id,
      ipAddresses: ['1.2.3.4']
    }],
    privateEndpoint: {
      subnetIds: [vnetInfo.subnets['privatelink'].id],
      type: ['blob', 'file', 'queue', 'table']
    }
  })
  .withLifecyclePolicy({
    keyExpirationPeriodInDays: 365,
    isBlobVersioningEnabled: true,
    defaultManagementRules: ['DeleteAfter30Days', 'ArchiveAfter7Days']
  })
  .lock()
  .build();

// Static website with CDN
const web = StorageBuilder({ name: 'website', group })
  .asStaticWebStorage()
  .withAFD({
    customDomain: 'www.example.com',
    enableWaf: true,
    responseHeaders: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff'
    }
  })
  .build();
```

#### VaultBuilder - Key Vault

```typescript
// Vault with secrets and certs
const vault = VaultBuilder({ name: 'secrets', group })
  .addSecrets({
    'db-connection': 'Server=...',
    'api-key': requireSecret('apiKey')
  })
  .addSecretsIf(isPrd, {
    'prd-token': requireSecret('prdToken')
  })
  .addCerts({
    name: 'wildcard-cert',
    certFile: './wildcard.pfx',
    certPassword: requireSecret('certPassword')
  })
  .privateLinkTo({
    subnetIds: [vnetInfo.subnets['privatelink'].id]
  })
  .build();

// Use existing vault
const vault = VaultBuilderResults.from(existingVaultInfo)
  .addSecrets({ newSecret: 'value' })
  .privateLinkTo({ subnetIds: [...] })
  .build();
```

#### AksBuilder - Kubernetes

```typescript
const aks = AksBuilder({ name: 'cluster', group, vaultInfo })
  .withVersion('1.28.3')
  .withNetwork({
    subnetId: vnetInfo.subnets['aks'].id,
    serviceCidr: '172.16.0.0/16',
    dnsServiceIP: '172.16.0.10',
    outboundIpAddressIds: network.outboundIpAddress?.ids
  })
  .withSystemNodePool({
    name: 'system',
    vmSize: 'Standard_D4s_v3',
    osDiskSize: 128,
    minCount: 2,
    maxCount: 5,
    availabilityZones: ['1', '2', '3']
  })
  .addNodePool({
    name: 'workers',
    vmSize: 'Standard_D8s_v3',
    minCount: 1,
    maxCount: 20,
    enableAutoScaling: true
  })
  .enableAzurePolicy()
  .enableMonitoring(logInfo)
  .enableSecretProvider(vaultInfo)
  .build();
```

#### SqlBuilder - SQL Database

```typescript
const sql = SqlBuilder({ name: 'maindb', group, vaultInfo, envRoles })
  .generateLogin()                  // Auto-generate admin credentials -> vault
  .withElasticPool({
    sku: { name: 'StandardPool', tier: 'Standard', capacity: 100 }
  })
  .addDatabase({
    name: 'app-db',
    maxSizeBytes: 10 * 1024 * 1024 * 1024  // 10GB
  })
  .withNetwork({
    subnetId: vnetInfo.subnets['data'].id,
    privateEndpoint: {
      subnetIds: [vnetInfo.subnets['privatelink'].id]
    }
  })
  .enableEncryption()               // TDE with managed identity
  .enableThreatDetection()
  .lock()
  .build();
```

#### ApimBuilder - API Management

```typescript
const apim = ApimBuilder({ name: 'api-gateway', group, vaultInfo })
  .withSku('Developer', 1)
  .withNetwork({
    subnetId: vnetInfo.subnets['apim'].id,
    type: 'Internal'                // Internal VNet integration
  })
  .withCustomDomain({
    gateway: 'api.example.com',
    portal: 'portal.example.com',
    certFromVault: 'wildcard-cert'
  })
  .addBackend({
    name: 'api-v1',
    url: 'https://backend.internal',
    credentials: { query: { 'api-key': vaultSecret } }
  })
  .build();

// Add API
const api = apim.addApi({
  name: 'users-api',
  path: 'users',
  openApiSpec: './swagger.json'
})
  .withPolicy('RateLimit', { calls: 100, renewal: 60 })
  .withPolicy('Authentication', { type: 'JWT' })
  .build();
```

### Working with Naming Conventions

```typescript
import { naming, cleanName, getResourceName } from '@drunk-pulumi/azure/Common';

// Auto-naming (uses environment, region, organization from config)
naming.getStorageName('mydata');
// Dev: "devmydataseastgmyorg"
// Prd: "prdmydataseastgmyorg"

naming.getResourceGroupName('myapp');
// Dev: "dev-myapp-seau-grp-myorg"
// Prd: "prd-myapp-seau-grp-myorg"

// Custom naming rules
const customName = getResourceName('special', {
  prefix: 'custom',
  suffix: 'srv',
  maxLength: 24,
  cleanName: true
});

// Clean name (remove special characters)
cleanName('my-app_name.test');
// Result: "myappnametest"

// Get info from resource ID
import { rsInfo } from '@drunk-pulumi/azure/Common';

const info = rsInfo.getResourceInfoFromId(
  '/subscriptions/.../resourceGroups/my-rg/providers/Microsoft.Storage/storageAccounts/mystg'
);
// Returns: { name: 'mystg', group: {...}, subscriptionId: '...', id: ... }

// Get resource info by name (useful for importing existing resources)
const storageInfo = rsInfo.getStorageInfo('mydata');
const vaultInfo = rsInfo.getKeyVaultInfo('myvault');
const aksInfo = rsInfo.getAksInfo('mycluster');
```

### Working with Environment Roles

```typescript
import { EnvRoleBuilder, grantEnvRolesAccess } from '@drunk-pulumi/azure';

// Create new roles
const roles = EnvRoleBuilder.create()
  .addAdmin({ objectId: 'xxx', displayName: 'Admin Group' })
  .addContributor({ objectId: 'yyy', displayName: 'Dev Group' })
  .addReadOnly({ objectId: 'zzz', displayName: 'Auditors' })
  .build();

// Store in vault
roles.saveToVault(vaultInfo);

// Load from vault
const roles = EnvRoleBuilder.loadFrom(vaultInfo);

// Apply to resources
grantEnvRolesAccess({
  name: 'my-resource',
  resourceId: resource.id,
  envRoles: roles,
  enableVaultRoles: { admin: true, contributor: true },  // Specific roles
  enableStorageRoles: true  // All roles
});

// Manual assignment
import { Role } from '@drunk-pulumi/azure/AzAd';

Role.create({
  name: 'custom-role',
  principalId: identity.principalId,
  principalType: 'ServicePrincipal',
  roleName: 'Storage Blob Data Contributor',
  scope: storage.id
});
```

### Working with Encryption

```typescript
// Create encryption identity (User Assigned Managed Identity)
import * as EnvUID from '@drunk-pulumi/azure/AzAd/EnvUID';

const envUID = EnvUID.create({ name: 'encryption', group, vaultInfo });
// Stores identity info in vault automatically

// Use with storage
StorageBuilder({ 
  name: 'encrypted', 
  group, 
  vaultInfo,
  envUIDInfo: envUID,
  enableEncryption: true 
})
  .asStorage()
  .build();

// Disk encryption set for VMs
import { DiskEncryptionSet } from '@drunk-pulumi/azure/VirtualMachine';

const diskEncrypt = DiskEncryptionSet({
  name: 'vm-encrypt',
  group,
  vaultInfo,
  identityInfo: envUID
});

// Use with VM
VmBuilder({ name: 'myvm', group, diskEncryptionSetId: diskEncrypt.id })
  .build();
```

### Working with Private Endpoints

```typescript
import { 
  VaultPrivateLink, 
  StoragePrivateLink,
  SqlPrivateLink,
  AksPrivateLink 
} from '@drunk-pulumi/azure/VNet';

// Key Vault
VaultPrivateLink({
  resourceInfo: vaultInfo,
  subnetIds: [subnet.id],
  extraVnetIds: [spokeVnet.id]  // Link DNS to additional VNets
});

// Storage (multiple services)
StoragePrivateLink({
  resourceInfo: storageInfo,
  subnetIds: [subnet.id],
  type: ['blob', 'file', 'queue', 'table', 'dfs'],
  privateIpAddress: '10.0.1.10'  // Optional static IP
});

// SQL Server
SqlPrivateLink({
  resourceInfo: sqlInfo,
  subnetIds: [subnet.id]
});

// Automatic private DNS zone creation and record management
// DNS zones like 'privatelink.blob.core.windows.net' are created automatically
```

### Working with Secrets and Configuration

```typescript
import { requireSecret, getSecret } from '@drunk-pulumi/azure/Common/ConfigHelper';

// From Pulumi config (pulumi config set mySecret --secret)
const apiKey = requireSecret('apiKey');  // Throws if not found
const optionalKey = getSecret('optionalKey');  // Returns undefined if not found

// Add to vault
ResourceBuilder('app')
  .createVault()
  .addSecrets({
    'api-key': requireSecret('apiKey'),
    'db-password': requireSecret('dbPassword')
  })
  .build();

// Load from vault
import { getSecret } from '@drunk-pulumi/azure/KeyVault';

const secret = getSecret({
  vaultName: vaultInfo.name,
  secretName: 'api-key',
  version: 'latest'  // Or specific version
});

// Use in resources
const connectionString = pulumi.interpolate`Server=${sqlServer.name};Password=${secret.value}`;
```

### Development Workflow

1. Make changes to TypeScript files in `src/`
2. Run `pnpm run build` (updates tsconfig.json automatically)
3. Test functionality with working test files or pulumi-test/
4. Verify package builds with `pnpm run pack`
5. Run `pnpm run lint` (expect warnings - ~150 is normal)
6. Commit changes

### Local Testing with pulumi-test/

```bash
cd pulumi-test/
pnpm install
pulumi preview  # See what would be created
pulumi up       # Actually create resources
pulumi destroy  # Clean up
```

## Complete Builder Catalog

### 26 Available Builders

| Builder | Purpose | Key Features | Async |
|---------|---------|--------------|-------|
| **ResourceBuilder** | Foundation resources | RG, Roles, Vault, VNet, Encryption | ✅ Yes |
| **VnetBuilder** | Virtual Networks | Hub/Spoke, Firewall, VPN, Bastion, Peering | ❌ No |
| **StorageBuilder** | Storage Accounts | Containers, Queues, Files, Static Web, CDN | ❌ No |
| **VaultBuilder** | Key Vault | Secrets, Certificates, Private Link | ❌ No |
| **AksBuilder** | Kubernetes | Node pools, Networking, Add-ons | ❌ No |
| **SqlBuilder** | SQL Database | Elastic pools, Databases, Firewall | ❌ No |
| **MySqlBuilder** | MySQL | Flexible server, Databases, VNet integration | ❌ No |
| **PostgreSqlBuilder** | PostgreSQL | Flexible server, Databases, Extensions | ❌ No |
| **ApimBuilder** | API Management | VNet, Custom domains, Backends | ❌ No |
| **ApimRootBuilder** | APIM Organization | Multiple APIM instances | ❌ No |
| **ApimApiBuilder** | APIM APIs | OpenAPI, Policies, Operations | ❌ No |
| **ApimProductBuilder** | APIM Products | APIs, Subscriptions, Policies | ❌ No |
| **ApimPolicyBuilder** | APIM Policies | XML policies, Transformations | ❌ No |
| **AzAppBuilder** | App Services | Web Apps, Functions, App Plans | ❌ No |
| **AFDBuilder** | Azure Front Door | Endpoints, Custom domains, WAF | ❌ No |
| **FrontDoorBuilder** | Front Door Classic | Legacy Front Door | ❌ No |
| **CdnBuilder** | CDN | Endpoints, Custom domains, Rules | ❌ No |
| **DnsZoneBuilder** | Public DNS | Records (A, CNAME, TXT, MX) | ❌ No |
| **PrivateDnsZoneBuilder** | Private DNS | VNet links, Private records | ❌ No |
| **AcrBuilder** | Container Registry | Geo-replication, Webhooks | ❌ No |
| **ServiceBusBuilder** | Service Bus | Queues, Topics, Subscriptions | ❌ No |
| **RedisCacheBuilder** | Redis Cache | Clustering, Persistence | ❌ No |
| **SignalRBuilder** | SignalR Service | CORS, Upstream templates | ❌ No |
| **AppConfigBuilder** | App Configuration | Key-values, Feature flags | ❌ No |
| **IotHubBuilder** | IoT Hub | Routing, Consumer groups | ❌ No |
| **VmBuilder** | Virtual Machines | Extensions, Disks, NICs | ❌ No |
| **VdiBuilder** | Azure Virtual Desktop | Host pools, App groups | ❌ No |
| **AutomationBuilder** | Automation Account | Runbooks, Schedules | ❌ No |
| **LogicAppBuilder** | Logic Apps | Workflows, Triggers | ❌ No |
| **AzSearchBuilder** | Cognitive Search | Indexing, Search services | ❌ No |
| **EnvRoleBuilder** | Environment Roles | Admin, Contributor, ReadOnly | ❌ No |

## Type System Reference

### Core Type Hierarchies

#### Resource Information Types (Outputs)

```typescript
// Basic resource info
type BasicResourceInfo = {
  name: string;
  id: Output<string>;
};

// With resource group
type ResourceInfo = BasicResourceInfo & {
  group: ResourceGroupInfo;
};

// With subscription
type ResourceInfoWithSub = ResourceInfo & {
  subscriptionId?: string;
};

// With instance (actual Azure resource)
interface ResourceInfoWithInstance<T> extends ResourceInfo {
  instance: T;  // e.g., storage.StorageAccount
}
```

#### Builder Input Types

```typescript
// Minimal required
type WithNamedType = { name: string };
type WithResourceGroupInfo = { group: ResourceGroupInfo };

// With dependencies
type WithDependsOn = {
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
};

// With Pulumi options
type OptsArgs = WithDependsOn & {
  importUri?: string;
  ignoreChanges?: string[];
};

// Basic args for resources
type BasicResourceArgs = WithNamedType & WithResourceGroupInfo & OptsArgs;

// With vault
type BasicResourceWithVaultArgs = BasicResourceArgs & {
  vaultInfo?: KeyVaultInfo;
};

// With encryption
type BasicEncryptResourceArgs = BasicResourceWithVaultArgs & {
  enableEncryption?: boolean;
  envRoles?: IEnvRoleBuilder;
  envUIDInfo?: IdentityInfo;
};
```

#### Service-Specific Info Types

```typescript
// Key Vault
type KeyVaultInfo = ResourceInfo;

// Storage Account
type StorageInfo = ResourceInfo & {
  endpoints: {
    blob: string;
    file: string;
    table: string;
  };
  primaryConnection?: Output<string>;
  secondaryConnection?: Output<string>;
  primaryKey?: Output<string>;
  secondaryKey?: Output<string>;
};

// Application Insights
type AppInsightInfo = ResourceInfo & {
  instrumentationKey: Output<string>;
  connectionString: Output<string>;
};

// Log Analytics Workspace
type LogWorkspaceInfo = ResourceInfo & {
  workspaceId?: Output<string>;
  primarySharedKey?: Output<string>;
  secondarySharedKey?: Output<string>;
};

// Combined logging
type LogInfo = {
  logWp: LogWorkspaceInfo;
  logStorage: StorageInfo;
  appInsight: AppInsightInfo;
};

// Identity
type IdentityInfo = {
  id: Output<string>;
  clientId: Input<string>;
  principalId: Input<string>;
};

// Active Directory
type AdIdentityInfo = {
  name: string;
  objectId: Output<string>;
  clientId: Output<string>;
  clientSecret: Output<string> | undefined;
  principalId: Output<string> | undefined;
  principalSecret: Output<string> | undefined;
};
```

#### Network Types

```typescript
// Private Link
type PrivateLinkPropsType = {
  privateIpAddress?: Input<string>;
  subnetIds: Input<string>[];
  extraVnetIds?: Input<string>[];  // Additional VNets for DNS linking
};

// Network configuration
type NetworkPropsType = {
  subnetId?: Input<string>;
  ipAddresses?: Input<string>[];
  privateLink?: PrivateLinkPropsType;
};

// Storage network
type StorageNetworkType = {
  defaultByPass?: 'AzureServices' | 'None';
  vnet?: Array<{ 
    subnetId?: Input<string>; 
    ipAddresses?: Array<string> 
  }>;
  privateEndpoint?: Omit<PrivateLinkPropsType, 'type'> & {
    type: StorageEndpointTypes | StorageEndpointTypes[];
  };
};

type StorageEndpointTypes = 'blob' | 'table' | 'queue' | 'file' | 'web' | 'dfs';
```

#### RBAC Types

```typescript
// Environment roles
type EnvRoleKeyTypes = 'readOnly' | 'contributor' | 'admin';

type EnvRoleInfoType = { 
  objectId: string; 
  displayName: string;
};

type EnvRolesInfo = Record<
  EnvRoleKeyTypes,
  Output<EnvRoleInfoType> | EnvRoleInfoType
>;

// Role enablement
type RoleEnableItem = boolean | { 
  [k in EnvRoleKeyTypes]?: boolean 
};

type RoleEnableTypes = {
  enableRGRoles?: RoleEnableItem;
  enableAksRoles?: RoleEnableItem;
  enableStorageRoles?: RoleEnableItem;
  enableVaultRoles?: RoleEnableItem;
  enableACRRoles?: RoleEnableItem;
  enableAppConfig?: RoleEnableItem;
  enableServiceBus?: RoleEnableItem;
  enableSignalR?: RoleEnableItem;
  enableRedisCache?: RoleEnableItem;
  enableIotRoles?: RoleEnableItem;
};
```

#### Naming Types

```typescript
type ReplacePattern = {
  from: string | RegExp;
  to: string;
};

type ConventionProps = {
  prefix?: string;
  suffix?: string;
  region?: string;  // Azure region code
  includeOrgName?: boolean;
  cleanName?: boolean;  // Remove special chars
  maxLength?: number;
  replaces?: ReplacePattern[];
};

type NamingType = string | { 
  val: string; 
  rule: ConventionProps 
};
```

### Builder Result Types

Each builder returns a specific result type:

```typescript
// ResourceBuilder
type ResourceBuilderResults = {
  group?: ResourceGroupInfo;
  vaultInfo?: IVaultBuilderResults;
  envRoles?: IEnvRoleBuilder;
  envUIDInfo?: IdentityInfo;
  vnetInfo?: VnetBuilderResults;
  logInfo?: LogInfo;
  otherResources?: Record<string, ResourceInfo>;
};

// VnetBuilder
type VnetBuilderResults = {
  vnet: VnetResult;
  subnets: Record<string, SubnetResult>;
  ipAddressPrefix?: PublicIpAddressPrefixResult;
  outboundIpAddress?: { ids: Output<string>[] };
  natGateway?: network.NatGateway;
  vpnGateway?: network.VirtualNetworkGateway;
  firewall?: FirewallResult;
  bastion?: network.BastionHost;
  privateDnsZones?: Record<string, ResourceInfo>;
};

// StorageBuilder
type StorageResult = ResourceInfoWithInstance<storage.StorageAccount> & {
  endpoints: {
    blob: Output<string>;
    file: Output<string>;
    queue: Output<string>;
    table: Output<string>;
    web: Output<string>;
    dfs: Output<string>;
  };
  primaryConnection?: Output<string>;
  secondaryConnection?: Output<string>;
  afd?: AfdResult;  // If withAFD() was called
};

// AksBuilder  
type AksBuilderResults = ResourceInfoWithInstance<containerservice.ManagedCluster> & {
  nodeResourceGroup: Output<string>;
  kubeconfigRaw: Output<string>;
  kubeconfig: Output<any>;
  identity?: IdentityInfo;
};
```

## Utility Functions Reference

### Common Helpers (`src/Common/Helpers.ts`)

```typescript
// String utilities
replaceAll(value: string, search: string, replace: string): string
toBase64(value: string): string
getDomainFromUrl(url: string): string
getRootDomainFromUrl(url: string): string  // 'test.example.com' -> 'example.com'
cleanName(name: string): string  // Remove special characters

// Array utilities
RangeOf(length: number): number[]  // [0, 1, 2, ..., length-1]

// Object utilities
shallowEquals(obj1: any, obj2: any): boolean
isObject(item: any): boolean

// File utilities
readFileAsBase64(filePath: string): Promise<string>
```

### Azure Environment (`src/Common/AzureEnv/`)

```typescript
// Automatically detected
export const tenantId: Output<string>
export const subscriptionId: Output<string>
export const currentPrincipal: Output<string>
export const currentRegionName: string  // 'SoutheastAsia'
export const currentRegionCode: string  // 'seau'
export const currentCountryCode: string  // 'sg'
export const currentEnv: Environments  // Detected from stack
export const defaultSubScope: Output<string>  // '/subscriptions/{id}'

// Environment checks
export const isDev: boolean
export const isSandbox: boolean
export const isPrd: boolean
export const isGlobal: boolean
export const isEnv: (env: Environments) => boolean

// Constants
export const allAzurePorts: string[]  // Common Azure service ports
```

### Resource Info (`src/Common/RsInfo/`)

```typescript
// Parse resource ID
getResourceInfoFromId(id: string): ResourceInfoWithSub | undefined
getNameFromId(id: string): string | undefined

// Generate resource info (useful for importing existing resources)
getRGInfo(name: NamingType): ResourceGroupWithIdInfo
getStorageInfo(name: NamingType): ResourceInfo
getKeyVaultInfo(name: NamingType): ResourceInfo
getAutomationAccountInfo(name: NamingType): ResourceInfo
getAppConfigInfo(name: NamingType): ResourceInfo
getApimInfo(name: NamingType): ResourceInfo
getAksInfo(name: NamingType): ResourceInfo
getSqlServerInfo(name: NamingType): ResourceInfo
getLogAnalyticsInfo(name: NamingType): ResourceInfo
getAppInsightInfo(name: NamingType): ResourceInfo
```

### VNet Helpers (`src/VNet/Helper.ts`)

```typescript
// Subnet name constants
export const appGatewaySubnetName = 'app-gateway'
export const gatewaySubnetName = 'GatewaySubnet'
export const azFirewallSubnet = 'AzureFirewallSubnet'
export const azFirewallManagementSubnet = 'AzureFirewallManagementSubnet'
export const azBastionSubnetName = 'AzureBastionSubnet'

// IP utilities
getIpsRange(prefix: string): Netmask  // Get IP range from CIDR
convertToIpRange(ipAddress: string[]): Array<{ start: string; end: string }>
getIpAddressFromHost(host: string): Output<{ address: string; family: number }>
```

### Naming Utilities (`src/Common/Naming.ts`)

```typescript
// Main naming function
export default naming: {
  getResourceGroupName(name: NamingType): string
  getStorageName(name: NamingType): string
  getKeyVaultName(name: NamingType): string
  getAksName(name: NamingType): string
  getAppServiceName(name: NamingType): string
  getSqlServerName(name: NamingType): string
  // ... 90+ naming methods for all Azure resources
}

// Helper functions
cleanName(name: string): string  // Remove special characters
getResourceName(name: string, convention: ConventionProps): string
removeLeadingAndTrailingDash(name: string): string
```

### Key Vault Helpers (`src/KeyVault/Helper.ts`)

```typescript
// Add secrets
addCustomSecret(props: {
  name: string;
  value: Input<string>;
  vaultInfo: KeyVaultInfo;
  contentType?: string;
  dependsOn?: Input<Resource>;
}): keyvault.Secret

addCustomSecrets(items: Record<string, Input<string>>, vaultInfo: KeyVaultInfo): Record<string, keyvault.Secret>

// Add encryption key
addEncryptKey(name: string, vaultInfo: KeyVaultInfo): keyvault.Key

// Get secrets (runtime)
getSecret(props: {
  vaultName: string;
  secretName: string;
  version?: string;
}): Output<{ value: string }>

getCert(props: {
  vaultName: string;
  certName: string;
  version?: string;
}): Output<{ value: string }>
```

## Important Implementation Patterns

### Builder Implementation Pattern

When creating new builders, follow this pattern:

```typescript
// 1. Define types in src/Builder/types/{builderName}.ts
export interface IMyServiceStarterBuilder {
  asType1(props?: Type1Props): IMyServiceBuilder;
  asType2(props?: Type2Props): IMyServiceBuilder;
}

export interface IMyServiceBuilder extends IBuilder<MyServiceResult> {
  withFeature1(props: Feature1Props): IMyServiceBuilder;
  withFeature2(props: Feature2Props): IMyServiceBuilder;
  lock(): IMyServiceBuilder;
}

export type MyServiceResult = ResourceInfoWithInstance<MyServiceResource>;
export type MyServiceBuilderArgs = BasicResourceWithVaultArgs;

// 2. Implement builder in src/Builder/MyServiceBuilder.ts
class MyServiceBuilder 
  extends Builder<MyServiceResult>
  implements IMyServiceStarterBuilder, IMyServiceBuilder 
{
  // Private instance storage
  private _instance: MyServiceResource | undefined;
  
  // Private configuration
  private _type: 'type1' | 'type2' = 'type1';
  private _features: FeatureConfig = {};
  private _lock: boolean = false;

  constructor(props: MyServiceBuilderArgs) {
    super(props);
  }

  public asType1(props?: Type1Props): IMyServiceBuilder {
    this._type = 'type1';
    return this;
  }

  public withFeature1(props: Feature1Props): IMyServiceBuilder {
    this._features.feature1 = props;
    return this;
  }

  public lock(): IMyServiceBuilder {
    this._lock = true;
    return this;
  }

  public build(): MyServiceResult {
    const { name, group, vaultInfo, dependsOn } = this.commonProps;
    
    // Create resource using ResourceCreator pattern
    const { resource, locker } = ResourceCreator(MyServiceResource, {
      name: naming.getMyServiceName(name),
      ...group,
      // ... other props
      lock: this._lock,
      dependsOn,
    });

    this._instance = resource;

    // Return result
    return {
      name,
      group,
      id: resource.id,
      instance: resource,
    };
  }
}

export default MyServiceBuilder;
```

### Error Handling Pattern

```typescript
// Validate required inputs
if (!vaultInfo && requiresVault) {
  throw new Error(`${name}: vaultInfo is required for this configuration`);
}

// Use Pulumi apply for output values
const result = someOutput.apply(value => {
  if (!value) {
    throw new Error('Expected value is undefined');
  }
  return processValue(value);
});

// Conditional resource creation
const privateEndpoint = network?.privateEndpoint 
  ? createPrivateEndpoint(...)
  : undefined;
```

### Dependency Management Pattern

```typescript
// Explicit dependencies
const resource2 = new Resource2(name, props, {
  dependsOn: [resource1],
});

// Implicit dependencies (automatic via Pulumi)
const connectionString = pulumi.interpolate`Server=${sqlServer.name};...`;

// Builder dependency chaining
const resources = ResourceBuilder('app')
  .createRG()
  .createVault()  // Depends on RG
  .build();       // Returns all with proper dependencies
```

### Private Endpoint Pattern

```typescript
// Standard pattern used by all services
import { PrivateDnsZone, PrivateEndpoint } from '../VNet';

export const MyServicePrivateLink = ({
  resourceInfo,
  subnetIds,
  privateIpAddress,
  extraVnetIds,
}: PrivateLinkPropsType & { 
  resourceInfo: ResourceInfo;
  type?: MyServiceType[];  // Service-specific types
}) => {
  const dnsZoneName = 'privatelink.myservice.azure.com';
  
  // Create or get private DNS zone
  const dnsZone = PrivateDnsZone({
    name: dnsZoneName,
    group: resourceInfo.group,
    vnetIds: [...subnetIds, ...(extraVnetIds || [])],
  });

  // Create private endpoint for each type
  types?.forEach(type => {
    PrivateEndpoint({
      name: `${resourceInfo.name}-${type}`,
      group: resourceInfo.group,
      subnetIds,
      privateLinkServiceId: resourceInfo.id,
      groupIds: [type],
      dnsZoneName,
      dnsZoneId: dnsZone.id,
      privateIpAddress,
    });
  });

  return dnsZone;
};
```

### Naming Convention Pattern

```typescript
// Always use naming utilities
import { naming } from '../Common';

// ✅ Correct - uses environment, region, org
const storageName = naming.getStorageName('mydata');

// ❌ Wrong - hardcoded name
const storageName = 'prd-mydata-seau-stg-myorg';

// Custom naming for special cases
const customName = getResourceName('special', {
  prefix: 'custom',
  suffix: 'srv',
  cleanName: true,
  maxLength: 24,
});
```

### Secrets Management Pattern

```typescript
// Store secrets in Key Vault
import { addCustomSecret, addCustomSecrets } from '../KeyVault';

// Single secret
const secret = addCustomSecret({
  name: 'api-key',
  value: apiKeyValue,
  vaultInfo,
  contentType: 'application/json',
});

// Multiple secrets
const secrets = addCustomSecrets({
  'db-connection': dbConnection,
  'api-key': apiKey,
}, vaultInfo);

// Retrieve for use
import { getSecret } from '../KeyVault/Helper';

const secretValue = getSecret({
  vaultName: vaultInfo.name,
  secretName: 'api-key',
});

// Use in interpolation
const config = pulumi.interpolate`ApiKey=${secretValue.value}`;
```

### Environment-Specific Configuration

```typescript
import { isPrd, isDev, currentEnv, Environments } from '../Common';

// Conditional resource creation
const resources = ResourceBuilder('app')
  .createRG()
  .createVault()
  .addSecretsIf(isPrd, {
    'prd-api-key': requireSecret('prdApiKey'),
  })
  .addSecretsIf(isDev, {
    'dev-api-key': 'dev-test-key',
  })
  .build();

// Conditional feature enablement
const storage = StorageBuilder({ name: 'data', group })
  .asStorage({
    allowBlobPublicAccess: isDev,  // Only allow in dev
  })
  .withLifecyclePolicyIf(isPrd, {  // Only in production
    defaultManagementRules: ['DeleteAfter30Days'],
  })
  .lock(isPrd)  // Only lock production resources
  .build();

// Environment-based sizing
const nodeSize = isPrd ? 'Standard_D8s_v3' : 'Standard_D4s_v3';
```

### RBAC Assignment Pattern

```typescript
import { Role } from '../AzAd';
import { RoleEnum } from '../AzAd/Roles/RolesBuiltIn';

// Built-in roles
Role.create({
  name: `${resourceName}-contributor`,
  principalId: identity.principalId,
  principalType: 'ServicePrincipal',
  roleName: RoleEnum.Contributor,
  scope: resource.id,
});

// Environment roles (automatic)
import { grantEnvRolesAccess } from '../AzAd';

grantEnvRolesAccess({
  name: resourceName,
  resourceId: resource.id,
  envRoles: envRoles,
  enableStorageRoles: true,  // All roles
  enableVaultRoles: { admin: true, contributor: true },  // Specific
});
```

### Resource Import Pattern

```typescript
// Import existing resource
const storage = StorageBuilder({
  name: 'existing',
  group,
  importUri: '/subscriptions/.../resourceGroups/.../providers/Microsoft.Storage/storageAccounts/existingstorage',
  ignoreChanges: ['networkRuleSet'],  // Don't update these
})
  .asStorage()
  .build();

// Get info for existing resource (without creating)
import { rsInfo } from '../Common';

const existingVault = rsInfo.getKeyVaultInfo('existing-vault');
const existingStorage = rsInfo.getStorageInfo('existing-storage');
```

### Testing Pattern

```typescript
// src/z_tests/MyService/MyService.test.ts
import { expect } from 'chai';
import { describe, it } from 'mocha';

describe('MyService tests', () => {
  it('should create resource with correct name', () => {
    const name = naming.getMyServiceName('test');
    expect(name).to.include('test');
    expect(name).to.include(currentRegionCode);
  });

  it('should parse resource ID correctly', () => {
    const id = '/subscriptions/.../resourceGroups/rg/providers/Microsoft.MyService/services/mysvc';
    const info = rsInfo.getResourceInfoFromId(id);
    expect(info?.name).to.equal('mysvc');
    expect(info?.group.resourceGroupName).to.equal('rg');
  });
});
```

## Best Practices

### Security Best Practices

1. **Always use RBAC, never access keys**
   ```typescript
   // ✅ Good - RBAC enabled
   StorageBuilder({ name: 'data', group })
     .asStorage({ allowSharedKeyAccess: false })
     .build();
   
   // ❌ Bad - allows key access
   StorageBuilder({ name: 'data', group })
     .asStorage({ allowSharedKeyAccess: true })
     .build();
   ```

2. **Use private endpoints for all services**
   ```typescript
   // ✅ Good - private endpoint
   VaultBuilder({ name: 'secrets', group })
     .privateLinkTo({ subnetIds: [subnet.id] })
     .build();
   ```

3. **Enable encryption at rest**
   ```typescript
   // ✅ Good - customer-managed encryption
   StorageBuilder({ name: 'data', group, vaultInfo, envUIDInfo })
     .asStorage({ enableEncryption: true })
     .build();
   ```

4. **Lock production resources**
   ```typescript
   // ✅ Good - prevent accidental deletion
   StorageBuilder({ name: 'data', group })
     .asStorage()
     .lock(isPrd)
     .build();
   ```

### Performance Best Practices

1. **Use environment detection for conditional logic**
   ```typescript
   import { isPrd, isDev } from '../Common';
   // Cached, no repeated computation
   ```

2. **Minimize Pulumi applies**
   ```typescript
   // ✅ Good - single apply
   const config = pulumi.all([val1, val2, val3]).apply(([v1, v2, v3]) => 
     buildConfig(v1, v2, v3)
   );
   
   // ❌ Bad - multiple applies
   const config1 = val1.apply(v => ...);
   const config2 = val2.apply(v => ...);
   ```

3. **Batch resource creation**
   ```typescript
   // ✅ Good - creates all in one builder
   const rs = await ResourceBuilder('app')
     .createRG()
     .createVault()
     .createVnet(...)
     .build();
   ```

### Code Organization Best Practices

1. **One builder per file**
2. **Types in separate files** (`src/Builder/types/`)
3. **Helpers in dedicated files** (`src/{Service}/Helper.ts`)
4. **Constants in separate files** (`src/{Service}/Constants.ts`)
5. **Tests mirror source structure** (`src/z_tests/{Service}/`)

### Naming Best Practices

1. **Use naming utilities consistently**
2. **Don't override names unless necessary**
3. **Document custom naming rules**
4. **Test naming in z_tests**

### Documentation Best Practices

1. **Add JSDoc to all public methods**
2. **Document builder patterns in docs/**
3. **Provide examples in comments**
4. **Update copilot-instructions.md**

## Known Issues and Workarounds

### Test Suite Issues
- Many tests in `src/z_tests/` reference outdated modules
- **DO NOT** attempt to fix all broken tests
- Focus on tests that actually work: `Common/Helpers.test.ts`, `Vnet/Helper.test.ts`

### ESLint Configuration
- Configuration previously had hardcoded developer path (now fixed)
- Shows ~150 warnings but this is normal for this codebase
- Warnings do not prevent successful builds

### Build Dependencies
- Requires specific versions: Node.js 20, pnpm 8
- Build process auto-generates tsconfig.json from source files
- Uses cross-env for environment variables (Windows compatibility)

## Performance Expectations

### Command Timing (NEVER CANCEL these operations)
- `pnpm install`: 2+ minutes (dependency download)
- `pnpm run build`: ~30 seconds (full build with tsconfig update)
- `pnpm run ciBuild`: ~15 seconds (CI build, faster)
- `pnpm run lint`: ~10 seconds
- `pnpm run pack`: <1 second
- Individual tests: ~6 seconds

### Memory Requirements
- Build process uses `NODE_OPTIONS=--max-old-space-size=4096`
- Large TypeScript project with ~200 source files
- May require increased Node.js memory limits

## Troubleshooting Guide

### Common Build Issues

#### Issue: "Cannot find module" errors
```bash
# Solution: Clean install
rm -rf node_modules .pnpm-store pnpm-lock.yaml
pnpm install
pnpm run build
```

#### Issue: Build hangs or times out
```bash
# Solution: Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=8192"
pnpm run build
```

#### Issue: TypeScript compilation errors after adding files
```bash
# Solution: Regenerate tsconfig.json
pnpm run update-tsconfig
pnpm run build
```

#### Issue: ESLint crashes with "Cannot read tsconfig.json"
```bash
# Solution: Check eslint.config.mjs uses __dirname correctly
# The file should have:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

### Common Runtime Issues

#### Issue: "Resource already exists" during pulumi up
```typescript
// Solution: Import existing resource
const storage = StorageBuilder({
  name: 'existing',
  group,
  importUri: '/subscriptions/.../providers/Microsoft.Storage/storageAccounts/name',
})
  .asStorage()
  .build();
```

#### Issue: "Cannot find vault" when loading roles
```typescript
// Solution: Ensure vault exists first
const rs = await ResourceBuilder('app')
  .createVault()  // Create vault first
  .withRolesFromVault()  // Then load roles
  .build();

// OR use withVaultFrom for existing vault
const rs = await ResourceBuilder('app')
  .withVaultFrom('existing-vault-name')
  .withRolesFromVault()
  .build();
```

#### Issue: Private endpoint DNS not resolving
```typescript
// Solution: Check VNet is linked to private DNS zone
VaultPrivateLink({
  resourceInfo: vaultInfo,
  subnetIds: [subnet.id],
  extraVnetIds: [spokeVnet.id],  // Add all VNets that need DNS
});
```

#### Issue: RBAC permissions not working
```typescript
// Solution: Wait for role assignments to propagate (60-90 seconds)
// OR check principal ID is correct
import { currentPrincipal } from '@drunk-pulumi/azure/Common';

Role.create({
  name: 'my-role',
  principalId: currentPrincipal,  // Current user/SP
  roleName: 'Contributor',
  scope: resource.id,
});
```

### Common Test Issues

#### Issue: Tests fail with "Module not found"
```bash
# Solution: Use correct tsconfig for tests
cross-env TS_NODE_PROJECT='./tsconfig.test.json' mocha --timeout 10000 -r ts-node/register 'src/z_tests/**/*.test.ts'
```

#### Issue: Tests timeout
```bash
# Solution: Increase timeout
mocha --timeout 30000 ...
```

### Common Pulumi Issues

#### Issue: "Stack is currently locked"
```bash
# Solution: Cancel lock (if safe)
pulumi cancel
# OR force unlock
pulumi stack select <stack>
pulumi cancel --yes
```

#### Issue: "Error: refusing to deploy" with preview errors
```bash
# Solution: Run preview first, fix errors
pulumi preview
# Then run up
pulumi up
```

#### Issue: Resources created with wrong names
```bash
# Solution: Check environment variables
echo $PULUMI_NODEJS_STACK
echo $PULUMI_NODEJS_PROJECT
echo $PULUMI_NODEJS_ORGANIZATION

# Verify naming configuration
export DPA_NAMING_DISABLE_PREFIX=false
export DPA_NAMING_DISABLE_SUFFIX=false
```

## CLI Command Reference

### Build Commands

```bash
# Full build (recommended)
pnpm run build
# 1. Generates tsconfig.json from src/
# 2. Compiles TypeScript
# 3. Copies clean package.json to .out-bin/
# Time: ~30 seconds

# Fast build (CI)
pnpm run ciBuild
# Skips tsconfig generation and package copy
# Time: ~15 seconds

# Development build
pnpm run fastBuild
# Just TypeScript compilation
# Time: ~20 seconds

# Update tsconfig only
pnpm run update-tsconfig
# Time: <1 second

# Package for distribution
pnpm run pack
# Creates .tgz in .out-bin/
# Time: <1 second
```

### Test Commands

```bash
# Run all tests
pnpm run test

# Run specific test file
npx cross-env TS_NODE_PROJECT='./tsconfig.test.json' mocha --timeout 10000 -r ts-node/register 'src/z_tests/Common/Helpers.test.ts'

# Run with coverage
pnpm run test-cover

# Run working tests only
npx cross-env TS_NODE_PROJECT='./tsconfig.test.json' mocha --timeout 10000 -r ts-node/register 'src/z_tests/Common/Helpers.test.ts' 'src/z_tests/Vnet/Helper.test.ts'
```

### Lint Commands

```bash
# Run ESLint
pnpm run lint
# Expected: ~150 warnings (normal for this codebase)
# Time: ~10 seconds

# Lint specific files
npx eslint src/Builder/StorageBuilder.ts
```

### Pulumi Commands (in pulumi-test/)

```bash
# Initialize new stack
pnpm run new-stack
# Creates stack with passphrase encryption

# Preview changes
pulumi preview

# Deploy
pnpm run up
# Equivalent to: pulumi up --yes --skip-preview

# Refresh and deploy
pnpm run reup
# Equivalent to: pulumi up --refresh --yes --skip-preview

# Destroy
pnpm run destroy
# Equivalent to: pulumi destroy --yes --skip-preview

# Export state
pnpm run export
# Saves to state.json

# Import state
pnpm run import
# Loads from state.json
```

### Maintenance Commands

```bash
# Update dependencies
pnpm run update
# Uses npm-check-updates

# Clean build artifacts
rm -rf .out-bin/ node_modules/ .pnpm-store/

# Full reset
rm -rf .out-bin/ node_modules/ .pnpm-store/ pnpm-lock.yaml
pnpm install
pnpm run build
```

## Environment Variables Reference

### Build-time Variables

```bash
# Node.js memory (for large builds)
export NODE_OPTIONS="--max-old-space-size=4096"

# Production build
export NODE_ENV="production"
```

### Pulumi Variables

```bash
# Stack configuration (auto-set by Pulumi)
PULUMI_NODEJS_STACK=dev
PULUMI_NODEJS_PROJECT=my-project
PULUMI_NODEJS_ORGANIZATION=my-org

# Dry run mode
PULUMI_NODEJS_DRY_RUN=true

# Debug
PULUMI_DEBUG_PROMISE_LEAKS=true
```

### DPA Configuration Variables

```bash
# Disable environment prefix in names
export DPA_NAMING_DISABLE_PREFIX=true

# Disable region code in names
export DPA_NAMING_DISABLE_REGION=true

# Disable service suffix in names
export DPA_NAMING_DISABLE_SUFFIX=true

# Disable vault item name formatting
export DPA_VAULT_DISABLE_FORMAT_NAME=true

# Enable secondary connection strings in vault
export DPA_CONN_ENABLE_SECONDARY=true
```

### Azure Configuration (via Pulumi config or env)

```bash
# Set via Pulumi
pulumi config set azure-native:tenantId <tenant-id>
pulumi config set azure-native:subscriptionId <subscription-id>
pulumi config set azure-native:location SoutheastAsia

# OR via environment
export ARM_TENANT_ID=<tenant-id>
export ARM_SUBSCRIPTION_ID=<subscription-id>
export ARM_CLIENT_ID=<client-id>
export ARM_CLIENT_SECRET=<client-secret>
```

## Quick Start Guide

### For New Developers

```bash
# 1. Clone repository
git clone https://github.com/baoduy/drunk-pulumi-azure.git
cd drunk-pulumi-azure

# 2. Install pnpm globally (if not installed)
npm install -g pnpm@8

# 3. Install dependencies (NEVER CANCEL - takes 2+ minutes)
pnpm install

# 4. Build library (NEVER CANCEL - takes ~30 seconds)
pnpm run build

# 5. Verify build
ls -la .out-bin/
node -e "const h = require('./.out-bin/Common/Helpers.js'); console.log(h.getRootDomainFromUrl('test.example.com'))"

# 6. Run tests
npx cross-env TS_NODE_PROJECT='./tsconfig.test.json' mocha --timeout 10000 -r ts-node/register 'src/z_tests/Common/Helpers.test.ts'

# 7. Try example project
cd pulumi-test/
pnpm install
pulumi preview
```

### For Creating New Infrastructure

```bash
# 1. Create new Pulumi project
mkdir my-infra && cd my-infra
pulumi new typescript

# 2. Install drunk-pulumi-azure
pnpm add @drunk-pulumi/azure

# 3. Create infrastructure (index.ts)
cat > index.ts << 'EOF'
import * as pulumi from '@pulumi/pulumi';
import { ResourceBuilder, StorageBuilder } from '@drunk-pulumi/azure';

export default (async () => {
  const rs = await ResourceBuilder('my-app')
    .createRoles()
    .createRG({ enableVaultRoles: true })
    .createVault()
    .build();

  const storage = StorageBuilder({ ...rs, name: 'mydata' })
    .asStorage()
    .withContainers([{ name: 'data', public: false }])
    .build();

  return {
    resourceGroup: rs.group?.resourceGroupName,
    storage: storage.name,
  };
})();
EOF

# 4. Configure Azure
pulumi config set azure-native:location SoutheastAsia

# 5. Deploy
pulumi up
```

## Package Information

- **Name**: @drunk-pulumi/azure
- **Version**: Managed via GitHub Actions (semantic versioning)
- **Type**: TypeScript library for Pulumi
- **Target**: Azure infrastructure management
- **Distribution**: npm package (published from GitHub Actions)
- **License**: MIT
- **Repository**: https://github.com/baoduy/drunk-pulumi-azure
- **Documentation**: https://baoduy.github.io/drunk-pulumi-azure/

### Key Dependencies

**Core Dependencies:**
- `@pulumi/pulumi` (^3.208.0) - Pulumi SDK
- `@pulumi/azure-native` (^3.10.2) - Azure Native provider
- `@pulumi/azuread` (6.7.0) - Azure AD provider
- `@pulumi/random` (^4.18.4) - Random provider
- `@pulumi/tls` (^5.2.3) - TLS provider
- `@drunk-pulumi/azure-providers` (^1.0.10) - Custom providers
- `@azure/keyvault-certificates` (^4.10.0) - Key Vault SDK
- `@azure/keyvault-secrets` (^4.10.0) - Key Vault SDK
- `netmask` (^2.0.2) - IP address utilities
- `node-forge` (^1.3.1) - Cryptography utilities
- `to-words` (^4.8.0) - Number to words conversion
- `lodash` (^4.17.21) - Utility functions

**Dev Dependencies:**
- TypeScript 5.9.3
- ESLint with TypeScript support
- Mocha & Chai for testing
- ts-node for running TypeScript
- cross-env for environment variables
- Various build tools

### Build Output Structure

```
.out-bin/
├── package.json          # Clean (no devDependencies)
├── README.md             # Project documentation
├── Aks/                  # Compiled JavaScript + type definitions
│   ├── index.js
│   ├── index.d.ts
│   ├── Helper.js
│   ├── Helper.d.ts
│   └── ...
├── Builder/              # All builders
│   ├── index.js
│   ├── index.d.ts
│   ├── ResourceBuilder.js
│   ├── ResourceBuilder.d.ts
│   ├── types/
│   │   ├── index.d.ts
│   │   └── ...
│   └── ...
├── Common/               # Utilities
├── AzAd/                 # AD & Identity
├── VNet/                 # Networking
├── Storage/              # Storage
├── KeyVault/             # Key Vault
└── ...                   # All other modules
```

## Advanced Topics

### Custom Builder Creation

To create a new builder for an Azure service:

1. **Create type definitions** (`src/Builder/types/myServiceBuilder.ts`)
2. **Implement builder** (`src/Builder/MyServiceBuilder.ts`)
3. **Add helper functions** (`src/MyService/Helper.ts`)
4. **Add to exports** (`src/Builder/index.ts`)
5. **Add tests** (`src/z_tests/MyService/MyService.test.ts`)
6. **Add documentation** (`docs/builders/MyServiceBuilder.md`)
7. **Update copilot instructions**

See existing builders as templates (e.g., `StorageBuilder`, `VnetBuilder`).

### Custom Naming Rules

To add custom naming rules:

```typescript
// In src/Common/Naming.ts
export const rules = {
  // ... existing rules
  getMyServiceName: {
    cleanName: true,
    maxLength: 80,
    suffix: 'mysvc',
    includeOrgName: true,
    replaces: [{ from: /[_]/g, to: '-' }],
  },
};

// Then implement the function
export const getMyServiceName = (name: NamingType) =>
  getResourceName(name, rules.getMyServiceName);
```

### Custom Private Endpoint

To add private endpoint for new service:

```typescript
// In src/VNet/PrivateEndpoint.ts
export const MyServicePrivateLink = ({
  resourceInfo,
  subnetIds,
  privateIpAddress,
  extraVnetIds,
  type,
}: PrivateLinkPropsType & {
  resourceInfo: ResourceInfo;
  type?: ('endpoint1' | 'endpoint2')[];
}) => {
  const dnsZoneName = 'privatelink.myservice.azure.com';
  
  const dnsZone = PrivateDnsZone({
    name: dnsZoneName,
    group: resourceInfo.group,
    vnetIds: [...subnetIds, ...(extraVnetIds || [])],
  });

  (type || ['endpoint1']).forEach((t) => {
    PrivateEndpoint({
      name: `${resourceInfo.name}-${t}`,
      group: resourceInfo.group,
      subnetIds,
      privateLinkServiceId: resourceInfo.id,
      groupIds: [t],
      dnsZoneName,
      dnsZoneId: dnsZone.id,
      privateIpAddress,
    });
  });

  return dnsZone;
};
```

### Extending Environment Roles

To add custom role types:

```typescript
// In src/types.ts
export type EnvRoleKeyTypes = 
  | 'readOnly' 
  | 'contributor' 
  | 'admin'
  | 'customRole';  // Add custom role

// In src/AzAd/EnvRoles/EnvRoles.Consts.ts
export const RoleKeys = {
  readOnly: 'readOnly',
  contributor: 'contributor',
  admin: 'admin',
  customRole: 'customRole',  // Add custom role
} as const;

// Then use in builders
const roles = EnvRoleBuilder.create()
  .addAdmin({ objectId: '...', displayName: 'Admins' })
  .addCustomRole({ objectId: '...', displayName: 'Custom' })
  .build();
```

## Performance Optimization

### Build Performance

```bash
# Use CI build for faster iteration
pnpm run ciBuild  # ~15s vs ~30s for full build

# Increase Node.js memory for large projects
export NODE_OPTIONS="--max-old-space-size=8192"

# Use pnpm instead of npm (faster)
pnpm install  # vs npm install
```

### Pulumi Performance

```typescript
// ✅ Good - batch operations
const rs = await ResourceBuilder('app')
  .createRG()
  .createVault()
  .createVnet(...)
  .build();

// ❌ Bad - sequential creates
const rg = ResourceGroup(...);
const vault = KeyVault(...);
const vnet = VNet(...);

// ✅ Good - minimize applies
pulumi.all([out1, out2, out3]).apply(([v1, v2, v3]) => 
  processAll(v1, v2, v3)
);

// ❌ Bad - multiple applies
out1.apply(v1 => process1(v1));
out2.apply(v2 => process2(v2));
out3.apply(v3 => process3(v3));
```

### Code Organization Performance

```typescript
// ✅ Good - import specific functions
import { naming, rsInfo } from '@drunk-pulumi/azure/Common';

// ❌ Bad - import everything
import * as drunk from '@drunk-pulumi/azure';
```

## Contributing Guidelines

### Code Style

- Use TypeScript strict mode
- Follow existing builder patterns
- Add JSDoc comments to public APIs
- Use meaningful variable names
- Keep functions small and focused
- Avoid `any` types where possible

### Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes
# ... edit files ...

# 3. Build and test
pnpm run build
pnpm run lint
pnpm run test  # Run relevant tests

# 4. Commit
git add .
git commit -m "feat: add MyService builder"

# 5. Push
git push origin feature/my-feature

# 6. Create PR on GitHub
```

### Commit Message Convention

```
feat: add new feature
fix: fix bug
docs: update documentation
style: formatting changes
refactor: code refactoring
test: add or update tests
chore: maintenance tasks
```

### Testing Requirements

- Add tests for new builders
- Add tests for new helper functions
- Update existing tests if behavior changes
- Ensure tests pass before PR

### Documentation Requirements

- Update copilot-instructions.md for new features
- Add markdown documentation in docs/builders/
- Add JSDoc comments to TypeScript code
- Update README.md if needed

## FAQs

**Q: Why are there so many test files marked as "outdated"?**
A: The codebase has evolved rapidly, and some tests reference old modules or patterns. Focus on the working tests in `src/z_tests/Common/` and `src/z_tests/Vnet/`.

**Q: Why does the build take so long?**
A: The project has 190+ TypeScript files and generates a complete type-safe distribution package. Use `pnpm run ciBuild` for faster iteration during development.

**Q: Why does ESLint show so many warnings?**
A: Many warnings are intentional (e.g., `@typescript-eslint/no-unsafe-assignment` for Pulumi outputs). ~150 warnings is normal for this codebase.

**Q: Can I use this with Pulumi TypeScript projects only?**
A: Yes, this is a TypeScript-specific library designed for Pulumi TypeScript projects.

**Q: Does this work with Azure Resource Manager (ARM)?**
A: No, this library uses Pulumi's Azure Native provider, not ARM templates.

**Q: Can I contribute custom builders?**
A: Yes! Follow the contributing guidelines and builder patterns. Submit a PR with tests and documentation.

**Q: Why use builders instead of direct Pulumi resources?**
A: Builders provide:
- Automatic naming conventions
- Built-in security defaults
- RBAC integration
- Type-safe APIs
- Reduced boilerplate
- Consistent patterns

**Q: How do I upgrade to a new version?**
A: Update package.json version, run `pnpm install`, and check CHANGELOG for breaking changes.

**Q: Why does the naming include environment and region?**
A: This ensures resources are uniquely identified across environments and regions, preventing conflicts and enabling clear resource organization.

**Q: Can I disable automatic naming?**
A: Yes, use environment variables:
```bash
export DPA_NAMING_DISABLE_PREFIX=true
export DPA_NAMING_DISABLE_REGION=true
export DPA_NAMING_DISABLE_SUFFIX=true
```

---

## Summary for GitHub Copilot

This library provides a comprehensive, production-ready TypeScript abstraction over Pulumi's Azure Native provider using the Builder Pattern. Key points:

✅ **26+ builders** for Azure services (AKS, Storage, SQL, VNet, APIM, etc.)
✅ **Automatic naming** with environment/region awareness (90+ rules)
✅ **Built-in security** (RBAC, encryption, private endpoints, Key Vault)
✅ **Type-safe** APIs with 200+ TypeScript types
✅ **Resource locking** and lifecycle management
✅ **Environment detection** and conditional configuration
✅ **Comprehensive utilities** for networking, secrets, roles

**Common workflows:**
- Build: `pnpm run build` (~30s, NEVER CANCEL)
- Test: `pnpm run test` or run specific tests
- Lint: `pnpm run lint` (~150 warnings is normal)
- Package: `pnpm run pack`

**Key files:**
- `src/Builder/` - All 26+ builders
- `src/Common/` - Utilities (naming, helpers, env detection)
- `src/types.ts` - Core type definitions
- `.tasks/` - Build automation scripts

**Always reference this file first** before making changes or answering questions about the project structure, patterns, or usage.
