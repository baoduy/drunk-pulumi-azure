# `VnetBuilder` Class Overview

The `VnetBuilder` class is designed to build and configure an Azure Virtual Network (VNet) with specific configurations such as subnets, public IPs, NAT gateways, VPN gateways, firewalls, bastions, security rules, route rules, private DNS, and peering.

### Constructor
#### Purpose:
Initializes the `VnetBuilder` with the provided arguments.

#### Sample Usage:
```typescript
const vnetBuilder = new VnetBuilder({
  name: 'myVnet',
  group: { resourceGroupName: 'myResourceGroup' },
  // other necessary arguments
});
```




### `asHub`
#### Purpose:
Configures the VNet as a hub with specified properties.

#### Sample Usage:
```typescript
vnetBuilder.asHub({
  subnets: { subnet1: { addressPrefix: '10.0.0.0/24' } },
  dnsServers: ['8.8.8.8'],
  addressSpaces: ['10.0.0.0/16'],
});
```




### `asSpoke`
#### Purpose:
Configures the VNet as a spoke with specified properties.

#### Sample Usage:
```typescript
vnetBuilder.asSpoke({
  subnets: { subnet1: { addressPrefix: '10.0.1.0/24' } },
  dnsServers: ['8.8.8.8'],
  addressSpaces: ['10.0.1.0/16'],
});
```




### `withPublicIP`
#### Purpose:
Sets the type of public IP for the VNet.

#### Sample Usage:
```typescript
vnetBuilder.withPublicIP('prefix');
```




### `withPublicIPFrom`
#### Purpose:
Uses an existing public IP for the VNet.

#### Sample Usage:
```typescript
vnetBuilder.withPublicIPFrom('existing-ip-id');
```




### `withNatGateway`
#### Purpose:
Enables NAT gateway for the VNet.

#### Sample Usage:
```typescript
vnetBuilder.withNatGateway();
```




### `withVpnGateway`
#### Purpose:
Sets the VPN gateway properties for the VNet.

#### Sample Usage:
```typescript
vnetBuilder.withVpnGateway({
  subnetSpace: '10.0.2.0/24',
  // other VpnGatewayCreationProps properties
});
```




### `withFirewall`
#### Purpose:
Sets the firewall properties for the VNet.

#### Sample Usage:
```typescript
vnetBuilder.withFirewall({
  subnet: { addressPrefix: '10.0.3.0/24' },
  // other FirewallCreationProps properties
});
```




### `withFirewallAndNatGateway`
#### Purpose:
Sets the firewall properties and enables NAT gateway for the VNet.

#### Sample Usage:
```typescript
vnetBuilder.withFirewallAndNatGateway({
  subnet: { addressPrefix: '10.0.3.0/24' },
  // other FirewallCreationProps properties
});
```




### `withBastion`
#### Purpose:
Sets the bastion properties for the VNet.

#### Sample Usage:
```typescript
vnetBuilder.withBastion({
  subnet: { addressPrefix: '10.0.4.0/24' },
  // other BastionCreationProps properties
});
```




### `withSecurityRules`
#### Purpose:
Adds security rules to the VNet.

#### Sample Usage:
```typescript
vnetBuilder.withSecurityRules({
  name: 'AllowSSH',
  priority: 100,
  direction: 'Inbound',
  access: 'Allow',
  protocol: 'Tcp',
  sourcePortRange: '*',
  destinationPortRange: '22',
  sourceAddressPrefix: '*',
  destinationAddressPrefix: '*',
});
```




### `withRouteRules`
#### Purpose:
Adds route rules to the VNet.

#### Sample Usage:
```typescript
vnetBuilder.withRouteRules({
  name: 'RouteToInternet',
  addressPrefix: '0.0.0.0/0',
  nextHopType: 'Internet',
});
```




### `withPrivateDns`
#### Purpose:
Adds private DNS settings to the VNet.

#### Sample Usage:
```typescript
vnetBuilder.withPrivateDns('mydomain.com', (builder) => {
  builder.addRecordSet({
    name: 'www',
    type: 'A',
    ttl: 300,
    records: ['10.0.0.4'],
  });
});
```




### `peeringTo`
#### Purpose:
Adds peering to another VNet.

#### Sample Usage:
```typescript
vnetBuilder.peeringTo({
  vnetId: 'other-vnet-id',
  direction: 'Bidirectional',
  options: { allowForwardedTraffic: true },
});
```




### `buildIpAddress`
#### Purpose:
Creates the public IP addresses for the VNet.

#### Sample Usage:
This method is called internally by the `build` method and is not typically called directly.

### `buildNatGateway`
#### Purpose:
Creates the NAT gateway for the VNet.

