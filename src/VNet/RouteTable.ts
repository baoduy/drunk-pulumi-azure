import { BasicResourceArgs } from '../types';
import { RouteArgs } from './types';
import { naming } from '../Common';
import * as network from '@pulumi/azure-native/network';
import { Input } from '@pulumi/pulumi';

interface Props extends BasicResourceArgs {
  routes?: Input<RouteArgs>[];
}

export default ({ name, group, routes, dependsOn }: Props) => {
  const routeName = naming.getRouteName(name);
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
  return new network.Route(name, {
    name,
    ...group,
    ...others,
  });
};
