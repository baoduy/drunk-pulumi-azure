process.env.PULUMI_TEST_MODE = "true";
// Common/StackEnv.ts reads this real env var directly (not via pulumi's
// mock organization below), so naming rules with includeOrgName need it set.
process.env.PULUMI_NODEJS_ORGANIZATION = "testOrganization";

import * as pulumi from "@pulumi/pulumi";

const tryFindName = (props: any) => {
  let name: string = props.name || props.resourceName;

  if (!name) {
    const keys = Object.keys(props);
    //Try to find the name that is not a resourceGroupName
    let key = keys.find((k) => k.endsWith("Name"));

    if (key) {
      name = props[key];
    }
  }
  //if (!name) console.error('Unable to find name', props);
  return name;
};

// Captures every resource's construction inputs, keyed by Pulumi type token,
// so tests can inspect args passed to resources a builder never returns
// (e.g. ServiceBusBuilder/AcrBuilder keep their network rule-set/registry
// instances private). This list is never cleared between test files sharing
// the process, so tests should record `createdResources.length` as a
// watermark before acting, then slice from it and find the first match —
// isolating the search to resources created by that test alone.
// `importId` mirrors `args.id`, which the pulumi runtime populates from a
// resource's `import` option (`req.getImportid()` in runtime/mocks.js) — the
// only one of the new lock-guard's two resource options observable through
// this mock harness; `protect` is never forwarded to `newResource` at all.
export const createdResources: Array<{ type: string; name: string; inputs: any; importId?: string }> = [];

export default pulumi.runtime.setMocks(
  {
    newResource: (
      args: pulumi.runtime.MockResourceArgs,
    ): {
      id: string;
      name: string;
      state: any;
    } => {
      const name = tryFindName(args.inputs) ?? args.name;
      createdResources.push({ type: args.type, name, inputs: args.inputs, importId: args.id });

      return {
        id: `/subscriptions/12345/resourceGroups/resr-group/providers/${name}`,
        name,
        state: {
          name,
          ...args.inputs,
          ...(args.type.includes("Random")
            ? { result: "5c1c5657-085b-41c8-8d11-de897e70eae7" }
            : name.endsWith("ssh")
              ? { publicKey: "1234567890", privateKey: "1234567890" }
              : {}),
        },
      };
    },
    call: (args: pulumi.runtime.MockCallArgs) => {
      if (args.token === "azure:core/getSubscription:getSubscription")
        return {
          id: "00000000-0000-0000-0000-000000000000",
          display_name: "subscription",
        };
      if (args.token === "azure-native:storage:listStorageAccountKeys")
        return {
          keys: [
            { keyName: "key1", value: "key1-value" },
            { keyName: "key2", value: "key2-value" },
          ],
        };
      return args.inputs;
    },
  },
  "testProject",
  "testStack",
  false,
  "testOrganization",
);
