import { interpolate } from '@pulumi/pulumi';
import { grantEnvRolesAccess } from '../AzAd/EnvRoles.Consts';
import { defaultSubScope } from '../Common';
import {
  AksBuilderArgs,
  AksEncryptionType,
  AksImportProps,
  BuilderAsync,
  IAksBuilder,
  IAksDefaultNodePoolBuilder,
  IAksNetworkBuilder,
  IBuilderAsync,
  ISshBuilder,
  SshBuilderProps,
} from './types';
import { generateSsh, SshResults } from '../Core/KeyGenerators';
import { ManagedClusterSKUTier } from '@pulumi/azure-native/containerservice';
import Aks, {
  AksAccessProps,
  AksNetworkProps,
  NodePoolProps,
  AksResults,
  AskAddonProps,
  AskFeatureProps,
  DefaultAksNodePoolProps,
} from '../Aks';

/**
 * AksBuilder class for creating and configuring Azure Kubernetes Service (AKS) resources.
 * This class implements the Builder pattern for AKS configuration.
 * @extends BuilderAsync<AksResults>
 * @implements ISshBuilder
 * @implements IAksNetworkBuilder
 * @implements IAksDefaultNodePoolBuilder
 * @implements IAksBuilder
 */
class AksBuilder
  extends BuilderAsync<AksResults>
  implements
    ISshBuilder,
    IAksNetworkBuilder,
    IAksDefaultNodePoolBuilder,
    IAksBuilder
{
  // Instances
  private _sshInstance: SshResults | undefined = undefined;
  private _askInstance: AksResults | undefined = undefined;

  // Props
  private _sshProps: SshBuilderProps | undefined = undefined;
  private _nodePoolsProps: NodePoolProps[] = [];
  private _addonProps: AskAddonProps | undefined = undefined;
  private _featureProps: AskFeatureProps | undefined = undefined;
  private _authProps: Omit<AksAccessProps, 'envRoles'> | undefined = {};
  private _tier: ManagedClusterSKUTier = ManagedClusterSKUTier.Free;
  private _networkProps: AksNetworkProps | undefined = undefined;
  private _defaultNode: DefaultAksNodePoolProps | undefined = undefined;
  private _importProps: AksImportProps | undefined = undefined;
  private _lock: boolean = false;
  private _encryptionProps: AksEncryptionType | undefined = undefined;

  /**
   * Creates an instance of AksBuilder.
   * @param {AksBuilderArgs} args - The arguments for building the AKS.
   */
  constructor(private args: AksBuilderArgs) {
    super(args);
  }

  // Info collection methods

  /**
   * Sets the SSH properties for the AKS.
   * @param {SshBuilderProps} props - The SSH properties to set.
   * @returns {IAksNetworkBuilder} The current AksBuilder instance.
   */
  public withNewSsh(props: SshBuilderProps): IAksNetworkBuilder {
    this._sshProps = props;
    return this;
  }

  /**
   * Adds a node pool to the AKS.
   * @param {NodePoolProps} props - The node pool properties to add.
   * @returns {IAksBuilder} The current AksBuilder instance.
   */
  public withNodePool(props: NodePoolProps): IAksBuilder {
    this._nodePoolsProps.push(props);
    return this;
  }

  /**
   * Sets the addon properties for the AKS.
   * @param {AskAddonProps} props - The addon properties to set.
   * @returns {IAksBuilder} The current AksBuilder instance.
   */
  public withAddon(props: AskAddonProps): IAksBuilder {
    this._addonProps = props;
    return this;
  }

  /**
   * Sets the feature properties for the AKS.
   * @param {AskFeatureProps} props - The feature properties to set.
   * @returns {IAksBuilder} The current AksBuilder instance.
   */
  public withFeature(props: AskFeatureProps): IAksBuilder {
    this._featureProps = props;
    return this;
  }

  /**
   * Sets the authentication properties for the AKS.
   * @param {Omit<AksAccessProps, 'envRoles'>} props - The authentication properties to set.
   * @returns {IAksBuilder} The current AksBuilder instance.
   */
  public withAuth(props: Omit<AksAccessProps, 'envRoles'>): IAksBuilder {
    this._authProps = props;
    return this;
  }

  /**
   * Sets the tier for the AKS.
   * @param {ManagedClusterSKUTier} tier - The tier to set for the AKS.
   * @returns {IAksBuilder} The current AksBuilder instance.
   */
  public withTier(tier: ManagedClusterSKUTier): IAksBuilder {
    this._tier = tier;
    return this;
  }

  /**
   * Sets the network properties for the AKS.
   * @param {AksNetworkProps} props - The network properties to set.
   * @returns {IAksDefaultNodePoolBuilder} The current AksBuilder instance.
   */
  public withNetwork(props: AksNetworkProps): IAksDefaultNodePoolBuilder {
    this._networkProps = props;
    return this;
  }

  /**
   * Sets the default node pool properties for the AKS.
   * @param {DefaultAksNodePoolProps} props - The default node pool properties to set.
   * @returns {IAksBuilder} The current AksBuilder instance.
   */
  public withDefaultNodePool(props: DefaultAksNodePoolProps): IAksBuilder {
    this._defaultNode = props;
    return this;
  }

  /**
   * Enables encryption for the AKS.
   * @param {AksEncryptionType} props - The encryption properties to set.
   * @returns {IAksBuilder} The current AksBuilder instance.
   */
  public enableEncryption(props: AksEncryptionType): IAksBuilder {
    this._encryptionProps = props;
    return this;
  }

  /**
   * Locks the AKS configuration.
   * @returns {IBuilderAsync<AksResults>} The current AksBuilder instance.
   */
  public lock(): IBuilderAsync<AksResults> {
    this._lock = true;
    return this;
  }

  /**
   * Imports an existing AKS configuration.
   * @param {AksImportProps} props - The import properties to set.
   */
  public import(props: AksImportProps) {
    this._importProps = props;
    return this;
  }

  // Build Methods

  /**
   * Builds the SSH configuration for the AKS.
   * @private
   */
  private buildSsh() {
    const vaultInfo = this.commonProps.vaultInfo;
    if (!vaultInfo)
      throw new Error(`${this.commonProps.name} requires vaultInfo.`);

    this._sshInstance = generateSsh({
      ...this.commonProps,
      ...this._sshProps,
      vaultInfo,
    });
  }

  /**
   * Builds the AKS resource with the configured properties.
   * @private
   * @async
   */
  private async buildAsk() {
    const sshKey = this._sshInstance!.lists.getPublicKey();

    this._askInstance = await Aks({
      ...this.commonProps,
      addon: this._addonProps,
      aksAccess: this._authProps!,
      tier: this._tier,
      linux: {
        adminUsername: this._sshInstance!.userName,
        sshKeys: [sshKey],
      },
      diskEncryptionSetId: this._encryptionProps?.diskEncryptionSetId,
      defaultNodePool: this._defaultNode!,
      nodePools: this._nodePoolsProps,
      features: this._featureProps,
      network: this._networkProps!,

      importUri: this._importProps?.id,
      ignoreChanges: this._importProps?.ignoreChanges,
      lock: this._lock,
    });

    // Grant read permission to AKS Node Group
    if (this.args.envRoles && this._askInstance.instance.nodeResourceGroup) {
      grantEnvRolesAccess({
        name: `${this._askInstance.name}-node-group`,
        dependsOn: this._askInstance.instance,
        envRoles: this.args.envRoles.info(),
        enableRGRoles: { readOnly: true },
        scope: interpolate`${defaultSubScope}/resourceGroups/${this._askInstance.instance.nodeResourceGroup}`,
      });
    }
  }

  /**
   * Builds and returns the AksResults for the configured AKS.
   * @returns {Promise<AksResults>} The AKS results.
   */
  public async build(): Promise<AksResults> {
    this.buildSsh();
    await this.buildAsk();

    return this._askInstance!;
  }
}

/**
 * Factory function to create a new AksBuilder instance.
 * @param {AksBuilderArgs} props - The arguments for building the AKS.
 * @returns {ISshBuilder} A new AksBuilder instance cast as ISshBuilder.
 */
export default (props: AksBuilderArgs) => new AksBuilder(props) as ISshBuilder;
