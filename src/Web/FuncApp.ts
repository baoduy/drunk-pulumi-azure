import * as native from '@pulumi/azure-native';
import { BasicResourceArgs } from '../types';
import { getFuncAppName } from '../Common/Naming';
import Locker from '../Core/Locker';
import * as pulumi from '@pulumi/pulumi';
import { SiteConfigArgs } from './types';

interface Props extends BasicResourceArgs {
  kind: 'FunctionApp' | 'WebApp';
  appServicePlanId: pulumi.Output<string>;
  siteConfig?: SiteConfigArgs;
  enabled?: boolean;
  lock?: boolean;
}

export default ({
  name,
  group,
  kind,
  appServicePlanId,
  siteConfig,
  enabled,
  lock,
}: Props) => {
  const finalName = getFuncAppName(name);

  const app = new native.web.WebApp(
    finalName,
    {
      kind,
      name: finalName,
      ...group,

      serverFarmId: appServicePlanId,
      enabled,
      httpsOnly: true,

      siteConfig,
    },
    { deleteBeforeReplace: true }
  );

  if (lock) {
    Locker({ name, resourceId: app.id, dependsOn: app });
  }
  return app;
};
