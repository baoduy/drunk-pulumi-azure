import { K8sArgs } from "./types";
import { getAcrCredentials } from "../ContainerRegistry/Helper";
import { organization } from "../Common/StackEnv";
import { core } from "@pulumi/kubernetes";
interface Props extends K8sArgs {
  name: string;
  namespaces: string[];
}
export default async ({ namespaces, name, ...others }: Props) => {
  const acrInfo = await getAcrCredentials(organization);

  const base64Credentials = Buffer.from(
    acrInfo.username + ":" + acrInfo.password
  ).toString("base64");

  const json = `{"auths":{"${acrInfo.url}":{"auth":"${base64Credentials}"}}}`;

  const base64JsonEncodedCredentials = Buffer.from(json).toString("base64");

  return namespaces.map(
    (n) =>
      new core.v1.Secret(
        `${name}-${n}`,
        {
          metadata: {
            name,
            namespace: n,
          },
          type: "kubernetes.io/dockerconfigjson",
          data: {
            ".dockerconfigjson": base64JsonEncodedCredentials,
          },
        },
        others
      )
  );
};
