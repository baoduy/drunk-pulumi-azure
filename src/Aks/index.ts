import * as ccs from '@pulumi/azure-native/containerservice';
import * as pulumi from '@pulumi/pulumi';
import { containerservice } from '@pulumi/azure-native/types/input';
import { Input, Output, output } from '@pulumi/pulumi';
import * as dnsBuilder from '../Builder/PrivateDnsZoneBuilder';
import vmsDiagnostic from './VmSetMonitor';
import {
  BasicEncryptResourceArgs,
  LockableType,
  ResourceInfoWithInstance,
} from '../types';
import {
  currentEnv,
  defaultSubScope,
  Environments,
  getResourceIdFromInfo,
  isPrd,
  parseResourceInfoFromId,
  tenantId,
  stack,
  getAksName,
  getResourceGroupName,
} from '../Common';
import Locker from '../Core/Locker';
import aksIdentityCreator from './Identity';
import { createDiagnostic } from '../Logs/Helpers';
import { roleAssignment } from '../AzAd/RoleAssignment';
import { getAksConfig, getAksPrivateDnz } from './Helper';
import { addCustomSecret } from '../KeyVault/CustomHelper';
import getKeyVaultBase from '@drunk-pulumi/azure-providers/AzBase/KeyVaultBase';
import { IdentityResult } from '../AzAd/Identity';

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
  type: ccs.AgentPoolType.VirtualMachineScaleSets,
  vmSize: 'Standard_B2s',

  maxPods: 50,
  enableFIPS: false,
  enableNodePublicIP: false,
  //enableEncryptionAtHost: false,

  enableUltraSSD: isPrd,
  osDiskSizeGB: 128,
  osDiskType: ccs.OSDiskType.Managed,

  nodeLabels: {
    environment: currentEnv,
    stack,
  },
};

export enum VmSizes {
  /** 32G RAM - 4CPU - $221.92 */
  Standard_E4as_v4 = 'Standard_E4as_v4',
  /** 8G RAM - 2CPU - $77.38 */
  Standard_B2ms = 'Standard_B2ms',
  /** 16G RAM - 4CPU - $154.03 */
  Standard_B4ms = 'Standard_B4ms',
  /** 8G RAM - 2CPU - 87.60 */
  Standard_D2as_v4 = 'Standard_D2as_v4',
  /** 8G RAM - 2CPU - 87.60 */
  Standard_D2s_v3 = 'Standard_D2s_v3',
  /** 8G RAM - 4CPU - 182.5 */
  Standard_D4s_v3 = 'Standard_D4s_v3',
  /** 16G RAM - 4CPU - $175.20 */
  Standard_D4as_v4 = 'Standard_D4as_v4',
  /** 4G RAM - 2CPU - $69.35 */
  Standard_A2_v2 = 'Standard_A2_v2',
  /** 8G RAM - 4CPU - $144.54 */
  Standard_A4_v2 = 'Standard_A4_v2',
  /** 32G RAM - 4CPU - $205.13 */
  Standard_A4m_v2 = 'Standard_A4m_v2',
}

export interface NodePoolProps
  extends containerservice.ManagedClusterAgentPoolProfileArgs {
  mode: ccs.AgentPoolMode;
  vmSize: VmSizes | string;
  osDiskSizeGB: number;
  maxPods: number;
}

export type AskAddonProps = {
  enableAzureKeyVault?: boolean;
  enableVirtualHost?: boolean;
  applicationGateway?: { gatewaySubnetId: pulumi.Input<string> };
};

export type AskFeatureProps = {
  enablePrivateCluster?: boolean;
  enableAutoScale?: boolean;
  enablePodIdentity?: boolean;
  enableWorkloadIdentity?: boolean;
  //enableDiagnosticSetting?: boolean;
  enableMaintenance?: boolean;
};

export type AksAccessProps = {
  //envRoles?: IEnvRoleBuilder;
  authorizedIPRanges?: Input<string>[];
  disableLocalAccounts?: boolean;
};

export type AksNetworkProps = {
  subnetId: pulumi.Input<string>;
  virtualHostSubnetName?: pulumi.Input<string>;
  /** This is using for Private DNZ linking only*/
  extraVnetIds?: pulumi.Input<string>[];
  outboundIpAddress?: {
    ipAddressId?: pulumi.Input<string>;
    ipAddressPrefixId?: pulumi.Input<string>;
  };
};

export type AksNodePoolProps = Omit<NodePoolProps, 'subnetId' | 'aksId'>;
export type DefaultAksNodePoolProps = Omit<AksNodePoolProps, 'name' | 'mode'>;

export interface AksProps extends BasicEncryptResourceArgs, LockableType {
  tier?: ccs.ManagedClusterSKUTier;
  addon?: AskAddonProps;
  features?: AskFeatureProps;
  aksAccess: AksAccessProps;
  storageProfile?: {
    blobCSIDriver: {
      enabled: boolean;
    };
    diskCSIDriver: {
      enabled: boolean;
    };
    fileCSIDriver: { enabled: boolean };
    snapshotController: { enabled: boolean };
  };
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
  logWpId?: Input<string>;
}

