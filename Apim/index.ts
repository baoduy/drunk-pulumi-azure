import * as apimanagement from '@pulumi/azure-native/apimanagement';
import { Input } from '@pulumi/pulumi';

import { defaultTags } from '../Common/AzureEnv';
import { getApimName } from '../Common/Naming';
import { organization } from '../Common/StackEnv';
import { randomUuId } from '../Core/Random';
import Creator from '../Core/ResourceCreator';
import { ApimSignInSettingsResource } from '../CustomProviders/ApimSignInSettings';
import { ApimSignUpSettingsResource } from '../CustomProviders/ApimSignUpSettings';
import { ApimInfo, BasicResourceArgs, DefaultResourceArgs } from '../types';

interface Props
  extends BasicResourceArgs,
  Omit<DefaultResourceArgs, "monitoring"> {
  insight?: { id: Input<string>; key: Input<string> };
  sku: apimanagement.SkuType;
  capacity?: number;
  alertEmail: Input<string>;
  customDomain?: {
    domain: string;
    certificate: Input<string>;
    certificatePassword?: Input<string>;
  };
}

export default async ({
  name,
  group,
  customDomain,
  insight,
  sku,
  capacity = 1,
  lock = true,
  alertEmail,
  ...others
}: Props) => {
  const apimName = getApimName(name);
  const { resource } = await Creator(apimanagement.ApiManagementService, {
    serviceName: apimName,
    ...group,

    publisherEmail: alertEmail,
    publisherName: organization,
    notificationSenderEmail: "apimgmt-noreply@mail.windowsazure.com",

    //enableClientCertificate: true,
    sku: { name: sku, capacity: sku === "Consumption" ? 0 : capacity },
    identity: { type: "SystemAssigned" },

    hostnameConfigurations: customDomain
      ? [
        //   {
        //     type: 'Management',
        //     hostName: `mm-${customDomain.domain}`,

        //     certificatePassword: customDomain.certificatePassword,
        //     negotiateClientCertificate: false,
        //     encodedCertificate: customDomain.certificate,
        //     defaultSslBinding: false,
        //   },
        //   {
        //     type: 'DeveloperPortal',
        //     hostName: `dev-${customDomain.domain}`,

        //     certificatePassword: customDomain.certificatePassword,
        //     negotiateClientCertificate: false,
        //     encodedCertificate: customDomain.certificate,
        //     defaultSslBinding: false,
        //   },
        {
          type: "Proxy",
          hostName: customDomain.domain,

          certificatePassword: customDomain.certificatePassword,
          negotiateClientCertificate: false,
          encodedCertificate: customDomain.certificate,
          defaultSslBinding: false,
        },
        //   {
        //     type: 'Scm',
        //     hostName: `scm-${customDomain.domain}`,

        //     certificatePassword: customDomain.certificatePassword,
        //     negotiateClientCertificate: false,
        //     encodedCertificate: customDomain.certificate,
        //     defaultSslBinding: false,
        //   },
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
    tags: defaultTags,
    lock,
    ...others,
    ignoreChanges: [],
  } as apimanagement.ApiManagementServiceArgs & DefaultResourceArgs);
  const apim = resource as apimanagement.ApiManagementService;

  //Link AppInsights in
  if (insight) {
    const insightName = `${apimName}-insight`;
    //App Insight Logs
    new apimanagement.Logger(insightName, {
      loggerType: apimanagement.LoggerType.ApplicationInsights,
      description: "App Insight Logger",
      loggerId: randomUuId(insightName).result,
      resourceId: insight.id,
      credentials: {
        //This credential will be add to NameValue automatically.
        instrumentationKey: insight.key,
      },
      serviceName: apim.name,
      ...group,
    });
  }
  //Turn of the SignIn
  new ApimSignInSettingsResource(
    apimName,
    { serviceName: apim.name, ...group, enabled: false },
    { dependsOn: apim }
  );
  //Turn off the setting
  new ApimSignUpSettingsResource(
    apimName,
    {
      serviceName: apim.name,
      ...group,
      enabled: false,
      termsOfService: {
        consentRequired: false,
        enabled: false,
        text: "terms Of Service",
      },
    },
    { dependsOn: apim }
  );

  return {
    apim,
    toApimInfo: (): ApimInfo => ({ serviceName: apimName, group }),
  };
};
