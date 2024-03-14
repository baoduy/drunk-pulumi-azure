import { KeyVaultInfo } from '../types';
import { getSshName } from '../Common/Naming';
import { SshKeyResource } from '../CustomProviders/SshKeyGenerator';
import { addCustomSecret } from '../KeyVault/CustomHelper';
import { getSecret } from '../KeyVault/Helper';
import { LoginProps, randomPassword, randomUserName } from './Random';
import { PGPProps, PGPResource } from '../CustomProviders/PGPGenerator';

export const generateSsh = ({
  name,
  loginPrefix,
  maxUserNameLength,
  passwordOptions = { policy: false },
  vaultInfo,
}: LoginProps & { vaultInfo: KeyVaultInfo }) => {
  name = getSshName(name);

  const userNameKey = `${name}-user`;
  const passwordKeyName = `${name}-password`;
  const publicKeyName = `${name}-publicKey`;
  const privateKeyName = `${name}-privateKey`;

  const userName = randomUserName({ name, loginPrefix, maxUserNameLength });
  const pass = randomPassword({ name, ...passwordOptions });

  const rs = new SshKeyResource(
    name,
    {
      password: pass.result,
      vaultInfo,
      publicKeyName,
      privateKeyName,
    },
    { dependsOn: pass }
  );

  addCustomSecret({
    name: userNameKey,
    value: userName,
    vaultInfo,
    contentType: 'Random Ssh',
  });

  addCustomSecret({
    name: passwordKeyName,
    value: pass.result,
    vaultInfo,
    contentType: 'Random Ssh',
    dependsOn: rs,
  });

  return {
    userName,
    ssh: rs,
    password: pass.result,
    vaultNames: { passwordKeyName, publicKeyName, privateKeyName },
    lists: {
      getUserName: async () =>
        (await getSecret({ name: userNameKey, vaultInfo }))?.value,
      getPublicKey: async () =>
        (await getSecret({ name: publicKeyName, vaultInfo }))?.value,
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
      getPublicKey: async () =>
        (await getSecret({ name: `${name}-publicKey`, vaultInfo }))?.value,
      getPrivateKey: async () =>
        (await getSecret({ name: `${name}-privateKey`, vaultInfo }))?.value,
      getRevocationCertificate: async () =>
        (await getSecret({ name: `${name}-revocationCertificate`, vaultInfo }))
          ?.value,
    },
  };
};
