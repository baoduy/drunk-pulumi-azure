import { replaceAll } from "../../Common/Helpers";
import { OpenAPI3 } from "./OpenApi";

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

const downloadSpecFile = async (
  fileUrl: string,
): Promise<OpenAPI3 | undefined> => {
  //Get specs json from URL
  return await fetch(fileUrl, { method: "GET" })
    .then<OpenAPI3>((rs) => rs.json())
    .catch((error) => {
      console.error(`Not able to get spec file from: ${fileUrl}`, error);
      return undefined;
    });
};

export const getImportConfig = async (
  specUrl: string,
  version: string,
): Promise<string | undefined> => {
  const spec = await downloadSpecFile(specUrl);
  if (!spec) return undefined;

  //Remove Version
  const data = removeVersion(spec, version);
  return JSON.stringify(data);
};
