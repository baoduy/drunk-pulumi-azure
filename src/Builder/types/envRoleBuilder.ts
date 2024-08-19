import { Input, Output } from '@pulumi/pulumi';
import { EnvRoleKeyTypes, EnvRolesInfo } from '../../AzAd/EnvRoles';
import { RoleEnableTypes } from '../../AzAd/EnvRoles.Consts';
import { KeyVaultInfo, WithNamedType } from '../../types';
import { IInfo } from './genericBuilder';

/**
 * Properties for granting permissions to an environment role.
 */
export type EnvRoleBuilderGrantType = WithNamedType & {
  permissions: RoleEnableTypes;
  scope: Input<string>;
};

/**
 * Interface for building environment roles.
 */
export interface IEnvRoleBuilder extends EnvRolesInfo, IInfo<EnvRolesInfo> {
  /**
   * Method to grant permissions to an environment role.
   * @param props - Properties for granting permissions.
   * @returns An instance of IEnvRoleBuilder.
   */
  grant(props: EnvRoleBuilderGrantType): IEnvRoleBuilder;

  /**
   * Method to add a member to an environment role.
   * @param type - The type of the environment role key.
   * @param memberId - The ID of the member to add.
   * @returns An instance of IEnvRoleBuilder.
   */
  addMember(type: EnvRoleKeyTypes, memberId: Input<string>): IEnvRoleBuilder;

  /**
   * Method to add an identity to an environment role.
   * @param type - The type of the environment role key.
   * @param identity - The identity to add.
   * @returns An instance of IEnvRoleBuilder.
   */
  addIdentity(
    type: EnvRoleKeyTypes,
    identity: Output<{ principalId: string } | undefined>,
  ): IEnvRoleBuilder;

  /**
   * Method to push the environment role to a key vault.
   * @param vaultInfo - The key vault information.
   * @returns An instance of IEnvRoleBuilder.
   */
  pushTo(vaultInfo: KeyVaultInfo): IEnvRoleBuilder;
}
