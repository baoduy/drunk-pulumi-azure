import adGroupCreator, { GroupPermissionProps } from './Group';
import { currentEnv, Environments } from '../Common/AzureEnv';
import { Input } from '@pulumi/pulumi';
import { organization } from '../Common/StackEnv';

interface RoleProps {
  env: Environments;
  /** The country code or GLB for Global*/
  location?: string;
  appName: string;
  moduleName?: string;
  roleName: string;
  members?: Input<string>[];
  owners?: Input<Input<string>[]>;
  permissions?: Array<GroupPermissionProps>;

  includeOrganization?: boolean;
}

export type RoleNameType = Pick<
  RoleProps,
  | 'env'
  | 'location'
  | 'appName'
  | 'moduleName'
  | 'roleName'
  | 'includeOrganization'
>;

export const getRoleName = ({
  env,
  location = 'GLB',
  appName,
  moduleName,
  roleName,
  includeOrganization = true,
}: RoleNameType) => {
  const prefix = includeOrganization ? `${organization} ROL` : 'ROL';

  const e = env === Environments.Prd ? 'prod' : 'staging';

  return moduleName
    ? `${prefix} ${e} ${location} ${appName}.${moduleName} ${roleName}`.toUpperCase()
    : `${prefix} ${e} ${location} ${appName} ${roleName}`.toUpperCase();
};

export default ({ members, owners, permissions, ...others }: RoleProps) => {
  const name = getRoleName(others);

  return adGroupCreator({
    name,
    members,
    owners,
    permissions,
  });
};
