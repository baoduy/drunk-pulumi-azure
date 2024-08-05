import { CustomSecurityRuleArgs } from '../types';

export default (name: string = 'default') => {
  const rs = new Array<CustomSecurityRuleArgs>();
  rs.push({
    name: `${name}-block-internet-outbound`,
    description: 'Block Internet Outbound',
    priority: 4096,
    protocol: '*',
    access: 'Deny',
    direction: 'Outbound',

    sourceAddressPrefix: '*',
    sourcePortRange: '*',
    destinationAddressPrefix: 'Internet',
    destinationPortRange: '*',
  });

  return rs;
};
