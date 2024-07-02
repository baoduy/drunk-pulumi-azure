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

  public static from(vaultInfo: KeyVaultInfo): IVaultBuilderResults {
    if (!vaultInfo || !vaultInfo.name || !vaultInfo.id)
      throw new Error("VaultBuilderResult is not defined");

    return new VaultBuilderResults(vaultInfo);
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
    items: Record<string, Input<string>>,
  ): IVaultBuilderResults {
    //Add Secrets to Vaults
    Object.keys(items).map((key) => {
      const val = items[key];
      return addCustomSecret({
        name: key,
        value: val,
        contentType: `${this.vaultInfo.name}-${key}`,
        vaultInfo: this.vaultInfo,
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
    return VaultBuilderResults.from(rs.info());
  }
}

export default (props: Omit<BuilderProps, "vaultInfo">) =>
  new VaultBuilder(props) as IVaultBuilder;
