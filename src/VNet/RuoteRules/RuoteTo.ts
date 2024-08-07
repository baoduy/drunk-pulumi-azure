import { RouteArgs } from '../types';
import { WithNamedType } from '../../types';

export default ({
  name,
  addressPrefix = '0.0.0.0/0',
  nextHopType = 'VirtualAppliance',
  ...others
}: RouteArgs & WithNamedType) => {};
