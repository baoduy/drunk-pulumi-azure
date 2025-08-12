import * as azure from '@pulumi/azure-native';
import {
  AzAppBuilderArgs,
  AzAppBuilderKinds,
  AzFuncAppBuilderType,
  Builder,
  IAzAppBuilder,
  IAzAppPlanBuilder,
} from './types';
import { NamingType, ResourceInfo } from '../types';
import { isPrd, naming } from '../Common';

/**
 * AzAppBuilder class for creating and configuring Azure App Service and Function App resources.
 * This class implements the Builder pattern for App Service configuration including
 * app service plans and function apps.
 * @extends Builder<ResourceInfo>
 * @implements IAzAppBuilder
 * @implements IAzAppPlanBuilder
 */
class AzAppBuilder
  extends Builder<ResourceInfo>
  implements IAzAppBuilder, IAzAppPlanBuilder
{
  private readonly _instanceName: string;
  
  // Resource instances
  private _appPlanInstance: azure.web.AppServicePlan | undefined = undefined;

  // Configuration properties  
  private _planSku: AzAppBuilderKinds | undefined = undefined;
  private _funcs: AzFuncAppBuilderType[] = [];

  /**
   * Creates an instance of AzAppBuilder.
   * @param {AzAppBuilderArgs} args - The arguments for building the Azure App Service.
   */
  constructor(private args: AzAppBuilderArgs) {
    super(args);
    this._instanceName = naming.getAppPlanName(args.name);
  }

  /**
   * Sets the App Service Plan configuration for the Azure App Service.
   * @param {AzAppBuilderKinds} props - The App Service Plan configuration including SKU and kind.
   * @returns {IAzAppBuilder} The current AzAppBuilder instance.
   */
  public withPlan(props: AzAppBuilderKinds): IAzAppBuilder {
    this._planSku = props;
    return this;
  }

  /**
   * Adds a Function App to the App Service Plan.
   * @param {AzFuncAppBuilderType} props - The Function App configuration including name and settings.
   * @returns {IAzAppBuilder} The current AzAppBuilder instance.
   */
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
    const { envUIDInfo, logInfo } = this.args;

    this._funcs.map((f) => {
      const fName = naming.getFuncAppName(f.name);
      const n = `${this._instanceName}-${fName}`;
      const appSettings = f.appSettings ?? [];

      if (logInfo?.appInsight) {
        appSettings.push({
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY',
          value: logInfo.appInsight.instrumentationKey,
        });
        appSettings.push({
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING',
          value: logInfo.appInsight.connectionString,
        });
      }

      return new azure.web.WebApp(n, {
        ...this.args.group,
        name: fName,
        enabled: true,
        httpsOnly: true,
        //storageAccountRequired: true,
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
          appSettings: f.appSettings ?? [],
          cors: {
            allowedOrigins: ['*'],
          },
          http20Enabled: true,
          use32BitWorkerProcess: false,
          nodeVersion: f.nodeVersion,
          netFrameworkVersion: f.netFrameworkVersion,
          scmIpSecurityRestrictionsDefaultAction: f.network?.ipAddresses
            ? 'Deny'
            : 'Allow',
          ipSecurityRestrictionsDefaultAction: f.network?.ipAddresses
            ? 'Deny'
            : 'Allow',
          //scmIpSecurityRestrictions: [],
          scmIpSecurityRestrictionsUseMain: Boolean(f.network?.ipAddresses),
          ipSecurityRestrictions: f.network?.ipAddresses
            ? f.network?.ipAddresses.map((ip) => ({
                action: 'Allow',
                ipAddress: ip,
              }))
            : undefined,
        },
        publicNetworkAccess: f.network?.privateLink ? 'Disabled' : 'Enabled',
        virtualNetworkSubnetId: f.network?.subnetId,
        vnetContentShareEnabled: Boolean(f.network?.subnetId),
        vnetImagePullEnabled: Boolean(f.network?.subnetId),
        vnetRouteAllEnabled: Boolean(f.network?.subnetId),
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

export const getFuncHostInfo = (name: NamingType) => {
  const funcName = naming.getFuncAppName(name);
  return {
    host: `${funcName}.azurewebsites.net`,
    scm: `${funcName}.scm.azurewebsites.net`,
  };
};

export default (props: AzAppBuilderArgs) =>
  new AzAppBuilder(props) as IAzAppPlanBuilder;
