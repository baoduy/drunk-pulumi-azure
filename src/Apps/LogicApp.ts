import * as logic from "@pulumi/azure-native/logic";
import { BasicResourceArgs, DefaultResourceArgs } from "../types";
import { getWorkflowName } from "../Common/Naming";

export type WorkflowProps = BasicResourceArgs &
  DefaultResourceArgs &
  Pick<logic.WorkflowArgs, "accessControl">;

export default ({
  name,
  group,
  dependsOn,
  ignoreChanges,
  importUri,
  ...others
}: WorkflowProps) => {
  const n = getWorkflowName(name);

  const workFlow = new logic.Workflow(
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

  return workFlow;
};
