import { BasicResourceArgs } from '../../types';
import UserAssignedIdentity from '../UserAssignedIdentity';
import { defaultAzAdoName } from './AzDevOpsIdentity';

interface Props extends Omit<BasicResourceArgs, 'name'> {
  name?: string;
}

export default ({ name = defaultAzAdoName, ...others }: Props) => {
  return UserAssignedIdentity({
    name,
    role: 'admin',
    ...others,
  });
};
