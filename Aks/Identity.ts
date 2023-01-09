import { all, Input } from '@pulumi/pulumi';

import { getGraphPermissions } from '../AzAd/GraphDefinition';
import identityCreator from '../AzAd/Identity';
import { roleAssignment } from '../AzAd/RoleAssignment';
import { defaultScope, getResourceIdFromInfo, getResourceInfoFromId } from '../Common/AzureEnv';
import { KeyVaultInfo, ResourceGroupInfo } from '../types';

interface Props {
  name: string;
  group?: ResourceGroupInfo;
  vaultInfo: KeyVaultInfo;
  containerRegistryId?: Input<string>;
  privateCluster?: boolean;
  /**Grant permission to subnet resource group if it is in different resource group*/
  subnetId?: Input<string>;
}

//** The Az AD app Identity for Azure Kubernetes */
export default async ({
  name,
  group,
  vaultInfo,
  containerRegistryId,
  privateCluster,
  subnetId,
}: Props) => {
  //AKS need this permission for AAD integration
  const graphAccess = getGraphPermissions(
    { name: "User.Read", type: "Scope" },
    { name: "Group.Read.All", type: "Scope" },
    //{ name: 'Directory.Read.All', type: 'Scope' },
    { name: "Directory.Read.All", type: "Role" }
  );

  const serverIdentity = await identityCreator({
    name,
    createClientSecret: true,
    createPrincipal: true,
    requiredResourceAccesses: [graphAccess],
    publicClient: false,
    allowImplicit: false,
    vaultInfo,
  });

  //Permission for Server Identity
  if (serverIdentity.principalId) {
    //Allows to pull image from ACR
    await roleAssignment({
      name: `${name}-acr-pull`,
      principalId: serverIdentity.principalId,
      roleName: "AcrPull",
      scope: containerRegistryId || defaultScope,
      principalType: "ServicePrincipal",
    });

    //Allows to update Private DNS Zone
    if (privateCluster) {
      await roleAssignment({
        name: `${name}-private-dns`,
        principalId: serverIdentity.principalId,
        roleName: "Private DNS Zone Contributor",
        principalType: "ServicePrincipal",
      });
    }

    //Add contribute role to resource group
    if (group) {
      await roleAssignment({
        name: `${name}-contributor`,
        principalId: serverIdentity.principalId,
        roleName: "Contributor",
        principalType: "ServicePrincipal",
        scope: getResourceIdFromInfo({ group }),
      });

      if (subnetId) {
        all([subnetId]).apply(([sId]) => {
          const info = getResourceInfoFromId(sId);
          if (!info) return undefined;

          if (
            info.group.resourceGroupName.toLowerCase() !==
            group.resourceGroupName.toLowerCase()
          ) {
            return roleAssignment({
              name: `${name}-net`,
              principalId: serverIdentity.principalId!,
              roleName: "Contributor",
              principalType: "ServicePrincipal",
              scope: getResourceIdFromInfo({ group: info.group }),
            });
          }
          return undefined;
        });
      }
    }
  }

  return serverIdentity;
};
