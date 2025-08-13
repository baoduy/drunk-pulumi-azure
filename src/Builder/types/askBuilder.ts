// AKS Builder types
import * as cs from '@pulumi/azure-native/containerservice';
import { SshGenerationProps } from '../../Core/KeyGenerators';
import { BuilderProps, IBuilderAsync } from './genericBuilder';
import {
  AksAccessProps,
  AksNetworkProps,
  NodePoolProps,
  AksResults,
  AskAddonProps,
  AskFeatureProps,
  DefaultAksNodePoolProps,
} from '../../Aks';
import { WithDiskEncryption, WithEnvRoles } from '../../types';

/**
 * Arguments for the AKS Builder.
 */
export type AksBuilderArgs = BuilderProps & WithEnvRoles;

/**
 * Properties for SSH generation, excluding vaultInfo and name.
 */
export type SshBuilderProps = Omit<SshGenerationProps, 'vaultInfo' | 'name'>;

/**
 * Properties for importing an existing AKS cluster.
 */
export type AksImportProps = { id: string; ignoreChanges?: string[] };

/**
 * Properties for enabling disk encryption in AKS.
 */
export type AksEncryptionType = Required<WithDiskEncryption>;

/**
 * Interface for building SSH configurations for AKS.
 */
export interface ISshBuilder {
  /**
   * Method to set properties for generating a new SSH key.
   * @param props - Properties for SSH generation.
   * @returns An instance of IAksNetworkBuilder.
   */
  withNewSsh(props: SshBuilderProps): IAksNetworkBuilder;
  // withExistingSsh: (props: {vaultSecretName:string}) => IAskAuthBuilder;
}

/**
 * Interface for building network configurations for AKS.
 */
export interface IAksNetworkBuilder {
  /**
   * Method to set network properties for AKS.
   * @param props - Properties for AKS network configuration.
   * @returns An instance of IAksDefaultNodePoolBuilder.
   */
  withNetwork(props: AksNetworkProps): IAksDefaultNodePoolBuilder;
}

/**
 * Interface for building default node pool configurations for AKS.
 */
export interface IAksDefaultNodePoolBuilder {
  /**
   * Method to set default node pool properties for AKS.
   * @param props - Properties for the default node pool.
   * @returns An instance of IAksBuilder.
   */
  withDefaultNodePool(props: DefaultAksNodePoolProps): IAksBuilder;
}

/**
 * Interface for building an AKS cluster.
 */
export interface IAksBuilder extends IBuilderAsync<AksResults> {
  /**
   * Method to set authentication properties for AKS.
   * @param props - Properties for AKS authentication.
   * @returns An instance of IAksBuilder.
   */
  withAuth(props: Omit<AksAccessProps, 'envRoles'>): IAksBuilder;

  /**
   * Method to add a node pool to the AKS cluster.
   * @param props - Properties for the node pool.
   * @returns An instance of IAksBuilder.
   */
  withNodePool(props: NodePoolProps): IAksBuilder;
  withNodePoolIf(condition: boolean, props: NodePoolProps): IAksBuilder;

  /**
   * Method to add an addon to the AKS cluster.
   * @param props - Properties for the addon.
   * @returns An instance of IAksBuilder.
   */
  withAddon(props: AskAddonProps): IAksBuilder;

  /**
   * Method to enable a feature in the AKS cluster.
   * @param props - Properties for the feature.
   * @returns An instance of IAksBuilder.
   */
  withFeature(props: AskFeatureProps): IAksBuilder;

  /**
   * Method to set the SKU tier for the AKS cluster.
   * @param tier - The SKU tier.
   * @returns An instance of IAksBuilder.
   */
  withTier(tier: cs.ManagedClusterSKUTier): IAksBuilder;

  /**
   * Method to enable disk encryption for the AKS cluster.
   * This must be enabled before the resource is created.
   * @param props - Properties for disk encryption.
   * @returns An instance of IAksBuilder.
   */
  enableEncryption(props: AksEncryptionType): IAksBuilder;

  /**
   * Method to import an existing AKS cluster.
   * @param props - Properties for importing the AKS cluster.
   * @returns An instance of IAksBuilder.
   */
  import(props: AksImportProps): IAksBuilder;

  /**
   * Method to lock the AKS cluster configuration.
   * @returns An instance of IBuilderAsync with AKS results.
   */
  lock(): IBuilderAsync<AksResults>;
}
