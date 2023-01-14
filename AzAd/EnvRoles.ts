import { currentEnv } from "../Common/AzureEnv";
import Role, { getRoleName, RoleNameType } from "./Role";

const envRoleConfig = {
  readOnly: {
    env: currentEnv,
    roleName: "Readonly",
    appName: "Azure",
  } as RoleNameType,
  contributor: {
    env: currentEnv,
    roleName: "Contributor",
    appName: "Azure",
  } as RoleNameType,
  admin: {
    env: currentEnv,
    roleName: "Admin",
    appName: "Azure",
  } as RoleNameType,
};

export const envRoleNames = {
  readOnly: getRoleName(envRoleConfig.readOnly),
  contributor: getRoleName(envRoleConfig.contributor),
  admin: getRoleName(envRoleConfig.admin),
};

export default async () => {
  //ReadOnly
  await Role(envRoleConfig.readOnly);
  //Contributor
  await Role(envRoleConfig.contributor);
  //Admin
  await Role(envRoleConfig.admin);
};
