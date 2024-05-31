import { replaceInFile, ReplaceResult } from "replace-in-file";

const options = {
  files: "./node_modules/openpgp/openpgp.d.ts",
  from: /NodeStream as GenericNodeStream/g,
  to: "NodeWebStream as GenericNodeStream",
};

replaceInFile(options)
  .then((rs: ReplaceResult[]) => {
    console.log("Replacement results:", rs);
  })
  .catch((er: Error) => {
    console.error("Error occurred:", er);
  });
