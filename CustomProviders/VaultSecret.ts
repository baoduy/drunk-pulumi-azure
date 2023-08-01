import { SecretClient } from '@azure/keyvault-secrets';
import * as pulumi from '@pulumi/pulumi';
import { KeyVaultInfo } from '../types';

import {
  BaseOptions,
  BaseProvider,
  BaseResource,
  ClientCredential,
  DefaultInputs,
  DefaultOutputs,
} from './Base';
import * as console from 'console';

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
  private _client: SecretClient | undefined = undefined;

  getClient(vaultName: string) {
    if (this._client) return this._client;

    const url = `https://${vaultName}.vault.azure.net?api-version=7.0`;
    this._client = new SecretClient(url, new ClientCredential());
    return this._client;
  }

  async tryGetDeletedSecret(props: VaultSecretInputs) {
    const client = this.getClient(props.vaultInfo.name);
    return await client.getDeletedSecret(props.name).catch(() => undefined);
  }

  async tryRecoverSecret(props: VaultSecretInputs): Promise<void> {
    const client = this.getClient(props.vaultInfo.name);
    const deleted = await this.tryGetDeletedSecret(props);
    //Recover deleted items
    if (deleted)
      await (
        await client.beginRecoverDeletedSecret(deleted.name)
      ).pollUntilDone();
  }

  async create(props: VaultSecretInputs): Promise<pulumi.dynamic.CreateResult> {
    await this.tryRecoverSecret(props);

    const client = this.getClient(props.vaultInfo.name);
    const ss = await client.setSecret(props.name, props.value, {
      enabled: true,
      contentType: props.contentType,
      tags: props.tags,
    });

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
    try {
      const client = this.getClient(props.vaultInfo.name);
      await client.beginDeleteSecret(props.name);
    } catch {
      //Ignore
    }
  }

  async diff(
    id: string,
    previousOutput: VaultSecretOutputs,
    news: VaultSecretInputs
  ): Promise<pulumi.dynamic.DiffResult> {
    //check if secret is deleted then commit changes to recover it.
    const deleted = await this.tryGetDeletedSecret(news);

    return {
      deleteBeforeReplace: false,
      changes:
        deleted != undefined ||
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
