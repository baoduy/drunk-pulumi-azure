import { EnvRolesResults } from '../AzAd/EnvRoles';
import { addMemberToGroup } from '../AzAd/Group';
import { ResourceGroupInfo, ResourceInfo } from '../types';
import * as cdn from '@pulumi/azure-native/cdn';
import { getCdnProfileName, global } from '../Common';

interface Props {
  name: string;
  group?: ResourceGroupInfo;
  envRoles?: EnvRolesResults;
}

export default ({
  name,
  group = global.groupInfo,
  envRoles,
}: Props): ResourceInfo & { instance: cdn.Profile } => {
  name = getCdnProfileName(name);
  const internalGroup = { ...group, location: 'global' };

  const profile = new cdn.Profile(name, {
    profileName: name,
    ...internalGroup,
    identity: { type: cdn.ManagedServiceIdentityType.SystemAssigned },
    sku: { name: cdn.SkuName.Standard_Microsoft },
  });

  if (envRoles) {
    profile.identity.apply((i) => {
      if (!i) return;
      addMemberToGroup({
        name,
        objectId: i.principalId,
        groupObjectId: envRoles.readOnly.objectId,
      });
    });
  }

  return {
    name,
    group: internalGroup,
    id: profile.id,
    instance: profile,
  };
};
