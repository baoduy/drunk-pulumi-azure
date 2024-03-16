import * as native from '@pulumi/azure-native';
import * as pulumi from '@pulumi/pulumi';
import { Input, Resource } from '@pulumi/pulumi';
import { defaultScope } from '../Common/AzureEnv';
import RolesBuiltIn from './RolesBuiltIn';

type GetRoleProps = {
  roleName: string;
};

// interface AzureRestResult<T> {
//   value: Array<T>;
// }
//
// type RoleDefinitionProps = {
//   name: string;
//   id: string;
//   type: string;
//   properties: {
//     roleName: string;
//     type: 'BuiltInRole';
//     description: string;
//   };
// };

/** The result must be single item if not will return undefined. */
export const getRoleDefinitionByName = ({ roleName }: GetRoleProps) => {
  const role = RolesBuiltIn.find((r) => r.properties.roleName === roleName);
  if (role) return role;
  throw new Error(`The role ${roleName} is not found.`);

  // const axios = createAxios();
  // const url = `/providers/Microsoft.Authorization/roleDefinitions?$filter=roleName eq '${roleName}'&api-version=2018-01-01-preview`;
  //
  // const rs = await axios
  //   .get<AzureRestResult<RoleDefinitionProps>>(url)
  //   .then((rs) => rs.data.value);
  //
  // if (rs.length <= 0) throw new Error(`Role ${roleName} not found`);
  // return rs[0];
};

type Props = {
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
}: Props) => {
  const role = getRoleDefinitionByName({ roleName });

  return new native.authorization.RoleAssignment(
    `${name}-${roleName.split(' ').join('')}`,
    {
      principalId,
      principalType,
      roleDefinitionId: role.id,
      scope,
    },
    { dependsOn }
  );
};
