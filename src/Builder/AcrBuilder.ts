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
import { addEncryptKey } from '../KeyVault/Helper';
import { AcrPrivateLink } from '../VNet';

/**
 * AcrBuilder class for creating and configuring Azure Container Registry (ACR) resources.
 * This class implements the Builder pattern for ACR configuration.
 * @extends Builder<ResourceInfo>
 * @implements IAcrBuilder
 * @implements IAcrSkuBuilder
 */
class AcrBuilder
  extends Builder<ResourceInfo>
  implements IAcrBuilder, IAcrSkuBuilder
{
  private readonly _instanceName: string;
  private _acrInstance: registry.Registry | undefined = undefined;

  private _sku: AcrSkuBuilderType = registry.SkuName.Basic;
  private _network: AcrBuilderNetworkType | undefined = undefined;
  private _policy: AcrBuilderPolicies | undefined = undefined;

  /**
   * Creates an instance of AcrBuilder.
   * @param {AcrBuilderArgs} args - The arguments for building the ACR.
   */
  constructor(private args: AcrBuilderArgs) {
    super(args);
    this._instanceName = naming.getAcrName(args.name);
  }

  /**
   * Sets the SKU for the ACR.
   * @param {AcrSkuBuilderType} props - The SKU to set for the ACR.
   * @returns {IAcrBuilder} The current AcrBuilder instance.
   */
  public withSku(props: AcrSkuBuilderType): IAcrBuilder {
    this._sku = props;
    return this;
  }

  /**
   * Sets the network configuration for the ACR.
   * @param {AcrBuilderNetworkType} props - The network properties to set.
   * @returns {IAcrBuilder} The current AcrBuilder instance.
   */
  public withNetwork(props: AcrBuilderNetworkType): IAcrBuilder {
    this._network = props;
    return this;
  }

  /**
   * Sets the policies for the ACR.
   * @param {AcrBuilderPolicies} props - The policies to set.
   * @returns {IAcrBuilder} The current AcrBuilder instance.
   */
  public withPolicy(props: AcrBuilderPolicies): IAcrBuilder {
    this._policy = props;
    return this;
  }

  /**
   * Builds the ACR resource with the configured properties.
   * @private
   */
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
      AcrPrivateLink({
        ...this._network.privateLink,
        dependsOn: this._acrInstance,
        resourceInfo: {
          name: this._instanceName,
          group,
          id: this._acrInstance.id,
        },
      });
    }
  }

  /**
   * Builds and returns the ResourceInfo for the configured ACR.
   * @returns {ResourceInfo} The resource information for the built ACR.
   */
  public build(): ResourceInfo {
    this.buildAcr();
    return {
      name: this._instanceName,
      group: this.args.group,
      id: this._acrInstance!.id,
    };
  }
}

/**
 * Factory function to create a new AcrBuilder instance.
 * @param {AcrBuilderArgs} props - The arguments for building the ACR.
 * @returns {IAcrSkuBuilder} A new AcrBuilder instance cast as IAcrSkuBuilder.
 */
export default (props: AcrBuilderArgs) =>
  new AcrBuilder(props) as IAcrSkuBuilder;
