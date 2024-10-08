import { KeyVaultInfo, NamedWithVaultType } from '../types';
import { naming } from '../Common';
import { SshKeyResource } from '@drunk-pulumi/azure-providers/SshKeyGenerator';
import { addCustomSecrets } from '../KeyVault';
import { LoginProps, randomPassword, randomUserName } from './Random';
import {
  PGPProps,
  PGPResource,
} from '@drunk-pulumi/azure-providers/PGPGenerator';
import { Output, output } from '@pulumi/pulumi';

export type SshResults = {
  userName: Output<string>;
  publicKey: Output<string>;
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
  name = naming.getSshName(name);

  const userNameKey = `${name}-user`;
  const passwordKeyName = `${name}-password`;
  const publicKeyName = `${name}-publicKey`;
  const privateKeyName = `${name}-privateKey`;

  const userName = randomUserName({ name, loginPrefix, maxUserNameLength });
  const pass = randomPassword({ name, policy: false });

  const rs = new SshKeyResource(
    name,
    { password: pass.result },
    { dependsOn: pass },
  );

  //Add secrets to vault
  addCustomSecrets({
    vaultInfo,
    contentType: 'Random Ssh',
    dependsOn: rs,
    items: [
      { name: userNameKey, value: userName },
      { name: passwordKeyName, value: pass.result },
      { name: publicKeyName, value: rs.publicKey },
      { name: privateKeyName, value: rs.privateKey },
    ],
  });

  return {
    userName,
    publicKey: rs.publicKey,
  };
};

export const generatePGP = ({
  name,
  options,
  vaultInfo,
}: Required<NamedWithVaultType> & {
  options: PGPProps;
}) => {
  const revocationCertificateKeyName = `${name}-revocationCertificate`;
  const publicKeyName = `${name}-publicKey`;
  const privateKeyName = `${name}-privateKey`;

  const rs = new PGPResource(name, options);

  //Add secrets to vault
  addCustomSecrets({
    vaultInfo,
    contentType: 'PGP Keys',
    dependsOn: rs,
    items: [
      { name: publicKeyName, value: rs.publicKey },
      { name: privateKeyName, value: rs.privateKey },
      { name: revocationCertificateKeyName, value: rs.revocationCertificate },
    ],
  });

  return rs;
};
