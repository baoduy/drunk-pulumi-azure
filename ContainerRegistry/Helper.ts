import * as native from "@pulumi/azure-native";
import axios from "axios";
import { ResourceGroupInfo } from "../types";

export interface ImageInfo {
  registry: string;
  imageName: string;
  tags: Tag[];
}

export interface Tag {
  name: string;
  signed: boolean;
}

interface LatestAcrImageProps {
  repository: string;
  acrName: string;
  group: ResourceGroupInfo;
}

export const getLastAcrImage = async ({
  acrName,
  repository,
  group,
}: LatestAcrImageProps) => {
  const credentials = await native.containerregistry.listRegistryCredentials({
    registryName: acrName,
    ...group,
  });

  const token = Buffer.from(
    `${credentials.username}:${credentials.passwords![0].value}`
  ).toString("base64");

  const url = `https://${acrName}.azurecr.io/acr/v1/${repository}/_tags?last=1&n=1&orderby=timedesc`;
  const rs = await axios
    .get<ImageInfo>(url, { headers: { Authorization: `Basic ${token}` } })
    .then((rs) => rs.data)
    .catch((err) => {
      console.log(`getLastAcrImage: "${url}" Error`, err.response.data);
      return undefined;
    });

  const latestImage = rs
    ? `${rs.registry}/${rs.imageName}:${rs.tags[0].name}`
    : `${acrName}.azurecr.io/${repository}:latest`;

  console.log(`getLastAcrImage: ${acrName}`, latestImage);
  return latestImage;
};
