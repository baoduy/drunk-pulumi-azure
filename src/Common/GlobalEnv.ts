import { ResourceGroupInfo } from '../types';
import naming from './Naming';

export const globalKeyName = 'global';

export const groupInfo: ResourceGroupInfo = {
  resourceGroupName: naming.getResourceGroupName(globalKeyName),
};

// const cdnProfileName = getCdnProfileName(globalKeyName);
// export const cdnProfileInfo: ResourceInfo = {
//   name: cdnProfileName,
//   group: {
//     resourceGroupName: groupInfo.resourceGroupName,
//     location: globalKeyName,
//   },
//   id: interpolate`${defaultSubScope}/resourceGroups/${groupInfo.resourceGroupName}/providers/microsoft.cdn/profiles/${cdnProfileName}`,
// };

//
// /** Global Key Vault Info */
// const vaultName = getKeyVaultName(globalKeyName);
// export const keyVaultInfo: KeyVaultInfo = {
//   name: vaultName,
//   group: groupInfo,
//   id: interpolate`${defaultSubScope}/resourceGroups/${groupInfo.resourceGroupName}/providers/Microsoft.KeyVault/vaults/${vaultName}`,
// };
