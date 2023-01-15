import * as native from "@pulumi/azure-native";
import * as pulumi from "@pulumi/pulumi";
import { Input, output } from "@pulumi/pulumi";
import vmsDiagnostic from "./VmSetMonitor";
import { BasicMonitorArgs, BasicResourceArgs, KeyVaultInfo } from "../types";
import {
  currentEnv,
  defaultTags,
  defaultScope,
  Environments,
  getResourceIdFromInfo,
  getResourceInfoFromId,
  isPrd,
  tenantId,
} from "../Common/AzureEnv";
import Locker from "../Core/Locker";
import aksIdentityCreator from "./Identity";
import roleCreator from "../AzAd/Role";
import { stack } from "../Common/StackEnv";
import { createDiagnostic } from "../Logs/Helpers";
import { getAksName } from "../Common/Naming";
import PrivateDns from "../VNet/PrivateDns";
import { getVnetIdFromSubnetId } from "../VNet/Helper";
import * as console from "console";
import { roleAssignment } from "../AzAd/RoleAssignment";

const autoScaleFor = ({
  enableAutoScaling,
  nodeType,
  env,
}: {
  env: Environments;
  nodeType: "Default" | "System" | "User";
  enableAutoScaling?: boolean;
}) => {
  let nodeCount = 1;
  let minCount = 1;
  let maxCount = 3;

  if (env === Environments.Prd) {
    switch (nodeType) {
      case "User":
        maxCount = 5;
        break;

      case "Default":
      case "System":
      default:
        maxCount = 3;
        break;
    }
  }

  return {
    enableAutoScaling,
    nodeCount: enableAutoScaling ? undefined : nodeCount,
    minCount: enableAutoScaling ? minCount : undefined,
    maxCount: enableAutoScaling ? maxCount : undefined,
  };
};

const defaultNodePool = {
  availabilityZones: isPrd ? ["1", "2", "3"] : undefined,
  type: native.containerservice.AgentPoolType.VirtualMachineScaleSets,
  vmSize: "Standard_B2s",

  maxPods: 50,
  enableFIPS: false,
  enableNodePublicIP: false,

  osDiskSizeGB: 128,
  osDiskType: native.containerservice.OSDiskType.Managed,

  nodeLabels: {
    environment: currentEnv,
    stack,
  },

  tags: {
    environment: currentEnv,
  },
};

export enum VmSizes {
  /** 32G RAM - 4CPU - $221.92 */
  Standard_E4as_v4_221 = "Standard_E4as_v4",
  /** 8G RAM - 2CPU - $77.38 */
  Standard_B2ms_77 = "Standard_B2ms",
  /** 16G RAM - 4CPU - $154.03 */
  Standard_B4ms_154 = "Standard_B4ms",
  /** 8G RAM - 2CPU - 87.60 */
  Standard_D2as_v4_87 = "Standard_D2as_v4",
  /** 8G RAM - 2CPU - 87.60 */
  Standard_D2s_v3_87 = "Standard_D2s_v3",
  /** 16G RAM - 4CPU - $175.20 */
  Standard_D4as_v4_175 = "Standard_D4as_v4",
  /** 4G RAM - 2CPU - $69.35 */
  Standard_A2_v2_69 = "Standard_A2_v2",
  /** 8G RAM - 4CPU - $144.54 */
  Standard_A4_v2_144 = "Standard_A4_v2",
  /** 32G RAM - 4CPU - $205.13 */
  Standard_A4m_v2_205 = "Standard_A4m_v2",
}

interface NodePoolProps {
  name: string;
  mode: native.containerservice.AgentPoolMode;
  vmSize?: VmSizes;
  maxPods?: number;
  osDiskSizeGB?: number;
  osDiskType?: native.containerservice.OSDiskType;
  /**Not all machine is support this feature*/
  enableEncryptionAtHost?: boolean;
}

interface Props extends BasicResourceArgs {
  nodeResourceGroup?: string;

  addon?: {
    enableAzureKeyVault?: boolean;
    enableAzurePolicy?: boolean;
    enableKubeDashboard?: boolean;
    enableVirtualHost?: boolean;
    disableLocalAccounts?: boolean;
    applicationGateway?: { gatewaySubnetId: pulumi.Input<string> };
  };

  linux?: {
    adminUsername: Input<string>;
    sshKeys: Array<pulumi.Input<string>>;
  };

  //kubernetesVersion?: Input<string>;
  nodePools: Array<Omit<NodePoolProps, "subnetId" | "aksId">>;
  enableAutoScale?: boolean;

