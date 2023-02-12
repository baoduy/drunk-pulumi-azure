import { Output } from '@pulumi/pulumi';
import * as random from '@pulumi/random';

import { getPasswordName, getSshName } from '../Common/Naming';
import { SshKeyResource } from '../CustomProviders/SshKeyGenerator';
import { addCustomSecret } from '../KeyVault/CustomHelper';
import { getSecret } from '../KeyVault/Helper';
import { addLegacySecret } from '../KeyVault/LegacyHelper';
import { KeyVaultInfo } from '../types';

interface Props {
  name: string;
  policy?: "monthly" | "yearly" | false;
  length?: number;
  options?: {
    lower?: boolean;
    upper?: boolean;
    number?: boolean;
    special?: boolean;
  };
}

/**
 * Genera random password with 50 characters length.
 * @param name the name of password
 * @param autoRolling if true the password will be changed every year.
 */
export const randomPassword = ({
  length = 50,
  name,
  policy = "yearly",
  options,
}: Props) => {
  if(length<10)length = 10;
  
  const keepKey =
    policy === "monthly"
      ? `${new Date().getMonth()}.${new Date().getFullYear()}`
      : policy === "yearly"
      ? `${new Date().getFullYear()}`
      : "";

  name = getPasswordName(name, null);

  return new random.RandomPassword(name, {
    keepers: { keepKey },
    length,
    lower: true,
    minLower: 2,
    upper: true,
    minUpper: 2,
    number: true,
    minNumeric: 2,
    special: true,
    minSpecial: 2,
    ...options,
    //Exclude some special characters that are not accepted by XML and SQLServer.
    overrideSpecial: "#%&*+-/:<>?^_|~",
  });
};

export const randomUuId = (name: string) => new random.RandomUuid(name);

const randomString = (name: string, length = 5) =>
  new random.RandomString(name, {
    length,
    number: true,
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
  loginPrefix = "admin",
  maxUserNameLength = 15,
}: UserNameProps): Output<string> => {
  const rd = randomString(name);
  return rd.result.apply((r) =>
    `${loginPrefix}${name}${r}`.substring(0, maxUserNameLength)
  );
};

interface LoginProps extends UserNameProps {
  passwordPolicy?: "monthly" | "yearly" | false;
  vaultInfo?: KeyVaultInfo;
}

export const randomSsh = ({
  name,
  loginPrefix,
  maxUserNameLength,
  passwordPolicy = false,
  vaultInfo,
}: LoginProps & { vaultInfo: KeyVaultInfo }) => {
  name = getSshName(name);

  const userNameKey = `${name}-user`;
  const passwordKeyName = `${name}-password`;
  const publicKeyName = `${name}-publicKey`;
  const privateKeyName = `${name}-privateKey`;

  const userName = randomUserName({ name, loginPrefix, maxUserNameLength });
  const pass = randomPassword({ name, policy: passwordPolicy });

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
    contentType: "Random Ssh",
  });

  addCustomSecret({
    name: passwordKeyName,
    value: pass.result,
    vaultInfo,
    contentType: "Random Ssh",
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

export const randomLogin = async ({
  name,
  loginPrefix,
  maxUserNameLength,
  passwordPolicy = "yearly",
  vaultInfo,
}: LoginProps) => {
  const userName = randomUserName({ name, loginPrefix, maxUserNameLength });
  const password = randomPassword({ name, policy: passwordPolicy }).result;

  const userNameKey = `${name}-user`;
  const passwordKey = `${name}-password`;

  if (vaultInfo) {
    await addLegacySecret({
      name: userNameKey,
      value: userName,
      vaultInfo,
      contentType: "Random Login",
    });

    await addLegacySecret({
      name: passwordKey,
      value: password,
      vaultInfo,
      contentType: "Random Login",
    });
  }

  return { userName, password, vaultKeys: { userNameKey, passwordKey } };
};
