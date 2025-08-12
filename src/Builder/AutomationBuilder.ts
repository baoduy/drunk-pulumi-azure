import { Builder } from './types';
import { IdentityInfoWithInstance, ResourceInfo } from '../types';
import {
  AutomationBuilderArgs,
  AutomationSkuBuilder,
  IAutomationBuilder,
  IAutomationSkuBuilder,
} from './types/automationBuilder';
import { naming } from '../Common';
import UserAssignedIdentity from '../AzAd/UserAssignedIdentity';
import { addEncryptKey } from '../KeyVault/Helper';
import * as automation from '@pulumi/azure-native/automation';
import * as mid from '@pulumi/azure-native/managedidentity';

/**
 * AutomationBuilder class for creating and configuring Azure Automation Account resources.
 * This class implements the Builder pattern for Automation Account configuration including
 * SKU selection, identity management, and encryption settings.
 * @extends Builder<ResourceInfo>
 * @implements IAutomationBuilder
 * @implements IAutomationSkuBuilder
 */
class AutomationBuilder
  extends Builder<ResourceInfo>
  implements IAutomationBuilder, IAutomationSkuBuilder
{
  private readonly _instanceName: string;
  
  // Resource instances
  private _uid: IdentityInfoWithInstance<mid.UserAssignedIdentity> | undefined =
    undefined;
  private _automationInstance: automation.AutomationAccount | undefined =
    undefined;
    
  // Configuration properties
  private _sku: AutomationSkuBuilder = automation.SkuNameEnum.Free;

  /**
   * Creates an instance of AutomationBuilder.
   * @param {AutomationBuilderArgs} args - The arguments for building the Automation Account.
   */
  constructor(private args: AutomationBuilderArgs) {
    super(args);
    this._instanceName = naming.getAutomationAccountName(args.name);
  }

  /**
   * Sets the SKU for the Automation Account.
   * @param {AutomationSkuBuilder} props - The SKU to set (Free or Basic).
   * @returns {IAutomationBuilder} The current AutomationBuilder instance.
   */
  public withSku(props: AutomationSkuBuilder): IAutomationBuilder {
    this._sku = props;
    return this;
  }

  private buildUID() {
    const { group, dependsOn, envRoles } = this.args;
    this._uid = UserAssignedIdentity({
      name: this._instanceName,
      group,
      dependsOn,
    });

    //grant permission
    envRoles?.addMember('contributor', this._uid.principalId);
  }

  private buildAutomation() {
    const {
      group,
      vaultInfo,
      envRoles,
      envUIDInfo,
      enableEncryption,
      ignoreChanges,
      dependsOn,
    } = this.args;

    const encryption =
      enableEncryption && vaultInfo
        ? addEncryptKey(this._instanceName, vaultInfo)
        : undefined;

    this._automationInstance = new automation.AutomationAccount(
      this._instanceName,
      {
        ...group,
        automationAccountName: this._instanceName,
        publicNetworkAccess: false,
        identity: {
          type: automation.ResourceIdentityType.SystemAssigned_UserAssigned,
          userAssignedIdentities: envUIDInfo
            ? [this._uid!.id, envUIDInfo.id]
            : [this._uid!.id],
        },
        disableLocalAuth: true,

        encryption: {
          keySource: encryption ? 'Microsoft.Keyvault' : 'Microsoft.Automation',
          identity: encryption
            ? { userAssignedIdentity: envUIDInfo?.id ?? this._uid!.id }
            : undefined,
          keyVaultProperties: encryption
            ? {
                keyName: encryption.keyName,
                keyvaultUri: encryption.keyVaultUri,
                keyVersion: encryption.keyVersion,
              }
            : undefined,
        },
        sku: {
          name: this._sku,
        },
      },
      { dependsOn: this._uid?.instance ?? dependsOn, ignoreChanges },
    );

    //grant permission
    envRoles?.addIdentity('contributor', this._automationInstance.identity);
  }

  public build(): ResourceInfo {
    this.buildUID();
    this.buildAutomation();

    return {
      name: this._instanceName,
      group: this.args.group,
      id: this._automationInstance!.id,
    };
  }
}

export default (props: AutomationBuilderArgs) =>
  new AutomationBuilder(props) as IAutomationSkuBuilder;
