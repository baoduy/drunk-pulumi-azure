import * as native from '@pulumi/azure-native';
import { BasicResourceArgs } from '../types';
import { getWebAppName } from '../Common/Naming';
import Locker from '../Core/Locker';
import * as pulumi from '@pulumi/pulumi';
import { SiteConfigArgs } from './types';
import { defaultTags } from '../Common/AzureEnv';

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
  const finalName = getWebAppName(name);

  const app = new native.web.WebApp(finalName, {
    kind,
    ...group,

    serverFarmId: appServicePlanId,
    enabled,
    httpsOnly: true,

    siteConfig,
    tags: defaultTags,
  });

  if (lock) {
    Locker({ name, resourceId: app.id, dependsOn: app });
  }
  return app;
};
