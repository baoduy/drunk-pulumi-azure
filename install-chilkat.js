const { spawn } = require('child_process');
const { platform, arch } = require('os');
const fs = require('fs');
const os = require('os');

const npmCmd = platform().startsWith('win') ? 'npm.cmd' : 'npm';

const run = (cmd) =>
  new Promise((solve) => {
    console.log(npmCmd, cmd);
    const ls = spawn(npmCmd, cmd, {
      env: process.env,
      cwd: './',
      stdio: 'inherit',
    });
    ls.on('close', solve);
  });

const getChilkatTool = () => {
  const v = process.version.split('.')[0].replace('v', '');
  console.log(process.arch);
  const node = v ? `node${v}` : 'node16';
  const platform = os.platform();
  const arch = os.arch();

  let name = '';

  if (platform == 'win32') {
    if (arch == 'ia32') name = 'win-ia32';
    else name = 'win64';
  } else if (platform == 'linux') {
    if (arch == 'arm') name = 'arm';
    else if (arch == 'x86') name = 'linux32';
    else name = 'linux64';
  } else if (platform == 'darwin') {
    if (arch == 'arm64') name = 'mac-m1';
    else name = 'macosx';
  }

  const m = `@chilkat/ck-${node}-${name}`;
  console.log("Installing",m);
  return m;
};

const uninstallTool = () => {
  //Uninstall all existing tool from package.json
  const p = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

  Object.keys(p.dependencies)
    .filter((k) => k.startsWith('@chilkat'))
    .forEach((k) => {
      delete p.dependencies[k];
    });

  Object.keys(p.devDependencies)
    .filter((k) => k.startsWith('@chilkat'))
    .forEach((k) => {
      delete p.dependencies[k];
    });

  fs.writeFileSync('./package.json', JSON.stringify(p, null, 2), {
    encoding: 'utf8',
  });
};

(async () => {
  //Uninstall Tool
  uninstallTool();

  //Install new package with current os
  await run(['install', getChilkatTool(), '--save']);

  // Delete package-lock.json
  fs.unlink('./package-lock.json', console.error);
})();
