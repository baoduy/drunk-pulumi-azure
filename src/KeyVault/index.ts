import * as keyvault from '@pulumi/azure-native/keyvault';
import { enums } from '@pulumi/azure-native/types';
import { Input } from '@pulumi/pulumi';
import { naming, tenantId } from '../Common';
import {
  BasicResourceArgs,
  KeyVaultInfo,
  NetworkPropsType,
  PrivateLinkPropsType,
} from '../types';
import PrivateEndpoint from '../VNet/PrivateEndpoint';

export interface KeyVaultProps extends BasicResourceArgs {
  softDeleteRetentionInDays?: Input<number>;
  network?: NetworkPropsType;
}

export const createVaultPrivateLink = ({
  vaultInfo,
  ...props
}: PrivateLinkPropsType & {
  vaultInfo: KeyVaultInfo;
}) =>
  PrivateEndpoint({
    resourceInfo: vaultInfo,
    ...props,
    privateDnsZoneName: 'privatelink.vaultcore.azure.net',
    linkServiceGroupIds: props.type ? [props.type] : ['keyVault'],
  });

// export const createVaultDiagnostic = ({
//   vaultInfo,
//   logInfo,
// }: {
//   vaultInfo: KeyVaultInfo;
//   logInfo: BasicMonitorArgs;
// }) =>
//   createDiagnostic({
//     name: `${vaultInfo.name}-vault`,
//     targetResourceId: vaultInfo.id,
//     ...logInfo,
//     logsCategories: ['AuditEvent'],
//   });

export default ({
  name,
  group,
  network,
  softDeleteRetentionInDays = 7,
  ignoreChanges = [],
  dependsOn,
  importUri,
  ...others
}: KeyVaultProps) => {
  const vaultName = naming.getKeyVaultName(name);

  const vault = new keyvault.Vault(
    vaultName,
    {
      vaultName,
      ...group,
      ...others,

      properties: {
        tenantId,
        sku: { name: 'standard', family: 'A' },
        createMode: 'default',

        enableRbacAuthorization: true,
        accessPolicies: undefined,

        enablePurgeProtection: true,
        enableSoftDelete: true,
        softDeleteRetentionInDays, //This is not important as pulumi auto restore and update the sift deleted.

        enabledForDeployment: true,
        enabledForDiskEncryption: true,
        enabledForTemplateDeployment: true,

        networkAcls: {
          bypass: 'AzureServices',
          defaultAction: enums.keyvault.NetworkRuleAction.Allow,

          ipRules: network?.ipAddresses
            ? network.ipAddresses.map((i) => ({ value: i }))
            : [],

          virtualNetworkRules: network?.subnetId
            ? [{ id: network.subnetId }]
            : undefined,
        },
      },
    },
    {
      dependsOn,
      import: importUri,
      ignoreChanges: [
        'softDeleteRetentionInDays',
        'enableSoftDelete',
        'enablePurgeProtection',
        ...ignoreChanges,
      ],
    },
  );

  //To Vault Info
  const info = () => ({
    name: vaultName,
    group,
    id: vault.id,
  });

  // Create Private Link
  const createPrivateLink = (props: PrivateLinkPropsType) =>
    createVaultPrivateLink({ vaultInfo: info(), ...props });

  //Create Private Link
  if (network?.privateLink) {
    createPrivateLink(network!.privateLink);
  }

  //Add Diagnostic
  // const addDiagnostic = (logInfo: BasicMonitorArgs) =>
  //   createVaultDiagnostic({ vaultInfo: info(), logInfo });

  return {
    name: vaultName,
    vault,
    info,
    //addDiagnostic,
    createPrivateLink,
  };
};
