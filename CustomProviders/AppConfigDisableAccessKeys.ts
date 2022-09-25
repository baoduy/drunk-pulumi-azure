import * as pulumi from '@pulumi/pulumi';
import { AxiosInstance } from 'axios';
import {createAxios} from '../Tools/Axios';

import {
  BaseOptions,
  BaseProvider,
  BaseResource,
  DefaultInputs,
  DefaultOutputs,
} from './Base';

interface AppConfigDisableAccessKeysInputs extends DefaultInputs {
  resourceGroupName: string;
  configStoreName: string;
}

interface AppConfigDisableAccessKeysOutputs
  extends AppConfigDisableAccessKeysInputs,
    DefaultOutputs {}

class AppConfigDisableAccessKeysResourceProvider
  implements
    BaseProvider<
      AppConfigDisableAccessKeysInputs,
      AppConfigDisableAccessKeysOutputs
    >
{
  constructor(private name: string) {}

  async diff(
    id: string,
    previousOutput: AppConfigDisableAccessKeysOutputs,
    news: AppConfigDisableAccessKeysInputs
  ): Promise<pulumi.dynamic.DiffResult> {
    return {
      deleteBeforeReplace: true,
      replaces: [],
      changes:
        previousOutput.resourceGroupName !== news.resourceGroupName ||
        previousOutput.configStoreName !== news.configStoreName,
    };
  }

  private async updateKeys(
    { resourceGroupName, configStoreName }: AppConfigDisableAccessKeysInputs,
    disableLocalAuth: boolean
  ) {
    //TODO: Workaround for this issue https://github.com/pulumi/pulumi/issues/5294
    const axios = createAxios();
    const url = `/resourceGroups/${resourceGroupName}/providers/Microsoft.AppConfiguration/configurationStores/${configStoreName}?api-version=2021-03-01-preview`;
    return await axios
      .patch(url, {
        properties: {
          disableLocalAuth,
        },
      })
      .then((rs) => rs.data);
  }

  async create(
    props: AppConfigDisableAccessKeysInputs
  ): Promise<pulumi.dynamic.CreateResult> {
    const rs = await this.updateKeys(props, true);

    return {
      id: rs.id || this.name,
      outs: { ...rs, ...props },
    };
  }

  async delete(
    id: string,
    props: AppConfigDisableAccessKeysOutputs
  ): Promise<void> {
    return await this.updateKeys(props, false);
  }
}

export class AppConfigDisableAccessKeysResource extends BaseResource<
  AppConfigDisableAccessKeysInputs,
  AppConfigDisableAccessKeysOutputs
> {
  public readonly name: string;

  constructor(
    name: string,
    args: BaseOptions<AppConfigDisableAccessKeysInputs>,
    opts?: pulumi.CustomResourceOptions
  ) {
    super(
      new AppConfigDisableAccessKeysResourceProvider(name),
      `csp:AppConfigDisableAccessKeys:${name}`,
      args,
      opts
    );
    this.name = name;
  }
}
