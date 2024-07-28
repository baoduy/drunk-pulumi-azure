import { CertArgs } from '@drunk-pulumi/azure-providers';
import { BasicMonitorArgs, KeyVaultInfo, NamedType } from '../../types';
import { Input } from '@pulumi/pulumi';

export type CertBuilderType = NamedType & {
  cert: CertArgs;
};
export interface IVaultBuilderResults extends KeyVaultInfo {
  info(): KeyVaultInfo;

  addSecrets(items: Record<string, Input<string>>): IVaultBuilderResults;
  //addKeys () : IVaultBuilderResults;
  addCerts(items: Record<string, CertBuilderType>): IVaultBuilderResults;
  privateLinkTo(subnetIds: Input<string>[]): IVaultBuilderResults;
  linkTo(props: {
    subnetIds: Input<string>[];
    ipAddresses: Input<string>[];
  }): IVaultBuilderResults;
}

export interface IVaultBuilder {
  withDiagnostic(logInfo: BasicMonitorArgs): IVaultBuilder;
  build(): IVaultBuilderResults;
}
