import { BasicMonitorArgs, KeyVaultInfo } from "../../types";
import { Input } from "@pulumi/pulumi";

export interface IVaultBuilderResults extends KeyVaultInfo {
  linkTo: (props: {
    subnetIds: Input<string>[];
    ipAddresses: Input<string>[];
  }) => IVaultBuilderResults;
  privateLinkTo: (subnetIds: Input<string>[]) => IVaultBuilderResults;
}

export interface IVaultBuilder {
  name: string;
  withDiagnostic: (logInfo: BasicMonitorArgs) => IVaultBuilder;
  build: () => IVaultBuilderResults;
}
