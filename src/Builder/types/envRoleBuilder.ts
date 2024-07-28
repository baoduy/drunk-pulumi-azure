import { Input } from '@pulumi/pulumi';
import { EnvRoleKeyTypes, EnvRolesInfo } from '../../AzAd/EnvRoles';
import { RoleEnableTypes } from '../../AzAd/EnvRoles.Consts';
import { KeyVaultInfo, NamedType } from '../../types';
import { IInfo } from './genericBuilder';

export type EnvRoleBuilderGrantType = NamedType & {
  permissions: RoleEnableTypes;
  scope: Input<string>;
};

export interface IEnvRoleBuilder extends EnvRolesInfo, IInfo<EnvRolesInfo> {
  grant(props: EnvRoleBuilderGrantType): IEnvRoleBuilder;
  addMember(type: EnvRoleKeyTypes, memberId: Input<string>): IEnvRoleBuilder;
  pushTo(vaultInfo: KeyVaultInfo): IEnvRoleBuilder;
}
