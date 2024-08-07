import { addCustomSecrets } from '../KeyVault/CustomHelper';
import {
  BasicResourceArgs,
  IdentityInfoWithInstance,
  WithVaultInfo,
} from '../types';
import * as mid from '@pulumi/azure-native/managedidentity';
import { getUIDName } from '../Common';

export interface UserAssignedIdentityProps
  extends BasicResourceArgs,
    WithVaultInfo {}

export default ({
  name,
  group,
  vaultInfo,
  dependsOn,
  importUri,
  ignoreChanges,
}: UserAssignedIdentityProps): IdentityInfoWithInstance<mid.UserAssignedIdentity> => {
  name = getUIDName(name);
  const managedIdentity = new mid.UserAssignedIdentity(
    name,
    {
      resourceName: name,
      ...group,
    },
    { dependsOn, import: importUri, ignoreChanges },
  );

  if (vaultInfo) {
    addCustomSecrets({
      vaultInfo,
      dependsOn: managedIdentity,
      contentType: 'UserAssignedIdentity',
      formattedName: true,
      items: [
        {
          name: `${name}-id`,
          value: managedIdentity.id,
        },
        {
          name: `${name}-principalId`,
          value: managedIdentity.principalId,
        },
      ],
    });
  }

  return {
    id: managedIdentity.id,
    principalId: managedIdentity.principalId,
    instance: managedIdentity,
  };
};
