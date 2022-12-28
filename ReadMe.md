# HBD.Pulumi.Share
The common share component for Pulumi projects

## How to use me?
1. Clone me from https://github.com/baoduy/HBD.Pulumi.Share into a folder named "_Shared".
2. Create a pulumi account and link to the environment.
3. Create a "_Config" folder to store your custom configuration.

## How to config Organization Name
You should add the Organization code to the name of some resources and resource groups to ensure that their name is identical and dedicated to your projects.
There are two ways to config your organization code.

1. Name your project with the following convention: "ProjectName-OrgCode".
2. Set "projectName:organization: YourOrgCode" in your project stack YAML configuration file.
**Note**: With option two, you must repeat the configuration on all stack YAML files.

## Private Link Dns Name
https://docs.microsoft.com/en-us/azure/private-link/private-endpoint-dns

## Upgrading Issues
Azure AD Application: https://github.com/pulumi/pulumi-azuread/issues/185#issuecomment-982414862