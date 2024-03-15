import * as forge from 'node-forge';
import * as pulumi from '@pulumi/pulumi';

import {
  BaseOptions,
  BaseProvider,
  BaseResource,
  DefaultInputs,
  DefaultOutputs,
} from './Base';

import { generateKeyPair, RSAKeyPairOptions } from 'crypto';
import { getSecretName } from '../Common/Naming';
import { getKeyVaultBase } from '../AzBase/KeyVaultBase';
import { KeyVaultInfo } from '../types';

const generateKeys = (options: RSAKeyPairOptions<'pem', 'pem'>) =>
  new Promise<{ publicKey: string; privateKey: string }>((resolve, reject) => {
    generateKeyPair(
      'rsa',
      options,
      (err: Error | null, pK: string, prK: string) => {
        if (err) reject(err);

        const publicKey = forge.ssh.publicKeyToOpenSSH(
          forge.pki.publicKeyFromPem(pK)
        );
        const privateKey = forge.ssh.privateKeyToOpenSSH(
          forge.pki.decryptRsaPrivateKey(
            prK,
            options.privateKeyEncoding.passphrase
          )
        );

        resolve({ publicKey, privateKey });
      }
    );
  });

interface SshKeyInputs extends DefaultInputs {
  password: string;
  vaultInfo: KeyVaultInfo;
  publicKeyName: string;
  privateKeyName: string;
}

interface SshKeyOutputs extends SshKeyInputs, DefaultOutputs {
  privateKey: string;
  publicKey: string;
}

class SshKeyResourceProvider
  implements BaseProvider<SshKeyInputs, SshKeyOutputs>
{
  constructor(private name: string) {}

  async diff(
    id: string,
    previousOutput: SshKeyOutputs,
    news: SshKeyInputs
  ): Promise<pulumi.dynamic.DiffResult> {
    return {
      deleteBeforeReplace: false,
      changes:
        previousOutput.password !== news.password ||
        previousOutput.publicKeyName !== news.publicKeyName ||
        previousOutput.privateKeyName !== news.privateKeyName,
    };
  }

  async create(inputs: SshKeyInputs): Promise<pulumi.dynamic.CreateResult> {
    const { publicKey, privateKey } = await generateKeys({
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
        cipher: 'aes-256-cbc',
        passphrase: inputs.password,
      },
    });

    //Create Key Vault items
    const client = getKeyVaultBase(inputs.vaultInfo.name);

    await client.setSecret(
      getSecretName(inputs.publicKeyName),
      publicKey,
      this.name
    );

    await client.setSecret(
      getSecretName(inputs.privateKeyName),
      privateKey,
      this.name
    );

    return {
      id: this.name,
      outs: inputs,
    };
  }

  async update(
    id: string,
    olds: SshKeyOutputs,
    news: SshKeyInputs
  ): Promise<pulumi.dynamic.UpdateResult> {
    return await this.create(news);
  }

  // No need to be deleted the keys will be upsert when creating a new one.
  // async delete(id: string, props: SshKeyOutputs) {
  //   const client = createKeyVaultClient(props.vaultName);
  //   await client.beginDeleteSecret(getSecretName(props.publicKeyName)).catch();
  //   await client.beginDeleteSecret(getSecretName(props.privateKeyName)).catch();
  // }
}

export class SshKeyResource extends BaseResource<SshKeyInputs, SshKeyOutputs> {
  public readonly name: string;
  public readonly publicKey!: pulumi.Output<string>;
  public readonly privateKey!: pulumi.Output<string>;

  constructor(
    name: string,
    args: BaseOptions<SshKeyInputs>,
    opts?: pulumi.CustomResourceOptions
  ) {
    super(new SshKeyResourceProvider(name), `csp:SshKeys:${name}`, args, opts);
    this.name = name;
  }
}
