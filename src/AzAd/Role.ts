import adGroupCreator, { GroupPermissionProps } from "./Group";
import { Environments } from "../Common/AzureEnv";
import { Input, output } from "@pulumi/pulumi";
import { organization } from "../Common/StackEnv";

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
  location,
  appName,
  moduleName,
  roleName,
}: RoleNameType) => {
  const nameBuilder = [`${organization} ROL`, env];
  if (location) nameBuilder.push(location);
  if (moduleName) nameBuilder.push(`${appName}.${moduleName}`);
  else nameBuilder.push(appName);
  nameBuilder.push(roleName);
  return nameBuilder.join(" ").toUpperCase();
};

export default ({ members, owners, permissions, ...others }: RoleProps) => {
  const name = getRoleName(others);
  return output(
    adGroupCreator({
      name,
      members,
      owners,
      permissions,
    }),
  );
};
