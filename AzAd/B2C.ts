import * as native from '@pulumi/azure-native';

import { getB2cName } from '../Common/Naming';
import { BasicResourceArgs } from '../types';
import Locker from '../Core/Locker';

type Locations = 'United States' | 'Europe' | 'Asia Pacific' | 'Australia';

interface Props extends BasicResourceArgs {
  displayName: string;
  location: Locations;
  lock?: boolean;
}

const getCountryCode = (location: Locations) => {
  switch (location) {
    case 'Asia Pacific':
      return 'SG';
    case 'Australia':
      return 'AU';
    case 'United States':
      return 'US';
    case 'Europe':
      return 'EU';
    default:
      return 'SG';
  }
};

export default ({ name, group, location, displayName, lock }: Props) => {
  const n = getB2cName(name);

  const b2cTenant = new native.azureactivedirectory.B2CTenant(n, {
    resourceName: n,
    ...group,
    location,

    countryCode: getCountryCode(location),
    displayName,

    sku: {
      name: native.azureactivedirectory.B2CResourceSKUName.Standard,
      tier: native.azureactivedirectory.B2CResourceSKUTier.A0,
    },
  });

  if (lock) {
    Locker({ name, resourceId: b2cTenant.id, dependsOn: b2cTenant });
  }

  return b2cTenant;
};
