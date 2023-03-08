import { getIdentityName, getSecretName } from '../Common/Naming';
import { getSecret } from '../KeyVault/Helper';
import { KeyVaultInfo } from '../types';
import * as azureAD from '@pulumi/azuread';

interface Props {
  name: string;
  includePrincipalSecret?: boolean;
  vaultInfo: KeyVaultInfo;
}

export const getIdentitySecrets = async ({
  name,
  vaultInfo,
  includePrincipalSecret,
}: Props) => {
  name = getIdentityName(name);

  const clientIdKeyName = getSecretName(`${name}-client-id`);
  const clientSecretKeyName = getSecretName(`${name}-client-secret`);
  const principalIdKeyName = getSecretName(`${name}-principal-id`);
  const principalSecretKeyName = getSecretName(`${name}-principal-secret`);

  const [clientId, clientSecret] = await Promise.all([
    getSecret({ name: clientIdKeyName, vaultInfo }),
    getSecret({ name: clientSecretKeyName, vaultInfo }),
  ]);

  const [principalId, principalSecret] = includePrincipalSecret
    ? await Promise.all([
        getSecret({ name: principalIdKeyName, vaultInfo }),
        getSecret({ name: principalSecretKeyName, vaultInfo }),
      ])
    : [undefined, undefined];

  return { clientId, clientSecret, principalId, principalSecret };
};

export const getIdentity = (name: string, isGlobal = false) =>
  azureAD.getApplication({
    displayName: isGlobal ? `global-${name}` : getIdentityName(name),
  });
