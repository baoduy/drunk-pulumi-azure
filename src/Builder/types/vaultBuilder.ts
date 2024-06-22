import { BasicMonitorArgs, KeyVaultInfo } from "../../types";
import { Input } from "@pulumi/pulumi";

export interface IVaultBuilderResults {
  info(): KeyVaultInfo;
  addSecrets(items: Record<string, Input<string>>): IVaultBuilderResults;
  //addKeys () => IVaultBuilderResults;
  //addCerts() => IVaultBuilderResults;
  privateLinkTo(subnetIds: Input<string>[]): IVaultBuilderResults;
  linkTo(props: {
    subnetIds: Input<string>[];
    ipAddresses: Input<string>[];
  }): IVaultBuilderResults;
}

export interface IVaultBuilder {
  name: string;
  withDiagnostic(logInfo: BasicMonitorArgs): IVaultBuilder;
  build(): IVaultBuilderResults;
}
