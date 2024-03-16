/* eslint-disable  @typescript-eslint/no-unsafe-return */

import * as pulumi from '@pulumi/pulumi';
import { createAxios } from '../Tools/Axios';

import {
  BaseOptions,
  BaseProvider,
  BaseResource,
  DefaultInputs,
  DefaultOutputs,
} from './Base';

interface ApimSignInSettingsInputs extends DefaultInputs {
  resourceGroupName: string;
  serviceName: string;
  enabled: boolean;
}

interface ApimSignInSettingsOutputs
  extends ApimSignInSettingsInputs,
    DefaultOutputs {}

class ApimSignInSettingsResourceProvider
  implements BaseProvider<ApimSignInSettingsInputs, ApimSignInSettingsOutputs>
{
  constructor(private name: string) {}

  // eslint-disable-next-line @typescript-eslint/require-await
  async diff(
    id: string,
    previousOutput: ApimSignInSettingsOutputs,
    news: ApimSignInSettingsInputs
  ): Promise<pulumi.dynamic.DiffResult> {
    return {
      deleteBeforeReplace:
        previousOutput.resourceGroupName !== news.resourceGroupName ||
        previousOutput.serviceName !== news.serviceName,
      replaces: [],
      changes:
        previousOutput.enabled !== news.enabled ||
        previousOutput.resourceGroupName !== news.resourceGroupName ||
        previousOutput.serviceName !== news.serviceName,
    };
  }

  async create({
    resourceGroupName,
    serviceName,
    enabled,
  }: ApimSignInSettingsInputs): Promise<pulumi.dynamic.CreateResult> {
    //TODO: Workaround for this issue https://github.com/pulumi/pulumi/issues/5294
    const axios = createAxios();
    const url = `/resourceGroups/${resourceGroupName}/providers/Microsoft.ApiManagement/service/${serviceName}/portalsettings/signin?api-version=2020-06-01-preview`;
    const rs = await axios
      .put(url, {
        properties: {
          enabled,
        },
      })
      .then((rs) => rs.data);

    return {
      id: this.name,
      outs: { ...rs, resourceGroupName, serviceName, enabled },
    };
  }

  async update(
    id: string,
    olds: ApimSignInSettingsOutputs,
    news: ApimSignInSettingsInputs
  ): Promise<pulumi.dynamic.UpdateResult> {
    return this.create(news);
  }
}

export class ApimSignInSettingsResource extends BaseResource<
  ApimSignInSettingsInputs,
  ApimSignInSettingsOutputs
> {
  public readonly name: string;

  constructor(
    name: string,
    args: BaseOptions<ApimSignInSettingsInputs>,
    opts?: pulumi.CustomResourceOptions
  ) {
    super(
      new ApimSignInSettingsResourceProvider(name),
      `csp:ApimSignInSettings:${name}`,
      args,
      opts
    );
    this.name = name;
  }
}
