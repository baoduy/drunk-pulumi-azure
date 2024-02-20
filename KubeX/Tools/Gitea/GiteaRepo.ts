import { DefaultK8sArgs } from '../../types';
import * as k8s from '@pulumi/kubernetes';
import { Input, interpolate } from '@pulumi/pulumi';
import { randomPassword } from '../../../Core/Random';
import { KeyVaultInfo } from '../../../types';
import IdentityCreator from '../../../AzAd/Identity';
import RoleCreator from '../../../AzAd/Role';
import { Environments, tenantId } from '../../../Common/AzureEnv';

type CaptchaType = {
  type: 'image' | 'recaptcha' | 'hcaptcha' | 'mcaptcha' | 'cfturnstile';
  siteKey: Input<string>;
  secret: Input<string>;
  url?: Input<string>;
};

const getCaptchaPrefixKey = (captcha: CaptchaType) =>
  captcha.type === 'cfturnstile' ? 'CF_TURNSTILE' : captcha.type.toUpperCase();

interface HarborRepoProps extends DefaultK8sArgs {
  vaultInfo?: KeyVaultInfo;
  storageClass: Input<string>;
  host: string;

  auth?: {
    localAdmin?: { username: string; email: string };
    disableRegistration?: boolean;
    enableAzureAD?: boolean;
    oauth?: {
      name: string;
      iconUrl?: Input<string>;
      key: Input<string>;
      secret: Input<string>;
      scopes?: Input<string>;
      autoDiscoverUrl?: Input<string>;
      useCustomUrls?: Input<string>;
      customAuthUrl?: Input<string>;
      customTokenUrl?: Input<string>;
      customProfileUrl?: Input<string>;
      customEmailUrl?: Input<string>;
    };
    ldap?: {
      name: string;
      iconUrl?: Input<string>;
      securityProtocol: Input<string>;
      host: Input<string>;
      port: Input<string>;
      userSearchBase: Input<string>;
      userFilter: Input<string>;
      adminFilter: Input<string>;
      emailAttribute: Input<string>;
      bindDn: Input<string>;
      bindPassword: Input<string>;
      usernameAttribute: Input<string>;
      publicSSHKeyAttribute: Input<string>;
    };
  };

  captcha?: CaptchaType;
  enabledActions?: boolean;

  postgres: {
    host: Input<string>;
    port: Input<number>;
    database: Input<string>;
    username: Input<string>;
    password: Input<string>;
    sslmode?: boolean;
  };
}

