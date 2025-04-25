import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import { createDiagnostic } from "@drunk-pulumi/azure/Monitor";


const rs = (async () => {
  const suffix = "codedx";
  const group = new resources.ResourceGroup("Hello");

  createDiagnostic("hello",{
    resourceUri:group.id,
    logs:[{categoryGroup:"ABC"}],
  });

  return group;
})();

export default pulumi.output(rs);
