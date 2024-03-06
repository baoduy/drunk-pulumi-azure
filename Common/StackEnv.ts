import * as pulumi from '@pulumi/pulumi';
import { getValue } from './ConfigHelper';

export const isDryRun = Boolean(process.env.PULUMI_NODEJS_DRY_RUN);
export const organization =
  process.env.PULUMI_NODEJS_ORGANIZATION ??
  getValue('organization') ??
  pulumi.getOrganization().toLowerCase();
export const projectName =
  process.env.PULUMI_NODEJS_PROJECT ?? pulumi.getProject().toLowerCase();
export const stack =
  process.env.PULUMI_NODEJS_STACK ?? pulumi.getStack().toLowerCase();

console.log(
  `Current Pulumi Project: ${projectName}, Organization: ${organization} and Stack: ${stack}`
);
