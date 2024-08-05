import * as compute from '@pulumi/azure-native/compute';
import { Input } from '@pulumi/pulumi';
import { getDiskEncryptionName } from '../Common';
import { addEncryptKey } from '../KeyVault/Helper';
import {
  BasicResourceWithVaultArgs,
  KeyVaultInfo,
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
  dependsOn,
  ignoreChanges,
  importUri,
}: DiskEncryptionProps) => {
  if (!envUIDInfo || !vaultInfo) return undefined;
  name = getDiskEncryptionName(name);
  const keyEncryption = addEncryptKey({ name, vaultInfo });
  return new compute.DiskEncryptionSet(
    name,
    {
      ...group,
      rotationToLatestKeyVersionEnabled: true,
      encryptionType: 'EncryptionAtRestWithCustomerKey',
      identity: {
        type: compute.ResourceIdentityType.SystemAssigned_UserAssigned,
        userAssignedIdentities: [envUIDInfo!.id],
      },
      activeKey: { keyUrl: keyEncryption.url },
    },
    { dependsOn, ignoreChanges, import: importUri },
  );
};
