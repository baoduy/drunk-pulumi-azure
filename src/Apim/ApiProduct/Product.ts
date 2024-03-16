import { ApimInfo, KeyVaultInfo } from '../../types';
import * as apim from '@pulumi/azure-native/apimanagement';
import { getResourceName } from '../../Common/ResourceEnv';
import { interpolate } from '@pulumi/pulumi';
import { randomPassword } from '../../Core/Random';
import { getPasswordName } from '../../Common/Naming';
import { addCustomSecret } from '../../KeyVault/CustomHelper';

const getProductName = (name: string) =>
  getResourceName(name, { prefix: '', suffix: 'prod', includeOrgName: false });
const getSubscriptionName = (name: string) =>
  getResourceName(name, {
    prefix: 'apim',
    suffix: 'sub',
    includeOrgName: false,
  });

export interface ProductProps {
  name: string;
  apimInfo: ApimInfo;
  subscriptionRequired?: boolean;
  vaultInfo?: KeyVaultInfo;
}

export const createProduct = async ({
  name,
  apimInfo,
  subscriptionRequired,
  vaultInfo,
}: ProductProps) => {
  const pName = getProductName(name);
  const product = new apim.Product(pName, {
    productId: pName,
    displayName: pName,
    description: pName,
    serviceName: apimInfo.serviceName,
    resourceGroupName: apimInfo.group.resourceGroupName,

    subscriptionRequired,
    approvalRequired: subscriptionRequired ? false : undefined,
    subscriptionsLimit: subscriptionRequired ? 5 : undefined,
  });

  if (subscriptionRequired && vaultInfo) {
    const subName = getSubscriptionName(name);
    const primaryKey = getPasswordName(subName, 'primary');
    const secondaryKey = getPasswordName(subName, 'secondary');

    const primaryPass = randomPassword({ name: primaryKey }).result;
    const secondaryPass = randomPassword({ name: secondaryKey }).result;

    new apim.Subscription(
      subName,
      {
        sid: subName,
        displayName: subName,
        serviceName: apimInfo.serviceName,
        resourceGroupName: apimInfo.group.resourceGroupName,
        scope: interpolate`/products/${product.id}`,
        primaryKey: primaryPass,
        secondaryKey: secondaryPass,
      },
      { dependsOn: product }
    );

    addCustomSecret({
      name: primaryKey,
      formattedName: true,
      value: primaryPass,
      contentType: subName,
      vaultInfo,
      tags: { name, subName },
    });

    addCustomSecret({
      name: secondaryKey,
      formattedName: true,
      value: secondaryPass,
      contentType: subName,
      vaultInfo,
      tags: { name, subName },
    });
  }

  return product;
};
