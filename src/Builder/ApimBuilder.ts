import * as types from './types';
import { EnvRoleKeyTypes, ResourceInfo } from '../types';
import * as apim from '@pulumi/azure-native/apimanagement';
import * as pulumi from '@pulumi/pulumi';
import { getSecretOutput, addCustomSecret } from '../KeyVault';
import {
  naming,
  organization,
  readFileAsBase64,
  subscriptionId,
  tenantId,
} from '../Common';
import {
  ApimSignInSettingsResource,
  ApimSignUpSettingsResource,
} from '@drunk-pulumi/azure-providers';
import * as network from '@pulumi/azure-native/network';
import * as IpAddress from '../VNet/IpAddress';
import Identity from '../AzAd/Identity';
import { interpolate } from '@pulumi/pulumi';
import { ApimPrivateLink } from '../VNet';

class ApimBuilder
  extends types.Builder<ResourceInfo>
  implements
    types.IApimSkuBuilder,
    types.IApimPublisherBuilder,
    types.IApimBuilder
{
  private _publisher: types.ApimPublisherBuilderType | undefined = undefined;
  private _proxyDomains: types.ApimDomainBuilderType[] = [];
  private _sku: types.ApimSkuBuilderType | undefined = undefined;
  private _additionalLocations: types.ApimAdditionalLocationType[] = [];
  private _zones: types.ApimZoneType | undefined = undefined;
  private _restoreFromDeleted: boolean = false;
  private _enableEntraID: boolean = false;
  private _disableSignIn: boolean = false;
  private _apimVnet: types.ApimVnetType | undefined = undefined;
  private _privateLink: types.ApimPrivateLinkType | undefined = undefined;
  private _rootCerts: types.ApimCertBuilderType[] = [];
  private _caCerts: types.ApimCertBuilderType[] = [];
  private _auths: types.ApimAuthType[] = [];

  private readonly _instanceName: string;
  private _ipAddressInstances: Record<string, network.PublicIPAddress> = {};
  private _apimInstance: apim.ApiManagementService | undefined = undefined;
  private _envRoleType: EnvRoleKeyTypes | undefined = undefined;

  public constructor(private args: types.ApimBuilderArgs) {
    super(args);
    this._instanceName = naming.getApimName(this.commonProps.name);
  }
  public disableSignIn(): types.IApimBuilder {
    this._disableSignIn = true;
    return this;
  }
  public withAuth(props: types.ApimAuthType): types.IApimBuilder {
    this._auths.push(props);
    this._disableSignIn = false;
    return this;
  }
  public withEntraID(): types.IApimBuilder {
    this._enableEntraID = true;
    this._disableSignIn = false;
    return this;
  }
  public withCACert(props: types.ApimCertBuilderType): types.IApimBuilder {
    this._caCerts.push(props);
    return this;
  }
  public withRootCert(props: types.ApimCertBuilderType): types.IApimBuilder {
    this._rootCerts.push(props);
    return this;
  }
  public withPrivateLink(props: types.ApimPrivateLinkType): types.IApimBuilder {
    this._privateLink = props;
    return this;
  }
  public withSubnet(props: types.ApimVnetType): types.IApimBuilder {
    this._apimVnet = props;
    return this;
  }
  public restoreFomDeleted(): types.IApimBuilder {
    this._restoreFromDeleted = true;
    return this;
  }
  public withZones(props: types.ApimZoneType): types.IApimBuilder {
    this._zones = props;
    return this;
  }
  public withAdditionalLocation(
    props: types.ApimAdditionalLocationType
  ): types.IApimBuilder {
    this._additionalLocations.push(props);
    return this;
  }
  public withProxyDomain(
    props: types.ApimDomainBuilderType
  ): types.IApimBuilder {
    this._proxyDomains.push(props);
    return this;
  }
  public withProxyDomainIf(
    condition: boolean,
    props: types.ApimDomainBuilderType
  ): types.IApimBuilder {
    if (condition) {
      this.withProxyDomain(props);
    }
    return this;
  }
  public withPublisher(
    props: types.ApimPublisherBuilderType
  ): types.IApimBuilder {
    this._publisher = props;
    return this;
  }
  public withSku(props: types.ApimSkuBuilderType): types.IApimPublisherBuilder {
    this._sku = props;
    return this;
  }
  public withEnvRole(role: EnvRoleKeyTypes): types.IApimBuilder {
    this._envRoleType = role;
    return this;
  }

  private buildPublicIpAddress() {
    if (!this._apimVnet) return;

    const ipPros = {
      ...this.commonProps,
      name: `${this.commonProps.name}-apim`,
      enableZone: this._sku!.sku === 'Premium',
    };

    this._ipAddressInstances[this.commonProps.name] = IpAddress.create(ipPros);

    if (this._additionalLocations) {
      this._additionalLocations.forEach((j) => {
        this._ipAddressInstances[j.location] = IpAddress.create({
          ...ipPros,
          name: `${this.commonProps.name}-${j.location}-apim`,
        });
      });
    }
  }

  private getCert(props: types.ApimCertBuilderType) {
    if ('vaultCertName' in props) {
      const cert = getSecretOutput({
        name: props.vaultCertName,
        vaultInfo: this.args.vaultInfo!,
      });
      return { encodedCertificate: cert.apply((c) => c!.value!) };
    }

    if ('certificatePath' in props) {
      const cert = pulumi
        .output(props.certificatePath)
        .apply((p) => readFileAsBase64(p));
      return {
        encodedCertificate: cert,
        certificatePassword: props.certificatePassword,
      };
    }

    return {
      encodedCertificate: props.certificate,
      certificatePassword: props.certificatePassword,
    };
  }

  private buildAPIM() {
    const { group, envRoles, vaultInfo } = this.args;

    const sku = {
      name: this._sku!.sku,
      capacity: this._sku!.sku === 'Consumption' ? 0 : this._sku!.capacity ?? 1,
    };
    const zones = sku.name === 'Premium' ? this._zones : undefined;

    this._apimInstance = new apim.ApiManagementService(
      this._instanceName,
      {
        ...group,
        serviceName: this._instanceName,
        publisherEmail: this._publisher!.publisherEmail,
        publisherName: this._publisher!.publisherName ?? organization,
        notificationSenderEmail:
          this._publisher?.notificationSenderEmail ??
          'apimgmt-noreply@mail.windowsazure.com',

        identity: { type: 'SystemAssigned' },
        sku,

        apiVersionConstraint: {
          minApiVersion: '2019-12-01',
        },
        certificates: [
          ...this._rootCerts.map((c) => {
            const crt = this.getCert(c);
            return {
              ...crt,
              storeName: 'Root',
            };
          }),
          ...this._caCerts.map((c) => {
            const crt = this.getCert(c);
            return {
              ...crt,
              storeName: 'CertificateAuthority',
            };
          }),
        ],

        enableClientCertificate: true,
        hostnameConfigurations: this._proxyDomains.map((d) => ({
          ...this.getCert(d),
          type: 'Proxy',
          hostName: d.domain,
          negotiateClientCertificate: false,
          defaultSslBinding: false,
        })),

        //Restore APIM from Deleted
        restore: this._restoreFromDeleted,

        //Only support when linking to a virtual network
        publicIpAddressId: this._apimVnet
          ? this._ipAddressInstances[this.commonProps.name]?.id
          : undefined,
        publicNetworkAccess: this._privateLink?.disablePublicAccess
          ? 'Disabled'
          : 'Enabled',
        //NATGateway
        natGatewayState: this._apimVnet?.enableGateway ? 'Enabled' : 'Disabled',
        virtualNetworkType: this._apimVnet?.type ?? 'None',
        virtualNetworkConfiguration: this._apimVnet
          ? {
              subnetResourceId: this._apimVnet.subnetId,
            }
          : undefined,

        //Only available for Premium
        zones,
        //Only available for Premium
        additionalLocations:
          sku.name === 'Premium'
            ? this._additionalLocations?.map((a) => ({
                ...a,
                sku,
                zones,
              }))
            : undefined,

        customProperties: {
          'Microsoft.WindowsAzure.ApiManagement.Gateway.Protocols.Server.Http2':
            'true',
          'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Backend.Protocols.Ssl30':
            'false',
          'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Backend.Protocols.Tls10':
            'false',
          'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Backend.Protocols.Tls11':
            'false',
          'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA':
            'false',
          'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA':
            'false',
          'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA':
            'false',
          'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA':
            'false',
          'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TLS_RSA_WITH_AES_128_CBC_SHA':
            'false',
          'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TLS_RSA_WITH_AES_128_CBC_SHA256':
            'false',
          'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TLS_RSA_WITH_AES_128_GCM_SHA256':
            'false',
          'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TLS_RSA_WITH_AES_256_CBC_SHA':
            'false',
          'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TLS_RSA_WITH_AES_256_CBC_SHA256':
            'false',
          'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TripleDes168':
            'false',
          'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Protocols.Ssl30':
            'false',
          'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Protocols.Tls10':
            'false',
          'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Protocols.Tls11':
            'false',
        },
      },
      {
        dependsOn: this.commonProps.dependsOn,
        deleteBeforeReplace: true,
        ignoreChanges: ['publicNetworkAccess'],
      }
    );

    if (this._envRoleType && envRoles) {
      envRoles.addIdentity(this._envRoleType, this._apimInstance.identity);
    }

    if (vaultInfo && this._proxyDomains.length > 0) {
      addCustomSecret({
        name: `${this._instanceName}-host`,
        value: this._proxyDomains[0].domain ?? this._apimInstance.gatewayUrl,
        contentType: `APIM ${this._instanceName}`,
        dependsOn: this._apimInstance,
        vaultInfo,
      });
    }
  }

  private buildEntraID() {
    if (!this._enableEntraID || this._disableSignIn) return;

    const identity = Identity({
      ...this.commonProps,
      name: `${this.commonProps.name}-apim`,
      createClientSecret: true,
    });

    new apim.IdentityProvider(
      this.commonProps.name,
      {
        ...this.commonProps.group,
        serviceName: this._apimInstance!.name,
        clientId: identity.clientId,
        clientSecret: identity.clientSecret!,
        authority: interpolate`https://login.microsoftonline.com/${tenantId}/`,
        type: 'aad',
        identityProviderName: 'aad',
        allowedTenants: [tenantId],
        signinTenant: tenantId,
      },
      { dependsOn: this._apimInstance }
    );
  }
  private buildAuths() {
    if (this._disableSignIn) return;

    this._auths.forEach(
      (auth) =>
        new apim.IdentityProvider(
          `${this.commonProps.name}-${auth.type}`,
          {
            ...this.commonProps.group,
            ...auth,
            identityProviderName: auth.type,
            serviceName: this._apimInstance!.name,
          },
          { dependsOn: this._apimInstance }
        )
    );
  }
  private buildDisableSigIn() {
    if (!this._disableSignIn) return;

    //Turn off Sign upsetting
    new ApimSignUpSettingsResource(
      this._instanceName!,
      {
        ...this.commonProps.group,
        serviceName: this._instanceName!,
        subscriptionId,
        enabled: false,
        termsOfService: {
          consentRequired: false,
          enabled: false,
          text: 'Terms & Conditions Of Service',
        },
      },
      { dependsOn: this._apimInstance, deleteBeforeReplace: true }
    );

    //Turn of the SignIn setting
    new ApimSignInSettingsResource(
      this._instanceName!,
      {
        ...this.commonProps.group,
        serviceName: this._instanceName!,
        subscriptionId,
        enabled: false,
      },
      { dependsOn: this._apimInstance, deleteBeforeReplace: true }
    );
  }
  private buildPrivateLink() {
    if (!this._privateLink) return;
    ApimPrivateLink({
      resourceInfo: {
        name: this._instanceName!,
        group: this.commonProps.group,
        id: this._apimInstance!.id,
      },
      ...this._privateLink,
      dependsOn: this._apimInstance,
    });
  }
  private buildInsightLog() {
    const { logInfo } = this.args;
    if (!logInfo?.appInsight) return;
    //App Insight Logs
    new apim.Logger(
      `${this._instanceName}-insight`,
      {
        serviceName: this._apimInstance!.name,
        ...this.commonProps.group,

        loggerType: apim.LoggerType.ApplicationInsights,
        description: 'App Insight Logger',
        loggerId: `${this._instanceName}-appInsight`,
        resourceId: logInfo!.appInsight.id,
        credentials: {
          //This credential will be added to NameValue automatically.
          instrumentationKey: logInfo!.appInsight.instrumentationKey!,
        },
      },
      { dependsOn: this._apimInstance }
    );
  }

  public build(): ResourceInfo {
    this.buildPublicIpAddress();
    this.buildAPIM();
    this.buildPrivateLink();
    this.buildDisableSigIn();
    this.buildEntraID();
    this.buildAuths();
    this.buildInsightLog();

    return {
      name: this._instanceName!,
      group: this.commonProps.group,
      id: this._apimInstance!.id,
    };
  }
}

export default (props: types.ApimBuilderArgs) =>
  new ApimBuilder(props) as types.IApimSkuBuilder;
