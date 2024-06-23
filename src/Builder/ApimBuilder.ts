import {
  ApimDomainBuilderType,
  ApimPublisherBuilderType,
  ApimSkuBuilderType,
  Builder,
  BuilderProps,
  IApimBuilder,
  IApimPublisherBuilder,
  IApimSkuBuilder,
} from "./types";
import { ResourceInfo } from "../types";
import * as apimanagement from "@pulumi/azure-native/apimanagement";
import { getApimName } from "../Common/Naming";
import { organization } from "../Common/StackEnv";
import { isPrd } from "../Common/AzureEnv";
import { ApimSignUpSettingsResource } from "@drunk-pulumi/azure-providers/ApimSignUpSettings";
import { ApimSignInSettingsResource } from "@drunk-pulumi/azure-providers/ApimSignInSettings";
import { randomUuId } from "../Core/Random";
import { AppInsightInfo } from "../Logs/Helpers";

class ApimBuilder
  extends Builder<ResourceInfo>
  implements IApimSkuBuilder, IApimPublisherBuilder, IApimBuilder
{
  private _insightLog: AppInsightInfo | undefined = undefined;
  private _publisher: ApimPublisherBuilderType | undefined = undefined;
  private _proxyDomain: ApimDomainBuilderType | undefined = undefined;
  private _sku: ApimSkuBuilderType | undefined = undefined;

  private _instanceName: string | undefined = undefined;
  private _apimInstance: apimanagement.ApiManagementService | undefined =
    undefined;

  public constructor(props: BuilderProps) {
    super(props);
  }

  withInsightLog(props: AppInsightInfo): IApimBuilder {
    this._insightLog = props;
    return this;
  }

  withProxyDomain(props: ApimDomainBuilderType): IApimBuilder {
    this._proxyDomain = props;
    return this;
  }

  withPublisher(props: ApimPublisherBuilderType): IApimBuilder {
    this._publisher = props;
    return this;
  }

  withSku(props: ApimSkuBuilderType): IApimPublisherBuilder {
    this._sku = props;
    return this;
  }

  private buildAPIM() {
    this._instanceName = getApimName(this.commonProps.name);
    this._apimInstance = new apimanagement.ApiManagementService(
      this._instanceName,
      {
        //serviceName: name,
        ...this.commonProps.group,
        publisherEmail: this._publisher!.publisherEmail,
        publisherName: this._publisher!.publisherName ?? organization,
        notificationSenderEmail:
          this._publisher?.notificationSenderEmail ??
          "apimgmt-noreply@mail.windowsazure.com",

        identity: { type: "SystemAssigned" },
        sku: {
          name: this._sku!.sku,
          capacity:
            this._sku!.sku === "Consumption" ? 0 : this._sku!.capacity ?? 1,
        },
        zones: isPrd ? [] : undefined,
        hostnameConfigurations: this._proxyDomain
          ? [
              {
                type: "Proxy",
                hostName: this._proxyDomain.domain,
                encodedCertificate: this._proxyDomain.certificate,
                certificatePassword: this._proxyDomain.certificatePassword,
                negotiateClientCertificate: false,
                defaultSslBinding: false,
              },
            ]
          : undefined,

        customProperties: {
          "Microsoft.WindowsAzure.ApiManagement.Gateway.Protocols.Server.Http2":
            "true",
          "Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Backend.Protocols.Ssl30":
            "false",
          "Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Backend.Protocols.Tls10":
            "false",
          "Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Backend.Protocols.Tls11":
            "false",
          "Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA":
            "false",
          "Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA":
            "false",
          "Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA":
            "false",
          "Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA":
            "false",
          "Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TLS_RSA_WITH_AES_128_CBC_SHA":
            "false",
          "Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TLS_RSA_WITH_AES_128_CBC_SHA256":
            "false",
          "Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TLS_RSA_WITH_AES_128_GCM_SHA256":
            "false",
          "Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TLS_RSA_WITH_AES_256_CBC_SHA":
            "false",
          "Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TLS_RSA_WITH_AES_256_CBC_SHA256":
            "false",
          "Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TripleDes168":
            "false",
          "Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Protocols.Ssl30":
            "false",
          "Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Protocols.Tls10":
            "false",
          "Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Protocols.Tls11":
            "false",
        },
      },
    );

    //Turn off Sign up setting
    new ApimSignUpSettingsResource(
      this._instanceName,
      {
        serviceName: this._apimInstance!.name,
        ...this.commonProps.group,
        enabled: false,
        termsOfService: {
          consentRequired: false,
          enabled: false,
          text: "terms Of Service",
        },
      },
      { dependsOn: this._apimInstance },
    );

    //Turn of the SignIn setting
    new ApimSignInSettingsResource(
      this._instanceName,
      {
        serviceName: this._apimInstance!.name,
        ...this.commonProps.group,
        enabled: false,
      },
      { dependsOn: this._apimInstance },
    );
  }

  private buildInsightLog() {
    if (!this._insightLog) return;
    //App Insight Logs
    new apimanagement.Logger(
      `${this._instanceName}-insight`,
      {
        serviceName: this._apimInstance!.name,
        ...this.commonProps.group,

        loggerType: apimanagement.LoggerType.ApplicationInsights,
        description: "App Insight Logger",
        loggerId: randomUuId(this._instanceName!).result,
        resourceId: this._insightLog.id,
        credentials: {
          //This credential will be add to NameValue automatically.
          instrumentationKey: this._insightLog.instrumentationKey!,
        },
      },
      { dependsOn: this._apimInstance },
    );
  }

  public build(): ResourceInfo {
    this.buildAPIM();
    this.buildInsightLog();

    return {
      resourceName: this._instanceName!,
      group: this.commonProps.group,
      id: this._apimInstance!.id,
    };
  }
}

export default (props: BuilderProps) =>
  new ApimBuilder(props) as IApimSkuBuilder;
