import * as fs from "fs";
import * as path from "path";

const tsconfigPath: string = "./tsconfig.json";
const srcFolderPath: string = "./src"; // Adjust 'src' if your TS files are in a different directory
const excludeFolders: string[] = ["z_tests"]; // List of folder names to exclude

// Function to recursively find .ts files, excluding specified folders
function findTsFiles(dir: string, arrayOfFiles: string[] = []): string[] {
  const files: string[] = fs.readdirSync(dir);

  files.forEach(function (file) {
    const fullPath: string = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!excludeFolders.includes(file)) {
        // Check if the directory is not in the exclude list
        arrayOfFiles = findTsFiles(fullPath, arrayOfFiles);
      }
    } else if (file.endsWith(".ts")) {
      arrayOfFiles.push(path.relative("./", fullPath).replace(/\\/g, "/"));
    }
  });

  return arrayOfFiles;
}

const tsFiles: string[] = findTsFiles(srcFolderPath);

// Read tsconfig.json, update it with the found .ts files, excluding those in the excludeFolders, and write it back
fs.readFile(tsconfigPath, "utf8", (err, data) => {
  if (err) {
    console.error(err);
    return;
  }

  const tsconfig: any = JSON.parse(data);
  tsconfig.files = tsFiles; // Assuming 'files' field is used, adjust if your setup uses 'include'

  fs.writeFile(
    tsconfigPath,
    JSON.stringify(tsconfig, null, 2),
    "utf8",
    (err) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log("tsconfig.json has been updated with TypeScript files.");
    },
  );
});
