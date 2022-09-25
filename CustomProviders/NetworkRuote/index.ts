import * as pulumi from "@pulumi/pulumi";
import {
  BaseOptions,
  BaseProvider,
  BaseResource,
  DefaultInputs,
  DefaultOutputs,
} from "../Base";
import { NetworkRouteRequest, NetworkRouteResult } from "./type";
import { AxiosInstance } from "axios";
import { createAxios } from "../../Tools/Axios";

interface NetworkRouteInputs extends DefaultInputs {
  resourceGroupName: string;
  routeTableName: string;
  routeName: string;
  addressPrefix: string;
  nextHopType:
    | "VirtualNetworkGateway"
    | "VnetLocal"
    | "Internet"
    | "VirtualAppliance"
    | "None";
  /** The IP address packets should be forwarded to. Next hop values are only allowed in routes where the next hop type is VirtualAppliance. */
  nextHopIpAddress?: string;
}

interface NetworkRouteOutputs extends NetworkRouteInputs, DefaultOutputs {}

const getRoute = async ({
  resourceGroupName,
  routeTableName,
}: NetworkRouteInputs) => {
  const axios = createAxios();
  const url = `/resourceGroups/${resourceGroupName}/providers/Microsoft.Network/routeTables/${routeTableName}?api-version=2021-02-01`;
  return await axios.get<NetworkRouteResult>(url).then((rs) => rs.data);
};

const createOrUpdateRoute = async ({
  resourceGroupName,
  routeTableName,
  addressPrefix,
  nextHopType,
  routeName,
  nextHopIpAddress,
  result,
  isDeleting = false,
}: NetworkRouteInputs & {
  result: NetworkRouteResult;
  isDeleting?: boolean;
}) => {
  const axios = createAxios();
  const url = `/resourceGroups/${resourceGroupName}/providers/Microsoft.Network/routeTables/${routeTableName}?api-version=2021-02-01`;
  const data: NetworkRouteRequest = {
    ...result,
    properties: {
      disableBgpRoutePropagation: result.properties.disableBgpRoutePropagation,
      routes: result.properties.routes.filter((r) => r.name !== routeName),
    },
  };

  if (!isDeleting) {
    data.properties.routes.push({
      name: routeName,
      properties: { addressPrefix, nextHopType, nextHopIpAddress },
    });
  }

  return await axios.put(url, data).then((rs) => rs.data);
};

class NetworkRouteResourceProvider
  implements BaseProvider<NetworkRouteInputs, NetworkRouteOutputs>
{
  constructor(private name: string) {}

  async diff(
    id: string,
    previousOutput: NetworkRouteOutputs,
    news: NetworkRouteInputs
  ): Promise<pulumi.dynamic.DiffResult> {
    const rs = await getRoute(news);

    return {
      deleteBeforeReplace: false,
      replaces: [],
      changes: !rs.properties.routes.find((r) => r.name === news.routeName),
    };
  }

  async create(
    inputs: NetworkRouteInputs
  ): Promise<pulumi.dynamic.CreateResult> {
    const result = await getRoute(inputs);
    await createOrUpdateRoute({ ...inputs, result });

    return {
      id: this.name,
      outs: inputs,
    };
  }

  async update(
    id: string,
    olds: NetworkRouteOutputs,
    news: NetworkRouteInputs
  ): Promise<pulumi.dynamic.UpdateResult> {
    await this.create(news).catch(() => undefined);
    return { outs: news };
  }

  async delete(id: string, inputs: NetworkRouteInputs): Promise<void> {
    const result = await getRoute(inputs);
    await createOrUpdateRoute({ ...inputs, result, isDeleting: true });
  }
}

export class NetworkRouteResource extends BaseResource<
  NetworkRouteInputs,
  NetworkRouteOutputs
> {
  public readonly name: string;

  constructor(
    name: string,
    args: BaseOptions<NetworkRouteInputs>,
    opts?: pulumi.CustomResourceOptions
  ) {
    super(
      new NetworkRouteResourceProvider(name),
      `csp:NetworkRoutes:${name}`,
      args,
      opts
    );
    this.name = name;
  }
}
