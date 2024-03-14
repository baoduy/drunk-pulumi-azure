import * as pulumi from '@pulumi/pulumi';
import { KeyVaultInfo } from '../types';

import {
  BaseOptions,
  BaseProvider,
  BaseResource,
  DefaultInputs,
  DefaultOutputs,
} from './Base';
import * as console from 'console';
import { getKeyVaultBase } from '../AzBase/KeyVaultBase';

interface VaultSecretInputs extends DefaultInputs {
  name: string;
  value: string;
  vaultInfo: KeyVaultInfo;
  contentType?: string;
  ignoreChange?: boolean;
  tags?: {
    [key: string]: string;
  };
}

interface VaultSecretOutputs extends VaultSecretInputs, DefaultOutputs {}

class VaultSecretResourceProvider
  implements BaseProvider<VaultSecretInputs, VaultSecretOutputs>
{
  constructor(private name: string) {}

  private getClient(vaultInfo: KeyVaultInfo) {
    return getKeyVaultBase(vaultInfo);
  }

  async create(props: VaultSecretInputs): Promise<pulumi.dynamic.CreateResult> {
    const client = this.getClient(props.vaultInfo);
    const ss = await client.setSecret(
      props.name,
      props.value,
      props.contentType,
      props.tags
    );

    return { id: ss.properties.id || this.name, outs: props };
  }

  async update(
    id: string,
    olds: VaultSecretOutputs,
    news: VaultSecretInputs
  ): Promise<pulumi.dynamic.UpdateResult> {
    if (olds.ignoreChange || news.ignoreChange) {
      console.log(`${news.name} will be ignored the update.`);
      return { outs: { id, ...olds, ...news } };
    }

    const rs = await this.create(news);

    //Delete the old Secret
    if (olds.name !== news.name || olds.vaultInfo.name !== news.vaultInfo.name)
      await this.delete(id, olds).catch((e) =>
        console.log(`Cannot delete ${this.name}`, e?.resource?.data)
      );

    return rs;
  }

  async delete(id: string, props: VaultSecretOutputs): Promise<void> {
    const client = this.getClient(props.vaultInfo);
    return client.deleteSecret(props.name);
  }

  async diff(
    id: string,
    previousOutput: VaultSecretOutputs,
    news: VaultSecretInputs
  ): Promise<pulumi.dynamic.DiffResult> {
    return {
      deleteBeforeReplace: false,
      changes:
        previousOutput.name !== news.name ||
        previousOutput.vaultInfo.name !== news.vaultInfo.name ||
        previousOutput.value !== news.value ||
        previousOutput.contentType !== news.contentType,
    };
  }
}

export class VaultSecretResource extends BaseResource<
  VaultSecretInputs,
  VaultSecretOutputs
> {
  public readonly name: string;

  constructor(
    name: string,
    args: BaseOptions<VaultSecretInputs>,
    opts?: pulumi.CustomResourceOptions
  ) {
    super(
      new VaultSecretResourceProvider(name),
      `csp:VaultSecrets:${name}`,
      args,
      opts
    );
    this.name = name;
  }
}
