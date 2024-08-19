import { Builder } from './types';
import { ResourceInfo } from '../types';
import {
  AcrBuilderArgs,
  AcrBuilderNetworkType,
  AcrBuilderPolicies,
  AcrSkuBuilderType,
  IAcrBuilder,
  IAcrSkuBuilder,
} from './types';
import { naming } from '../Common';
import * as registry from '@pulumi/azure-native/containerregistry/v20231101preview';
import PrivateEndpoint from '../VNet/PrivateEndpoint';
import { addEncryptKey } from '../KeyVault/Helper';

class AcrBuilder
  extends Builder<ResourceInfo>
  implements IAcrBuilder, IAcrSkuBuilder
{
  private readonly _instanceName: string;
  private _acrInstance: registry.Registry | undefined = undefined;

  private _sku: AcrSkuBuilderType = registry.SkuName.Basic;
  private _network: AcrBuilderNetworkType | undefined = undefined;
  private _policy: AcrBuilderPolicies | undefined = undefined;

  constructor(private args: AcrBuilderArgs) {
    super(args);
    this._instanceName = naming.getAcrName(args.name);
  }

  public withSku(props: AcrSkuBuilderType): IAcrBuilder {
    this._sku = props;
    return this;
  }
  public withNetwork(props: AcrBuilderNetworkType): IAcrBuilder {
    this._network = props;
    return this;
  }
  public withPolicy(props: AcrBuilderPolicies): IAcrBuilder {
    this._policy = props;
    return this;
  }

  private buildAcr() {
    const {
      group,
      enableEncryption,
      envUIDInfo,
      vaultInfo,
      dependsOn,
      ignoreChanges,
    } = this.args;

    const encryption =
      enableEncryption && vaultInfo
        ? addEncryptKey(this._instanceName, vaultInfo)
        : undefined;

    this._acrInstance = new registry.Registry(
      this._instanceName,
      {
        ...group,
        registryName: this._instanceName,
        sku: { name: this._sku },
        adminUserEnabled: false,
        dataEndpointEnabled: false,

        //This is for encryption
        identity: {
          type: envUIDInfo
            ? registry.ResourceIdentityType.SystemAssigned_UserAssigned
            : registry.ResourceIdentityType.SystemAssigned,

          userAssignedIdentities: envUIDInfo ? [envUIDInfo.id] : undefined,
        },

        encryption:
          this._sku === 'Premium' && encryption && envUIDInfo
            ? {
                keyVaultProperties: {
                  identity: envUIDInfo.clientId,
                  keyIdentifier: encryption.urlWithoutVersion,
                },
              }
            : undefined,

        policies:
          this._sku === 'Premium'
            ? {
                exportPolicy: {
                  status: registry.ExportPolicyStatus.Disabled,
                },
                quarantinePolicy: { status: registry.PolicyStatus.Enabled },
                retentionPolicy: {
                  days: this._policy?.retentionDay ?? 90,
                  status: registry.PolicyStatus.Enabled,
                },
                trustPolicy: {
                  status: registry.PolicyStatus.Enabled,
                  type: registry.TrustPolicyType.Notary,
                },
              }
            : undefined,

        publicNetworkAccess: this._network?.privateLink
          ? 'Disabled'
          : 'Enabled',
        networkRuleBypassOptions: this._network?.privateLink
          ? 'None'
          : 'AzureServices',
        zoneRedundancy: this._sku === 'Premium' ? 'Enabled' : 'Disabled',

        networkRuleSet:
          this._sku === 'Premium' && this._network
            ? {
                defaultAction: registry.DefaultAction.Allow,
                ipRules: this._network.ipAddresses
                  ? this._network.ipAddresses.map((ip) => ({
                      iPAddressOrRange: ip,
                    }))
                  : undefined,
              }
            : undefined,
      },
      { dependsOn, ignoreChanges },
    );

    if (this._sku === 'Premium' && this._network?.privateLink) {
      PrivateEndpoint({
        ...this._network.privateLink,
        resourceInfo: {
          name: this._instanceName,
          group,
          id: this._acrInstance.id,
        },
        privateDnsZoneName: 'privatelink.azurecr.io',
        linkServiceGroupIds: this._network.privateLink.type
          ? [this._network.privateLink.type]
          : ['azurecr'],
      });
    }
  }

  public build(): ResourceInfo {
    this.buildAcr();
    return {
      name: this._instanceName,
      group: this.args.group,
      id: this._acrInstance!.id,
    };
  }
}

export default (props: AcrBuilderArgs) =>
  new AcrBuilder(props) as IAcrSkuBuilder;
