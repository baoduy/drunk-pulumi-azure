import { BasicResourceArgs } from '../types';
import { RouteArgs } from './types';
import { getRouteName, getRouteItemName } from '../Common';
import * as network from '@pulumi/azure-native/network';
import { Input } from '@pulumi/pulumi';

interface Props extends BasicResourceArgs {
  routes?: Input<RouteArgs>[];
}

export default ({ name, group, routes, dependsOn }: Props) => {
  const routeName = getRouteName(name);
  return new network.RouteTable(
    routeName,
    {
      routeTableName: routeName,
      ...group,
      routes,
    },
    { dependsOn },
  );
};

interface RouteItemsProps extends BasicResourceArgs, Omit<RouteArgs, 'name'> {
  routeTableName: Input<string>;
}

export const updateRouteItems = ({
  name,
  group,
  ...others
}: RouteItemsProps) => {
  const routeName = getRouteItemName(name);
  return new network.Route(routeName, {
    name: routeName,
    ...group,
    ...others,
  });
};
