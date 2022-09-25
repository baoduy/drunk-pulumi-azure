import adGroupCreator, { GroupPermissionProps } from './Group';
import { Environments } from '../Common/AzureEnv';
import { Input } from '@pulumi/pulumi';

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

export default ({
  env,
  location = 'GLB',
  appName,
  moduleName,
  roleName,
  members,
  owners,
  permissions,
}: RoleProps) => {
  const e = env === Environments.Prd ? 'prod' : 'non-prd';
  const name = moduleName
    ? `ROL ${e} ${location} ${appName}.${moduleName} ${roleName}`.toUpperCase()
    : `ROL ${e} ${location} ${appName} ${roleName}`.toUpperCase();

  return adGroupCreator({
    name,
    members,
    owners,
    permissions,
  });
};
