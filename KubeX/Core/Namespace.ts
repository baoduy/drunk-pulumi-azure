import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { DefaultK8sArgs } from "../types";
import { ResourceQuotaSpec } from "./ResourceQuota";
import ResourceQuota from "./ResourceQuota";

interface Props extends Omit<DefaultK8sArgs, "namespace"> {
  labels?: pulumi.Input<{
    [key: string]: pulumi.Input<string>;
  }>;
  quota?: ResourceQuotaSpec;
}

export default ({ name, labels, quota, provider }: Props) => {
  labels = labels || {};

  const ns = new k8s.core.v1.Namespace(
    name,
    {
      metadata: {
        name,
        namespace: name,
        labels: {
          name,
          ...labels,
        },
      },
    },
    { provider }
  );

  if (quota) {
    ResourceQuota({
      name,
      namespace: name,
      spec: quota,
      provider,
      dependsOn: ns,
    });
  }

  return ns;
};
