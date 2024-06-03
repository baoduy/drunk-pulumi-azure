import { defaultScope } from "../../Common/AzureEnv";
import * as authorization from "@pulumi/azure-native/authorization";

export default () =>
  new authorization.RoleDefinition("Just_In_Time_Request_Role", {
    roleDefinitionId: "f13ceb01-0f55-45de-97d9-cf64d24ca824",
    roleName: "Just In Time Request Role",
    description: "Just In Time Request Role",
    permissions: [
      {
        actions: [
          "Microsoft.Security/locations/jitNetworkAccessPolicies/initiate/action",
          "Microsoft.Security/locations/jitNetworkAccessPolicies/read",
          "Microsoft.Security/policies/read",
          "Microsoft.Compute/virtualMachines/read",
        ],
        notActions: [],
        dataActions: [],
        notDataActions: [],
      },
    ],
    assignableScopes: [defaultScope],
    scope: defaultScope,
  });