// https://github.com/go-gitea/gitea
// https://gitea.com/gitea/helm-chart
export default ({
  name = 'gitea',
  namespace,
  host,
  auth = { disableRegistration: true },
  captcha,
  storageClass,
  postgres,
  enabledActions,
  vaultInfo,
  provider,
  dependsOn,
}: HarborRepoProps) => {
  const randomPassOptions = {
    length: 16,
    options: { special: false },
    policy: false,
    vaultInfo,
  };

  //Create 2 Groups for Admin and Users
  const devGroup = RoleCreator({
    env: Environments.Dev,
    appName: name,
    roleName: 'Developers',
    includeOrganization: true,
  });
  const adminGroup = RoleCreator({
    env: Environments.Dev,
    appName: name,
    roleName: 'Admins',
    includeOrganization: true,
  });

  const identity = auth?.enableAzureAD
    ? IdentityCreator({
        name,
        appRoleAssignmentRequired: false,
        createPrincipal: false,
        createClientSecret: true,
        appType: 'web',
        replyUrls: [`https://${host}/user/oauth2/AzureAD/callback`],
        vaultInfo,

        optionalClaims: {
          idTokens: [{ name: 'groups', essential: false }],
          accessTokens: [{ name: 'groups', essential: false }],
        },
      })
    : undefined;

  const captchaConfig = captcha
    ? {
        CAPTCHA_TYPE: captcha.type,
        [`${getCaptchaPrefixKey(captcha)}_SITEKEY`]: captcha.siteKey,
        [`${getCaptchaPrefixKey(captcha)}_SECRET`]: captcha.secret,
        [`${getCaptchaPrefixKey(captcha)}_URL`]: captcha.url ?? '',
      }
    : {};

  const gitea = new k8s.helm.v3.Chart(
    name,
    {
      namespace,
      chart: 'gitea',
      fetchOpts: { repo: 'https://dl.gitea.com/charts' },

      values: {
        gitea: {
          admin: auth?.localAdmin
            ? {
                username: auth.localAdmin.username,
                email: auth.localAdmin.email,
                password: randomPassword({
                  name: `${name}-admin`,
                  ...randomPassOptions,
                }).result,
              }
            : undefined,

          oauth: identity
            ? [
                {
                  name: 'AzureAD',
                  iconUrl:
                    'https://code.benco.io/icon-collection/azure-icons/Azure-AD-B2C.svg',
                  provider: 'openidConnect',
                  key: identity.clientId,
                  secret: identity.clientSecret,
                  autoDiscoverUrl: interpolate`https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`,
                  requiredClaimName: 'groups',
                  requiredClaimValue: interpolate`${devGroup.objectId};${adminGroup.objectId}`,
                  scopes: 'openid email',
                  groupClaimName: 'groups',
                  adminGroup: adminGroup.objectId,
                  //groupTeamMap: interpolate`{"${adminGroup.objectId}": {"creamteam": ["Developers"]}}`,
                },
              ]
            : auth?.oauth
            ? [{ provider: 'openidConnect', ...auth.oauth }]
            : undefined,

          ldap: auth?.ldap,

          config: {
            actions: { ENABLED: `${Boolean(enabledActions)}` },

            admin: {
              DISABLE_REGULAR_ORG_CREATION: 'true', //Only Admin able to create new Organization
            },
            oauth2_client: {
              ENABLE_AUTO_REGISTRATION: 'true',
              ACCOUNT_LINKING: 'auto',
              UPDATE_AVATAR: 'true',
              OPENID_CONNECT_SCOPES: 'openid email',
              USERNAME: 'email',
            },
            openid: {
              ENABLE_OPENID_SIGNIN: 'false',
              ENABLE_OPENID_SIGNUP: 'true',
              WHITELISTED_URIS: 'login.microsoftonline.com google.com',
            },
            database: {
              DB_TYPE: 'postgres',
              HOST: interpolate`${postgres.host}:${postgres.port}`,
              NAME: postgres.database,
              USER: postgres.username,
              PASSWD: postgres.password,
              SCHEMA: 'public',
            },
            service: {
              ENABLE_CAPTCHA: `${Boolean(captchaConfig)}`,
              REQUIRE_CAPTCHA_FOR_LOGIN: `${Boolean(captchaConfig)}`,
              ...captchaConfig,

              DISABLE_REGISTRATION: auth?.disableRegistration
                ? 'true'
                : 'false',
              ENABLE_BASIC_AUTHENTICATION: 'false', // `${Boolean(auth?.localAdmin)}`,
              ALLOW_ONLY_EXTERNAL_REGISTRATION: 'true',
              DEFAULT_ALLOW_CREATE_ORGANIZATION: 'true', //only Admin able to create Organization
              SHOW_REGISTRATION_BUTTON: 'false',
            },
            server: {
              DISABLE_SSH: 'true',
              START_SSH_SERVER: 'false',
              //APP_DATA_PATH = /data
              DOMAIN: host,
              HTTP_PORT: '3000',
              PROTOCOL: 'http',
              ROOT_URL: `https://${host}`,
              SSH_DOMAIN: host,
              SSH_LISTEN_PORT: '22',
              SSH_PORT: '22',
              ENABLE_PPROF: 'false',

              DISABLE_REGISTRATION: auth?.disableRegistration
                ? 'true'
                : 'false',
            },
            session: {
              SAME_SITE: 'lax',
              COOKIE_SECURE: 'true',
              COOKIE_NAME: 'gitea_session',
              DOMAIN: host,
            },
            repository: { DEFAULT_PRIVATE: 'true', FORCE_PRIVATE: 'true' },
          },
        },

        'redis-cluster': { enabled: false },
        postgresql: { enabled: false },
        'postgresql-ha': { enabled: false },

        persistence: { enabled: true, storageClass },
      },
    },
    { provider, dependsOn }
  );

  return gitea;
};
