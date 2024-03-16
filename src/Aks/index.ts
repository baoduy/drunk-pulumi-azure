import * as native from '@pulumi/azure-native';
import * as pulumi from '@pulumi/pulumi';
import { Input, output } from '@pulumi/pulumi';
import vmsDiagnostic from './VmSetMonitor';
import { BasicMonitorArgs, BasicResourceArgs, KeyVaultInfo } from '../types';
import {
  currentEnv,
  defaultScope,
  defaultTags,
  Environments,
  getResourceIdFromInfo,
  getResourceInfoFromId,
  isPrd,
  tenantId,
} from '../Common/AzureEnv';
import Locker from '../Core/Locker';
import aksIdentityCreator from './Identity';
import { stack } from '../Common/StackEnv';
import { createDiagnostic } from '../Logs/Helpers';
import { getAksName } from '../Common/Naming';
import PrivateDns from '../VNet/PrivateDns';
import { getVnetIdFromSubnetId } from '../VNet/Helper';
import { roleAssignment } from '../AzAd/RoleAssignment';
import { getAdGroup } from '../AzAd/Group';
import { EnvRoleNamesType } from '../AzAd/EnvRoles';
import { getAksConfig } from './Helper';
import { addCustomSecret } from '../KeyVault/CustomHelper';
import * as inputs from '@pulumi/azure-native/types/input';
import { getKeyVaultBase } from '@drunk-pulumi/azure-providers/AzBase/KeyVaultBase';

