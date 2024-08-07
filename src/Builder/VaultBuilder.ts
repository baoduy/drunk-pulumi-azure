import { BuilderProps } from './types';
import {
  CertBuilderType,
  IVaultBuilder,
  IVaultBuilderResults,
  VaultBuilderArgs,
} from './types/vaultBuilder';
import Vault, { createVaultPrivateLink } from '../KeyVault';
import { KeyVaultInfo, ResourceGroupInfo, WithEnvRoles } from '../types';
import { Input, Output } from '@pulumi/pulumi';
import {
  VaultCertResource,
  VaultNetworkResource,
} from '@drunk-pulumi/azure-providers';
import { subscriptionId } from '../Common';
import { addCustomSecret } from '../KeyVault/CustomHelper';
import { requireSecret } from '../Common/ConfigHelper';

export class VaultBuilderResults implements IVaultBuilderResults {
  private constructor(private readonly vaultInfo: KeyVaultInfo) {}

  public static from(vaultInfo: KeyVaultInfo): IVaultBuilderResults {
    if (!vaultInfo || !vaultInfo.name || !vaultInfo.id)
      throw new Error('VaultBuilderResult is not defined');
    return new VaultBuilderResults(vaultInfo);
  }

  public get name(): string {
    return this.vaultInfo.name;
  }
  public get group(): ResourceGroupInfo {
    return this.vaultInfo.group;
  }
  public get id(): Output<string> {
    return this.vaultInfo.id;
  }
  public info(): KeyVaultInfo {
    return this.vaultInfo;
  }

  public linkTo(props: {
    subnetIds: Input<string>[];
    ipAddresses: Input<string>[];
  }): IVaultBuilderResults {
    new VaultNetworkResource(`${this.vaultInfo.name}-vault-link`, {
      vaultName: this.vaultInfo.name,
      resourceGroupName: this.vaultInfo.group.resourceGroupName,
      subscriptionId,
      ...props,
    });
    return this;
  }

  public privateLinkTo(subnetIds: Input<string>[]): IVaultBuilderResults {
    createVaultPrivateLink({
      vaultInfo: this.vaultInfo,
      subnetIds,
    });
    return this;
  }

  public addSecrets(
    items: Record<string, Input<string>> | string,
  ): IVaultBuilderResults {
    //Add secret from project secret
    if (typeof items === 'string') {
      const key = items as string;
      const val = requireSecret(key);
      addCustomSecret({
        name: key,
        value: val,
        contentType: `${this.vaultInfo.name}-${key}`,
        vaultInfo: this.vaultInfo,
      });
    }
    //Add Secrets to Vaults
    else {
      Object.keys(items).map((key) => {
        const val = items[key];
        return addCustomSecret({
          name: key,
          value: val,
          contentType: `${this.vaultInfo.name}-${key}`,
          vaultInfo: this.vaultInfo,
        });
      });
    }
    return this;
  }

  public addCerts(
    items: Record<string, CertBuilderType>,
  ): IVaultBuilderResults {
    Object.keys(items).map((key) => {
      const val = items[key];
      return new VaultCertResource(val.name, {
        ...val,
        vaultName: this.vaultInfo.name,
      });
    });

    return this;
  }
}

class VaultBuilder implements IVaultBuilder {
  constructor(private args: VaultBuilderArgs) {}

  // public withDiagnostic(logInfo: BasicMonitorArgs): IVaultBuilder {
  //   this._logInfo = logInfo;
  //   return this;
  // }

  public build(): IVaultBuilderResults {
    const rs = Vault(this.args);
    //if (this._logInfo) rs.addDiagnostic(this._logInfo);
    return VaultBuilderResults.from(rs.info());
  }
}

export default (props: VaultBuilderArgs) =>
  new VaultBuilder(props) as IVaultBuilder;
