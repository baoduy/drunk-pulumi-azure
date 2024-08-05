import { CustomSecurityRuleArgs } from '../types';
type Props = { name?: string; allowsVnetAccess?: boolean };

export default (
  { name, allowsVnetAccess }: Props = {
    name: 'default',
    allowsVnetAccess: true,
  },
) => {
  const rs = new Array<CustomSecurityRuleArgs>();
  if (allowsVnetAccess) {
    rs.push({
      name: `${name}-allows-vnet-outbound`,
      description: 'Allows Vnet Internet Outbound',
      priority: 4095,
      protocol: '*',
      access: 'Allow',
      direction: 'Outbound',

      sourceAddressPrefix: 'VirtualNetwork',
      sourcePortRange: '*',
      destinationAddressPrefix: 'VirtualNetwork',
      destinationPortRange: '*',
    });
  }

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
