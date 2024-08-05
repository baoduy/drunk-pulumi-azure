import {
  BasicResourceArgs,
  WithEncryptionInfo,
  WithEnvRoles,
  WithVaultInfo,
} from '../../types';
import UserAssignedIdentity from '../UserAssignedIdentity';
import { defaultAzAdoName } from './AzDevOpsIdentity';

interface Props
  extends Omit<BasicResourceArgs, 'name'>,
    WithVaultInfo,
    WithEnvRoles {
  name?: string;
}

export default ({ name = defaultAzAdoName, envRoles, ...others }: Props) => {
  const identity = UserAssignedIdentity({
    name,
    ...others,
  });
  envRoles?.addMember('admin', identity.principalId);
};
