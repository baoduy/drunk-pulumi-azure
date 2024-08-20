import { Output } from '@pulumi/pulumi';
import * as random from '@pulumi/random';
import { getResourceName } from '../Common';
import { addCustomSecret, addCustomSecrets } from '../KeyVault/CustomHelper';
import { KeyVaultInfo, WithNamedType, NamedWithVaultType } from '../types';

export const getPasswordName = (
  name: string,
  type: 'primary' | 'secondary' | null,
) =>
  type === null
    ? getResourceName(name, { suffix: 'pwd' })
    : `${name}-pwd-${type}`;

interface RandomPassProps extends NamedWithVaultType {
  policy?: 'monthly' | 'yearly' | boolean;
  length?: number;
  options?: {
    lower?: boolean;
    upper?: boolean;
    numeric?: boolean;
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
    minSpecial: options?.special ? 2 : 0,
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
      dependsOn: randomPass,
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

interface UserNameProps extends WithNamedType {
  loginPrefix?: string;
  maxUserNameLength?: number;
}

export const randomUserName = ({
  name,
  loginPrefix = 'admin',
  maxUserNameLength = 15,
}: UserNameProps): Output<string> => {
  const rd = randomString(name);
  return rd.result.apply((r) =>
    `${loginPrefix}${name}${r}`.substring(0, maxUserNameLength),
  );
};

export interface LoginProps extends UserNameProps {
  passwordOptions?: Omit<RandomPassProps, 'name' | 'vaultInfo'>;
  vaultInfo?: KeyVaultInfo;
}

export const randomLogin = ({
  name,
  loginPrefix,
  maxUserNameLength,
  passwordOptions = { policy: 'yearly' },
  vaultInfo,
}: LoginProps) => {
  const userName = randomUserName({ name, loginPrefix, maxUserNameLength });
  const password = randomPassword({
    name,
    ...passwordOptions,
    vaultInfo,
  }).result;

  const userNameKey = `${name}-user`;
  const passwordKey = `${name}-password`;

  if (vaultInfo) {
    addCustomSecrets({
      vaultInfo,
      contentType: 'Random Login',
      items: [
        { name: userNameKey, value: userName },
        { name: passwordKey, value: password },
      ],
    });
  }

  return { userName, password, vaultKeys: { userNameKey, passwordKey } };
};