const autoScaleFor = ({
  enableAutoScaling,
  nodeType,
  env,
}: {
  env: Environments;
  nodeType: 'Default' | 'System' | 'User';
  enableAutoScaling?: boolean;
}) => {
  const nodeCount = 1;
  const minCount = 1;
  let maxCount = 3;

  if (env === Environments.Prd) {
    switch (nodeType) {
      case 'User':
        maxCount = 5;
        break;

      case 'Default':
      case 'System':
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
  availabilityZones: isPrd ? ['1', '2', '3'] : undefined,
  type: native.containerservice.AgentPoolType.VirtualMachineScaleSets,
  vmSize: 'Standard_B2s',

  maxPods: 50,
  enableFIPS: false,
  enableNodePublicIP: false,

  enableUltraSSD: isPrd,
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
  Standard_E4as_v4_221 = 'Standard_E4as_v4',
  /** 8G RAM - 2CPU - $77.38 */
  Standard_B2ms_77 = 'Standard_B2ms',
  /** 16G RAM - 4CPU - $154.03 */
  Standard_B4ms_154 = 'Standard_B4ms',
  /** 8G RAM - 2CPU - 87.60 */
  Standard_D2as_v4_87 = 'Standard_D2as_v4',
  /** 8G RAM - 2CPU - 87.60 */
  Standard_D2s_v3_87 = 'Standard_D2s_v3',
  /** 16G RAM - 4CPU - $175.20 */
  Standard_D4as_v4_175 = 'Standard_D4as_v4',
  /** 4G RAM - 2CPU - $69.35 */
  Standard_A2_v2_69 = 'Standard_A2_v2',
  /** 8G RAM - 4CPU - $144.54 */
  Standard_A4_v2_144 = 'Standard_A4_v2',
  /** 32G RAM - 4CPU - $205.13 */
  Standard_A4m_v2_205 = 'Standard_A4m_v2',
}

interface NodePoolProps
  extends Partial<inputs.containerservice.ManagedClusterAgentPoolProfileArgs> {
  name: string;
  mode: native.containerservice.AgentPoolMode;
  vmSize: VmSizes;
  osDiskSizeGB: number;
  maxPods: number;
  enableEncryptionAtHost?: boolean;
}

interface AksProps extends BasicResourceArgs {
  nodeResourceGroup?: string;
  tier?: native.containerservice.ManagedClusterSKUTier;

  addon?: {
    enableAzureKeyVault?: boolean;
    enableAzurePolicy?: boolean;
    enableKubeDashboard?: boolean;
    enableVirtualHost?: boolean;
    applicationGateway?: { gatewaySubnetId: pulumi.Input<string> };
  };

  linux?: {
    adminUsername: Input<string>;
    sshKeys: Array<pulumi.Input<string>>;
  };

  //kubernetesVersion?: Input<string>;
  defaultNodePool: Omit<NodePoolProps, 'subnetId' | 'aksId'>;
  nodePools?: Array<Omit<NodePoolProps, 'subnetId' | 'aksId'>>;
  enableAutoScale?: boolean;

  featureFlags?: {
    createServicePrincipal?: boolean;
    enablePodIdentity?: boolean;
    enableDiagnosticSetting?: boolean;
  };

  //Azure Registry Container
  acr?: { enable: boolean; id?: Input<string> };
  aksAccess?: {
    //Only disable local accounts one downloaded and connected to ADO
    //disableLocalAccounts?: boolean;
    envRoleNames: EnvRoleNamesType;
    adminMembers?: Array<{ objectId: Input<string> }>;

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
  log?: Pick<BasicMonitorArgs, 'logWpId'>;
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
  defaultNodePool,
  nodePools,
  enableAutoScale,
  network,
  log,
  acr,
  aksAccess,
  vaultInfo,
  featureFlags = { enableDiagnosticSetting: true },
  addon = {
    enableAzurePolicy: true,
    enableAzureKeyVault: true,
    enableKubeDashboard: false,
  },
  tier = native.containerservice.ManagedClusterSKUTier.Free,
  lock = true,
  dependsOn = [],
  importFrom,
}: AksProps) => {
  const aksName = getAksName(name);
  const secretName = `${aksName}-config`;
  const acrScope = acr?.enable ? acr.id ?? defaultScope : undefined;
  const disableLocalAccounts = vaultInfo
    ? await getKeyVaultBase(vaultInfo.name).checkSecretExist(secretName)
    : false;
  console.log(name, { disableLocalAccounts });
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
    ? aksIdentityCreator({
        name: aksName,
        vaultInfo,
      })
    : undefined;

  const adminGroup = aksAccess?.envRoleNames
    ? getAdGroup(aksAccess.envRoleNames.admin)
    : undefined;

  const contributeGroup = aksAccess?.envRoleNames
    ? getAdGroup(aksAccess.envRoleNames.contributor)
    : undefined;

  //const enableAzureRBAC = Boolean(aksAccess?.adminMembers && adminGroup);

  //=================Validate ===================================/
  if (!network?.subnetId) {
    console.error('Aks subnetId is required:', name);
    return undefined;
  }
  if (!linux?.sshKeys || !linux.sshKeys[0]) {
    console.error('Aks sshKeys is required:', name);
    return undefined;
  }

  //Private DNS Zone for Private CLuster
  const privateZone = aksAccess?.enablePrivateCluster
    ? PrivateDns({
        name: 'privatelink.southeastasia.azmk8s.io',
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

      apiServerAccessProfile: {
        authorizedIPRanges: aksAccess?.enablePrivateCluster
          ? []
          : aksAccess?.authorizedIPRanges || [],
        disableRunCommand: true,
        enablePrivateCluster: aksAccess?.enablePrivateCluster,
        privateDNSZone: privateZone?.id,
      },
      //fqdnSubdomain: '',

      addonProfiles: {
        azureKeyvaultSecretsProvider: {
          config: addon.enableAzureKeyVault
            ? {
                enableSecretRotation: 'true',
              }
            : undefined,
          enabled: Boolean(addon.enableAzureKeyVault),
        },

        azurePolicy: { enabled: Boolean(addon.enableAzurePolicy) },
        kubeDashboard: { enabled: Boolean(addon.enableKubeDashboard) },
        //If there is no public P address provided, the public app can access via HTTP app routing only and feature only support HTTP.
        //TO enable HTTPS support need to create a cluster with a public IP address.
        httpApplicationRouting: {
          enabled:
            !network.outboundIpAddress?.ipAddressId &&
            !network.enableFirewall &&
            !aksAccess?.enablePrivateCluster,
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
        name: native.containerservice.ManagedClusterSKUName.Base,
        tier,
      },

      agentPoolProfiles: [
        {
          ...defaultNodePoolProps,
          ...defaultNodePool,

          ...autoScaleFor({
            env: currentEnv,
            nodeType: defaultNodePool.mode,
            enableAutoScaling: enableAutoScale,
          }),

          count: defaultNodePool.mode === 'System' ? 1 : 0,
          //orchestratorVersion: kubernetesVersion,
          vnetSubnetID: network.subnetId,
          kubeletDiskType: 'OS',
          osSKU: 'Ubuntu',
          osType: 'Linux',

          //upgradeSettings: {},
          tags: {
            ...defaultNodePoolProps.tags,
            mode: defaultNodePool.mode,
          },
        },
      ],

      linuxProfile: linux
        ? {
            adminUsername: linux.adminUsername,
            ssh: { publicKeys: linux.sshKeys.map((k) => ({ keyData: k })) },
          }
        : undefined,

      autoScalerProfile: {
        balanceSimilarNodeGroups: 'true',
        expander: 'random',
        maxEmptyBulkDelete: '10',
        maxGracefulTerminationSec: '600',
        maxNodeProvisionTime: '15m',
        maxTotalUnreadyPercentage: '45',
        newPodScaleUpDelay: '0s',
        okTotalUnreadyCount: '3',
        scaleDownDelayAfterAdd: '30m',
        scaleDownDelayAfterDelete: '60s',
        scaleDownDelayAfterFailure: '10m',
        scaleDownUnneededTime: '10m',
        scaleDownUnreadyTime: '20m',
        scaleDownUtilizationThreshold: '0.5',
        scanInterval: '60s',
        skipNodesWithLocalStorage: 'false',
        skipNodesWithSystemPods: 'true',
      },

      //Still under preview
      // workloadAutoScalerProfile: enableAutoScale
      //   ? { keda: { enabled: true } }
      //   : undefined,

      servicePrincipalProfile: serviceIdentity
        ? {
            clientId: serviceIdentity.clientId,
            secret: serviceIdentity.clientSecret,
          }
        : undefined,

      securityProfile: {
        defender: isPrd
          ? {
              logAnalyticsWorkspaceResourceId: log?.logWpId,
              securityMonitoring: { enabled: true },
            }
          : undefined,
        imageCleaner: { enabled: true, intervalHours: 24 },
        workloadIdentity: { enabled: false },
      },

      //azureMonitorProfile: { metrics: { enabled } },
      //Refer here for details https://learn.microsoft.com/en-us/azure/aks/use-managed-identity
      enablePodSecurityPolicy: false,
      podIdentityProfile: featureFlags.enablePodIdentity
        ? {
            enabled: featureFlags.enablePodIdentity,
            //Not allow pod to use kublet command
            allowNetworkPluginKubenet: false,
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
        upgradeChannel: native.containerservice.UpgradeChannel.Patch,
      },
      //securityProfile:{},
      disableLocalAccounts,
      enableRBAC: true,
      aadProfile: {
        enableAzureRBAC: true,
        managed: true,
        adminGroupObjectIDs: adminGroup ? [adminGroup.objectId] : undefined,
        tenantID: tenantId,
      },

      storageProfile: {
        blobCSIDriver: {
          enabled: true,
        },
        diskCSIDriver: {
          enabled: true,
        },
        fileCSIDriver: { enabled: true },
      },

      networkProfile: {
        networkMode: native.containerservice.NetworkMode.Transparent,
        networkPolicy: native.containerservice.NetworkPolicy.Azure,
        networkPlugin: native.containerservice.NetworkPlugin.Azure,

        //dnsServiceIP: '10.0.0.10',
        //dockerBridgeCidr: '172.17.0.1/16',
        //serviceCidr: '10.0.0.0/16',

        outboundType:
          network.enableFirewall || aksAccess?.enablePrivateCluster
            ? native.containerservice.OutboundType.UserDefinedRouting
            : native.containerservice.OutboundType.LoadBalancer,

        loadBalancerSku:
          network.outboundIpAddress?.ipAddressId ||
          network.enableFirewall ||
          aksAccess?.enablePrivateCluster
            ? 'Standard'
            : 'Basic',

        loadBalancerProfile:
          network.outboundIpAddress &&
          !(network.enableFirewall || aksAccess?.enablePrivateCluster)
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
      ignoreChanges: ['privateLinkResources', 'networkProfile', 'linuxProfile'],
    }
  );

  if (lock) {
    Locker({ name: aksName, resourceId: aks.id, dependsOn: aks });
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
            enableAutoScaling: enableAutoScale,
          }),

          count: p.mode === 'System' ? 1 : 0,
          //orchestratorVersion: kubernetesVersion,
          vnetSubnetID: network.subnetId,
          kubeletDiskType: 'OS',
          osSKU: 'Ubuntu',
          osType: 'Linux',

          //upgradeSettings: {},
          tags: {
            ...defaultNodePoolProps.tags,
            mode: p.mode,
          },
        })
    );
  }
  if (vaultInfo) {
    aks.id.apply(async (id) => {
      if (!id) return;

      const config = await getAksConfig({
        name: aksName,
        groupName: group.resourceGroupName,
        formattedName: true,
        localAccountDisabled: disableLocalAccounts,
      });

      addCustomSecret({
        name: secretName,
        value: config,
        dependsOn: aks,
        ignoreChange: true,
        contentType: name,
        vaultInfo,
      });
    });
  }

  //Grant permission for Group

  aks.id.apply(async (id) => {
    if (!id) return;

    //Admin
    if (adminGroup) {
      await Promise.all(
        [
          {
            shortName: 'Admin-Contributor-Role',
            name: 'Azure Kubernetes Service Contributor Role',
          },
          {
            shortName: 'Admin-RBAC-Cluster-Admin',
            name: 'Azure Kubernetes Service RBAC Cluster Admin',
          },
          {
            shortName: 'Admin-Cluster-Admin-Role',
            name: 'Azure Kubernetes Service Cluster Admin Role',
          },
          {
            shortName: 'Admin-Cluster-Monitoring-User',
            name: 'Azure Kubernetes Service Cluster Monitoring User',
          },
          {
            shortName: 'Admin-Cluster-User-Role',
            name: 'Azure Kubernetes Service Cluster User Role',
          },
        ].map((r) =>
          roleAssignment({
            name: `${name}-${r.shortName}`,
            principalId: adminGroup.objectId,
            principalType: 'Group',
            roleName: r.name,
            scope: id,
          })
        )
      );
    }

    //Contributor
    if (contributeGroup) {
      await Promise.all(
        [
          {
            shortName: 'Contributor-Contributor-Role',
            name: 'Azure Kubernetes Service Contributor Role',
          },
          {
            shortName: 'Contributor-RBAC-Admin',
            name: 'Azure Kubernetes Service RBAC Admin',
          },
          {
            shortName: 'Contributor-RBAC-Reader',
            name: 'Azure Kubernetes Service RBAC Reader',
          },
          {
            shortName: 'Contributor-RBAC-Writer',
            name: 'Azure Kubernetes Service RBAC Writer',
          },
        ].map((r) =>
          roleAssignment({
            name: `${name}-${r.shortName}`,
            principalId: contributeGroup.objectId,
            principalType: 'Group',
            roleName: r.name,
            scope: id,
          })
        )
      );
    }

    //Diagnostic
    if (featureFlags.enableDiagnosticSetting) {
      createDiagnostic({
        name,
        targetResourceId: id,
        ...log,
        logsCategories: [
          'guard',
          'kube-controller-manager',
          'kube-audit-admin',
          'kube-audit',
          'kube-scheduler',
          'cluster-autoscaler',
        ],
      });
    }
  });

  //Grant Permission for Identity
  pulumi
    .all([aks.identity, aks.identityProfile, network.subnetId])
    .apply(([identity, identityProfile, sId]) => {
      console.log('Grant RBAC for cluster:', name);

      //Already assigned when creating the service
      // if (serviceIdentity?.principalId) {
      //   await roleAssignment({
      //     name: `${name}-aks-identity-acr-pull`,
      //     principalId: serviceIdentity?.principalId,
      //     principalType: 'ServicePrincipal',
      //     roleName: 'AcrPull',
      //     scope: defaultScope,
      //   });
      // }

      if (acrScope && identityProfile && identityProfile['kubeletidentity']) {
        roleAssignment({
          name: `${name}-aks-identity-profile-pull`,
          principalId: identityProfile['kubeletidentity'].objectId!,
          principalType: 'ServicePrincipal',
          roleName: 'AcrPull',
          scope: acrScope,
        });

        if (vaultInfo) {
          addCustomSecret({
            name: `${name}-identity-clientId`,
            value: identityProfile['kubeletidentity'].clientId!,
            dependsOn: aks,
            contentType: name,
            vaultInfo,
          });
        }
      }

      // if (identity?.principalId) {
      //   await roleAssignment({
      //     name: `${name}-system-acr-pull`,
      //     principalId: identity.principalId,
      //     principalType: 'ServicePrincipal',
      //     roleName: 'AcrPull',
      //     scope: defaultScope,
      //   });
      // }

      if (network.subnetId && identity) {
        roleAssignment({
          name: `${name}-system-net`,
          principalId: identity.principalId,
          roleName: 'Contributor',
          principalType: 'ServicePrincipal',
          scope: getResourceIdFromInfo({
            group: getResourceInfoFromId(sId)!.group,
          }),
        });
      }

      if (privateZone && identity) {
        roleAssignment({
          name: `${name}-private-dns`,
          principalId: identity.principalId,
          roleName: 'Private DNS Zone Contributor',
          principalType: 'ServicePrincipal',
          scope: privateZone.id,
        });
      }
    });

  //Apply monitoring for VMScale Sets
  vmsDiagnostic({
    group: { resourceGroupName: nodeResourceGroup },
    ...log,
    vaultInfo,
    dependsOn: aks,
  });

  return { aks, serviceIdentity, adminGroup, privateZone };
};
