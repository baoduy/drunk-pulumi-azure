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

interface StartStopPostgresFlexibleServerInputs extends DefaultInputs {
  resourceGroupName: string;
  resourceName: string;
}

interface StartStopPostgresFlexibleServerOutputs
  extends StartStopPostgresFlexibleServerInputs,
    DefaultOutputs {}

export interface Properties {
  powerState: PowerState;
}

export interface PowerState {
  code: string;
}

const StartStopPostgresFlexibleServer = async ({
  resourceGroupName,
  resourceName,
  start,
}: StartStopPostgresFlexibleServerInputs & { start?: boolean }) => {
  const axios = createAxios();
  //POST https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.DBforPostgreSQL/flexibleServers/{serverName}/stop?api-version=2022-12-01
  //POST https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.DBforPostgreSQL/flexibleServers/{serverName}/start?api-version=2022-12-01

  const url = `/resourceGroups/${resourceGroupName}/providers/Microsoft.DBforPostgreSQL/flexibleServers/${resourceName}/${
    start ? 'start' : 'stop'
  }?api-version=2022-12-01`;

  return await axios
    .post(url)
    //.then((rs) => rs.data)
    .catch((err: AxiosError) => {
      console.log('StartStopPostgresFlexibleServer', err.response?.data || err);
      throw err;
    });
};

class StartStopPostgresFlexibleServerResourceProvider
  implements
    BaseProvider<
      StartStopPostgresFlexibleServerInputs,
      StartStopPostgresFlexibleServerOutputs
    >
{
  constructor(private name: string) {}

  async create(
    inputs: StartStopPostgresFlexibleServerInputs
  ): Promise<pulumi.dynamic.CreateResult> {
    await StartStopPostgresFlexibleServer({ ...inputs, start: false });
    return {
      id: this.name,
      outs: inputs,
    };
  }

  async delete(
    id: string,
    inputs: StartStopPostgresFlexibleServerInputs
  ): Promise<void> {
    await StartStopPostgresFlexibleServer({ ...inputs, start: true }).catch(
      () => undefined
    );
  }
}

export class StartStopPostgresFlexibleServerResource extends BaseResource<
  StartStopPostgresFlexibleServerInputs,
  StartStopPostgresFlexibleServerOutputs
> {
  public readonly name: string;

  constructor(
    name: string,
    args: BaseOptions<StartStopPostgresFlexibleServerInputs>,
    opts?: pulumi.CustomResourceOptions
  ) {
    super(
      new StartStopPostgresFlexibleServerResourceProvider(name),
      `csp:StartStopPostgresFlexibleServers:${name}`,
      args,
      opts
    );
    this.name = name;
  }
}
