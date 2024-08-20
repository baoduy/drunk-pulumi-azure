import { addCustomSecrets } from '../KeyVault/CustomHelper';
import {
  BasicResourceArgs,
  IdentityInfoWithInstance,
  WithVaultInfo,
} from '../types';
import * as mid from '@pulumi/azure-native/managedidentity';
import { naming } from '../Common';

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
  name = naming.getUIDName(name);
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
      items: [
        {
          name: `${name}-id`,
          value: managedIdentity.id,
        },
        {
          name: `${name}-clientId`,
          value: managedIdentity.clientId,
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
    clientId: managedIdentity.clientId,
    principalId: managedIdentity.principalId,
    instance: managedIdentity,
  };
};
