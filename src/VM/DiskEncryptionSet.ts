import * as compute from '@pulumi/azure-native/compute';
import { Input } from '@pulumi/pulumi';
import { getDiskEncryptionName } from '../Common';
import { addEncryptKey } from '../KeyVault/Helper';
import { BasicResourceWithVaultArgs, KeyVaultInfo } from '../types';

interface DiskEncryptionProps extends BasicResourceWithVaultArgs {
  vaultInfo: KeyVaultInfo;
  /* Needs to ensure this userAssignedId is able to read key from Vault*/
  userAssignedId: Input<string>;
}

export default ({
  name,
  group,
  vaultInfo,
  userAssignedId,
  dependsOn,
  ignoreChanges,
  importUri,
}: DiskEncryptionProps) => {
  name = getDiskEncryptionName(name);
  const keyEncryption = addEncryptKey({ name, vaultInfo });

  return new compute.DiskEncryptionSet(
    name,
    {
      ...group,
      rotationToLatestKeyVersionEnabled: true,
      encryptionType: 'EncryptionAtRestWithCustomerKey',
      identity: {
        type: compute.ResourceIdentityType.UserAssigned,
        userAssignedIdentities: [userAssignedId],
      },
      activeKey: { keyUrl: keyEncryption.url },
    },
    { dependsOn, ignoreChanges, import: importUri },
  );
};
