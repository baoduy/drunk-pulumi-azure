import { CustomSecurityRuleArgs } from '../types';

export default (name: string = 'default') => {
  const rs = new Array<CustomSecurityRuleArgs>();

  //This should be added if not all internal access will be blocked
  rs.push({
    name: `${name}-allows-vnet-outbound`,
    description: 'Allows Vnet to Vnet Outbound',
    priority: 4095,
    protocol: '*',
    access: 'Allow',
    direction: 'Outbound',

    sourceAddressPrefix: 'VirtualNetwork',
    sourcePortRange: '*',
    destinationAddressPrefix: 'VirtualNetwork',
    destinationPortRange: '*',
  });

  //TODO: This may not need if azure support private subnet
  //Block direct access to internet
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
