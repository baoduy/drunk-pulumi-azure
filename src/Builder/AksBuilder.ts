import { interpolate } from '@pulumi/pulumi';
import { grantEnvRolesAccess } from '../AzAd/EnvRoles.Consts';
import { subscriptionId } from '../Common';
import {
  AksImportProps,
  BuilderAsync,
  BuilderProps,
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
  AksNodePoolProps,
  AksResults,
  AskAddonProps,
  AskFeatureProps,
  DefaultAksNodePoolProps,
} from '../Aks';

class AksBuilder
  extends BuilderAsync<AksResults>
  implements
    ISshBuilder,
    IAksNetworkBuilder,
    IAksDefaultNodePoolBuilder,
    IAksBuilder
{
  //Instances
  private _sshInstance: SshResults | undefined = undefined;
  private _askInstance: AksResults | undefined = undefined;

  //Props
  private _sshProps: SshBuilderProps | undefined = undefined;
  private _nodePoolsProps: AksNodePoolProps[] = [];
  private _addonProps: AskAddonProps | undefined = undefined;
  private _featureProps: AskFeatureProps | undefined = undefined;
  private _authProps: Omit<AksAccessProps, 'envRoles'> | undefined = {};
  private _tier: ManagedClusterSKUTier = ManagedClusterSKUTier.Free;
  private _networkProps: AksNetworkProps | undefined = undefined;
  private _defaultNode: DefaultAksNodePoolProps | undefined = undefined;
  private _importProps: AksImportProps | undefined = undefined;
  private _lock: boolean = false;

  constructor(props: BuilderProps) {
    super(props);
  }

  //Info collection methods
  public withNewSsh(props: SshBuilderProps): IAksNetworkBuilder {
    this._sshProps = props;
    return this;
  }

  public withNodePool(props: AksNodePoolProps): IAksBuilder {
    this._nodePoolsProps.push(props);
    return this;
  }
  public withAddon(props: AskAddonProps): IAksBuilder {
    this._addonProps = props;
    return this;
  }
  public withFeature(props: AskFeatureProps): IAksBuilder {
    this._featureProps = props;
    return this;
  }
  public withAuth(props: Omit<AksAccessProps, 'envRoles'>): IAksBuilder {
    this._authProps = props;
    return this;
  }
  public withTier(tier: ManagedClusterSKUTier): IAksBuilder {
    this._tier = tier;
    return this;
  }
  public withNetwork(props: AksNetworkProps): IAksDefaultNodePoolBuilder {
    this._networkProps = props;
    return this;
  }
  public withDefaultNodePool(props: DefaultAksNodePoolProps): IAksBuilder {
    this._defaultNode = props;
    return this;
  }
  public lock(): IBuilderAsync<AksResults> {
    this._lock = true;
    return this;
  }
  public import(props: AksImportProps) {
    this._importProps = props;
    return this;
  }
  //Build Methods
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
      defaultNodePool: this._defaultNode!,
      nodePools: this._nodePoolsProps,
      features: this._featureProps,
      network: this._networkProps!,

      importUri: this._importProps?.id,
      ignoreChanges: this._importProps?.ignoreChanges,
      lock: this._lock,
    });

    //Grant read permission to AKS Node Group
    if (
      this.commonProps.envRoles &&
      this._askInstance.instance.nodeResourceGroup
    ) {
      grantEnvRolesAccess({
        name: `${this._askInstance.name}-node-group`,
        dependsOn: this._askInstance.instance,
        envRoles: this.commonProps.envRoles.info(),
        enableRGRoles: { readOnly: true },
        scope: interpolate`/subscriptions/${subscriptionId}/resourceGroups/${this._askInstance.instance.nodeResourceGroup}`,
      });
    }
  }

  public async build(): Promise<AksResults> {
    this.buildSsh();
    await this.buildAsk();

    return this._askInstance!;
  }
}

export default (props: BuilderProps) => new AksBuilder(props) as ISshBuilder;
