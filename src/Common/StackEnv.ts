import * as pulumi from "@pulumi/pulumi";

export const isDryRun = Boolean(process.env.PULUMI_NODEJS_DRY_RUN);
export const organization = process.env.PULUMI_NODEJS_ORGANIZATION!;
export const projectName =
  process.env.PULUMI_NODEJS_PROJECT ?? pulumi.getProject().toLowerCase();
export const stack =
  process.env.PULUMI_NODEJS_STACK ?? pulumi.getStack().toLowerCase();

console.log("Pulumi Environments:", {
  organization,
  projectName,
  stack,
  isDryRun,
});
