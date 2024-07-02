import * as native from "@pulumi/azure-native";
import * as pulumi from "@pulumi/pulumi";
import { Input, Resource } from "@pulumi/pulumi";
import { defaultScope } from "../Common/AzureEnv";
import RolesBuiltIn from "./RolesBuiltIn";

type GetRoleProps = {
  roleName: string;
};

/** The result must be single item if not will return undefined. */
export const getRoleDefinitionByName = ({ roleName }: GetRoleProps) => {
  const role = RolesBuiltIn.find((r) => r.properties.roleName === roleName);
  if (role) return role;
  throw new Error(`The role ${roleName} is not found.`);
};

export type RoleAssignmentProps = {
  name: string;
  roleName: string;
  scope?: pulumi.Input<string>;
  principalId: pulumi.Input<string>;
  /**The type of principal Id default is User*/
  principalType?: native.authorization.PrincipalType;
  dependsOn?: Input<Resource> | Input<Input<Resource>[]>;
};

export const roleAssignment = ({
  name,
  roleName,
  scope = defaultScope,
  principalId,
  principalType,
  dependsOn,
}: RoleAssignmentProps) => {
  const role = getRoleDefinitionByName({ roleName });
  return pulumi.output(principalId).apply((id) => {
    if (!id) return undefined;
    return new native.authorization.RoleAssignment(
      `${name}-${roleName.split(" ").join("")}`,
      {
        principalId,
        principalType,
        roleDefinitionId: role.id,
        scope,
      },
      { dependsOn },
    );
  });
};
