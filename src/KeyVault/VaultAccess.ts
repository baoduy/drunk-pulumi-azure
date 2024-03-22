
import GroupRole from '../AzAd/Role';
import { currentEnv } from '../Common/AzureEnv';
import { getAdGroup } from '../AzAd/Group';
import { EnvRoleNamesType } from '../AzAd/EnvRoles';

export type VaultAccessType = {
  /** Grant permission of this group into Environment Roles groups*/
  envRoleNames?: EnvRoleNamesType;
};

interface Props {
  name: string;
  auth: VaultAccessType;
}

export default ({ name, auth }: Props) => {
  //Permission Groups
  const readOnlyGroup = auth.envRoleNames
    ? getAdGroup(auth.envRoleNames.readOnly)
    : GroupRole({
        env: currentEnv,
        appName: `${name}-vault`,
        roleName: 'ReadOnly',
      });

  const adminGroup = auth.envRoleNames
    ? getAdGroup(auth.envRoleNames.contributor)
    : GroupRole({
        env: currentEnv,
        appName: `${name}-vault`,
        roleName: 'Admin',
      });

  return { readOnlyGroup, adminGroup };
};
