import * as compute from '@pulumi/azure-native/compute';
import { naming } from '../Common';
import { addEncryptKey } from '../KeyVault/Helper';
import {
  BasicResourceWithVaultArgs,
  ResourceInfoWithInstance,
  WithEnvRoles,
} from '../types';

interface DiskEncryptionProps
  extends BasicResourceWithVaultArgs,
    WithEnvRoles {}

export default ({
  name,
  group,
  vaultInfo,
  envUIDInfo,
  envRoles,
  dependsOn,
  ignoreChanges = [],
  importUri,
}: DiskEncryptionProps): ResourceInfoWithInstance<compute.DiskEncryptionSet> => {
  if (!envUIDInfo || !vaultInfo)
    throw new Error(
      'The "vaultInfo" and "envUIDInfo" are required for  DiskEncryptionSet.',
    );

  name = naming.getDiskEncryptionName(name);
  const keyEncryption = addEncryptKey(name, vaultInfo);
  const diskEncrypt = new compute.DiskEncryptionSet(
    name,
    {
      ...group,
      diskEncryptionSetName: name,
      rotationToLatestKeyVersionEnabled: true,
      encryptionType: 'EncryptionAtRestWithCustomerKey',
      identity: {
        type: compute.ResourceIdentityType.SystemAssigned_UserAssigned,
        userAssignedIdentities: [envUIDInfo!.id],
      },
      activeKey: { keyUrl: keyEncryption.url },
    },
    {
      dependsOn,
      ignoreChanges: [...ignoreChanges, 'diskEncryptionSetName'],
      import: importUri,
    },
  );

  diskEncrypt.identity.apply((i) => {
    if (i) envRoles?.addMember('readOnly', i.principalId);
  });

  return { name, group, id: diskEncrypt.id, instance: diskEncrypt };
};