#### Sample Usage:
This method is called internally by the `build` method and is not typically called directly.

### `buildVnet`
#### Purpose:
Creates the VNet with the specified configurations.

#### Sample Usage:
This method is called internally by the `build` method and is not typically called directly.

### `buildFirewall`
#### Purpose:
Creates the firewall for the VNet.

#### Sample Usage:
This method is called internally by the `build` method and is not typically called directly.

### `buildVpnGateway`
#### Purpose:
Creates the VPN gateway for the VNet.

#### Sample Usage:
This method is called internally by the `build` method and is not typically called directly.

### `buildBastion`
#### Purpose:
Creates the bastion for the VNet.

#### Sample Usage:
This method is called internally by the `build` method and is not typically called directly.

### `buildPrivateDns`
#### Purpose:
Creates the private DNS settings for the VNet.

#### Sample Usage:
This method is called internally by the `build` method and is not typically called directly.

### `buildPeering`
#### Purpose:
Creates the peering connections for the VNet.

#### Sample Usage:
This method is called internally by the `build` method and is not typically called directly.

### `build`
#### Purpose:
Builds the VNet and returns the results.

#### Sample Usage:
```typescript
const vnetResults = vnetBuilder.build();
console.log(vnetResults);
```




### Full Example
Here is a full example demonstrating how to use the `VnetBuilder` class:

```typescript
import VnetBuilder from './Builder/VnetBuilder';
import { VnetBuilderArgs } from './types';

const args: VnetBuilderArgs = {
  name: 'myVnet',
  group: { resourceGroupName: 'myResourceGroup' },
  // other necessary arguments
};

const vnetBuilder = new VnetBuilder(args);

vnetBuilder
  .asHub({
    subnets: { subnet1: { addressPrefix: '10.0.0.0/24' } },
    dnsServers: ['8.8.8.8'],
    addressSpaces: ['10.0.0.0/16'],
  })
  .withPublicIP('prefix')
  .withNatGateway()
  .withVpnGateway({
    subnetSpace: '10.0.2.0/24',
    // other VpnGatewayCreationProps properties
  })
  .withFirewall({
    subnet: { addressPrefix: '10.0.3.0/24' },
    // other FirewallCreationProps properties
  })
  .withBastion({
    subnet: { addressPrefix: '10.0.4.0/24' },
    // other BastionCreationProps properties
  })
  .withSecurityRules({
    name: 'AllowSSH',
    priority: 100,
    direction: 'Inbound',
    access: 'Allow',
    protocol: 'Tcp',
    sourcePortRange: '*',
    destinationPortRange: '22',
    sourceAddressPrefix: '*',
    destinationAddressPrefix: '*',
  })
  .withRouteRules({
    name: 'RouteToInternet',
    addressPrefix: '0.0.0.0/0',
    nextHopType: 'Internet',
  })
  .withPrivateDns('mydomain.com', (builder) => {
    builder.addRecordSet({
      name: 'www',
      type: 'A',
      ttl: 300,
      records: ['10.0.0.4'],
    });
  })
  .peeringTo({
    vnetId: 'other-vnet-id',
    direction: 'Bidirectional',
    options: { allowForwardedTraffic: true },
  });

const vnetResults = vnetBuilder.build();
console.log(vnetResults);
```




### Summary
- **Constructor**: Initializes the builder with necessary arguments.
- **asHub**: Configures the VNet as a hub.
- **asSpoke**: Configures the VNet as a spoke.
- **withPublicIP**: Sets the type of public IP for the VNet.
- **withPublicIPFrom**: Uses an existing public IP for the VNet.
- **withNatGateway**: Enables NAT gateway for the VNet.
- **withVpnGateway**: Configures the VPN gateway properties.
- **withFirewall**: Configures the firewall properties.
- **withFirewallAndNatGateway**: Configures the firewall properties and enables NAT gateway.
- **withBastion**: Configures the bastion properties.
- **withSecurityRules**: Adds security rules to the VNet.
- **withRouteRules**: Adds route rules to the VNet.
- **withPrivateDns**: Adds private DNS settings to the VNet.
- **peeringTo**: Adds peering to another VNet.
- **buildIpAddress**: Internally creates the public IP addresses.
- **buildNatGateway**: Internally creates the NAT gateway.
- **buildVnet**: Internally creates the VNet.
- **buildFirewall**: Internally creates the firewall.
- **buildVpnGateway**: Internally creates the VPN gateway.
- **buildBastion**: Internally creates the bastion.
- **buildPrivateDns**: Internally creates the private DNS settings.
- **buildPeering**: Internally creates the peering connections.
- **build**: Executes the build process and returns the results.

This guideline should help developers understand and reuse the methods in the `VnetBuilder` class effectively.