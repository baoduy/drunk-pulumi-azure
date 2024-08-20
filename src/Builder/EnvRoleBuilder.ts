import { Input, Output } from '@pulumi/pulumi';
import {
  EnvRolesInfo,
  createEnvRoles,
  getEnvRolesOutput,
  pushEnvRolesToVault,
  EnvRoleKeyTypes,
  grantEnvRolesAccess,
} from '../AzAd';

import { addMemberToGroup } from '../AzAd/Group';
import { KeyVaultInfo } from '../types';
import { EnvRoleBuilderGrantType, IEnvRoleBuilder } from './types';

export class EnvRoleBuilder implements IEnvRoleBuilder {
  private constructor(private props: EnvRolesInfo) {}

  public get readOnly() {
    return this.props.readOnly;
  }
  public get contributor() {
    return this.props.contributor;
  }
  public get admin() {
    return this.props.admin;
  }

  public addMember(
    type: EnvRoleKeyTypes,
    memberId: Input<string>,
  ): IEnvRoleBuilder {
    addMemberToGroup({
      name: type,
      groupObjectId: this.props[type].objectId,
      objectId: memberId,
    });

    return this;
  }

  public addIdentity(
    type: EnvRoleKeyTypes,
    identity: Output<{ principalId: string } | undefined>,
  ): IEnvRoleBuilder {
    identity.apply((id) => {
      if (!id) return;
      this.addMember(type, id.principalId);
    });
    return this;
  }

  public pushTo(vaultInfo: KeyVaultInfo): IEnvRoleBuilder {
    pushEnvRolesToVault(this.props, vaultInfo);
    return this;
  }
  public grant(props: EnvRoleBuilderGrantType): IEnvRoleBuilder {
    grantEnvRolesAccess({
      envRoles: this.props,
      name: props.name,
      scope: props.scope,
      ...props.permissions,
    });
    return this;
  }
  public info(): EnvRolesInfo {
    return this.props;
  }

  //Static methods
  public static form(roles: EnvRolesInfo): IEnvRoleBuilder {
    return new EnvRoleBuilder(roles);
  }
  public static loadForm(vaultInfo: KeyVaultInfo): IEnvRoleBuilder {
    return new EnvRoleBuilder(getEnvRolesOutput(vaultInfo));
  }
  public static create(): IEnvRoleBuilder {
    return new EnvRoleBuilder(createEnvRoles());
  }
}
