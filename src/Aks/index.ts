import * as native from "@pulumi/azure-native";
import * as pulumi from "@pulumi/pulumi";
import { Input, Output, output } from "@pulumi/pulumi";
import vmsDiagnostic from "./VmSetMonitor";
import { BasicResourceArgs, KeyVaultInfo, ResourceInfo } from "../types";
import {
  currentEnv,
  defaultScope,
  Environments,
  getResourceIdFromInfo,
  parseResourceInfoFromId,
  isPrd,
  tenantId,
} from "../Common/AzureEnv";
import Locker from "../Core/Locker";
import aksIdentityCreator from "./Identity";
import { stack } from "../Common/StackEnv";
import { createDiagnostic } from "../Logs/Helpers";
import { getAksName, getResourceGroupName } from "../Common/Naming";
import { roleAssignment } from "../AzAd/RoleAssignment";
import { EnvRolesResults } from "../AzAd/EnvRoles";
import { getAksConfig } from "./Helper";
import { addCustomSecret } from "../KeyVault/CustomHelper";
import * as inputs from "@pulumi/azure-native/types/input";
import { getKeyVaultBase } from "@drunk-pulumi/azure-providers/AzBase/KeyVaultBase";
import { IdentityResult } from "../AzAd/Identity";
import { ManagedCluster } from "@pulumi/azure-native/containerservice";

