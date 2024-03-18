import { BasicResourceArgs } from '../types';
import * as automation from '@pulumi/azure-native/automation';
import { getAutomationAccountName } from '../Common/Naming';


interface Props extends BasicResourceArgs {}

export default ({ name, group }: Props) => {
  name = getAutomationAccountName(name);

  return new automation.AutomationAccount(name, {
    automationAccountName: name,
    ...group,
    publicNetworkAccess: false,
    identity: { type: 'SystemAssigned' },
    disableLocalAuth: true,

    sku: {
      name: 'Free', //Free, Basic
    },

  });
};
