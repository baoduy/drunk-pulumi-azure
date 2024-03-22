import adGroupCreator, { GroupPermissionProps } from './Group';
import { Environments } from '../Common/AzureEnv';
import { Input, output } from '@pulumi/pulumi';
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
}

export type RoleNameType = Pick<
  RoleProps,
  | 'env'
  | 'location'
  | 'appName'
  | 'moduleName'
  | 'roleName'
>;

export const getRoleName = ({
  env,
  location = 'GLB',
  appName,
  moduleName,
  roleName
}: RoleNameType) => {
  const prefix = `${organization} ROL`;

  return moduleName
    ? `${prefix} ${env} ${location} ${appName}.${moduleName} ${roleName}`.toUpperCase()
    : `${prefix} ${env} ${location} ${appName} ${roleName}`.toUpperCase();
};

export default ({ members, owners, permissions, ...others }: RoleProps) => {
  const name = getRoleName(others);
  return output(
    adGroupCreator({
      name,
      members,
      owners,
      permissions,
    })
  );
};
