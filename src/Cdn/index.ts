import { IEnvRoleBuilder } from '../Builder';
import { ResourceGroupInfo, ResourceInfoWithInstance } from '../types';
import * as cdn from '@pulumi/azure-native/cdn';
import { naming } from '../Common';

interface Props {
  name: string;
  group: ResourceGroupInfo;
  envRoles?: IEnvRoleBuilder;
}

export default ({
  name,
  group,
  envRoles,
}: Props): ResourceInfoWithInstance<cdn.Profile> => {
  name = naming.getCdnProfileName(name);
  const internalGroup = { ...group, location: 'global' };

  const profile = new cdn.Profile(name, {
    profileName: name,
    ...internalGroup,
    identity: { type: cdn.ManagedServiceIdentityType.SystemAssigned },
    sku: { name: cdn.SkuName.Standard_Microsoft },
  });

  if (envRoles) {
    //Add identity to read only group in order to read the certificate from the key vault
    envRoles.addMember(
      'readOnly',
      profile.identity.apply((i) => i!.principalId!),
    );
  }

  return {
    name,
    group: internalGroup,
    id: profile.id,
    instance: profile,
  };
};