export type AksResults = ResourceInfoWithInstance<ccs.ManagedCluster> & {
  serviceIdentity: IdentityResult;
  disableLocalAccounts?: boolean;
  getKubeConfig: () => Output<string> | undefined;
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
  enableEncryption,
  envRoles,
  features = { enableMaintenance: true },
  storageProfile,
  addon = {
    enableAzureKeyVault: false,
  },
  tier = ccs.ManagedClusterSKUTier.Free,
  lock = true,
  dependsOn = [],
  importUri,
  ignoreChanges = [],
}: AksProps): Promise<AksResults> => {
  const aksName = getAksName(name);
  const secretName = `${aksName}-config`;
  const nodeResourceGroup = getResourceGroupName(`${aksName}-nodes`);

  //Auto detect and disable Local Account
  if (aksAccess.disableLocalAccounts === undefined && vaultInfo) {
    aksAccess.disableLocalAccounts = await getKeyVaultBase(vaultInfo.name)
      .checkSecretExist(secretName)
      .catch(() => false);
  }

  //Add Default Ignoring properties
  ignoreChanges.push(
    'privateLinkResources',
    'networkProfile',
    'nodeResourceGroup',
    'linuxProfile',
    'windowsProfile',
    'diskEncryptionSetID',
  );

  const serviceIdentity = aksIdentityCreator({
    name: aksName,
    vaultInfo,
    dependsOn,
  });

  //TODO: Implement Disk Encryption
  // const diskEncryptionSet =enableEncryption? compute.

  //Create AKS Cluster
  const aks = new ccs.ManagedCluster(
    aksName,
    {
      resourceName: aksName,
      ...group,
      nodeResourceGroup,
      dnsPrefix: aksName,

      apiServerAccessProfile: {
        authorizedIPRanges: features?.enablePrivateCluster
          ? undefined
          : aksAccess.authorizedIPRanges || [],
        disableRunCommand: true,
        enablePrivateCluster: features?.enablePrivateCluster,
        enablePrivateClusterPublicFQDN: false,
        privateDNSZone: features?.enablePrivateCluster ? 'system' : undefined,
        //privateDNSZone: privateDnsZone?.id,
      },

      addonProfiles: {
        azureKeyvaultSecretsProvider: {
          config: addon.enableAzureKeyVault
            ? {
                enableSecretRotation: 'true',
              }
            : undefined,
          enabled: Boolean(addon.enableAzureKeyVault),
        },

        azurePolicy: { enabled: true },
        kubeDashboard: { enabled: false },
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
        name: ccs.ManagedClusterSKUName.Base,
        tier,
      },
      supportPlan: ccs.KubernetesSupportPlan.KubernetesOfficial,
      agentPoolProfiles: [
        {
          ...defaultNodePoolProps,
          ...defaultNodePool,
          ...autoScaleFor({
            env: currentEnv,
            nodeType: 'System',
            enableAutoScaling: features?.enableAutoScale,
          }),
          enableEncryptionAtHost: true,
          name: 'defaultnodes',
          mode: 'System',
          count: 1,
          vnetSubnetID: network.subnetId,
          kubeletDiskType: 'OS',
          osSKU: 'Ubuntu',
          osType: 'Linux',
        },
      ],
      linuxProfile: linux
        ? {
            adminUsername: linux.adminUsername,
            ssh: { publicKeys: linux.sshKeys.map((k) => ({ keyData: k })) },
          }
        : undefined,
      //This is not inuse
      windowsProfile: undefined,
      // windowsProfile: {
      //   adminUsername: 'azureuser',
      //   enableCSIProxy: true,
      // },
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
      //azureMonitorProfile: { metrics: { enabled } },
      //Refer here for details https://learn.microsoft.com/en-us/azure/aks/use-managed-identity
      //enablePodSecurityPolicy: true,
      diskEncryptionSetID: '',
      servicePrincipalProfile: {
        clientId: serviceIdentity.clientId,
        secret: serviceIdentity.clientSecret,
      },
      oidcIssuerProfile: { enabled: Boolean(features?.enableWorkloadIdentity) },
      securityProfile: {
        defender:
          logWpId && isPrd
            ? {
                logAnalyticsWorkspaceResourceId: logWpId,
                securityMonitoring: { enabled: true },
              }
            : undefined,
        imageCleaner: { enabled: true, intervalHours: 24 },
        workloadIdentity: {
          enabled: Boolean(features?.enableWorkloadIdentity),
        },
      },
      podIdentityProfile: features.enablePodIdentity
        ? {
            enabled: features.enablePodIdentity,
            //Not allow pod to use kublet command
            allowNetworkPluginKubenet: false,
          }
        : undefined,
      identity: {
        type: ccs.ResourceIdentityType.SystemAssigned,
      },
      autoUpgradeProfile: {
        upgradeChannel: ccs.UpgradeChannel.Stable,
        //nodeOSUpgradeChannel: "NodeImage",
      },
      disableLocalAccounts: Boolean(aksAccess.disableLocalAccounts),
      enableRBAC: true,
      aadProfile: envRoles
        ? {
            enableAzureRBAC: true,
            managed: true,
            adminGroupObjectIDs: [envRoles.admin.objectId],
            tenantID: tenantId,
          }
        : undefined,
      storageProfile,
      networkProfile: {
        networkMode: ccs.NetworkMode.Transparent,
        networkPolicy: ccs.NetworkPolicy.Azure,
        networkPlugin: ccs.NetworkPlugin.Azure,

        outboundType:
          features?.enablePrivateCluster || !network.outboundIpAddress
            ? ccs.OutboundType.UserDefinedRouting
            : ccs.OutboundType.LoadBalancer,

        loadBalancerSku: 'Standard',
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
      dependsOn: serviceIdentity.resource,
      import: importUri,
      deleteBeforeReplace: true,
      ignoreChanges,
      protect: lock,
    },
  );

  //Lock from delete
  if (lock) {
    Locker({ name: aksName, resource: aks });
  }

  if (features?.enableMaintenance) {
    //Default
    new ccs.MaintenanceConfiguration(
      `${aksName}-MaintenanceConfiguration`,
      {
        configName: 'default',
        ...group,
        resourceName: aks.name,
        timeInWeek: [
          {
            day: ccs.WeekDay.Sunday,
            hourSlots: [0, 23],
          },
        ],
      },
      { dependsOn: aks, deleteBeforeReplace: true },
    );
  }

  if (nodePools) {
    nodePools.map(
      (p) =>
        new ccs.AgentPool(`${name}-${p.name}`, {
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
          enableEncryptionAtHost: true,
          count: p.mode === 'System' ? 1 : 0,
          vnetSubnetID: network.subnetId,
          kubeletDiskType: 'OS',
          osSKU: 'Ubuntu',
          osType: 'Linux',
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
        const acrScope = acr?.id ?? defaultSubScope;
        if (identityProfile && identityProfile['kubeletidentity']) {
          // roleAssignment({
          //   name: `${name}-aks-identity-profile-pull`,
          //   principalId: identityProfile['kubeletidentity'].objectId!,
          //   principalType: 'ServicePrincipal',
          //   roleName: 'AcrPull',
          //   scope: acrScope,
          // });

          //Add into EnvRoles
          envRoles?.addMember(
            'contributor',
            identityProfile['kubeletidentity'].objectId!,
          );
        }

        //Link service principal to Vnet Resources group
        if (network.subnetId && identity) {
          roleAssignment({
            name: `${name}-system-net`,
            principalId: identity.principalId,
            roleName: 'Contributor',
            principalType: 'ServicePrincipal',
            scope: getResourceIdFromInfo({
              group: parseResourceInfoFromId(sId)!.group,
            }),
          });

          //Add into EnvRoles
          envRoles?.addMember('contributor', identity.principalId);
        }

        //Link Private Dns to extra Vnet
        if (features?.enablePrivateCluster && network.extraVnetIds) {
          const dns = getAksPrivateDnz({
            name: aksName,
            group,
            id: aks.id,
          });

          dns.apply((s) =>
            dnsBuilder
              .from(s!)
              .linkTo({ vnetIds: network.extraVnetIds })
              .build(),
          );
        }
      });

    //Update Vault
    const config = await getAksConfig({
      name: aksName,
      groupName: group.resourceGroupName,
      formattedName: true,
      disableLocalAccounts: aksAccess.disableLocalAccounts,
    });

    if (vaultInfo) {
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
    }

    //Diagnostic
    if (logWpId) {
      createDiagnostic({
        name,
        targetResourceId: id,
        logWpId,
        logsCategories: [
          'guard',
          'kube-controller-manager',
          'kube-audit-admin',
          'kube-audit',
          'kube-scheduler',
          'cluster-autoscaler',
        ],
        dependsOn: aks,
      });

      if (vaultInfo) {
        //Apply monitoring for VMScale Sets
        vmsDiagnostic({
          group: { resourceGroupName: nodeResourceGroup },
          logWpId,
          vaultInfo,
          dependsOn: aks,
        });
      }
    }
  });

  return {
    name: aksName,
    group,
    id: aks.id,
    instance: aks,
    serviceIdentity,
    getKubeConfig: (): Output<string> | undefined =>
      vaultInfo
        ? output(
            getKeyVaultBase(vaultInfo.name)
              .getSecret(secretName)
              .then((s) => s!.value!),
          )
        : undefined,
  };
};
