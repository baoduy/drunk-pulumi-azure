import { KeyVaultInfo, WithEnvRoles, WithVaultInfo } from '../../types';
import { getUserAssignedIdentityInfo } from '../Helper';
import UserAssignedIdentity, {
  UserAssignedIdentityProps,
} from '../UserAssignedIdentity';
import { currentEnv } from '../../Common';

export const create = ({
  envRoles,
  ...others
}: Omit<UserAssignedIdentityProps, 'name' | 'role'> &
  WithEnvRoles &
  WithVaultInfo) => {
  const identity = UserAssignedIdentity({
    ...others,
    name: currentEnv,
  });
  envRoles?.addMember('readOnly', identity.principalId);

  return identity;
};

export const get = (vaultInfo: KeyVaultInfo) =>
  getUserAssignedIdentityInfo(currentEnv, vaultInfo);
