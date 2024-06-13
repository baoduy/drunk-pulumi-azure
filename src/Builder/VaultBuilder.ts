import { BuilderProps } from "./types";
import { IVaultBuilder, IVaultBuilderResults } from "./types/vaultBuilder";
import Vault, { createVaultPrivateLink } from "../KeyVault";
import { BasicMonitorArgs, KeyVaultInfo } from "../types";
import { Input } from "@pulumi/pulumi";
import { VaultNetworkResource } from "@drunk-pulumi/azure-providers";
import { subscriptionId } from "../Common/AzureEnv";
import { addCustomSecret } from "../KeyVault/CustomHelper";

export class VaultBuilderResults implements IVaultBuilderResults {
  private constructor(private readonly vaultInfo: KeyVaultInfo) {}

  public toVaultInfo(): KeyVaultInfo {
    return this.vaultInfo;
  }

  public static from(vaultInfo: KeyVaultInfo): IVaultBuilderResults {
    if (!vaultInfo || !vaultInfo.name || !vaultInfo.id)
      throw new Error("VaultBuilderResult is not defined");

    return new VaultBuilderResults(vaultInfo);
  }

  public get name() {
    return this.vaultInfo.name;
  }

  public get group() {
    return this.vaultInfo.group;
  }

  public get id() {
    return this.vaultInfo.id;
  }

  public linkTo(props: {
    subnetIds: Input<string>[];
    ipAddresses: Input<string>[];
  }): IVaultBuilderResults {
    new VaultNetworkResource(`${this.name}-vault-link`, {
      vaultName: this.name,
      resourceGroupName: this.group.resourceGroupName,
      subscriptionId,
      ...props,
    });
    return this;
  }

  public privateLinkTo(subnetIds: Input<string>[]): IVaultBuilderResults {
    createVaultPrivateLink({
      name: `${this.name}-vault`,
      vaultInfo: this,
      subnetIds,
    });
    return this;
  }

  public addSecrets(
    items: Record<string, Input<string>>,
  ): IVaultBuilderResults {
    //Add Secrets to Vaults
    Object.keys(items).map((key) => {
      const val = items[key];
      return addCustomSecret({
        name: key,
        value: val,
        contentType: `${this.name}-${key}`,
        vaultInfo: this,
      });
    });
    return this;
  }
}

class VaultBuilder implements IVaultBuilder {
  private readonly _props: Omit<BuilderProps, "vaultInfo">;
  private _logInfo: BasicMonitorArgs | undefined = undefined;

  constructor(props: Omit<BuilderProps, "vaultInfo">) {
    this._props = props;
  }

  public withDiagnostic(logInfo: BasicMonitorArgs): IVaultBuilder {
    this._logInfo = logInfo;
    return this;
  }

  public get name() {
    return this._props.name;
  }

  public build(): IVaultBuilderResults {
    const rs = Vault(this._props);
    if (this._logInfo) rs.addDiagnostic(this._logInfo);
    return VaultBuilderResults.from(rs.toVaultInfo());
  }
}

export default (props: Omit<BuilderProps, "vaultInfo">) =>
  new VaultBuilder(props) as IVaultBuilder;