const autoScaleFor = ({
  enableAutoScaling,
  nodeType,
  env,
}: {
  env: Environments;
  nodeType: "Default" | "System" | "User";
  enableAutoScaling?: boolean;
}) => {
  const nodeCount = 1;
  const minCount = 1;
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

const defaultNodePoolProps = {
  availabilityZones: isPrd ? ["1", "2", "3"] : undefined,
  type: native.containerservice.AgentPoolType.VirtualMachineScaleSets,
  vmSize: "Standard_B2s",

  maxPods: 50,
  enableFIPS: false,
  enableNodePublicIP: false,
  //enableEncryptionAtHost: false,

  enableUltraSSD: isPrd,
  osDiskSizeGB: 128,
  osDiskType: native.containerservice.OSDiskType.Managed,

  nodeLabels: {
    environment: currentEnv,
    stack,
  },
};

export enum VmSizes {
  /** 32G RAM - 4CPU - $221.92 */
  Standard_E4as_v4 = "Standard_E4as_v4",
  /** 8G RAM - 2CPU - $77.38 */
  Standard_B2ms = "Standard_B2ms",
  /** 16G RAM - 4CPU - $154.03 */
  Standard_B4ms = "Standard_B4ms",
  /** 8G RAM - 2CPU - 87.60 */
  Standard_D2as_v4 = "Standard_D2as_v4",
  /** 8G RAM - 2CPU - 87.60 */
  Standard_D2s_v3 = "Standard_D2s_v3",
  /** 8G RAM - 4CPU - 182.5 */
  Standard_D4s_v3 = "Standard_D4s_v3",
  /** 16G RAM - 4CPU - $175.20 */
  Standard_D4as_v4 = "Standard_D4as_v4",
  /** 4G RAM - 2CPU - $69.35 */
  Standard_A2_v2 = "Standard_A2_v2",
  /** 8G RAM - 4CPU - $144.54 */
  Standard_A4_v2 = "Standard_A4_v2",
  /** 32G RAM - 4CPU - $205.13 */
  Standard_A4m_v2 = "Standard_A4m_v2",
}

export interface NodePoolProps
  extends Partial<inputs.containerservice.ManagedClusterAgentPoolProfileArgs> {
  name: string;
  mode: native.containerservice.AgentPoolMode;
  vmSize: VmSizes | string;
  osDiskSizeGB: number;
  maxPods: number;
  enableEncryptionAtHost?: boolean;
}

export type AskAddonProps = {
  enableAzureKeyVault?: boolean;
  enableAzurePolicy?: boolean;
  enableKubeDashboard?: boolean;
  enableVirtualHost?: boolean;
  applicationGateway?: { gatewaySubnetId: pulumi.Input<string> };
};

export type AskFeatureProps = {
  enablePrivateCluster?: boolean;
  enableAutoScale?: boolean;
  enablePodIdentity?: boolean;
  enableDiagnosticSetting?: boolean;
};

export type AksAccessProps = {
  envRoles: EnvRolesResults;
  authorizedIPRanges?: Input<string>[];
  disableLocalAccounts?: boolean;
};

export type AksNetworkProps = {
  subnetId: pulumi.Input<string>;
  virtualHostSubnetName?: pulumi.Input<string>;
  outboundIpAddress?: {
    ipAddressId?: pulumi.Input<string>;
    ipAddressPrefixId?: pulumi.Input<string>;
  };
};

export type AksNodePoolProps = Omit<NodePoolProps, "subnetId" | "aksId">;
export type DefaultAksNodePoolProps = Omit<AksNodePoolProps, "name" | "mode">;

export interface AksProps extends BasicResourceArgs {
  //nodeResourceGroup?: string;
  tier?: native.containerservice.ManagedClusterSKUTier;

  addon?: AskAddonProps;
  features?: AskFeatureProps;
  aksAccess: AksAccessProps;

  //Azure Registry Container
  acr?: { enable: boolean; id: Input<string> };

  defaultNodePool: DefaultAksNodePoolProps;
  network: AksNetworkProps;

  linux: {
    adminUsername: Input<string>;
    sshKeys: Array<pulumi.Input<string>>;
  };
  //kubernetesVersion?: Input<string>;
  nodePools?: Array<AksNodePoolProps>;

  vaultInfo: KeyVaultInfo;
  logWpId?: Input<string>;
  /**Lock resource from delete*/
  lock?: boolean;
}

export type AksResults = ResourceInfo & {
  serviceIdentity: IdentityResult;
  aks: ManagedCluster;
  disableLocalAccounts?: boolean;
  getKubeConfig: () => Output<string>;
};

//Using this to enable the preview feature https://azurecloudai.blog/2019/10/16/aks-enabling-and-using-preview-features-such-as-nodepools-using-cli/
export default async ({
  group,
  name,
  linux,
  defaultNodePool,
  nodePools,
  network,
  logWpId,
  acr,
  aksAccess,
  vaultInfo,
  features = { enableDiagnosticSetting: true },
  addon = {
    enableAzurePolicy: true,
    enableAzureKeyVault: false,
    enableKubeDashboard: false,
  },
  tier = native.containerservice.ManagedClusterSKUTier.Free,
  lock = true,
  dependsOn = [],
  importUri,
  ignoreChanges = [],
}: AksProps): Promise<AksResults> => {
  const aksName = getAksName(name);
  const secretName = `${aksName}-config`;
  const acrScope = acr?.enable ? acr.id ?? defaultScope : undefined;
  const nodeResourceGroup = getResourceGroupName(`${aksName}-nodes`);
  //Auto detect and disable Local Account
  if (aksAccess.disableLocalAccounts === undefined) {
    aksAccess.disableLocalAccounts = await getKeyVaultBase(vaultInfo.name)
      .checkSecretExist(secretName)
      .catch(() => false);
  }

  ignoreChanges!.push("privateLinkResources", "networkProfile", "linuxProfile");

  const serviceIdentity = aksIdentityCreator({
    name: aksName,
    vaultInfo,
    dependsOn,
  });

  //=================Validate ===================================/
  // if (!linux?.sshKeys || !linux.sshKeys[0]) {
  //   console.error("Aks sshKeys is required:", name);
  //   return undefined;
  // }

  //Create AKS Cluster
  const aks = new native.containerservice.ManagedCluster(
    aksName,
    {
      resourceName: aksName,
      ...group,
      nodeResourceGroup,
      dnsPrefix: aksName,
      //fqdnSubdomain: '',
      //kubernetesVersion,

      apiServerAccessProfile: {
        authorizedIPRanges: features?.enablePrivateCluster
          ? undefined
          : aksAccess.authorizedIPRanges || [],
        disableRunCommand: true,
        enablePrivateCluster: features?.enablePrivateCluster,
        enablePrivateClusterPublicFQDN: true,
        privateDNSZone: "system",
      },

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
        httpApplicationRouting: { enabled: false },

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
          enabled: Boolean(logWpId),
          config: logWpId
            ? {
                logAnalyticsWorkspaceResourceID: logWpId,
              }
            : undefined,
        },
      },

      sku: {
        name: native.containerservice.ManagedClusterSKUName.Base,
        tier,
      },
      supportPlan:
        native.containerservice.KubernetesSupportPlan.KubernetesOfficial,
      agentPoolProfiles: [
        {
          ...defaultNodePoolProps,
          ...defaultNodePool,
          ...autoScaleFor({
            env: currentEnv,
            nodeType: "System",
            enableAutoScaling: features?.enableAutoScale,
            // powerState: {
            //   code: "Running",
            // },
            // upgradeSettings: {
            //   maxSurge: "10%",
            // },
          }),

          name: "defaultnodes",
          mode: "System",
          count: 1,
          vnetSubnetID: network.subnetId,
          kubeletDiskType: "OS",
          osSKU: "Ubuntu",
          osType: "Linux",
        },
      ],
      linuxProfile: linux
        ? {
            adminUsername: linux.adminUsername,
            ssh: { publicKeys: linux.sshKeys.map((k) => ({ keyData: k })) },
          }
        : undefined,
      //This is not inuse
      windowsProfile: {
        adminUsername: "azureuser",
        enableCSIProxy: true,
      },
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

      //Still under preview
      // workloadAutoScalerProfile: enableAutoScale
      //   ? { keda: { enabled: true } }
      //   : undefined,
      //azureMonitorProfile: { metrics: { enabled } },
      //Refer here for details https://learn.microsoft.com/en-us/azure/aks/use-managed-identity
      //enablePodSecurityPolicy: true,

      servicePrincipalProfile: {
        clientId: serviceIdentity.clientId,
        secret: serviceIdentity.clientSecret,
      },
      securityProfile: {
        defender:
          logWpId && isPrd
            ? {
                logAnalyticsWorkspaceResourceId: logWpId,
                securityMonitoring: { enabled: true },
              }
            : undefined,
        imageCleaner: { enabled: true, intervalHours: 24 },
        workloadIdentity: { enabled: false },
      },
      podIdentityProfile: features.enablePodIdentity
        ? {
            enabled: features.enablePodIdentity,
            //Not allow pod to use kublet command
            allowNetworkPluginKubenet: false,
          }
        : undefined,
      identity: {
        type: native.containerservice.ResourceIdentityType.SystemAssigned,
      },
      autoUpgradeProfile: {
        upgradeChannel: native.containerservice.UpgradeChannel.Patch,
        //nodeOSUpgradeChannel: "NodeImage",
      },
      disableLocalAccounts: Boolean(aksAccess.disableLocalAccounts),
      enableRBAC: true,
      aadProfile: {
        enableAzureRBAC: true,
        managed: true,
        adminGroupObjectIDs: [aksAccess.envRoles.admin.objectId],
        tenantID: tenantId,
      },
      oidcIssuerProfile: { enabled: false },
      storageProfile: {
        blobCSIDriver: {
          enabled: true,
        },
        diskCSIDriver: {
          enabled: true,
        },
        fileCSIDriver: { enabled: true },
        snapshotController: { enabled: true },
      },
      networkProfile: {
        networkMode: native.containerservice.NetworkMode.Transparent,
        networkPolicy: native.containerservice.NetworkPolicy.Azure,
        networkPlugin: native.containerservice.NetworkPlugin.Azure,

        //dnsServiceIP: '10.0.0.10',
        //dockerBridgeCidr: '172.17.0.1/16',
        //serviceCidr: '10.0.0.0/16',

        outboundType:
          features?.enablePrivateCluster || !network.outboundIpAddress
            ? native.containerservice.OutboundType.UserDefinedRouting
            : native.containerservice.OutboundType.LoadBalancer,

        loadBalancerSku: "Standard",
        loadBalancerProfile: network.outboundIpAddress
          ? {
              outboundIPs: network.outboundIpAddress.ipAddressId
                ? {
                    publicIPs: [{ id: network.outboundIpAddress.ipAddressId }],
                  }
                : undefined,
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
    },
    {
      protect: lock,
      dependsOn: serviceIdentity.resource,
      import: importUri,
      deleteBeforeReplace: true,
      ignoreChanges,
    },
  );

  new native.containerservice.MaintenanceConfiguration(
    `${aksName}-MaintenanceConfiguration`,
    {
      configName: "default",
      // notAllowedTime: [
      //   {
      //     end: "2020-11-30T12:00:00Z",
      //     start: "2020-11-26T03:00:00Z",
      //   },
      // ],
      ...group,
      resourceName: aks.name,
      timeInWeek: [
        {
          day: native.containerservice.WeekDay.Sunday,
          hourSlots: [0, 23],
        },
      ],
    },
    { dependsOn: aks },
  );

  if (lock) {
    Locker({ name: aksName, resource: aks });
  }

  if (nodePools) {
    nodePools.map(
      (p) =>
        new native.containerservice.AgentPool(`${name}-${p.name}`, {
          //agentPoolName:p.name,
          resourceName: aks.name,
          ...group,
          ...defaultNodePoolProps,
          ...p,

          ...autoScaleFor({
            env: currentEnv,
            nodeType: p.mode,
            enableAutoScaling: features.enableAutoScale,
          }),

          count: p.mode === "System" ? 1 : 0,
          //orchestratorVersion: kubernetesVersion,
          vnetSubnetID: network.subnetId,
          kubeletDiskType: "OS",
          osSKU: "Ubuntu",
          osType: "Linux",
        }),
    );
  }

  //Grant permission for Group
  aks.id.apply(async (id) => {
    if (!id) return;

    //Grant Permission for Identity
    pulumi
      .all([aks.identity, aks.identityProfile, network.subnetId])
      .apply(([identity, identityProfile, sId]) => {
        if (acrScope && identityProfile && identityProfile["kubeletidentity"]) {
          roleAssignment({
            name: `${name}-aks-identity-profile-pull`,
            principalId: identityProfile["kubeletidentity"].objectId!,
            principalType: "ServicePrincipal",
            roleName: "AcrPull",
            scope: acrScope,
          });

          addCustomSecret({
            name: `${name}-identity-clientId`,
            value: identityProfile["kubeletidentity"].clientId!,
            dependsOn: aks,
            contentType: name,
            vaultInfo,
          });
        }

        if (network.subnetId && identity) {
          roleAssignment({
            name: `${name}-system-net`,
            principalId: identity.principalId,
            roleName: "Contributor",
            principalType: "ServicePrincipal",
            scope: getResourceIdFromInfo({
              group: parseResourceInfoFromId(sId)!.group,
            }),
          });
        }
      });

    //Update Vault
    const config = await getAksConfig({
      name: aksName,
      groupName: group.resourceGroupName,
      formattedName: true,
      disableLocalAccounts: aksAccess.disableLocalAccounts,
    });

    addCustomSecret({
      name: secretName,
      value: config,
      formattedName: true,
      dependsOn: aks,
      contentType: aksAccess.disableLocalAccounts
        ? `${name}-UserCredentials`
        : `${name}-AdminCredentials`,
      vaultInfo,
    });

    //Diagnostic
    if (features.enableDiagnosticSetting && logWpId) {
      createDiagnostic({
        name,
        targetResourceId: id,
        logWpId,
        logsCategories: [
          "guard",
          "kube-controller-manager",
          "kube-audit-admin",
          "kube-audit",
          "kube-scheduler",
          "cluster-autoscaler",
        ],
        dependsOn: aks,
      });

      //Apply monitoring for VMScale Sets
      vmsDiagnostic({
        group: { resourceGroupName: nodeResourceGroup },
        logWpId,
        vaultInfo,
        dependsOn: aks,
      });
    }
  });

  return {
    resourceName: name,
    group,
    id: aks.id,
    aks,
    serviceIdentity,
    getKubeConfig: (): Output<string> =>
      output(
        getKeyVaultBase(vaultInfo.name)
          .getSecret(secretName)
          .then((s) => s!.value!),
      ),
  };
};
