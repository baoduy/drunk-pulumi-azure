import { ResourceInfo } from '../types';
import { Builder } from './types';
import {
  ILogicAppBuilder,
  ILogicAppSkuBuilder,
  LogicAppBuilderArgs,
  LogicAppSku,
} from './types/logicAppBuilder';
import { naming } from '../Common';
import * as logic from '@pulumi/azure-native/logic';

class LogicAppBuilder
  extends Builder<ResourceInfo>
  implements ILogicAppBuilder, ILogicAppSkuBuilder
{
  private readonly _instanceName: string;
  private _sku: LogicAppSku = logic.IntegrationAccountSkuName.Free;
  private _wfInstance: logic.Workflow | undefined = undefined;

  constructor(private args: LogicAppBuilderArgs) {
    super(args);
    this._instanceName = naming.getLogWpName(this.args.name);
  }

  public withSku(props: LogicAppSku): ILogicAppBuilder {
    this._sku = props;
    return this;
  }

  private buildWorkflow() {
    const { group, dependsOn, ignoreChanges, importUri } = this.args;

    const accountName = `${this._instanceName}-account`;
    const account = new logic.IntegrationAccount(
      accountName,
      {
        ...group,
        integrationAccountName: accountName,
        integrationServiceEnvironment: {},
        sku: { name: this._sku },
      },
      { dependsOn },
    );

    this._wfInstance = new logic.Workflow(
      this._instanceName,
      {
        ...group,
        workflowName: this._instanceName,
        identity: { type: logic.ManagedServiceIdentityType.SystemAssigned },
        integrationAccount: { id: account.id },
      },
      { dependsOn: account, ignoreChanges, import: importUri },
    );
  }

  public build(): ResourceInfo {
    this.buildWorkflow();
    return {
      name: this._instanceName,
      group: this.args.group,
      id: this._wfInstance!.id,
    };
  }
}

export default (props: LogicAppBuilderArgs) =>
  new LogicAppBuilder(props) as ILogicAppBuilder;
