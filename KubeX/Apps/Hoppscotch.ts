import { K8sArgs } from '../types';
import * as pulumi from '@pulumi/pulumi';
import Deployment, { IngressTypes } from '../Deployment';
import { CertManagerIssuerTypes } from '../Ingress/type';
import { randomPassword } from '../../Core/Random';
import Identity from '../../AzAd/Identity';
import { tenantId } from '../../Common/AzureEnv';

//https://docs.hoppscotch.io/documentation/self-host/community-edition/install-and-build
interface HoppscotchProps extends K8sArgs {
  name?: string;
  namespace: pulumi.Input<string>;
  ingress: {
    type: IngressTypes;
    hosts: {
      frontendHost: string;
      adminHost: string;
      backendHost: string;
    };
    allowHttp?: boolean;
    certManagerIssuer?: CertManagerIssuerTypes;
  };
  postgres: {
    host: pulumi.Input<string>;
    username: pulumi.Input<string>;
    password: pulumi.Input<string>;
    database: pulumi.Input<string>;
  };
  smtp: {
    email: pulumi.Input<string>;
    password: pulumi.Input<string>;
    url: pulumi.Input<string>;
    port: pulumi.Input<number>;
  };
  auth: {
    azureAd: {
      name: 'MICROSOFT';
      autoCreate?: boolean;
      clientId?: pulumi.Input<string>;
      clientSecret?: pulumi.Input<string>;
      tenantId?: pulumi.Input<string>;
    };
  };
}

export default ({
  name = 'hoppscotch',
  namespace,
  postgres,
  ingress,
  auth,
  smtp,
  provider,
}: HoppscotchProps) => {
  const backendName = `${name}-backend`;
  const adminName = `${name}-admin`;
  const frontendName = `${name}-frontend`;

  const backendUrl = `https://${ingress.hosts.backendHost}`;
  const adminUrl = `https://${ingress.hosts.adminHost}`;
  const frontendUrl = `https://${ingress.hosts.frontendHost}`;
  const callbackUrl = `${backendUrl}/v1/auth/microsoft/callback`;

  if (auth.azureAd.autoCreate) {
    const identity = Identity({
      name,
      createClientSecret: true,
      replyUrls: [callbackUrl],
      appType: 'spa',
    });

    auth.azureAd.clientId = identity.clientId;
    auth.azureAd.clientSecret = identity.clientSecret;
    auth.azureAd.tenantId = tenantId;
  }

  const configMap = {
    // Auth Tokens Config
    TOKEN_SALT_COMPLEXITY: '10',
    MAGIC_LINK_TOKEN_VALIDITY: '3',
    REFRESH_TOKEN_VALIDITY: '604800000',
    ACCESS_TOKEN_VALIDITY: '86400000',

    // Hoppscotch App Domain Config
    REDIRECT_URL: frontendUrl,
    WHITELISTED_ORIGINS: `${ingress.hosts.backendHost},${ingress.hosts.frontendHost},${ingress.hosts.adminHost}`,
    VITE_ALLOWED_AUTH_PROVIDERS: auth.azureAd.name, // GOOGLE,GITHUB,MICROSOFT,EMAIL
  };

  const secrets = {
    // Microsoft Auth Config
    MICROSOFT_CLIENT_ID: auth.azureAd.clientId!,
    MICROSOFT_CLIENT_SECRET: auth.azureAd.clientSecret!,
    MICROSOFT_CALLBACK_URL: callbackUrl,
    MICROSOFT_SCOPE: 'user.read',
    MICROSOFT_TENANT: auth.azureAd.tenantId!,

    // Mailer config
    MAILER_SMTP_URL: pulumi.interpolate`smtps://${smtp.email}:${smtp.password}@${smtp.url}:${smtp.port}`,
    MAILER_ADDRESS_FROM: 'wixo.dev <wixo.dev@wixo.dev>',

    DATABASE_URL: pulumi.interpolate`postgresql://${postgres.username}:${postgres.password}@${postgres.host}:5432/${postgres.database}`,
    JWT_SECRET: randomPassword({
      name: `${name}-jwt`,
      length: 25,
      options: { special: false },
      policy: 'monthly',
    }).result,
    SESSION_SECRET: randomPassword({
      name: `${name}-session`,
      length: 25,
      options: { special: false },
      policy: 'monthly',
    }).result,
  };

  //Api
  const backend = Deployment({
    name: backendName,
    namespace,
    configMap,
    secrets,

    podConfig: {
      port: 3170,
      image: 'hoppscotch/hoppscotch-backend:latest',
    },

    deploymentConfig: { replicas: 1 },
    ingressConfig: {
      ...ingress,
      hostNames: [ingress.hosts.backendHost],
    },
    provider,
  });

  //Admin
  const admin = Deployment({
    name: adminName,
    namespace,
    configMap,
    secrets,

    podConfig: {
      port: 3100,
      image: 'hoppscotch/hoppscotch-admin:latest',
    },

    deploymentConfig: { replicas: 1 },
    ingressConfig: {
      ...ingress,
      hostNames: [ingress.hosts.adminHost],
    },
    provider,
  });

  //frontend
  const frontend = Deployment({
    name: frontendName,
    namespace,
    configMap: {
      // Base URLs
      VITE_BASE_URL: frontendUrl,
      VITE_SHORTCODE_BASE_URL: frontendUrl,
      VITE_ADMIN_URL: adminUrl,

      // Backend URLs
      VITE_BACKEND_GQL_URL: `http://${backendName}:3170/graphql`,
      VITE_BACKEND_WS_URL: `wss://${backendName}:3170/graphql`,
      VITE_BACKEND_API_URL: `http://${backendName}:3170/v1`,

      // Terms Of Service And Privacy Policy Links (Optional)
      VITE_APP_TOS_LINK: frontendUrl,
      VITE_APP_PRIVACY_POLICY_LINK: frontendUrl,
    },

    podConfig: {
      port: 3000,
      image: 'hoppscotch/hoppscotch-frontend:latest',
    },

    deploymentConfig: { replicas: 1 },
    ingressConfig: {
      ...ingress,
      hostNames: [ingress.hosts.frontendHost],
    },
    provider,
  });

  return { frontend, admin, backend };
};
