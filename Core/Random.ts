import { Output } from '@pulumi/pulumi';
import * as random from '@pulumi/random';

import { getPasswordName, getSshName } from '../Common/Naming';
import { SshKeyResource } from '../CustomProviders/SshKeyGenerator';
import { addCustomSecret } from '../KeyVault/CustomHelper';
import { getSecret } from '../KeyVault/Helper';
import { KeyVaultInfo } from '../types';

interface RandomPassProps {
  name: string;
  policy?: 'monthly' | 'yearly' | false;
  length?: number;
  options?: {
    lower?: boolean;
    upper?: boolean;
    numeric?: boolean;
    special?: boolean;
  };
  vaultInfo?: KeyVaultInfo;
}

/**
 * Genera random password with 50 characters length.
 * @param name the name of password
 * @param autoRolling if true the password will be changed every year.
 */
export const randomPassword = ({
  length = 50,
  name,
  policy = 'yearly',
  options,
  vaultInfo,
}: RandomPassProps) => {
  if (length < 10) length = 10;

  const keepKey =
    policy === 'monthly'
      ? `${new Date().getMonth()}.${new Date().getFullYear()}`
      : policy === 'yearly'
      ? `${new Date().getFullYear()}`
      : '';

  name = getPasswordName(name, null);

  const randomPass = new random.RandomPassword(name, {
    keepers: { keepKey },
    length,
    lower: true,
    minLower: 2,
    upper: true,
    minUpper: 2,
    numeric: true,
    minNumeric: 2,
    special: true,
    minSpecial: 2,
    ...options,
    //Exclude some special characters that are not accepted by XML and SQLServer.
    overrideSpecial: options?.special == false ? '' : '#%&*+-/:<>?^_|~',
  });

  if (vaultInfo) {
    addCustomSecret({
      name: getPasswordName(name, null),
      vaultInfo,
      value: randomPass.result,
      contentType: name,
    });
  }

  return randomPass;
};

export const randomUuId = (name: string) => new random.RandomUuid(name);

const randomString = (name: string, length = 5) =>
  new random.RandomString(name, {
    length,
    numeric: true,
    lower: true,
    upper: true,
    special: false,
  });

interface UserNameProps {
  name: string;
  loginPrefix?: string;
  maxUserNameLength?: number;
}

const randomUserName = ({
  name,
  loginPrefix = 'admin',
  maxUserNameLength = 15,
}: UserNameProps): Output<string> => {
  const rd = randomString(name);
  return rd.result.apply((r) =>
    `${loginPrefix}${name}${r}`.substring(0, maxUserNameLength)
  );
};

interface LoginProps extends UserNameProps {
  passwordOptions?: Omit<RandomPassProps, 'name'>;
  vaultInfo?: KeyVaultInfo;
}

export const randomSsh = ({
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
      vaultName: vaultInfo.name,
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

export const randomLogin = ({
  name,
  loginPrefix,
  maxUserNameLength,
  passwordOptions = { policy: 'yearly' },
  vaultInfo,
}: LoginProps) => {
  const userName = randomUserName({ name, loginPrefix, maxUserNameLength });
  const password = randomPassword({ name, ...passwordOptions }).result;

  const userNameKey = `${name}-user`;
  const passwordKey = `${name}-password`;

  if (vaultInfo) {
    addCustomSecret({
      name: userNameKey,
      value: userName,
      vaultInfo,
      contentType: 'Random Login',
    });

    addCustomSecret({
      name: passwordKey,
      value: password,
      vaultInfo,
      contentType: 'Random Login',
    });
  }

  return { userName, password, vaultKeys: { userNameKey, passwordKey } };
};
