import * as pulumi from '@pulumi/pulumi';

export const testMode = Boolean(process.env.TEST_MODE);
export const organization =testMode? "hbd" : pulumi.getOrganization().toLowerCase();
export const projectName = pulumi.getProject().toLowerCase();
export const stack = pulumi.getStack().toLowerCase();

console.log(`Current Pulumi Project: ${projectName}, Organization: ${organization} and Stack: ${stack}`);
if (testMode) console.log(` & Running in Test mode.`);

