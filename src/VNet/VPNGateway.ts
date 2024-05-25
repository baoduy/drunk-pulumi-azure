import { BasicResourceArgs } from "../types";
import { getVpnName } from "../Common/Naming";
import { Input, interpolate } from "@pulumi/pulumi";
import * as network from "@pulumi/azure-native/network";
import { tenantId } from "../Common/AzureEnv";
import IpAddress from "./IpAddress";

export interface VpnGatewayProps extends BasicResourceArgs {
  subnetId: Input<string>;
  vpnClientAddressPools?: string[];
  sku?: {
    name?: network.VirtualNetworkGatewaySkuName;
    tier?: network.VirtualNetworkGatewaySkuTier;
  };
}

// https://learn.microsoft.com/en-us/azure/vpn-gateway/openvpn-azure-ad-tenant
export default ({
  name,
  group,
  subnetId,
  vpnClientAddressPools = ["172.16.100.0/24"],
  sku = {
    name: network.VirtualNetworkGatewaySkuName.VpnGw1,
    tier: network.VirtualNetworkGatewaySkuTier.VpnGw1,
  },
}: VpnGatewayProps) => {
  name = getVpnName(name);
  const ipAddress = IpAddress({
    name,
    group,
    enableZone: false,
    lock: false,
  });

  return new network.VirtualNetworkGateway(name, {
    virtualNetworkGatewayName: name,
    ...group,
    sku,

    gatewayType: "Vpn",
    vpnType: "RouteBased",
    enableBgp: false,
    activeActive: false,
    enableDnsForwarding: true,
    allowRemoteVnetTraffic: true,

    ipConfigurations: [
      {
        name: "vnetGatewayConfig",
        publicIPAddress: {
          id: ipAddress.id,
        },
        subnet: {
          id: subnetId,
        },
      },
    ],

    vpnClientConfiguration: {
      // aadAudience?: pulumi.Input<string>;
      // aadIssuer?: pulumi.Input<string>;
      // aadTenant?: pulumi.Input<string>;
      // radiusServerAddress?: pulumi.Input<string>;
      // radiusServerSecret?: pulumi.Input<string>;
      // radiusServers?: pulumi.Input<pulumi.Input<inputs.network.RadiusServerArgs>[]>;
      // vngClientConnectionConfigurations?: pulumi.Input<pulumi.Input<inputs.network.VngClientConnectionConfigurationArgs>[]>;
      // vpnAuthenticationTypes?: pulumi.Input<pulumi.Input<string | enums.network.VpnAuthenticationType>[]>;
      // vpnClientAddressPool?: pulumi.Input<inputs.network.AddressSpaceArgs>;
      // vpnClientIpsecPolicies?: pulumi.Input<pulumi.Input<inputs.network.IpsecPolicyArgs>[]>;
      // vpnClientProtocols?: pulumi.Input<pulumi.Input<string | enums.network.VpnClientProtocol>[]>;
      // vpnClientRevokedCertificates?: pulumi.Input<pulumi.Input<inputs.network.VpnClientRevokedCertificateArgs>[]>;
      // vpnClientRootCertificates?: pulumi.Input<pulumi.Input<inputs.network.VpnClientRootCertificateArgs>[]>;

      vpnClientProtocols: ["OpenVPN"],
      vpnClientAddressPool: vpnClientAddressPools
        ? {
            addressPrefixes: vpnClientAddressPools,
          }
        : undefined,
      vpnClientRootCertificates: [],
      vpnClientRevokedCertificates: [],
      radiusServerAddress: "",
      radiusServerSecret: "",

      vpnAuthenticationTypes: [network.VpnAuthenticationType.AAD],
      aadTenant: interpolate`https://login.microsoftonline.com/${tenantId}`,
      aadAudience: "41b23e61-6c1e-4545-b367-cd054e0ed4b4",
      aadIssuer: interpolate`https://sts.windows.net/${tenantId}/`,
    },
  });
};
