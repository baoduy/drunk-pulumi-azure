import * as pulumi from '@pulumi/pulumi';

console.log(
  'Pulumi Environments\n',
  Object.keys(process.env)
    .filter((key) => key.startsWith('PULUMI_'))
    .map((key) => `\t${key}: ${process.env[key]}`)
    .join('\n')
);

export const isDryRun = Boolean(process.env.PULUMI_NODEJS_DRY_RUN);
export const organization = process.env.PULUMI_NODEJS_ORGANIZATION!;
export const projectName =
  process.env.PULUMI_NODEJS_PROJECT ?? pulumi.getProject().toLowerCase();
export const stack =
  process.env.PULUMI_NODEJS_STACK ?? pulumi.getStack().toLowerCase();
