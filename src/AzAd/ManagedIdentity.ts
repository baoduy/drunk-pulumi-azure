import { BasicResourceArgs } from '../types';
import * as azure from '@pulumi/azure-native';
import { getManagedIdentityName } from '../Common/Naming';
import Locker from '../Core/Locker';

interface Props extends BasicResourceArgs {
  lock?: boolean;
}

export default ({ name, group, lock }: Props) => {
  const n = getManagedIdentityName(name);
  const managedIdentity = new azure.managedidentity.UserAssignedIdentity(n, {
    resourceName: n,
    ...group,
  });

  if (lock) {
    Locker({
      name: n,
      resource: managedIdentity,
    });
  }

  return managedIdentity;
};
