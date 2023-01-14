import adGroupCreator, { GroupPermissionProps } from "./Group";
import { Environments } from "../Common/AzureEnv";
import { Input } from "@pulumi/pulumi";

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
  "env" | "location" | "appName" | "moduleName" | "roleName"
>;

export const getRoleName = ({
  env,
  location = "GLB",
  appName,
  moduleName,
  roleName,
}: RoleNameType) => {
  const e = env === Environments.Prd ? "prod" : "non-prd";
  return moduleName
    ? `ROL ${e} ${location} ${appName}.${moduleName} ${roleName}`.toUpperCase()
    : `ROL ${e} ${location} ${appName} ${roleName}`.toUpperCase();
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
