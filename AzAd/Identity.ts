import * as azureAD from '@pulumi/azuread';
import { ServicePrincipal } from '@pulumi/azuread';
import * as pulumi from '@pulumi/pulumi';
import { Input, Output } from '@pulumi/pulumi';
import { getIdentityName } from '../Common/Naming';
import {
  ApplicationApiOauth2PermissionScope,
  ApplicationAppRole,
  ApplicationRequiredResourceAccess,
} from '@pulumi/azuread/types/input';

import { KeyVaultInfo } from '../types';
import { roleAssignment } from './RoleAssignment';
import { defaultScope } from '../Common/AzureEnv';
import { addCustomSecret } from '../KeyVault/CustomHelper';

type PreAuthApplicationProps = {
  appId: string;
  oauth2PermissionNames: string[];
};

type IdentityProps = {
  name: string;
  owners?: pulumi.Input<pulumi.Input<string>[]>;
  createClientSecret?: boolean;
  /** if UI app set public client is true */
  homepage?: pulumi.Input<string>;
  publicClient?: boolean;
  createPrincipal?: boolean;
  replyUrls?: pulumi.Input<pulumi.Input<string>[]>;
  appType?: 'spa' | 'web' | 'api';
  allowMultiOrg?: boolean;
  appRoles?: pulumi.Input<pulumi.Input<ApplicationAppRole>[]>;
  oauth2Permissions?: pulumi.Input<
    pulumi.Input<ApplicationApiOauth2PermissionScope>[]
  >;
  appRoleAssignmentRequired?: boolean;
  preAuthApplications?: PreAuthApplicationProps[];
  requiredResourceAccesses?: pulumi.Input<
    pulumi.Input<ApplicationRequiredResourceAccess>[]
  >;
  /**The Role Assignment of principal. If scope is not defined the default scope will be at subscription level*/
  principalRoles?: Array<{
    roleName: string;
    scope?: Input<string>;
  }>;
  vaultInfo?: KeyVaultInfo;
};

export type IdentityResult = {
  name: string;
  objectId: Output<string>;
  clientId: Output<string>;
  clientSecret: Output<string> | undefined;
  principalId: Output<string> | undefined;
  principalSecret: Output<string> | undefined;
  resource: azureAD.Application;
};

export default ({
  name,
  owners,
  createClientSecret = false,
  createPrincipal = false,
  replyUrls,
  appType = 'spa',
  allowMultiOrg = false,
  appRoles,
  appRoleAssignmentRequired,
  requiredResourceAccesses = [],
  oauth2Permissions,
  publicClient = false,
  principalRoles,
  vaultInfo,
}: IdentityProps): IdentityResult & {
  vaultNames: {
    clientIdKeyName: string;
    clientSecretKeyName: string;
    principalIdKeyName: string;
    principalSecretKeyName: string;
  };
} => {
  // Azure AD Application no need suffix
  name = getIdentityName(name);

  const clientIdKeyName = `${name}-client-id`;
  const clientSecretKeyName = `${name}-client-secret`;
  const principalIdKeyName = `${name}-principal-id`;
  const principalSecretKeyName = `${name}-principal-secret`;

  const identifierUris = publicClient
    ? undefined
    : [`api://${name.toLowerCase()}`];

  const app = new azureAD.Application(name, {
    displayName: name,
    description: name,

    owners,
    appRoles,
    signInAudience: allowMultiOrg ? 'AzureADMultipleOrgs' : 'AzureADMyOrg',
    groupMembershipClaims: ['SecurityGroup'],
    identifierUris,

    publicClient: publicClient ? { redirectUris: replyUrls } : undefined,

    singlePageApplication:
      appType === 'spa'
        ? {
            redirectUris: replyUrls,
          }
        : undefined,

    web:
      appType === 'web'
        ? {
            redirectUris: replyUrls,
            implicitGrant: {
              accessTokenIssuanceEnabled: true,
              idTokenIssuanceEnabled: true,
            },
          }
        : undefined,

    api:
      appType === 'api'
        ? {
            oauth2PermissionScopes: oauth2Permissions,
            mappedClaimsEnabled: true,
            requestedAccessTokenVersion: 2,
          }
        : undefined,

    fallbackPublicClientEnabled: false,
    preventDuplicateNames: true,
    requiredResourceAccesses: requiredResourceAccesses
      ? pulumi.output(requiredResourceAccesses).apply((r) => [...r])
      : undefined,
  });

  if (vaultInfo)
    addCustomSecret({
      name: clientIdKeyName,
      value: app.clientId,
      vaultInfo,
      contentType: 'Identity',
    });

  let clientSecret: Output<string> | undefined = undefined;
  if (createClientSecret) {
    clientSecret = new azureAD.ApplicationPassword(
      name,
      {
        displayName: name,
        applicationId: app.id.apply((i) => `/applications/${i}`),
        endDateRelative: '43800h',
        //value: randomPassword({ name: `${name}-clientSecret` }).result,
      },
      { ignoreChanges: ['applicationId', 'applicationObjectId'] }
    ).value;

    if (vaultInfo)
      addCustomSecret({
        name: clientSecretKeyName,
        value: clientSecret,
        vaultInfo,
        contentType: 'Identity',
      });
  }

  let principal: ServicePrincipal | undefined;
  let principalSecret: Output<string> | undefined = undefined;

  if (createPrincipal || appRoleAssignmentRequired) {
    principal = new azureAD.ServicePrincipal(
      name,
      {
        //Allow to access to application as the permission is manage by Group assignment.
        appRoleAssignmentRequired,
        clientId: app.clientId,
      },
      { ignoreChanges: ['clientId', 'applicationId'] }
    );

    principalSecret = new azureAD.ServicePrincipalPassword(name, {
      displayName: name,
      servicePrincipalId: principal.objectId,
      endDateRelative: '43800h',
      //value: randomPassword({ name: `${name}-principalSecret` }).result,
    }).value;

    if (principalRoles) {
      principalRoles.map((r) =>
        roleAssignment({
          name,
          roleName: r.roleName,
          principalId: principal!.id,
          principalType: 'ServicePrincipal',
          scope: r.scope || defaultScope,
        })
      );
    }

    if (vaultInfo) {
      addCustomSecret({
        name: principalIdKeyName,
        value: principal.objectId,
        vaultInfo,
        contentType: 'Identity',
      });

      addCustomSecret({
        name: principalSecretKeyName,
        value: principalSecret,
        vaultInfo,
        contentType: 'Identity',
      });
    }
  }

  return {
    name,
    objectId: app.objectId,
    clientId: app.clientId ?? app.applicationId,
    clientSecret,
    principalId: principal?.objectId,
    principalSecret,
    resource: app,
    vaultNames: {
      clientIdKeyName,
      clientSecretKeyName,
      principalIdKeyName,
      principalSecretKeyName,
    },
  };
};
