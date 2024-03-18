import * as logic from '@pulumi/azure-native/logic';
import { BasicResourceArgs, DefaultResourceArgs } from '../types';
import creator from '../Core/ResourceCreator';
import { global } from '../Common';
import { getCertOrderName } from '../Common/Naming';

interface Props extends BasicResourceArgs, DefaultResourceArgs {}

export default ({ name, ...others }: Props) => {
  const n = getCertOrderName(name);

  const order = creator(logic.Workflow, {
    workflowName: n,
    ...global.groupInfo,
    ...others,
    sku: '',

  } as logic.WorkflowArgs & DefaultResourceArgs);

  return order;
};
