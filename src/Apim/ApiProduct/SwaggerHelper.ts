import { Input } from "@pulumi/pulumi";
import { OpenAPI3 } from "./OpenApi";
import axios from "axios";
import { replaceAll } from "../../Common/Helpers";

const removeVersion = (data: OpenAPI3, version: string): OpenAPI3 => {
  if (!data?.paths) {
    console.error(`APIM-removeVersion: There is no paths found in`, data);
    return data;
  }

  const newPaths = {} as any;

  //Replace version from path
  Object.keys(data.paths).forEach((k) => {
    const newKey = replaceAll(k, `/${version}`, "");
    newPaths[newKey] = data.paths[k];
  });

  data.paths = newPaths;
  return data;
};

export interface ApiImport {
  contentFormat: Input<string>;
  contentValue: Input<string>;
}

const downloadSpecFile = async (
  fileUrl: string,
): Promise<OpenAPI3 | undefined> => {
  try {
    //Get specs json from URL
    const specs = await axios.get<OpenAPI3>(fileUrl);
    return specs.data;
  } catch {
    console.error("Not able to get spec file from:", fileUrl);
    return undefined;
  }
};

export const getImportConfig = async (
  specUrl: string,
  version: string,
): Promise<string | undefined> => {
  const spec = await downloadSpecFile(specUrl);

  if (!spec) return undefined;

  //Validate
  //if (!validateSpecFile(specUrl, spec)) return undefined;

  //Remove Version
  const data = removeVersion(spec, version);
  return JSON.stringify(data);
};
