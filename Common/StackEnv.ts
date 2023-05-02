import * as pulumi from '@pulumi/pulumi';
import { getValue } from './ConfigHelper';

export const testMode = Boolean(process.env.TEST_MODE);
export const organization = testMode
  ? 'hbd'
  : getValue('organization') ?? pulumi.getOrganization().toLowerCase();
export const projectName = pulumi.getProject().toLowerCase();
export const stack = pulumi.getStack().toLowerCase();

console.log(
  `Current Pulumi Project: ${projectName}, Organization: ${organization} and Stack: ${stack}`
);
if (testMode) console.log(` & Running in Test mode.`);
