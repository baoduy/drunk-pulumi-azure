import * as native from '@pulumi/azure-native';
import { BasicResourceArgs } from '../types';
import { getAppPlanName } from '../Common/Naming';
import Locker from '../Core/Locker';

interface Props extends BasicResourceArgs {
  kind: 'Linux';
  lock?: boolean;
}

export default ({ name, group, kind, lock }: Props) => {
  const finalName = getAppPlanName(name);

  const appServicePlan = new native.web.AppServicePlan(finalName, {
    name: finalName,
    ...group,

    // Run on Linux
    kind,

    // Consumption plan SKU
    sku: {
      tier: 'Dynamic',
      name: 'Y1',
    },

    // For Linux, you need to change the plan to have Reserved = true property.
    reserved: kind === 'Linux',
  });

  if (lock) {
    Locker({ name, resourceId: appServicePlan.id, dependsOn: appServicePlan });
  }
  return appServicePlan;
};
