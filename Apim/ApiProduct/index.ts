import { createProduct, ProductProps } from './Product';
import { ApiProps, createApi } from './Api';

interface Props extends ProductProps, Omit<ApiProps, 'product'> {}

export default async ({
  name,
  apimInfo,
  subscriptionRequired,
  vaultInfo,
  ...others
}: Props) => {
  const product = await createProduct({
    name,
    apimInfo,
    vaultInfo,
    subscriptionRequired,
  });

  product.name.apply(console.log);

  const api = createApi({
    name,
    apimInfo,
    product,
    subscriptionRequired,
    ...others,
  });

  return { product, ...api };
};
