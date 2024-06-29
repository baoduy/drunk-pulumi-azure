import { PoliciesProps, SetHeaderTypes } from '../ApiProduct/PolicyBuilder';
import { ApimInfo, KeyVaultInfo } from '../../types';
import { createProduct } from '../ApiProduct/Product';
import { createApi } from '../ApiProduct/Api';

interface Props {
  name?: string;
  apimInfo: ApimInfo;
  subscriptionRequired?: boolean;
  vaultInfo?: KeyVaultInfo;
  policies?: PoliciesProps;
  domain: string;
  authHeaderKey: string;
  hookHeaderKey: string;
}

export default async ({
  name = 'hook-proxy',
  subscriptionRequired = true,
  domain,
  hookHeaderKey,
  authHeaderKey,
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
    serviceUrl: `https://${domain}`,
    operations: [{ name: 'Post', method: 'POST', urlTemplate: '/' }],
  });

  return { product, api };
};
