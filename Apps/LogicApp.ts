import * as logic from '@pulumi/azure-native/logic';

import { BasicResourceArgs, DefaultResourceArgs } from '../types';

import creator from '../Core/ResourceCreator';
import { defaultTags } from '../Common/AzureEnv';
import { global } from '../Common';
import { getCertOrderName } from '../Common/Naming';

interface Props extends BasicResourceArgs, DefaultResourceArgs {}

export default ({ name, group, ...others }: Props) => {
  const n = getCertOrderName(name);

  const order = creator(logic.Workflow, {
    workflowName: n,
    ...global.groupInfo,
    ...others,
    sku: '',
    tags: defaultTags,
  } as logic.WorkflowArgs & DefaultResourceArgs);

  return order;
};
