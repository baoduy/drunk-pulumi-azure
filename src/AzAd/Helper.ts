import { getIdentityName, getSecretName } from "../Common/Naming";
import { getSecret } from "../KeyVault/Helper";
import { KeyVaultInfo } from "../types";
import { output } from "@pulumi/pulumi";

interface Props {
  name: string;
  includePrincipal?: boolean;
  vaultInfo: KeyVaultInfo;
}

export type IdentityInfoResults = {
  objectId: string;
  clientId: string;
  clientSecret?: string;
  principalObjectId?: string;
  principalId?: string;
  principalSecret?: string;
};

export const getIdentitySecretNames = (name: string) => ({
  objectIdName: getSecretName(`${name}-object-id`),
  clientIdKeyName: getSecretName(`${name}-client-id`),
  clientSecretKeyName: getSecretName(`${name}-client-secret`),
  principalIdKeyName: getSecretName(`${name}-principal-id`),
  principalSecretKeyName: getSecretName(`${name}-principal-secret`),
});

export const getIdentityInfo = async ({
  name,
  vaultInfo,
  includePrincipal,
}: Props): Promise<IdentityInfoResults> => {
  name = getIdentityName(name);
  const secretNames = getIdentitySecretNames(name);

  const [objectId, clientId, clientSecret] = await Promise.all([
    getSecret({ name: secretNames.objectIdName, vaultInfo }),
    getSecret({ name: secretNames.clientIdKeyName, vaultInfo }),
    getSecret({ name: secretNames.clientSecretKeyName, vaultInfo }),
  ]);

  const [principalId, principalSecret] = includePrincipal
    ? await Promise.all([
        getSecret({ name: secretNames.principalIdKeyName, vaultInfo }),
        getSecret({ name: secretNames.principalSecretKeyName, vaultInfo }),
      ])
    : [undefined, undefined];

  return {
    objectId: objectId!.value!,
    clientId: clientId!.value!,
    clientSecret: clientSecret?.value,
    principalId: principalId?.value,
    principalSecret: principalSecret?.value,
  };
};

export const getIdentityInfoOutput = (props: Props) =>
  output<IdentityInfoResults>(getIdentityInfo(props));
