import * as azureAD from '@pulumi/azuread';
import { ServicePrincipal } from '@pulumi/azuread';
import * as pulumi from '@pulumi/pulumi';
import { Output } from '@pulumi/pulumi';
import { getIdentityName } from '../Common';
import {
  ApplicationApiOauth2PermissionScope,
  ApplicationAppRole,
  ApplicationOptionalClaims,
  ApplicationRequiredResourceAccess,
} from '@pulumi/azuread/types/input';
import { WithNamedType, NamedWithVaultBasicArgs } from '../types';
import { addCustomSecret, addCustomSecrets } from '../KeyVault/CustomHelper';
import { getIdentitySecretNames } from './Helper';

type PreAuthApplicationProps = {
  appId: string;
  oauth2PermissionNames: string[];
};

interface IdentityProps extends NamedWithVaultBasicArgs {
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
  optionalClaims?: pulumi.Input<ApplicationOptionalClaims>;
}

export type IdentityResult = WithNamedType & {
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
  optionalClaims,
  vaultInfo,
  dependsOn,
}: IdentityProps): IdentityResult => {
  // Azure AD Application no need suffix
  name = getIdentityName(name);
  const secretNames = getIdentitySecretNames(name);

  const identifierUris = publicClient
    ? undefined
    : [`api://${name.toLowerCase()}`];

  const app = new azureAD.Application(
    name,
    {
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

      optionalClaims,
    },
    { dependsOn },
  );

  if (vaultInfo) {
    addCustomSecrets({
      vaultInfo,
      contentType: 'Identity',
      items: [
        { name: secretNames.objectIdName, value: app.objectId },
        { name: secretNames.clientIdKeyName, value: app.clientId },
      ],
    });
  }

  let clientSecret: Output<string> | undefined = undefined;
  if (createClientSecret) {
    clientSecret = new azureAD.ApplicationPassword(
      name,
      {
        displayName: name,
        applicationId: app.id,
        endDateRelative: '43800h',
      },
      { ignoreChanges: ['applicationId', 'applicationObjectId'] },
    ).value;

    if (vaultInfo) {
      addCustomSecret({
        name: secretNames.clientSecretKeyName,
        value: clientSecret,
        vaultInfo,
        contentType: 'Identity',
        dependsOn: app,
      });
    }
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
      { ignoreChanges: ['clientId', 'applicationId'] },
    );

    principalSecret = new azureAD.ServicePrincipalPassword(name, {
      displayName: name,
      servicePrincipalId: principal.objectId,
      endDateRelative: '43800h',
      //value: randomPassword({ name: `${name}-principalSecret` }).result,
    }).value;

    if (vaultInfo) {
      addCustomSecrets({
        vaultInfo,
        contentType: 'Identity',
        dependsOn: principal,
        items: [
          { name: secretNames.principalIdKeyName, value: principal.objectId },
          { name: secretNames.principalSecretKeyName, value: principalSecret },
        ],
      });
    }
  }

  return {
    name,
    objectId: app.objectId,
    clientId: app.clientId,
    clientSecret,
    principalId: principal?.objectId,
    principalSecret,
    resource: app,
  };
};
