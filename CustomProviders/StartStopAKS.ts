import * as pulumi from '@pulumi/pulumi';
import { createAxios } from '../Tools/Axios';

import {
  BaseOptions,
  BaseProvider,
  BaseResource,
  DefaultInputs,
  DefaultOutputs,
} from './Base';
import * as console from 'console';
import { AxiosError } from 'axios';

interface StartStopAKSInputs extends DefaultInputs {
  resourceGroupName: string;
  resourceName: string;
}

interface StartStopAKSOutputs extends StartStopAKSInputs, DefaultOutputs {}

export interface AksResult {
  id: string;
  location: string;
  name: string;
  type: string;
  properties: Properties;
}

export interface Properties {
  powerState: PowerState;
}

export interface PowerState {
  code: string;
}

const getAksStatus = async ({
  resourceGroupName,
  resourceName,
}: StartStopAKSInputs) => {
  const axios = createAxios();
  const url = `/resourceGroups/${resourceGroupName}/providers/Microsoft.ContainerService/managedClusters/${resourceName}?api-version=2021-05-01`;
  return await axios.get<AksResult>(url).then((rs) => rs.data);
};

const startStopAKS = async ({
  resourceGroupName,
  resourceName,
  start,
}: StartStopAKSInputs & { start?: boolean }) => {
  const axios = createAxios();
  //POST https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContainerService/managedClusters/{resourceName}/start?api-version=2023-02-01
  //POST https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContainerService/managedClusters/{resourceName}/stop?api-version=2023-02-01

  const url = `/resourceGroups/${resourceGroupName}/providers/Microsoft.ContainerService/managedClusters/${resourceName}/${
    start ? 'start' : 'stop'
  }?api-version=2023-02-01`;
  //console.log('StartStopAKS', url);StartStopAKS.ts

  return await axios
    .post(url)
    //.then((rs) => rs.data)
    .catch((err: AxiosError) => {
      console.log('StartStopAKS', err.response?.data || err);
      throw err;
    });
};

class StartStopAKSResourceProvider
  implements BaseProvider<StartStopAKSInputs, StartStopAKSOutputs>
{
  constructor(private name: string) {}

  async diff(
    id: string,
    previousOutput: StartStopAKSOutputs,
    news: StartStopAKSInputs
  ): Promise<pulumi.dynamic.DiffResult> {
    const rs = await getAksStatus(news);

    return {
      deleteBeforeReplace: false,
      replaces: [],
      changes: rs.properties.powerState.code !== 'Stopped',
    };
  }

  async create(
    inputs: StartStopAKSInputs
  ): Promise<pulumi.dynamic.CreateResult> {
    await startStopAKS({ ...inputs, start: false });
    return {
      id: this.name,
      outs: inputs,
    };
  }

  async update(
    id: string,
    olds: StartStopAKSOutputs,
    news: StartStopAKSInputs
  ): Promise<pulumi.dynamic.UpdateResult> {
    //Ignored the error if cluster already stopped

    await this.create(news).catch(() => undefined);
    return { outs: news };
  }

  async delete(id: string, inputs: StartStopAKSInputs): Promise<void> {
    await startStopAKS({ ...inputs, start: true }).catch(() => undefined);
  }
}

export class StartStopAKSResource extends BaseResource<
  StartStopAKSInputs,
  StartStopAKSOutputs
> {
  public readonly name: string;

  constructor(
    name: string,
    args: BaseOptions<StartStopAKSInputs>,
    opts?: pulumi.CustomResourceOptions
  ) {
    super(
      new StartStopAKSResourceProvider(name),
      `csp:StartStopAKSs:${name}`,
      args,
      opts
    );
    this.name = name;
  }
}
