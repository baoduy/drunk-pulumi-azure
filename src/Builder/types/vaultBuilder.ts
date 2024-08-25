import { CertArgs } from '@drunk-pulumi/azure-providers';
import { KeyVaultInfo, PrivateLinkPropsType, WithNamedType } from '../../types';
import { Input } from '@pulumi/pulumi';
import { BuilderProps } from './genericBuilder';

/**
 * Arguments required for building a Vault resource.
 */
export type VaultBuilderArgs = Omit<BuilderProps, 'vaultInfo'>;

/**
 * Type for defining secrets to be added to the vault. If only name provided the secret will be retrieved from project secret
 */
export type VaultBuilderSecretType = Record<string, Input<string>> | string;

/**
 * Type for defining certificates to be added to the vault.
 */
export type CertBuilderType = WithNamedType & {
  cert: CertArgs;
};

/**
 * Interface for the results of the vault builder.
 */
export interface IVaultBuilderResults extends KeyVaultInfo {
  /**
   * Retrieves the KeyVault information.
   * @returns The KeyVault information.
   */
  info(): KeyVaultInfo;

  /**
   * Adds secrets to the vault. If the parameter is a string, the secret will be loaded from the project secret.
   * @param items - The secrets to add.
   * @returns An instance of IVaultBuilderResults.
   */
  addSecrets(items: VaultBuilderSecretType): IVaultBuilderResults;
  addSecretsIf(
    condition: boolean,
    items: VaultBuilderSecretType,
  ): IVaultBuilderResults;

  //addKeys () : IVaultBuilderResults;

  /**
   * Adds certificates to the vault.
   * @param items - The certificates to add.
   * @returns An instance of IVaultBuilderResults.
   */
  addCerts(items: Record<string, CertBuilderType>): IVaultBuilderResults;
  addCertsIf(
    condition: boolean,
    items: Record<string, CertBuilderType>,
  ): IVaultBuilderResults;

  /**
   * Links the vault to the specified subnets via a private link.
   * @returns An instance of IVaultBuilderResults.
   * @param props
   */
  privateLinkTo(props: PrivateLinkPropsType): IVaultBuilderResults;

  privateLinkToIf(
    condition: boolean,
    props: PrivateLinkPropsType,
  ): IVaultBuilderResults;

  /**
   * Links the vault to the specified subnets and IP addresses.
   * @param props - The linking properties.
   * @returns An instance of IVaultBuilderResults.
   */
  // linkTo(props: {
  //   subnetIds: Input<string>[];
  //   ipAddresses: Input<string>[];
  // }): IVaultBuilderResults;
}

/**
 * Interface for building a vault.
 */
export interface IVaultBuilder {
  //withDiagnostic(logInfo: BasicMonitorArgs): IVaultBuilder;

  /**
   * Builds the vault and returns the vault builder results.
   * @returns The vault builder results.
   */
  build(): IVaultBuilderResults;
}
