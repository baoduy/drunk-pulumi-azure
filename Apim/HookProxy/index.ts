import { PoliciesProps, SetHeaderTypes } from '../ApiProduct/PolicyBuilder';
import { ApimInfo, KeyVaultInfo } from '../../types';
import { createProduct } from '../ApiProduct/Product';
import { createApi } from '../ApiProduct/Api';
import { envDomain } from '../../Common/AzureEnv';
import { ApimAuthHeaderKey, ApimHookHeaderKey } from '../../Common/config';

interface Props {
  name?: string;
  apimInfo: ApimInfo;
  subscriptionRequired?: boolean;
  vaultInfo?: KeyVaultInfo;
  policies?: PoliciesProps;
  authHeaderKey?: string;
  hookHeaderKey?: string;
}

export default async ({
  name = 'hook-proxy',
  subscriptionRequired = true,
  hookHeaderKey = ApimHookHeaderKey,
  authHeaderKey = ApimAuthHeaderKey,
  policies,
  ...props
}: Props) => {
  const product = await createProduct({ name, ...props, subscriptionRequired });

  const api = await createApi({
    name,
    ...props,
    enableApiSet: false,
    product,
    authHeaderKey,
    policies: {
      ...policies,
      setHeaders: [{ name: authHeaderKey, type: SetHeaderTypes.delete }],
      checkHeaders: {
        checkHeaders: [{ name: hookHeaderKey }],
      },
    },
    //Dummy Url as it will be set from request header key `hookHeaderKey`
    serviceUrl: `https://${envDomain}`,
    operations: [{ name: 'Post', method: 'POST', urlTemplate: '/' }],
  });

  return { product, api };
};
