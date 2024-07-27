import { Input } from '@pulumi/pulumi';
import { EnvRolesInfo } from '../../AzAd/EnvRoles';
import { RoleEnableTypes } from '../../AzAd/EnvRoles.Consts';
import { KeyVaultInfo, NamedType } from '../../types';

export type EnvRoleBuilderGrantType = NamedType & {
  permissions: RoleEnableTypes;
  scope: Input<string>;
};

export interface IEnvRoleBuilder extends EnvRolesInfo {
  toInfo(): EnvRolesInfo;
  grant(props: EnvRoleBuilderGrantType): IEnvRoleBuilder;
  addMember(memberId: Input<string>): IEnvRoleBuilder;
  pushTo(vaultInfo: KeyVaultInfo): IEnvRoleBuilder;
}
