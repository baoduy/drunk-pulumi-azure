import { IEnvRoleBuilder } from '../Builder';
import { ResourceGroupInfo, ResourceInfoWithInstance } from '../types';
import * as cdn from '@pulumi/azure-native/cdn';
import { naming } from '../Common';

interface Props {
  name: string;
  group: ResourceGroupInfo;
  envRoles?: IEnvRoleBuilder;
  sku?: cdn.SkuName;
}

export default ({
  name,
  group,
  envRoles,
  sku = cdn.SkuName.Standard_Microsoft,
}: Props): ResourceInfoWithInstance<cdn.Profile> => {
  name = naming.getCdnProfileName(name);
  const internalGroup = { ...group, location: 'global' };

  const profile = new cdn.Profile(name, {
    profileName: name,
    ...internalGroup,
    //identity: { type: cdn.ManagedServiceIdentityType.SystemAssigned },
    sku: { name: sku },
  });

  // if (envRoles) {
  //   profile.identity.apply((i) => {
  //     if (!i) return;
  //     //Add identity to read only group in order to read the certificate from the key vault
  //     envRoles.addMember('readOnly', i.principalId);
  //   });
  // }

  return {
    name,
    group: internalGroup,
    id: profile.id,
    instance: profile,
  };
};
