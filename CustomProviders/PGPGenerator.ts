import * as pulumi from '@pulumi/pulumi';
import { generateKey, SerializedKeyPair } from 'openpgp';

import {
  BaseOptions,
  BaseProvider,
  BaseResource,
  DefaultInputs,
  DefaultOutputs,
} from './Base';

import { getSecretName } from '../Common/Naming';
import { createKeyVaultClient } from './Helper';

export interface PGPProps {
  user: { name: string; email: string };
  passphrase?: string;
  type?: 'ecc' | 'rsa';
  validDays?: number;
}

const generatePGP = ({ user, passphrase, type, validDays }: PGPProps) => {
  const now = new Date();
  const expireDate = new Date();
  if (validDays) expireDate.setDate(expireDate.getDate() + validDays);

  return generateKey({
    curve: 'ed25519',
    format: 'armored',
    type: type ?? 'rsa',
    date: now,
    keyExpirationTime: validDays ? expireDate.getTime() : undefined,
    passphrase,
    userIDs: [user],
  });
};

interface PGPInputs extends DefaultInputs {
  pgp: PGPProps;
  vaultName: string;
}

interface PGPOutputs
  extends PGPInputs,
    DefaultOutputs,
    SerializedKeyPair<string> {
  revocationCertificate: string;
}

class PGPResourceProvider implements BaseProvider<PGPInputs, PGPOutputs> {
  constructor(private name: string) {}

  async diff(
    id: string,
    previousOutput: PGPOutputs,
    news: PGPInputs
  ): Promise<pulumi.dynamic.DiffResult> {
    return {
      deleteBeforeReplace: false,
      changes:
        previousOutput.pgp.passphrase !== news.pgp.passphrase ||
        previousOutput.pgp.validDays !== news.pgp.validDays ||
        previousOutput.vaultName !== news.vaultName ||
        previousOutput.pgp.type !== news.pgp.type,
    };
  }

  async create(inputs: PGPInputs): Promise<pulumi.dynamic.CreateResult> {
    const { publicKey, privateKey, revocationCertificate } = await generatePGP(
      inputs.pgp
    );

    //Create Key Vault items
    const client = createKeyVaultClient(inputs.vaultName);

    await client.setSecret(getSecretName(`${this.name}-publicKey`), publicKey, {
      enabled: true,
      contentType: this.name,
    });

    await client.setSecret(
      getSecretName(`${this.name}-privateKey`),
      privateKey,
      {
        enabled: true,
        contentType: this.name,
      }
    );

    await client.setSecret(
      getSecretName(`${this.name}-revocationCertificate`),
      revocationCertificate,
      {
        enabled: true,
        contentType: this.name,
      }
    );

    return {
      id: this.name,
      outs: inputs,
    };
  }

  // No need to be deleted the keys will be upsert when creating a new one.
  // async delete(id: string, props: PGPOutputs) {
  //   const client = createKeyVaultClient(props.vaultName);
  //   await client.beginDeleteSecret(getSecretName(props.publicKeyName)).catch();
  //   await client.beginDeleteSecret(getSecretName(props.privateKeyName)).catch();
  // }

  // async update(
  //   id: string,
  //   olds: PGPOutputs,
  //   news: PGPInputs
  // ): Promise<pulumi.dynamic.UpdateResult> {
  //   const rs = await this.create(news);
  //   //Delete Ols key
  //
  //   const url = `https://${olds.vaultName}.vault.azure.net?api-version=7.0`;
  //   const client = new SecretClient(url, new ClientCredential());
  //
  //   if (
  //     olds.vaultName !== news.vaultName ||
  //     olds.publicKeyName !== news.publicKeyName
  //   ) {
  //     await client
  //       .beginDeleteSecret(getSecretName(olds.publicKeyName))
  //       .catch((e) => {
  //         //ignore if any error
  //       });
  //   }
  //
  //   if (
  //     olds.vaultName !== news.vaultName ||
  //     olds.privateKeyName !== news.privateKeyName
  //   ) {
  //     await client.beginDeleteSecret(getSecretName(olds.privateKeyName));
  //   }
  //
  //   return rs;
  // }
}

export class PGPResource extends BaseResource<PGPInputs, PGPOutputs> {
  public readonly name: string;
  public readonly publicKey!: pulumi.Output<string>;
  public readonly privateKey!: pulumi.Output<string>;

  constructor(
    name: string,
    args: BaseOptions<PGPInputs>,
    opts?: pulumi.CustomResourceOptions
  ) {
    super(new PGPResourceProvider(name), `csp:PGPs:${name}`, args, opts);
    this.name = name;
  }
}
