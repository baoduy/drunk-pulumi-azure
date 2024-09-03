import * as azure from '@pulumi/azure-native';
import {
  AzAppBuilderArgs,
  AzAppBuilderKinds,
  AzFuncAppBuilderType,
  Builder,
  IAzAppBuilder,
  IAzAppPlanBuilder,
} from './types';
import { ResourceInfo } from '../types';
import { isPrd, naming } from '../Common';

class AzAppBuilder
  extends Builder<ResourceInfo>
  implements IAzAppBuilder, IAzAppPlanBuilder
{
  private readonly _instanceName: string;
  private _appPlanInstance: azure.web.AppServicePlan | undefined = undefined;

  private _planSku: AzAppBuilderKinds | undefined = undefined;
  private _funcs: AzFuncAppBuilderType[] = [];

  constructor(private args: AzAppBuilderArgs) {
    super(args);
    this._instanceName = naming.getAppPlanName(args.name);
  }

  public withPlan(props: AzAppBuilderKinds): IAzAppBuilder {
    this._planSku = props;
    return this;
  }

  public withFunc(props: AzFuncAppBuilderType): IAzAppBuilder {
    this._funcs.push(props);
    return this;
  }

  private buildAppPlan() {
    this._appPlanInstance = new azure.web.AppServicePlan(this._instanceName, {
      ...this.args.group,
      name: this._instanceName,
      kind: this._planSku!.kind,
      sku: this._planSku!.sku,
      zoneRedundant: isPrd,
    });
  }
  private buildFuncApps() {
    const { envUIDInfo } = this.args;
    this._funcs.map((f) => {
      const n = `${this._instanceName}-${f.name}`;
      const func = new azure.web.WebApp(n, {
        ...this.args.group,
        name: f.name,
        enabled: true,
        httpsOnly: true,
        storageAccountRequired: true,
        serverFarmId: this._appPlanInstance!.id,
        kind: 'FunctionApp',
        identity: {
          type: envUIDInfo
            ? azure.web.ManagedServiceIdentityType.SystemAssigned_UserAssigned
            : azure.web.ManagedServiceIdentityType.SystemAssigned,
          userAssignedIdentities: envUIDInfo ? [envUIDInfo.id] : undefined,
        },
        siteConfig: {
          connectionStrings: f.connectionStrings,
          appSettings: [
            {
              name: 'AzureWebJobsStorage',
              value: f.storageConnectionString,
            },
            { name: 'WEBSITE_RUN_FROM_PACKAGE', value: '1' },
            ...(f.appSettings ?? []),
          ],
          cors: {
            allowedOrigins: ['*'],
          },
          scmIpSecurityRestrictionsDefaultAction: 'Deny',
          ipSecurityRestrictions: f.network?.ipAddresses
            ? f.network?.ipAddresses.map((ip) => ({
                action: 'Allow',
                ipAddress: ip,
              }))
            : undefined,
        },
        publicNetworkAccess: f.network?.privateLink ? 'Disabled' : 'Enabled',
        virtualNetworkSubnetId: f.network?.subnetId,
      });
    });
  }

  public build(): ResourceInfo {
    this.buildAppPlan();
    this.buildFuncApps();

    return {
      name: this._instanceName,
      group: this.args.group,
      id: this._appPlanInstance!.id,
    };
  }
}

export default (props: AzAppBuilderArgs) =>
  new AzAppBuilder(props) as IAzAppPlanBuilder;
