import * as native from '@pulumi/azure-native';
import { naming } from '../Common';
import { BasicResourceArgs } from '../types';

type Locations = 'United States' | 'Europe' | 'Asia Pacific' | 'Australia';

interface Props extends BasicResourceArgs {
  displayName: string;
  location: Locations;
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

export default ({ name, group, location, displayName }: Props) => {
  const n = naming.getB2cName(name);

  return new native.azureactivedirectory.B2CTenant(n, {
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
};
