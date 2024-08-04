import { KeyVaultInfo } from '../../types';
import { getUserAssignedIdentityInfo } from '../Helper';
import UserAssignedIdentity, {
  UserAssignedIdentityProps,
} from '../UserAssignedIdentity';
import { currentEnv } from '../../Common';

export const create = (
  props: Omit<UserAssignedIdentityProps, 'name' | 'role'>,
) => {
  return UserAssignedIdentity({
    ...props,
    name: currentEnv,
    role: 'readOnly',
  });
};

export const get = (vaultInfo: KeyVaultInfo) =>
  getUserAssignedIdentityInfo(currentEnv, vaultInfo);
