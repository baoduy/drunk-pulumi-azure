import * as pulumi from '@pulumi/pulumi';
import { BasicResourceArgs } from '../types';
import { getRouteName, getRouteItemName } from '../Common/Naming';
import * as network from '@pulumi/azure-native/network';
import { Input } from '@pulumi/pulumi';

interface Props extends BasicResourceArgs {
  routes?: pulumi.Input<pulumi.Input<network.RouteArgs>[]>;
}

export default ({ name, group, routes }: Props) => {
  const routeName = getRouteName(name);

  return new network.RouteTable(routeName, {
    ...group,
    routeTableName: routeName,
    routes,
  });
};

interface RouteProps
  extends BasicResourceArgs,
    Omit<
      network.RouteArgs,
      'name'   | 'id' | 'resourceGroupName' | 'type'
    > {
  routes?: Input<Input<network.RouteArgs>[]>;
}

export const updateRuoteItem = ({ name, group, ...others }: RouteProps) => {
  const routeName = getRouteItemName(name);
  return new network.Route(routeName, {
    routeName,
    ...group,
    ...others,
  });
};
