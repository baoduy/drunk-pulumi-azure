import { naming } from '../Common';
import { getSecret } from '../KeyVault/Helper';
import { IdentityInfo, KeyVaultInfo, WithNamedType } from '../types';
import { output } from '@pulumi/pulumi';

interface Props extends WithNamedType {
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
  objectIdName: `${name}-object-id`,
  clientIdKeyName: `${name}-client-id`,
  clientSecretKeyName: `${name}-client-secret`,
  principalIdKeyName: `${name}-principal-id`,
  principalSecretKeyName: `${name}-principal-secret`,
});

export const getIdentityInfo = async ({
  name,
  vaultInfo,
  includePrincipal,
}: Props): Promise<IdentityInfoResults> => {
  name = naming.getIdentityName(name);
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

export const getUserAssignedIdentityInfo = (
  name: string,
  vaultInfo: KeyVaultInfo,
): IdentityInfo => {
  name = naming.getUIDName(name);

  const id = output(
    getSecret({
      name: `${name}-id`,
      vaultInfo,
    }),
  );
  const clientId = output(
    getSecret({
      name: `${name}-clientId`,
      vaultInfo,
    }),
  );
  const principalId = output(
    getSecret({
      name: `${name}-principalId`,
      vaultInfo,
    }),
  );

  return {
    id: id?.apply((i) => i?.value!),
    clientId: clientId?.apply((i) => i?.value!),
    principalId: principalId?.apply((i) => i?.value!),
  };
};
