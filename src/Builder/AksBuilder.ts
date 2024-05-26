import {
  AksBuilderProps,
  AskBuilderResults,
  IAksBuilder,
  IAksDefaultNodePoolBuilder,
  IAksNetworkBuilder,
  ResourcesBuilder,
  SshBuilderProps,
} from "./types";
import { generateSsh, SshResults } from "../Core/KeyGenetators";
import {
  ManagedCluster,
  ManagedClusterSKUTier,
} from "@pulumi/azure-native/containerservice";
import Aks, {
  AksNodePoolProps,
  AskAddonProps,
  AskFeatureProps,
  AksAccessProps,
  AksNetworkProps,
} from "Aks";
import { IdentityResult } from "../AzAd/Identity";
import { PrivateZone } from "@pulumi/azure-native/network";
import { getResourceGroupName } from "../Common/Naming";

export class AksBuilder
  extends ResourcesBuilder<AskBuilderResults>
  implements IAksBuilder
{
  //Instances
  private _sshInstance: SshResults | undefined = undefined;
  private _askInstance:
    | undefined
    | {
        serviceIdentity: IdentityResult;
        aks: ManagedCluster;
        privateZone: PrivateZone | undefined;
      };

  //Props
  private _sshProps: SshBuilderProps | undefined = undefined;
  private _nodePoolsProps: AksNodePoolProps[] = [];
  private _addonProps: AskAddonProps | undefined = undefined;
  private _featureProps: AskFeatureProps | undefined = undefined;
  private _authProps: AksAccessProps | undefined = undefined;
  private _tier: ManagedClusterSKUTier = ManagedClusterSKUTier.Free;
  private _networkProps: AksNetworkProps | undefined = undefined;
  private _defaultNode: AksNodePoolProps | undefined = undefined;

  constructor({ ...others }: AksBuilderProps) {
    super(others);
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
  public withAuth(props: AksAccessProps): IAksBuilder {
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
  public withDefaultNodePool(props: AksNodePoolProps): IAksBuilder {
    this._defaultNode = props;
    return this;
  }

  //Build Methods
  private buildSsh() {
    this._sshInstance = generateSsh({
      ...this.commonProps,
      ...this._sshProps,
    });
  }

  private async buildAsk() {
    const sshKey = this._sshInstance!.lists.getPublicKey();
    this._askInstance = await Aks({
      ...this.commonProps,
      addon: this._addonProps,
      aksAccess: this._authProps!,
      linux: {
        adminUsername: this._sshInstance!.userName,
        sshKeys: [sshKey],
      },
      defaultNodePool: this._defaultNode!,
      nodePools: this._nodePoolsProps,
      features: this._featureProps,
      network: this._networkProps!,
      //nodeResourceGroup: getResourceGroupName(""),
    });
  }

  public async build(): Promise<AskBuilderResults> {
    this.buildSsh();
    await this.buildAsk();
    return {};
  }
}

export default AksBuilder;
