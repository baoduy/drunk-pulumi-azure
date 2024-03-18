import * as pulumi from "@pulumi/pulumi";
import { authorization } from "@pulumi/azure-native";

const rs = (async () => {
  const config = await authorization.getClientConfig();
  console.log(config);
})();

export default pulumi.output(rs);
