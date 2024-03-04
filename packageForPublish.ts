import * as fs from 'fs';
import * as path from 'path';

const tsConfigPath = './tsconfig.json'; // Path to tsconfig.json
const srcPackageJsonPath = './package.json'; // Source package.json path

// Read the tsconfig.json file to determine the output directory
const tsConfigRaw = fs.readFileSync(tsConfigPath, 'utf8');
const tsConfig = JSON.parse(tsConfigRaw);
const targetDir = tsConfig?.compilerOptions?.outDir ?? './.out-bin'; // Fallback to '../other-folder' if outDir is not specified

// Validate that we have a meaningful targetDir
if (!targetDir) {
  throw new Error(
    'Target directory (outDir) is not specified in tsconfig.json.'
  );
}

const targetPackageJsonPath = path.join(targetDir, 'package.json');

// Read the source package.json
const packageJsonRaw = fs.readFileSync(srcPackageJsonPath, 'utf8');
let packageJson = JSON.parse(packageJsonRaw);

// Remove devDependencies
packageJson.devDependencies = undefined;
packageJson.scripts = undefined;
packageJson.husky = undefined;

// Ensure the target directory exists (optional)
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Write the modified package.json to the target directory
fs.writeFileSync(targetPackageJsonPath, JSON.stringify(packageJson, null, 2), {
  encoding: 'utf8',
  flag: 'w',
});

console.log(
  `package.json has been copied to ${targetDir} without devDependencies.`
);