  featureFlags?: {
    createServicePrincipal?: boolean;
    enablePodIdentity?: boolean;
    enableDiagnosticSetting?: boolean;
  };

  aksAccess?: {
    enableAzureRBAC?:
      | boolean
      | { adminMembers: Array<{ objectId: Input<string> }> };
    enablePrivateCluster?: boolean;
    authorizedIPRanges?: Input<string>[];
    //privateDNSName?: string;
  };

  network: {
    subnetId?: pulumi.Input<string>;
    virtualHostSubnetName?: pulumi.Input<string>;

    enableFirewall?: boolean;

    outboundIpAddress?: {
      ipAddressId: pulumi.Input<string>;
      ipAddressPrefixId?: pulumi.Input<string>;
    };
  };

  vaultInfo: KeyVaultInfo;
  log?: BasicMonitorArgs;
  /**Lock resource from delete*/
  lock?: boolean;
  dependsOn?: pulumi.Input<pulumi.Resource>[];
  importFrom?: string;
}

//Using this to enable the preview feature https://azurecloudai.blog/2019/10/16/aks-enabling-and-using-preview-features-such-as-nodepools-using-cli/
export default async ({
  group,
  nodeResourceGroup,
  name,
  linux,
  //kubernetesVersion,
  nodePools,
  enableAutoScale,
  network,
  log,
  aksAccess = {},
  vaultInfo,
  featureFlags = { enableDiagnosticSetting: true },
  addon = {
    enableAzurePolicy: true,
    enableAzureKeyVault: true,
    enableKubeDashboard: false,
  },
  lock = true,
  dependsOn = [],
  importFrom,
}: Props) => {
  const aksName = getAksName(name);
  nodeResourceGroup = nodeResourceGroup || `${aksName}-nodes`;

  // const appGateway =
  //   addon.applicationGateway && network.outboundIpAddress
  //     ? await AppGateway({
  //         name,
  //         group,
  //         publicIpAddressId: network.outboundIpAddress.ipAddressId,
  //         subnetId: addon.applicationGateway.gatewaySubnetId,
  //       })
  //     : undefined;

  // const podIdentity = featureFlags?.enablePodIdentity
  //   ? ManagedIdentity({
  //       name,
  //       group,
  //       lock,
  //     })
  //   : undefined;

  const serviceIdentity = featureFlags.createServicePrincipal
    ? await aksIdentityCreator({
        name: aksName,
        vaultInfo,
      })
    : undefined;

  const adminGroup =
    typeof aksAccess.enableAzureRBAC === "object"
      ? await roleCreator({
          env: currentEnv,
          appName: name,
          roleName: "Aks-Admin",
          members: aksAccess.enableAzureRBAC.adminMembers.map(
            (m) => m.objectId
          ),
        })
      : undefined;

  //=================Validate ===================================/
  if (!network?.subnetId) {
    console.error("Aks subnetId is required:", name);
    return undefined;
  }
  if (!linux?.sshKeys || !linux.sshKeys[0]) {
    console.error("Aks sshKeys is required:", name);
    return undefined;
  }

  //Private DNS Zone for Private CLuster
  const privateZone = aksAccess.enablePrivateCluster
    ? PrivateDns({
        name: "privatelink.southeastasia.azmk8s.io",
        group,
        vnetIds: [output(network.subnetId).apply(getVnetIdFromSubnetId)],
      })
    : undefined;

  //Create AKS Cluster
  const aks = new native.containerservice.ManagedCluster(
    aksName,
    {
      resourceName: aksName,
      ...group,
      nodeResourceGroup,
      dnsPrefix: aksName,
      //kubernetesVersion,

      enableRBAC: Boolean(aksAccess.enableAzureRBAC),
      apiServerAccessProfile: {
        authorizedIPRanges: !aksAccess.enablePrivateCluster
          ? aksAccess.authorizedIPRanges || []
          : [],

        enablePrivateCluster: aksAccess.enablePrivateCluster,
        privateDNSZone: privateZone?.id,
      },
      //fqdnSubdomain: '',

      addonProfiles: {
        azureKeyvaultSecretsProvider: {
          config: addon.enableAzureKeyVault
            ? {
                enableSecretRotation: "true",
              }
            : undefined,
          enabled: Boolean(addon.enableAzureKeyVault),
        },

        azurePolicy: { enabled: Boolean(addon.enableAzurePolicy) },
        kubeDashboard: { enabled: Boolean(addon.enableKubeDashboard) },
        //If there is no public P address provided the public app can access via HTTP app routing only and feature only support HTTP.
        //TO enable HTTPS support need to create cluster with an public IP address.
        httpApplicationRouting: {
          enabled:
            !network.outboundIpAddress?.ipAddressId &&
            !network.enableFirewall &&
            !aksAccess.enablePrivateCluster,
        },

        aciConnectorLinux: {
          enabled: Boolean(network.virtualHostSubnetName),
          config: network.virtualHostSubnetName
            ? { SubnetName: network.virtualHostSubnetName }
            : undefined,
        },

        ingressApplicationGateway: {
          enabled: Boolean(addon.applicationGateway),
          config: addon.applicationGateway
            ? {
                gatewayName: `${name}-gateway`,
                subnetId: addon.applicationGateway.gatewaySubnetId,
              }
            : undefined,
        },

        omsAgent: {
          enabled: Boolean(log?.logWpId),
          config: log
            ? {
                logAnalyticsWorkspaceResourceID: log.logWpId!,
              }
            : undefined,
        },
      },

      sku: {
        name: native.containerservice.ManagedClusterSKUName.Basic,
        tier: native.containerservice.ManagedClusterSKUTier.Free,
        // tier: isPrd
        //   ? native.containerservice.ManagedClusterSKUTier.Paid
        //   : native.containerservice.ManagedClusterSKUTier.Free,
      },

      agentPoolProfiles: nodePools.map((p) => ({
        ...defaultNodePool,
        ...p,

        ...autoScaleFor({
          env: currentEnv,
          nodeType: p.mode,
          enableAutoScaling: enableAutoScale,
        }),

        count: p.mode === "System" ? 1 : 0,
        //orchestratorVersion: kubernetesVersion,
        vnetSubnetID: network.subnetId,

        kubeletDiskType: "OS",
        osSKU: "Ubuntu",
        osType: "Linux",

        tags: {
          ...defaultNodePool.tags,
          mode: p.mode,
        },
      })),

      linuxProfile: linux
        ? {
            adminUsername: linux.adminUsername,
            ssh: { publicKeys: linux.sshKeys.map((k) => ({ keyData: k })) },
          }
        : undefined,

      autoScalerProfile: {
        balanceSimilarNodeGroups: "true",
        expander: "random",
        maxEmptyBulkDelete: "10",
        maxGracefulTerminationSec: "600",
        maxNodeProvisionTime: "15m",
        maxTotalUnreadyPercentage: "45",
        newPodScaleUpDelay: "0s",
        okTotalUnreadyCount: "3",
        scaleDownDelayAfterAdd: "30m",
        scaleDownDelayAfterDelete: "60s",
        scaleDownDelayAfterFailure: "10m",
        scaleDownUnneededTime: "10m",
        scaleDownUnreadyTime: "20m",
        scaleDownUtilizationThreshold: "0.5",
        scanInterval: "60s",
        skipNodesWithLocalStorage: "false",
        skipNodesWithSystemPods: "true",
      },
      servicePrincipalProfile: serviceIdentity
        ? {
            clientId: serviceIdentity.clientId,
            secret: serviceIdentity.clientSecret!,
          }
        : undefined,

      //Refer here for details https://learn.microsoft.com/en-us/azure/aks/use-managed-identity
      enablePodSecurityPolicy: false,
      podIdentityProfile: featureFlags.enablePodIdentity
        ? {
            enabled: featureFlags.enablePodIdentity,
            //Not allow pod to use kublet command
            allowNetworkPluginKubenet: true,
          }
        : undefined,

      identity: {
        type: native.containerservice.ResourceIdentityType.SystemAssigned,
      },
      // identityProfile: podIdentity
      //   ? {
      //       kubeletidentity: {
      //         clientId: podIdentity.clientId,
      //         objectId: podIdentity.principalId,
      //         resourceId: podIdentity.id,
      //       },
      //     }
      //   : undefined,

      //Preview Features
      autoUpgradeProfile: {
        upgradeChannel: native.containerservice.UpgradeChannel.Stable,
      },
      //TODO: Needs to find a solution to allows ADO to deploy to AKS without this
      disableLocalAccounts:
        addon?.disableLocalAccounts && Boolean(aksAccess.enableAzureRBAC),
      aadProfile: {
        enableAzureRBAC: Boolean(aksAccess.enableAzureRBAC),
        managed: true,
        adminGroupObjectIDs: adminGroup ? [adminGroup.objectId] : undefined,
        tenantID: tenantId,
      },

      networkProfile: {
        networkMode: native.containerservice.NetworkMode.Transparent,
        networkPolicy: native.containerservice.NetworkPolicy.Azure,
        networkPlugin: native.containerservice.NetworkPlugin.Azure,

        dnsServiceIP: "10.0.0.10",
        dockerBridgeCidr: "172.17.0.1/16",
        serviceCidr: "10.0.0.0/16",

        outboundType:
          network.enableFirewall || aksAccess.enablePrivateCluster
            ? native.containerservice.OutboundType.UserDefinedRouting
            : native.containerservice.OutboundType.LoadBalancer,

        loadBalancerSku:
          network.outboundIpAddress?.ipAddressId ||
          network.enableFirewall ||
          aksAccess.enablePrivateCluster
            ? "Standard"
            : "Basic",

        loadBalancerProfile:
          network.outboundIpAddress &&
          !(network.enableFirewall || aksAccess.enablePrivateCluster)
            ? {
                outboundIPs: {
                  publicIPs: [{ id: network.outboundIpAddress.ipAddressId }],
                },
                outboundIPPrefixes: network.outboundIpAddress.ipAddressPrefixId
                  ? {
                      publicIPPrefixes: [
                        { id: network.outboundIpAddress.ipAddressPrefixId },
                      ],
                    }
                  : undefined,
              }
            : undefined,
      },

      tags: defaultTags,
    },
    {
      protect: lock,
      dependsOn: serviceIdentity
        ? [...dependsOn, serviceIdentity.resource]
        : dependsOn,
      import: importFrom,
      deleteBeforeReplace: true,
      //replaceOnChanges: [ 'servicePrincipalProfile'],
      ignoreChanges: [
        "privateLinkResources",
        "networkProfile",
        "linuxProfile",
        //'windowsProfile',
        //'servicePrincipalProfile.secret',
      ],
    }
  );

  if (lock) {
    Locker({ name: aksName, resourceId: aks.id, dependsOn: aks });
  }

  // if (vaultInfo) {
  //   aks.id.apply(async(id) => {
  //     if (!id) return;
  //     const config = await getAksConfig({
  //       name: aksName,
  //       groupName: group.resourceGroupName,
  //       formattedName: true,
  //     });
  //     addCustomSecret({
  //       name: `${aksName}-config`,
  //       value: config,
  //       dependsOn: aks,
  //       vaultInfo,
  //     });
  //   });
  // }

  //Grant Permission for Identity
  if (network.subnetId) {
    pulumi
      .all([aks.identity, network.subnetId])
      .apply(async ([identity, sId]) => {
        if (!identity?.principalId) return;

        await roleAssignment({
          name: `${name}-system-net`,
          principalId: identity.principalId,
          roleName: "Contributor",
          principalType: "ServicePrincipal",
          scope: getResourceIdFromInfo({
            group: getResourceInfoFromId(sId)!.group,
          }),
        });

        await roleAssignment({
          name: `${name}-system-acr-pull`,
          principalId: identity.principalId,
          principalType: "ServicePrincipal",
          roleName: "AcrPull",
          scope: defaultScope,
        });

        if (privateZone) {
          await roleAssignment({
            name: `${name}-private-dns`,
            principalId: identity.principalId,
            roleName: "Private DNS Zone Contributor",
            principalType: "ServicePrincipal",
            scope: privateZone.id,
          });
        }
      });
  }

  if (featureFlags.enableDiagnosticSetting) {
    aks.id.apply((id) => {
      if (!id) return;

      //Diagnostic
      return createDiagnostic({
        name,
        targetResourceId: id,
        ...log,
        logsCategories: [
          "guard",
          "kube-controller-manager",
          "kube-audit-admin",
          "kube-audit",
          "kube-scheduler",
          "cluster-autoscaler",
        ],
      });
    });
  }

  // if (enableVMAutoScale) {
  //   //Apply auto scale
  //   await vmsAutoScale({
  //     group: { resourceGroupName: nodeResourceGroup },
  //     dependsOn: aks,
  //   });
  // }

  //Apply monitoring for VMScale Sets
  await vmsDiagnostic({
    group: { resourceGroupName: nodeResourceGroup },
    ...log,
    vaultInfo,
    dependsOn: aks,
  });

  return { aks, serviceIdentity, adminGroup, privateZone };
};
