import { KeyVaultInfo } from '../../types';
import { getUserAssignedIdentityInfoOutput } from '../Helper';

import UserAssignedIdentity, {
  UserAssignedIdentityProps,
} from '../UserAssignedIdentity';

export const create = (
  props: Omit<UserAssignedIdentityProps, 'name' | 'role'>,
) => {
  return UserAssignedIdentity({
    ...props,
    name: 'global-user-assigned-identity',
    role: 'readOnly',
  });
};

export const get = (vaultInfo: KeyVaultInfo) =>
  getUserAssignedIdentityInfoOutput('global-user-assigned-identity', vaultInfo);
