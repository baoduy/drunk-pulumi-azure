import { BasicMonitorArgs, KeyVaultInfo } from "../../types";
import { Input } from "@pulumi/pulumi";

export interface IVaultBuilderResults extends KeyVaultInfo {
  toVaultInfo: () => KeyVaultInfo;
  linkTo: (props: {
    subnetIds: Input<string>[];
    ipAddresses: Input<string>[];
  }) => IVaultBuilderResults;
  privateLinkTo: (subnetIds: Input<string>[]) => IVaultBuilderResults;
  addSecrets: (items: Record<string, Input<string>>) => IVaultBuilderResults;
  //addKeys: () => IVaultBuilderResults;
  //addCerts:() => IVaultBuilderResults;
}

export interface IVaultBuilder {
  name: string;
  withDiagnostic: (logInfo: BasicMonitorArgs) => IVaultBuilder;
  build: () => IVaultBuilderResults;
}
