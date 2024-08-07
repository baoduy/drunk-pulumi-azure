import * as logic from '@pulumi/azure-native/logic';
import { BasicResourceArgs } from '../types';
import { getWorkflowName } from '../Common';

export type WorkflowProps = BasicResourceArgs &
  Pick<logic.WorkflowArgs, 'accessControl'>;

export default ({
  name,
  group,
  dependsOn,
  ignoreChanges,
  importUri,
  ...others
}: WorkflowProps) => {
  const n = getWorkflowName(name);

  return new logic.Workflow(
    name,
    {
      workflowName: n,
      ...group,
      ...others,
      identity: { type: logic.ManagedServiceIdentityType.SystemAssigned },
      accessControl: { actions: {} },
    },
    { dependsOn, ignoreChanges, import: importUri },
  );
};
