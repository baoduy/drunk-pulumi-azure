import { KeyVaultInfo } from '../types';
import { getSshName } from '../Common';
import { SshKeyResource } from '@drunk-pulumi/azure-providers/SshKeyGenerator';
import { addCustomSecret } from '../KeyVault/CustomHelper';
import { getSecret } from '../KeyVault/Helper';
import { LoginProps, randomPassword, randomUserName } from './Random';
import {
  PGPProps,
  PGPResource,
} from '@drunk-pulumi/azure-providers/PGPGenerator';
import { Output, output } from '@pulumi/pulumi';

export type SshResults = {
  userName: Output<string>;
  lists: {
    getPublicKey: () => Output<string>;
    getPrivateKey: () => Output<string>;
    getPassword: () => Output<string>;
  };
};

export type SshGenerationProps = Omit<LoginProps, 'passwordOptions'> & {
  vaultInfo: KeyVaultInfo;
};

export const generateSsh = ({
  name,
  loginPrefix,
  maxUserNameLength,
  vaultInfo,
}: SshGenerationProps): SshResults => {
  name = getSshName(name);

  const userNameKey = `${name}-user`;
  const passwordKeyName = `${name}-password`;
  const publicKeyName = `${name}-publicKey`;
  const privateKeyName = `${name}-privateKey`;

  const userName = randomUserName({ name, loginPrefix, maxUserNameLength });
  const pass = randomPassword({ name, policy: false });

  const rs = new SshKeyResource(
    name,
    {
      password: pass.result,
      vaultInfo,
      //publicKeyName,
      //privateKeyName,
    },
    { dependsOn: pass },
  );

  addCustomSecret({
    name: userNameKey,
    value: userName,
    formattedName: true,
    vaultInfo,
    contentType: 'Random Ssh',
    dependsOn: rs,
  });

  addCustomSecret({
    name: passwordKeyName,
    value: pass.result,
    formattedName: true,
    vaultInfo,
    contentType: 'Random Ssh',
    dependsOn: rs,
  });

  return {
    userName,
    lists: {
      getPublicKey: (): Output<string> =>
        output(
          getSecret({ name: publicKeyName, nameFormatted: true, vaultInfo })!,
        ).apply((i) => i!.value!),
      getPrivateKey: (): Output<string> =>
        output(
          getSecret({ name: privateKeyName, nameFormatted: true, vaultInfo })!,
        ).apply((i) => i!.value!),
      getPassword: (): Output<string> =>
        output(
          getSecret({ name: passwordKeyName, nameFormatted: true, vaultInfo })!,
        ).apply((i) => i!.value!),
    },
  };
};

export const generatePGP = ({
  name,
  options,
  vaultInfo,
}: {
  name: string;
  vaultInfo: KeyVaultInfo;
  options: PGPProps;
}) => {
  const rs = new PGPResource(name, {
    pgp: options,
    vaultInfo,
  });

  return {
    name,
    pgp: rs,
    lists: {
      getPublicKey: () =>
        output(getSecret({ name: `${name}-publicKey`, vaultInfo })).apply(
          (i) => i!.value!,
        ),
      getPrivateKey: () =>
        output(getSecret({ name: `${name}-privateKey`, vaultInfo })).apply(
          (i) => i!.value!,
        ),
      getRevocationCertificate: () =>
        output(
          getSecret({ name: `${name}-revocationCertificate`, vaultInfo }),
        ).apply((i) => i!.value!),
    },
  };
};
